const { Event, LeadStageHistory } = require('../models');
const { canTransition, isValidStage, STAGE_EVENT_TYPE } = require('../constants/leadStages');
const { HttpError } = require('../utils/httpError');
const { logInfo } = require('../utils/logger');

async function transitionLeadStage({
  lead,
  toStage,
  source,
  changedBy,
  reason,
  metadata,
  transaction,
}) {
  if (!lead) throw new HttpError(404, 'Lead not found', 'LEAD_NOT_FOUND');
  if (!isValidStage(toStage)) throw new HttpError(400, 'Invalid stage', 'INVALID_STAGE');

  if (lead.current_stage === toStage) {
    return lead;
  }

  if (!canTransition(lead.current_stage, toStage)) {
    throw new HttpError(
      409,
      `Cannot transition from ${lead.current_stage} to ${toStage}`,
      'INVALID_TRANSITION'
    );
  }

  const fromStage = lead.current_stage;
  lead.current_stage = toStage;
  await lead.save({ transaction });

  await LeadStageHistory.create(
    {
      lead_id: lead.id,
      from_stage: fromStage,
      to_stage: toStage,
      source: source || 'system',
      changed_by: changedBy || null,
      reason: reason || null,
      metadata: metadata || null,
    },
    { transaction }
  );

  const eventType = STAGE_EVENT_TYPE[toStage];
  if (eventType) {
    await Event.create(
      {
        visitor_id: lead.visitor_id,
        session_id: lead.session_id,
        lead_id: lead.id,
        event_type: eventType,
        event_source: source || 'system',
        occurred_at: new Date(),
      },
      { transaction }
    );
  }

  logInfo('lead_stage_changed', { lead_uuid: lead.lead_uuid });
  return lead;
}

module.exports = { transitionLeadStage };
