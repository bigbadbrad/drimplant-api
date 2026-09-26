const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canTransition, STAGES, isValidStage } = require('../constants/leadStages');

test('canonical stages exist', () => {
  assert.equal(STAGES.LEAD, 'lead');
  assert.ok(isValidStage('booked_consult'));
  assert.equal(isValidStage('qualified'), false);
});

test('allowed lifecycle transitions', () => {
  assert.equal(canTransition(STAGES.LEAD, STAGES.BOOKED_CONSULT), true);
  assert.equal(canTransition(STAGES.BOOKED_CONSULT, STAGES.COMPLETED_CONSULT), true);
  assert.equal(canTransition(STAGES.BOOKED_CONSULT, STAGES.CANCELED), true);
  assert.equal(canTransition(STAGES.BOOKED_CONSULT, STAGES.NO_SHOW), true);
  assert.equal(canTransition(STAGES.CANCELED, STAGES.BOOKED_CONSULT), true);
  assert.equal(canTransition(STAGES.NO_SHOW, STAGES.BOOKED_CONSULT), true);
  assert.equal(canTransition(STAGES.COMPLETED_CONSULT, STAGES.TREATMENT_ACCEPTED), true);
  assert.equal(canTransition(STAGES.TREATMENT_ACCEPTED, STAGES.PROCEDURE_SCHEDULED), true);
  assert.equal(canTransition(STAGES.PROCEDURE_SCHEDULED, STAGES.PROCEDURE_COMPLETED), true);
});

test('invalid lifecycle transitions are rejected', () => {
  assert.equal(canTransition(STAGES.LEAD, STAGES.COMPLETED_CONSULT), false);
  assert.equal(canTransition(STAGES.LEAD, STAGES.TREATMENT_ACCEPTED), false);
  assert.equal(canTransition(STAGES.PROCEDURE_COMPLETED, STAGES.LEAD), false);
  assert.equal(canTransition(STAGES.CANCELED, STAGES.COMPLETED_CONSULT), false);
});
