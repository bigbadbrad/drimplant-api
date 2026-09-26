const STAGES = {
  LEAD: 'lead',
  BOOKED_CONSULT: 'booked_consult',
  COMPLETED_CONSULT: 'completed_consult',
  CANCELED: 'canceled',
  NO_SHOW: 'no_show',
  TREATMENT_ACCEPTED: 'treatment_accepted',
  PROCEDURE_SCHEDULED: 'procedure_scheduled',
  PROCEDURE_COMPLETED: 'procedure_completed',
};

const STAGE_VALUES = Object.values(STAGES);

const ALLOWED_TRANSITIONS = {
  [STAGES.LEAD]: [STAGES.BOOKED_CONSULT],
  [STAGES.BOOKED_CONSULT]: [STAGES.COMPLETED_CONSULT, STAGES.CANCELED, STAGES.NO_SHOW],
  [STAGES.CANCELED]: [STAGES.BOOKED_CONSULT],
  [STAGES.NO_SHOW]: [STAGES.BOOKED_CONSULT],
  [STAGES.COMPLETED_CONSULT]: [STAGES.TREATMENT_ACCEPTED],
  [STAGES.TREATMENT_ACCEPTED]: [STAGES.PROCEDURE_SCHEDULED],
  [STAGES.PROCEDURE_SCHEDULED]: [STAGES.PROCEDURE_COMPLETED],
  [STAGES.PROCEDURE_COMPLETED]: [],
};

const STAGE_EVENT_TYPE = {
  [STAGES.LEAD]: 'lead_created',
  [STAGES.BOOKED_CONSULT]: 'consult_booked',
  [STAGES.COMPLETED_CONSULT]: 'consult_completed',
  [STAGES.CANCELED]: 'consult_canceled',
  [STAGES.NO_SHOW]: 'consult_no_show',
  [STAGES.TREATMENT_ACCEPTED]: 'treatment_accepted',
  [STAGES.PROCEDURE_SCHEDULED]: 'procedure_scheduled',
  [STAGES.PROCEDURE_COMPLETED]: 'procedure_completed',
};

const CONSULT_STATUSES = {
  SCHEDULED: 'scheduled',
  CANCELED: 'canceled',
  NO_SHOW: 'no_show',
  COMPLETED: 'completed',
};

function isValidStage(stage) {
  return STAGE_VALUES.includes(stage);
}

function canTransition(fromStage, toStage) {
  if (!isValidStage(fromStage) || !isValidStage(toStage)) return false;
  if (fromStage === toStage) return false;
  return (ALLOWED_TRANSITIONS[fromStage] || []).includes(toStage);
}

module.exports = {
  STAGES,
  STAGE_VALUES,
  ALLOWED_TRANSITIONS,
  STAGE_EVENT_TYPE,
  CONSULT_STATUSES,
  isValidStage,
  canTransition,
};
