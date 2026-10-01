const { test, before } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const BASE = process.env.API_BASE || 'http://127.0.0.1:3005';

async function json(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function adminHeaders() {
  let user = await User.findOne({ where: { email: 'jane.admin@example.com' } });
  if (!user) {
    user = await User.create({
      first_name: 'Jane',
      last_name: 'Admin',
      email: 'jane.admin@example.com',
      role: 'admin',
      status: 'active',
      password_hash: 'local-dev-only',
    });
  }
  return { Authorization: `Bearer ${jwt.sign({ id: user.id }, process.env.SECRET)}` };
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

test('contact create stores email and phone', async () => {
  const created = await json('POST', '/v1/contacts', {
    first_name: 'Maria',
    last_name: 'Example',
    email: 'maria.example@example.com',
    phone: '3055550198',
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.data.email, 'maria.example@example.com');
  assert.equal(created.data.data.phone, '3055550198');

  const patched = await json('PATCH', `/v1/contacts/${created.data.data.contact_uuid}`, {
    phone: '7865550198',
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.data.data.phone, '7865550198');
});

test('contact identity uniqueness', async () => {
  const contact = await json('POST', '/v1/contacts', { first_name: 'Id', last_name: 'One', phone: '9545550188' });
  const other = await json('POST', '/v1/contacts', { first_name: 'Id', last_name: 'Two', phone: '9545550189' });
  const added = await json('POST', `/v1/contacts/${contact.data.data.contact_uuid}/identities`, {
    identity_type: 'open_dental_pat_num',
    identity_value: 'OD-TEST-1001',
    source: 'open_dental',
  });
  assert.equal(added.status, 201);
  const conflict = await json('POST', `/v1/contacts/${other.data.data.contact_uuid}/identities`, {
    identity_type: 'open_dental_pat_num',
    identity_value: 'OD-TEST-1001',
  });
  assert.equal(conflict.status, 409);
});

test('lead creation with visitor, session, answers, and event', async () => {
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
  assert.equal(lead.data.data.engagement_status, 'new');
  assert.ok(lead.data.data.contact_uuid);
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
  assert.equal(fetched.data.data.status_history[0].to_status, 'new');
  assert.equal(fetched.data.data.contact.phone, '3055550100');
});

test('lead creation works without visitor or session', async () => {
  const lead = await json('POST', '/v1/leads', {
    first_name: 'Phone',
    last_name: 'Lead',
    phone: '7865550199',
    source: 'manual',
  });
  assert.equal(lead.status, 201);
  assert.equal(lead.data.data.engagement_status, 'new');
  assert.equal(lead.data.data.source, 'manual');
  assert.equal(lead.data.data.visitor_uuid, null);
});

test('invalid payload is rejected', async () => {
  const bad = await json('POST', '/v1/leads', { email: 'not-an-email' });
  assert.equal(bad.status, 400);
});

test('returning visitor reuses contact and creates a new lead', async () => {
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
  assert.equal(second.data.data.contact_uuid, first.data.data.contact_uuid);
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
  assert.equal(home.data.data.contact_uuid, widget1.data.data.contact_uuid);
});

test('lead engagement status is non-linear and does not follow appointment state', async () => {
  const lead = await json('POST', '/v1/leads', { first_name: 'Engage', last_name: 'Now', phone: '5615550122' });
  const leadUuid = lead.data.data.lead_uuid;
  const jump = await json('POST', `/v1/leads/${leadUuid}/status`, { engagement_status: 'in_communication' });
  assert.equal(jump.status, 200);
  assert.equal(jump.data.data.engagement_status, 'in_communication');

  const invalid = await json('POST', `/v1/leads/${leadUuid}/status`, { engagement_status: 'treatment_accepted' });
  assert.equal(invalid.status, 400);
});

test('appointments support cancel, no-show, complete, and reschedule without changing lead engagement', async () => {
  const lead = await json('POST', '/v1/leads', { first_name: 'Appt', last_name: 'Flow', phone: '9545550111' });
  const leadUuid = lead.data.data.lead_uuid;

  const a1 = await json('POST', `/v1/leads/${leadUuid}/appointments`, { scheduled_at: new Date().toISOString() });
  assert.equal(a1.status, 201);
  assert.equal(a1.data.data.status, 'scheduled');
  const afterBook = await json('GET', `/v1/leads/${leadUuid}`);
  assert.equal(afterBook.data.data.engagement_status, 'new');

  const canceled = await json('POST', `/v1/appointments/${a1.data.data.appointment_uuid}/status`, { to_status: 'canceled' });
  assert.equal(canceled.status, 200);
  assert.equal(canceled.data.data.status, 'canceled');

  const a2 = await json('POST', `/v1/leads/${leadUuid}/appointments`, { scheduled_at: new Date(Date.now() + 86400000).toISOString() });
  assert.equal(a2.status, 201);
  const noshow = await json('POST', `/v1/appointments/${a2.data.data.appointment_uuid}/status`, { to_status: 'no_show' });
  assert.equal(noshow.status, 200);

  const a3 = await json('POST', `/v1/leads/${leadUuid}/appointments`, { scheduled_at: new Date(Date.now() + 172800000).toISOString() });
  const completed = await json('POST', `/v1/appointments/${a3.data.data.appointment_uuid}/status`, { to_status: 'completed' });
  assert.equal(completed.status, 200);
  assert.equal(completed.data.data.status, 'completed');

  const stillNew = await json('GET', `/v1/leads/${leadUuid}`);
  assert.equal(stillNew.data.data.engagement_status, 'new');

  const list = await json('GET', `/v1/leads/${leadUuid}/appointments`);
  assert.equal(list.data.data.length, 3);

  const tasks = await json('GET', `/v1/tasks?lead_uuid=${leadUuid}`);
  assert.equal(tasks.status, 200);
  assert.ok(tasks.data.data.some((row) => row.task_type === 'reschedule_no_show'));
});

test('tasks can be created, completed, and canceled', async () => {
  const lead = await json('POST', '/v1/leads', { first_name: 'Task', last_name: 'Owner', phone: '3055550177' });
  const created = await json('POST', '/v1/tasks', {
    lead_uuid: lead.data.data.lead_uuid,
    title: 'Call tomorrow',
    task_type: 'follow_up',
    due_at: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(created.status, 201);
  const done = await json('PATCH', `/v1/tasks/${created.data.data.task_uuid}`, { status: 'completed' });
  assert.equal(done.status, 200);
  assert.equal(done.data.data.status, 'completed');
  const canceled = await json('POST', '/v1/tasks', {
    lead_uuid: lead.data.data.lead_uuid,
    title: 'Skip this',
  });
  const afterCancel = await json('PATCH', `/v1/tasks/${canceled.data.data.task_uuid}`, { status: 'canceled' });
  assert.equal(afterCancel.data.data.status, 'canceled');
});

test('contact activity timeline is chronological', async () => {
  const lead = await json('POST', '/v1/leads', { first_name: 'Timeline', last_name: 'Contact', phone: '3055550166' });
  const contactUuid = lead.data.data.contact_uuid;
  await json('POST', `/v1/contacts/${contactUuid}/activities`, {
    activity_type: 'note_added',
    summary: 'Called and left voicemail',
  });
  const timeline = await json('GET', `/v1/contacts/${contactUuid}/activities`);
  assert.equal(timeline.status, 200);
  assert.ok(timeline.data.data.length >= 2);
  const times = timeline.data.data.map((row) => new Date(row.occurred_at).getTime());
  const sorted = [...times].sort((a, b) => a - b);
  assert.deepEqual(times, sorted);
});

test('treatment, products, items, and financing keep separate state', async () => {
  const headers = await adminHeaders();
  const lead = await json('POST', '/v1/leads', { first_name: 'Treat', last_name: 'Ment', phone: '3055550155' });
  const leadUuid = lead.data.data.lead_uuid;
  const appt = await json('POST', `/v1/leads/${leadUuid}/appointments`, { scheduled_at: new Date().toISOString() });
  await json('POST', `/v1/appointments/${appt.data.data.appointment_uuid}/status`, { to_status: 'completed' });

  const product = await json('POST', '/v1/admin/products', {
    name: 'Test Arch PMMA',
    code: `TEST_ARCH_${Date.now()}`,
    list_price: 20000,
  }, headers);
  assert.equal(product.status, 201);

  const treatment = await json('POST', '/v1/treatments', {
    appointment_uuid: appt.data.data.appointment_uuid,
    quoted_amount: 20000,
  });
  assert.equal(treatment.status, 201);
  assert.equal(treatment.data.data.status, 'presented');

  const item = await json('POST', `/v1/treatments/${treatment.data.data.treatment_uuid}/items`, {
    product_uuid: product.data.data.product_uuid,
    quantity: 1,
  });
  assert.equal(item.status, 201);
  assert.equal(Number(item.data.data.list_price_snapshot), 20000);
  assert.equal(Number(item.data.data.unit_price), 20000);

  await json('PATCH', `/v1/admin/products/${product.data.data.product_uuid}`, { list_price: 25000 }, headers);
  const items = await json('GET', `/v1/treatments/${treatment.data.data.treatment_uuid}/items`);
  assert.equal(Number(items.data.data[0].list_price_snapshot), 20000);
  assert.equal(Number(items.data.data[0].unit_price), 20000);

  const overridden = await json('PATCH', `/v1/treatment-items/${item.data.data.id}`, { unit_price: 18000 });
  assert.equal(Number(overridden.data.data.unit_price), 18000);
  assert.equal(Number(overridden.data.data.total_price), 18000);

  const won = await json('POST', `/v1/treatments/${treatment.data.data.treatment_uuid}/status`, { to_status: 'won' });
  assert.equal(won.status, 200);
  assert.equal(won.data.data.status, 'won');

  const financing = await json('POST', `/v1/treatments/${treatment.data.data.treatment_uuid}/financing`, {
    provider: 'example-lender',
    amount_requested: 18000,
  });
  assert.equal(financing.status, 201);
  const approved = await json('POST', `/v1/financing/${financing.data.data.financing_uuid}/status`, { to_status: 'approved' });
  assert.equal(approved.status, 200);
  assert.equal(approved.data.data.status, 'approved');
  assert.equal(won.data.data.status, 'won');
});
