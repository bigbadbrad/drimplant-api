const sequelize = require('../config/connection');
const { Lead, Appointment, Treatment, Financing, Task } = require('../models');
const { LeadStatusHistory, AppointmentStatusHistory, TreatmentStatusHistory, FinancingStatusHistory } = require('../models');
const { HttpError } = require('../utils/httpError');
const {
  LEAD_ENGAGEMENT_STATUSES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TRANSITIONS,
  TREATMENT_STATUSES,
  FINANCING_STATUSES,
} = require('../constants/statuses');
const { recordActivity, recordEvent } = require('./activity.service');

function assertStatus(value, allowed, code = 'INVALID_STATUS') {
  if (!allowed.includes(value)) {
    throw new HttpError(400, `Invalid status: ${value}`, code);
  }
}

function assertChanged(from, to) {
  if (from === to) throw new HttpError(409, 'Already in this status', 'STATUS_UNCHANGED');
}

async function runInTransaction(existing, fn) {
  if (existing) return fn(existing);
  return sequelize.transaction(fn);
}

async function transitionLeadStatus({
  lead,
  toStatus,
  source = 'api',
  changedByUserId = null,
  reason = null,
  metadata = null,
  transaction,
}) {
  assertStatus(toStatus, LEAD_ENGAGEMENT_STATUSES);
  assertChanged(lead.engagement_status, toStatus);

  return runInTransaction(transaction, async (tx) => {
    const fromStatus = lead.engagement_status;
    await lead.update({ engagement_status: toStatus }, { transaction: tx });
    await LeadStatusHistory.create(
      {
        lead_id: lead.id,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by_user_id: changedByUserId,
        source,
        reason,
        metadata,
        changed_at: new Date(),
      },
      { transaction: tx }
    );
    await recordActivity(
      {
        contact_id: lead.contact_id,
        lead_id: lead.id,
        user_id: changedByUserId,
        activity_type: 'status_changed',
        summary: `Lead engagement ${fromStatus} → ${toStatus}`,
        details: { from_status: fromStatus, to_status: toStatus, source, reason },
      },
      tx
    );
    await recordEvent(
      {
        contact_id: lead.contact_id,
        lead_id: lead.id,
        visitor_id: lead.visitor_id,
        session_id: lead.session_id,
        event_type: 'lead_status_changed',
        event_source: source,
        properties: { from_status: fromStatus, to_status: toStatus },
      },
      tx
    );
    return lead;
  });
}

async function transitionAppointmentStatus({
  appointment,
  toStatus,
  source = 'api',
  changedByUserId = null,
  reason = null,
  metadata = null,
  transaction,
}) {
  assertStatus(toStatus, APPOINTMENT_STATUSES);
  assertChanged(appointment.status, toStatus);
  const allowed = APPOINTMENT_TRANSITIONS[appointment.status] || [];
  if (!allowed.includes(toStatus)) {
    throw new HttpError(409, `Cannot change appointment from ${appointment.status} to ${toStatus}`, 'INVALID_TRANSITION');
  }

  return runInTransaction(transaction, async (tx) => {
    const fromStatus = appointment.status;
    const patch = { status: toStatus };
    if (toStatus === 'canceled') {
      patch.canceled_at = new Date();
      patch.cancel_reason = reason || appointment.cancel_reason;
    }
    if (toStatus === 'no_show') patch.no_show_at = new Date();
    if (toStatus === 'completed') patch.completed_at = new Date();
    if (toStatus === 'scheduled') {
      patch.canceled_at = null;
      patch.no_show_at = null;
      patch.completed_at = null;
    }

    await appointment.update(patch, { transaction: tx });
    await AppointmentStatusHistory.create(
      {
        appointment_id: appointment.id,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by_user_id: changedByUserId,
        source,
        reason,
        metadata,
        changed_at: new Date(),
      },
      { transaction: tx }
    );
    await recordActivity(
      {
        contact_id: appointment.contact_id,
        lead_id: appointment.lead_id,
        appointment_id: appointment.id,
        user_id: changedByUserId,
        activity_type: `appointment_${toStatus}`,
        summary: `Appointment ${fromStatus} → ${toStatus}`,
        details: { from_status: fromStatus, to_status: toStatus, source, reason },
      },
      tx
    );
    await recordEvent(
      {
        contact_id: appointment.contact_id,
        lead_id: appointment.lead_id,
        event_type: `appointment_${toStatus}`,
        event_source: source,
        properties: { from_status: fromStatus, to_status: toStatus },
      },
      tx
    );

    if (toStatus === 'no_show') {
      await Task.create(
        {
          contact_id: appointment.contact_id,
          lead_id: appointment.lead_id,
          appointment_id: appointment.id,
          assigned_user_id: appointment.assigned_user_id,
          created_by_user_id: changedByUserId,
          task_type: 'reschedule_no_show',
          title: 'Reschedule no-show',
          status: 'open',
        },
        { transaction: tx }
      );
    }

    return appointment;
  });
}

