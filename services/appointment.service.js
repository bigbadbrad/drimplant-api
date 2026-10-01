const sequelize = require('../config/connection');
const { Appointment, AppointmentStatusHistory } = require('../models');
const { HttpError } = require('../utils/httpError');
const { clip, parseDate } = require('../utils/fields');
const { findLeadByUuid, findAppointmentByUuid, optionalUser } = require('./lookup');
const { recordActivity, recordEvent } = require('./activity.service');
const { transitionAppointmentStatus } = require('./status.service');

function publicAppointment(row) {
  return {
    appointment_uuid: row.appointment_uuid,
    contact_id: row.contact_id,
    lead_id: row.lead_id,
    location_id: row.location_id,
    provider_id: row.provider_id,
    scheduled_at: row.scheduled_at,
    status: row.status,
    open_dental_pat_num: row.open_dental_pat_num,
    open_dental_appointment_id: row.open_dental_appointment_id,
    canceled_at: row.canceled_at,
    cancel_reason: row.cancel_reason,
    no_show_at: row.no_show_at,
    completed_at: row.completed_at,
    external_system: row.external_system,
    external_id: row.external_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listAppointments(leadUuid) {
  const lead = await findLeadByUuid(leadUuid);
  const rows = await Appointment.findAll({
    where: { lead_id: lead.id },
    order: [['scheduled_at', 'ASC']],
  });
  return rows.map(publicAppointment);
}

async function createAppointment(leadUuid, payload) {
  const lead = await findLeadByUuid(leadUuid);
  const scheduledAt = parseDate(payload.scheduled_at, 'scheduled_at');
  if (!scheduledAt) throw new HttpError(400, 'scheduled_at is required', 'INVALID_APPOINTMENT');
  const createdBy = await optionalUser(payload.created_by_user_uuid);
  const assigned = await optionalUser(payload.assigned_user_uuid);

  const appointment = await sequelize.transaction(async (transaction) => {
    const row = await Appointment.create(
      {
        contact_id: lead.contact_id,
        lead_id: lead.id,
        location_id: payload.location_id || null,
        provider_id: payload.provider_id || null,
        scheduled_at: scheduledAt,
        status: 'scheduled',
        open_dental_pat_num: clip(payload.open_dental_pat_num, 64),
        open_dental_appointment_id: clip(payload.open_dental_appointment_id, 64),
        created_by_user_id: createdBy?.id || null,
        assigned_user_id: assigned?.id || null,
        external_system: clip(payload.external_system, 64),
        external_id: clip(payload.external_id, 64),
      },
      { transaction }
    );
    await AppointmentStatusHistory.create(
      {
        appointment_id: row.id,
        from_status: null,
        to_status: 'scheduled',
        changed_by_user_id: createdBy?.id || null,
        source: payload.source || 'api',
        reason: payload.reason || 'appointment_created',
        changed_at: new Date(),
      },
      { transaction }
    );
    await recordActivity(
      {
        contact_id: lead.contact_id,
        lead_id: lead.id,
        appointment_id: row.id,
        user_id: createdBy?.id || null,
        activity_type: 'appointment_created',
        summary: 'Appointment scheduled',
        details: { scheduled_at: scheduledAt },
      },
      transaction
    );
    await recordEvent(
      {
        contact_id: lead.contact_id,
        lead_id: lead.id,
        event_type: 'appointment_created',
        event_source: payload.source || 'api',
      },
      transaction
    );
    return row;
  });

  return publicAppointment(appointment);
}

async function getAppointment(appointmentUuid) {
  const row = await findAppointmentByUuid(appointmentUuid);
  return publicAppointment(row);
}

async function patchAppointment(appointmentUuid, payload) {
  const row = await findAppointmentByUuid(appointmentUuid);
  const next = {};
  if (payload.scheduled_at !== undefined) {
    const scheduledAt = parseDate(payload.scheduled_at, 'scheduled_at');
    if (!scheduledAt) throw new HttpError(400, 'scheduled_at is required', 'INVALID_APPOINTMENT');
    next.scheduled_at = scheduledAt;
  }
  if (payload.location_id !== undefined) next.location_id = payload.location_id || null;
  if (payload.provider_id !== undefined) next.provider_id = payload.provider_id || null;
  if (payload.open_dental_pat_num !== undefined) next.open_dental_pat_num = clip(payload.open_dental_pat_num, 64);
  if (payload.open_dental_appointment_id !== undefined) {
    next.open_dental_appointment_id = clip(payload.open_dental_appointment_id, 64);
  }
  if (payload.external_system !== undefined) next.external_system = clip(payload.external_system, 64);
  if (payload.external_id !== undefined) next.external_id = clip(payload.external_id, 64);
  if (payload.cancel_reason !== undefined) next.cancel_reason = clip(payload.cancel_reason, 255);

  if (Object.keys(next).length) await row.update(next);
  if (next.scheduled_at) {
    await recordActivity({
      contact_id: row.contact_id,
      lead_id: row.lead_id,
      appointment_id: row.id,
      activity_type: 'appointment_rescheduled',
      summary: 'Appointment rescheduled',
      details: { scheduled_at: next.scheduled_at },
    });
  }
  return publicAppointment(row);
}

async function changeAppointmentStatus(appointmentUuid, payload) {
  const row = await findAppointmentByUuid(appointmentUuid);
  const toStatus = payload.to_status || payload.status;
  await transitionAppointmentStatus({
    appointment: row,
    toStatus,
    source: payload.source || 'api',
    changedByUserId: payload.changed_by_user_id || null,
    reason: payload.reason || payload.cancel_reason || null,
    metadata: payload.metadata || null,
  });
  await row.reload();
  return publicAppointment(row);
}

module.exports = {
  publicAppointment,
  listAppointments,
  createAppointment,
  getAppointment,
  patchAppointment,
  changeAppointmentStatus,
};
