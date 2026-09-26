const { test, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.API_BASE || 'http://127.0.0.1:3005';

async function json(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

before(async () => {
  const health = await fetch(`${BASE}/health`).catch(() => null);
  if (!health || !health.ok) {
    throw new Error(`API is not running at ${BASE}. Start it with npm run dev first.`);
  }
});

test('health', async () => {
  const { status, data } = await json('GET', '/health');
  assert.equal(status, 200);
  assert.equal(data.service, 'drimplant-api');
});

test('visitor persists across sessions', async () => {
  const created = await json('POST', '/v1/visitors', {});
  assert.equal(created.status, 201);
  const visitorUuid = created.data.data.visitor_uuid;

  const again = await json('POST', '/v1/visitors', { visitor_uuid: visitorUuid });
  assert.equal(again.status, 201);
  assert.equal(again.data.data.visitor_uuid, visitorUuid);

  const s1 = await json('POST', '/v1/sessions', { visitor_uuid: visitorUuid, landing_page: '/en/' });
  const s2 = await json('POST', '/v1/sessions', { visitor_uuid: visitorUuid, landing_page: '/es/' });
  assert.equal(s1.status, 201);
  assert.equal(s2.status, 201);
  assert.notEqual(s1.data.data.session_uuid, s2.data.data.session_uuid);
});

test('lead creation with visitor, session, responses, and event', async () => {
  const visitor = await json('POST', '/v1/visitors', {});
  const visitorUuid = visitor.data.data.visitor_uuid;
  const session = await json('POST', '/v1/sessions', { visitor_uuid: visitorUuid });
  const sessionUuid = session.data.data.session_uuid;

  await json('POST', '/v1/touchpoints', {
    visitor_uuid: visitorUuid,
    session_uuid: sessionUuid,
    utm_source: 'meta',
    fbclid: 'abc123',
  });

  await json('POST', '/v1/events', {
    visitor_uuid: visitorUuid,
    session_uuid: sessionUuid,
    event_type: 'widget_completed',
    event_source: 'widget',
    properties: { step: 8 },
  });

  const lead = await json('POST', '/v1/leads', {
    visitor_uuid: visitorUuid,
    session_uuid: sessionUuid,
    first_name: 'Test',
    last_name: 'Patient',
    email: 'test.patient@example.com',
    phone: '3055550100',
    source: 'widget',
    source_detail: 'widget1',
    landing_page: '/widget1/',
    answers: { implant_interest: 'full_arch', situation: 'most_or_all' },
  });

  assert.equal(lead.status, 201);
  assert.equal(lead.data.data.current_stage, 'lead');
  assert.equal(lead.data.data.visitor_uuid, visitorUuid);
  assert.equal(lead.data.data.session_uuid, sessionUuid);
  assert.equal(lead.data.data.source, 'widget');
  assert.equal(lead.data.data.source_detail, 'widget1');
  assert.equal(lead.data.data.landing_page, '/widget1/');
  assert.ok(lead.data.data.lead_uuid);

  const fetched = await json('GET', `/v1/leads/${lead.data.data.lead_uuid}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.data.data.smile_profiles[0].workflow_id, 'widget1');
  assert.equal(fetched.data.data.smile_profiles[0].answers.implant_interest, 'full_arch');
});

test('lead creation works without visitor or session', async () => {
  const lead = await json('POST', '/v1/leads', {
    first_name: 'Phone',
    last_name: 'Lead',
    phone: '7865550199',
    source: 'manual',
  });
  assert.equal(lead.status, 201);
  assert.equal(lead.data.data.current_stage, 'lead');
  assert.equal(lead.data.data.source, 'manual');
  assert.equal(lead.data.data.visitor_uuid, null);
});

test('invalid payload is rejected', async () => {
  const bad = await json('POST', '/v1/leads', { email: 'not-an-email' });
  assert.equal(bad.status, 400);
});

test('returning visitor can submit another lead', async () => {
  const visitor = await json('POST', '/v1/visitors', {});
  const visitorUuid = visitor.data.data.visitor_uuid;
  const session = await json('POST', '/v1/sessions', { visitor_uuid: visitorUuid });
  const first = await json('POST', '/v1/leads', {
    visitor_uuid: visitorUuid,
    session_uuid: session.data.data.session_uuid,
    first_name: 'Returning',
    phone: '4075550133',
  });
  assert.equal(first.status, 201);

  const laterSession = await json('POST', '/v1/sessions', { visitor_uuid: visitorUuid });
  const second = await json('POST', '/v1/leads', {
    visitor_uuid: visitorUuid,
    session_uuid: laterSession.data.data.session_uuid,
    first_name: 'Returning',
    phone: '4075550133',
    source: 'widget',
    source_detail: 'widget1',
  });
  assert.equal(second.status, 201);
  assert.notEqual(second.data.data.lead_uuid, first.data.data.lead_uuid);
});

test('same visitor can create leads for different widgets', async () => {
  const visitor = await json('POST', '/v1/visitors', {});
  const visitorUuid = visitor.data.data.visitor_uuid;
  const session = await json('POST', '/v1/sessions', { visitor_uuid: visitorUuid, landing_page: '/widget1/' });
  const widget1 = await json('POST', '/v1/leads', {
    visitor_uuid: visitorUuid,
    session_uuid: session.data.data.session_uuid,
    first_name: 'Widget',
    last_name: 'One',
    phone: '3055550144',
    source: 'widget',
    source_detail: 'widget1',
    landing_page: '/widget1/',
    answers: { situation: 'most_or_all', motivation: 'confident' },
  });
  assert.equal(widget1.status, 201);

  const homeSession = await json('POST', '/v1/sessions', { visitor_uuid: visitorUuid, landing_page: '/' });
  const home = await json('POST', '/v1/leads', {
    visitor_uuid: visitorUuid,
    session_uuid: homeSession.data.data.session_uuid,
    first_name: 'Home',
    last_name: 'Page',
    phone: '3055550144',
    source: 'widget',
    source_detail: 'dr-implant',
    landing_page: '/',
    answers: { condition: 'one_tooth', locations: ['miami'] },
  });
  assert.equal(home.status, 201);
  assert.equal(home.data.data.source_detail, 'dr-implant');
  assert.notEqual(home.data.data.lead_uuid, widget1.data.data.lead_uuid);
});

test('consults move lead lifecycle and support rebooking', async () => {
  const lead = await json('POST', '/v1/leads', { first_name: 'Consult', last_name: 'Flow', phone: '9545550111' });
  const leadUuid = lead.data.data.lead_uuid;

  const c1 = await json('POST', `/v1/leads/${leadUuid}/consults`, { scheduled_at: new Date().toISOString() });
  assert.equal(c1.status, 201);
  const afterBook = await json('GET', `/v1/leads/${leadUuid}`);
  assert.equal(afterBook.data.data.current_stage, 'booked_consult');

  const canceled = await json('PATCH', `/v1/consults/${c1.data.data.consult_uuid}`, { status: 'canceled' });
  assert.equal(canceled.status, 200);
  const afterCancel = await json('GET', `/v1/leads/${leadUuid}`);
  assert.equal(afterCancel.data.data.current_stage, 'canceled');

  const c2 = await json('POST', `/v1/leads/${leadUuid}/consults`, { scheduled_at: new Date(Date.now() + 86400000).toISOString() });
  assert.equal(c2.status, 201);
  const noshow = await json('PATCH', `/v1/consults/${c2.data.data.consult_uuid}`, { status: 'no_show' });
  assert.equal(noshow.status, 200);

  const c3 = await json('POST', `/v1/leads/${leadUuid}/consults`, { scheduled_at: new Date(Date.now() + 172800000).toISOString() });
  const completed = await json('PATCH', `/v1/consults/${c3.data.data.consult_uuid}`, { status: 'completed' });
  assert.equal(completed.status, 200);
  const afterDone = await json('GET', `/v1/leads/${leadUuid}`);
  assert.equal(afterDone.data.data.current_stage, 'completed_consult');

  const list = await json('GET', `/v1/leads/${leadUuid}/consults`);
  assert.equal(list.data.data.length, 3);
});

test('invalid stage transition is rejected', async () => {
  const lead = await json('POST', '/v1/leads', { first_name: 'Bad', last_name: 'Jump', phone: '5615550122' });
  const jump = await json('POST', `/v1/leads/${lead.data.data.lead_uuid}/stage`, { to_stage: 'treatment_accepted' });
  assert.equal(jump.status, 409);
});
