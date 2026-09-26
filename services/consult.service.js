const sequelize = require('../config/connection');
const { Consult, Lead } = require('../models');
const { CONSULT_STATUSES, STAGES } = require('../constants/leadStages');
const { HttpError } = require('../utils/httpError');
const { findLeadByUuid, isUuid } = require('./lead.service');
const { transitionLeadStage } = require('./leadStage.service');

function publicConsult(consult, leadUuid) {
  return {
    consult_uuid: consult.consult_uuid,
    lead_uuid: leadUuid || null,
    location_id: consult.location_id,
    provider_id: consult.provider_id,
    scheduled_at: consult.scheduled_at,
    status: consult.status,
    canceled_at: consult.canceled_at,
    cancel_reason: consult.cancel_reason,
    no_show_at: consult.no_show_at,
    completed_at: consult.completed_at,
    external_system: consult.external_system,
    external_id: consult.external_id,
    created_at: consult.created_at,
    updated_at: consult.updated_at,
  };
}

const STATUS_TO_STAGE = {
  [CONSULT_STATUSES.SCHEDULED]: STAGES.BOOKED_CONSULT,
  [CONSULT_STATUSES.CANCELED]: STAGES.CANCELED,
  [CONSULT_STATUSES.NO_SHOW]: STAGES.NO_SHOW,
  [CONSULT_STATUSES.COMPLETED]: STAGES.COMPLETED_CONSULT,
};

async function listConsults(leadUuid) {
  const lead = await findLeadByUuid(leadUuid);
  const consults = await Consult.findAll({
    where: { lead_id: lead.id },
    order: [['scheduled_at', 'ASC']],
  });
  return consults.map((row) => publicConsult(row, lead.lead_uuid));
}

async function createConsult(leadUuid, payload) {
  const lead = await findLeadByUuid(leadUuid);
  if (!payload.scheduled_at) throw new HttpError(400, 'scheduled_at is required', 'INVALID_CONSULT');
  const scheduledAt = new Date(payload.scheduled_at);
  if (Number.isNaN(scheduledAt.getTime())) throw new HttpError(400, 'Invalid scheduled_at', 'INVALID_TIMESTAMP');

  const consult = await sequelize.transaction(async (transaction) => {
    const record = await Consult.create(
      {
        lead_id: lead.id,
        location_id: payload.location_id || null,
        provider_id: payload.provider_id || null,
        scheduled_at: scheduledAt,
        status: CONSULT_STATUSES.SCHEDULED,
        external_system: payload.external_system || null,
        external_id: payload.external_id || null,
      },
      { transaction }
    );

    if (lead.current_stage !== STAGES.BOOKED_CONSULT) {
      await transitionLeadStage({
        lead,
        toStage: STAGES.BOOKED_CONSULT,
        source: payload.source || 'consult',
        reason: 'consult_scheduled',
        metadata: { consult_uuid: record.consult_uuid },
        transaction,
      });
    }

    return record;
  });

  return publicConsult(consult, lead.lead_uuid);
}

async function patchConsult(consultUuid, payload) {
  if (!isUuid(consultUuid)) throw new HttpError(400, 'Invalid consult_uuid', 'INVALID_UUID');
  const consult = await Consult.findOne({ where: { consult_uuid: consultUuid } });
  if (!consult) throw new HttpError(404, 'Consult not found', 'CONSULT_NOT_FOUND');
  const lead = await Lead.findByPk(consult.lead_id);

  const nextStatus = payload.status;
  if (nextStatus && !Object.values(CONSULT_STATUSES).includes(nextStatus)) {
    throw new HttpError(400, 'Invalid consult status', 'INVALID_CONSULT_STATUS');
  }

  const updated = await sequelize.transaction(async (transaction) => {
    if (payload.scheduled_at) {
      const scheduledAt = new Date(payload.scheduled_at);
      if (Number.isNaN(scheduledAt.getTime())) throw new HttpError(400, 'Invalid scheduled_at', 'INVALID_TIMESTAMP');
      consult.scheduled_at = scheduledAt;
    }
    if (payload.location_id !== undefined) consult.location_id = payload.location_id;
    if (payload.provider_id !== undefined) consult.provider_id = payload.provider_id;
    if (payload.external_system !== undefined) consult.external_system = payload.external_system;
    if (payload.external_id !== undefined) consult.external_id = payload.external_id;
    if (payload.cancel_reason !== undefined) consult.cancel_reason = payload.cancel_reason;

    if (nextStatus && nextStatus !== consult.status) {
      consult.status = nextStatus;
      if (nextStatus === CONSULT_STATUSES.CANCELED) consult.canceled_at = new Date();
      if (nextStatus === CONSULT_STATUSES.NO_SHOW) consult.no_show_at = new Date();
      if (nextStatus === CONSULT_STATUSES.COMPLETED) consult.completed_at = new Date();
      if (nextStatus === CONSULT_STATUSES.SCHEDULED) {
        consult.canceled_at = null;
        consult.no_show_at = null;
        consult.completed_at = null;
      }
    }

    await consult.save({ transaction });

    if (nextStatus && STATUS_TO_STAGE[nextStatus] && lead.current_stage !== STATUS_TO_STAGE[nextStatus]) {
      await transitionLeadStage({
        lead,
        toStage: STATUS_TO_STAGE[nextStatus],
        source: payload.source || 'consult',
        reason: payload.reason || `consult_${nextStatus}`,
        metadata: { consult_uuid: consult.consult_uuid },
        transaction,
      });
    }

    return consult;
  });

  return publicConsult(updated, lead.lead_uuid);
}

module.exports = {
  publicConsult,
  listConsults,
  createConsult,
  patchConsult,
};