async function transitionTreatmentStatus({
  treatment,
  toStatus,
  source = 'api',
  changedByUserId = null,
  reason = null,
  metadata = null,
  transaction,
}) {
  assertStatus(toStatus, TREATMENT_STATUSES);
  assertChanged(treatment.status, toStatus);

  return runInTransaction(transaction, async (tx) => {
    const fromStatus = treatment.status;
    const patch = { status: toStatus };
    if (toStatus === 'won') patch.accepted_at = treatment.accepted_at || new Date();
    if (toStatus === 'lost' || toStatus === 'closed') {
      patch.closed_at = new Date();
      patch.close_reason = reason || treatment.close_reason;
    }
    await treatment.update(patch, { transaction: tx });
    await TreatmentStatusHistory.create(
      {
        treatment_id: treatment.id,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by_user_id: changedByUserId,
        source,
        reason,
        metadata,
        changed_at: new Date(),
      },
      { transaction: tx }
    );
    await recordActivity(
      {
        contact_id: treatment.contact_id,
        lead_id: treatment.lead_id,
        treatment_id: treatment.id,
        user_id: changedByUserId,
        activity_type: 'treatment_status_changed',
        summary: `Treatment ${fromStatus} → ${toStatus}`,
        details: { from_status: fromStatus, to_status: toStatus, source, reason },
      },
      tx
    );
    await recordEvent(
      {
        contact_id: treatment.contact_id,
        lead_id: treatment.lead_id,
        event_type: 'treatment_status_changed',
        event_source: source,
        properties: { from_status: fromStatus, to_status: toStatus },
      },
      tx
    );
    return treatment;
  });
}

async function transitionFinancingStatus({
  financing,
  treatment,
  toStatus,
  source = 'api',
  changedByUserId = null,
  reason = null,
  metadata = null,
  transaction,
}) {
  assertStatus(toStatus, FINANCING_STATUSES);
  assertChanged(financing.status, toStatus);

  return runInTransaction(transaction, async (tx) => {
    const fromStatus = financing.status;
    const patch = { status: toStatus };
    if (toStatus === 'approved' || toStatus === 'denied') patch.decision_at = new Date();
    await financing.update(patch, { transaction: tx });
    await FinancingStatusHistory.create(
      {
        financing_id: financing.id,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by_user_id: changedByUserId,
        source,
        reason,
        metadata,
        changed_at: new Date(),
      },
      { transaction: tx }
    );
    await recordActivity(
      {
        contact_id: treatment.contact_id,
        lead_id: treatment.lead_id,
        treatment_id: treatment.id,
        user_id: changedByUserId,
        activity_type: 'financing_status_changed',
        summary: `Financing ${fromStatus} → ${toStatus}`,
        details: { from_status: fromStatus, to_status: toStatus, source, reason },
      },
      tx
    );
    return financing;
  });
}

module.exports = {
  transitionLeadStatus,
  transitionAppointmentStatus,
  transitionTreatmentStatus,
  transitionFinancingStatus,
};
