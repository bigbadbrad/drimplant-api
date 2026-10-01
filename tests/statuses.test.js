const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  LEAD_ENGAGEMENT_STATUSES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TRANSITIONS,
  TREATMENT_STATUSES,
  FINANCING_STATUSES,
} = require('../constants/statuses');

test('lead engagement statuses are separate from appointment and treatment', async () => {
  assert.ok(LEAD_ENGAGEMENT_STATUSES.includes('new'));
  assert.ok(LEAD_ENGAGEMENT_STATUSES.includes('in_communication'));
  assert.equal(LEAD_ENGAGEMENT_STATUSES.includes('scheduled'), false);
  assert.equal(LEAD_ENGAGEMENT_STATUSES.includes('won'), false);
});

test('appointment transitions allow cancel, no-show, and complete from scheduled', async () => {
  assert.deepEqual(APPOINTMENT_TRANSITIONS.scheduled, ['canceled', 'no_show', 'completed']);
  assert.ok(APPOINTMENT_STATUSES.includes('scheduled'));
});

test('treatment and financing statuses stay on their own machines', async () => {
  assert.ok(TREATMENT_STATUSES.includes('presented'));
  assert.ok(TREATMENT_STATUSES.includes('won'));
  assert.ok(FINANCING_STATUSES.includes('approved'));
  assert.equal(TREATMENT_STATUSES.includes('approved'), false);
});
