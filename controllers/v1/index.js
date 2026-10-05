const router = require('express').Router();
const { asyncHandler } = require('../../utils/httpError');
const { requireInternalAdmin, authenticateToken } = require('../../middleware/auth.middleware');
const auth = require('../../services/auth.service');
const acquisition = require('../../services/acquisition.service');
const contacts = require('../../services/contact.service');
const leads = require('../../services/lead.service');
const appointments = require('../../services/appointment.service');
const tasks = require('../../services/task.service');
const treatments = require('../../services/treatment.service');
const comms = require('../../services/comms.service');

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'drimplant-api' });
});

router.post('/auth/login', asyncHandler(async (req, res) => {
  const result = await auth.login(req.body || {});
  res.json({ data: result });
}));

router.get('/auth/me', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ data: auth.toPublicUser(req.user) });
}));

router.post('/visitors', asyncHandler(async (req, res) => {
  const visitor = await acquisition.upsertVisitor(req.body || {});
  res.status(201).json({
    data: {
      visitor_uuid: visitor.visitor_uuid,
      first_seen_at: visitor.first_seen_at,
      last_seen_at: visitor.last_seen_at,
    },
  });
}));

router.get('/visitors', authenticateToken, asyncHandler(async (req, res) => {
  const rows = await acquisition.listVisitors(req.query || {});
  res.json({ data: rows });
}));

router.get('/visitors/:id/activities', authenticateToken, asyncHandler(async (req, res) => {
  const result = await acquisition.getVisitorActivity(req.params.id);
  res.json({ data: result.events });
}));

router.get('/visitors/:id', authenticateToken, asyncHandler(async (req, res) => {
  const row = await acquisition.getVisitor(req.params.id);
  res.json({ data: row });
}));

router.post('/sessions', asyncHandler(async (req, res) => {
  const { visitor, session } = await acquisition.createSession(req.body || {});
  res.status(201).json({
    data: {
      visitor_uuid: visitor.visitor_uuid,
      session_uuid: session.session_uuid,
      started_at: session.started_at,
      landing_page: session.landing_page,
    },
  });
}));

router.post('/touchpoints', asyncHandler(async (req, res) => {
  const touchpoint = await acquisition.createTouchpoint(req.body || {});
  res.status(201).json({
    data: {
      touchpoint_uuid: touchpoint.touchpoint_uuid,
      occurred_at: touchpoint.occurred_at,
      source: touchpoint.source,
      medium: touchpoint.medium,
      campaign: touchpoint.campaign,
    },
  });
}));

router.post('/events', asyncHandler(async (req, res) => {
  const event = await acquisition.createEvent(req.body || {});
  res.status(201).json({
    data: {
      event_uuid: event.event_uuid,
      event_type: event.event_type,
      occurred_at: event.occurred_at,
    },
  });
}));

router.post('/contacts', asyncHandler(async (req, res) => {
  const contact = await contacts.createContact(req.body || {});
  res.status(201).json({ data: contact });
}));

router.get('/contacts/:id', asyncHandler(async (req, res) => {
  const contact = await contacts.getContact(req.params.id);
  res.json({ data: contact });
}));

router.patch('/contacts/:id', asyncHandler(async (req, res) => {
  const contact = await contacts.patchContact(req.params.id, req.body || {});
  res.json({ data: contact });
}));

router.post('/contacts/:id/identities', asyncHandler(async (req, res) => {
  const identity = await contacts.addIdentity(req.params.id, req.body || {});
  res.status(201).json({ data: identity });
}));

router.get('/contacts/:id/activities', asyncHandler(async (req, res) => {
  const rows = await contacts.listActivities(req.params.id);
  res.json({ data: rows });
}));

router.post('/contacts/:id/activities', asyncHandler(async (req, res) => {
  const row = await contacts.createActivity(req.params.id, req.body || {});
  res.status(201).json({ data: row });
}));

router.post('/leads', asyncHandler(async (req, res) => {
  const lead = await leads.createLead(req.body || {});
  res.status(201).json({ data: lead });
}));

router.get('/leads/:id', asyncHandler(async (req, res) => {
  const lead = await leads.getLead(req.params.id);
  res.json({ data: lead });
}));

router.patch('/leads/:id', asyncHandler(async (req, res) => {
  const lead = await leads.patchLead(req.params.id, req.body || {});
  res.json({ data: lead });
}));

router.post('/leads/:id/status', asyncHandler(async (req, res) => {
  const lead = await leads.changeStatus(req.params.id, req.body || {});
  res.json({ data: lead });
}));

router.post('/leads/:id/smile-profiles', asyncHandler(async (req, res) => {
  const lead = await leads.addSmileProfile(req.params.id, req.body || {});
  res.status(201).json({ data: lead });
}));

router.post('/leads/:id/responses', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const payload = body.answers || body.responses ? body : { answers: body };
  const lead = await leads.addSmileProfile(req.params.id, payload);
  res.json({ data: lead });
}));

router.get('/leads/:id/appointments', asyncHandler(async (req, res) => {
  const rows = await appointments.listAppointments(req.params.id);
  res.json({ data: rows });
}));

router.post('/leads/:id/appointments', asyncHandler(async (req, res) => {
  const appointment = await appointments.createAppointment(req.params.id, req.body || {});
  res.status(201).json({ data: appointment });
}));

router.get('/appointments/:id', asyncHandler(async (req, res) => {
  const appointment = await appointments.getAppointment(req.params.id);
  res.json({ data: appointment });
}));

router.patch('/appointments/:id', asyncHandler(async (req, res) => {
  const appointment = await appointments.patchAppointment(req.params.id, req.body || {});
  res.json({ data: appointment });
}));

router.post('/appointments/:id/status', asyncHandler(async (req, res) => {
  const appointment = await appointments.changeAppointmentStatus(req.params.id, req.body || {});
  res.json({ data: appointment });
}));

router.get('/tasks', asyncHandler(async (req, res) => {
  const rows = await tasks.listTasks(req.query || {});
  res.json({ data: rows });
}));

router.post('/tasks', asyncHandler(async (req, res) => {
  const task = await tasks.createTask(req.body || {});
  res.status(201).json({ data: task });
}));

router.patch('/tasks/:id', asyncHandler(async (req, res) => {
  const task = await tasks.patchTask(req.params.id, req.body || {});
  res.json({ data: task });
}));

router.post('/conversations', asyncHandler(async (req, res) => {
  const conversation = await comms.createConversation(req.body || {});
  res.status(201).json({ data: conversation });
}));

router.get('/conversations/:id', asyncHandler(async (req, res) => {
  const conversation = await comms.getConversation(req.params.id);
  res.json({ data: conversation });
}));

router.post('/conversations/:id/messages', asyncHandler(async (req, res) => {
  const message = await comms.addMessage(req.params.id, req.body || {});
  res.status(201).json({ data: message });
}));

router.post('/calls', asyncHandler(async (req, res) => {
  const call = await comms.createCall(req.body || {});
  res.status(201).json({ data: call });
}));

router.get('/calls/:id', asyncHandler(async (req, res) => {
  const call = await comms.getCall(req.params.id);
  res.json({ data: call });
}));

router.patch('/calls/:id', asyncHandler(async (req, res) => {
  const call = await comms.patchCall(req.params.id, req.body || {});
  res.json({ data: call });
}));

router.post('/treatments', asyncHandler(async (req, res) => {
  const treatment = await treatments.createTreatment(req.body || {});
  res.status(201).json({ data: treatment });
}));

router.get('/treatments/:id', asyncHandler(async (req, res) => {
  const treatment = await treatments.getTreatment(req.params.id);
  res.json({ data: treatment });
}));

router.patch('/treatments/:id', asyncHandler(async (req, res) => {
  const treatment = await treatments.patchTreatment(req.params.id, req.body || {});
  res.json({ data: treatment });
}));

router.post('/treatments/:id/status', asyncHandler(async (req, res) => {
  const treatment = await treatments.changeTreatmentStatus(req.params.id, req.body || {});
  res.json({ data: treatment });
}));

router.get('/treatments/:id/items', asyncHandler(async (req, res) => {
  const items = await treatments.listItems(req.params.id);
  res.json({ data: items });
}));

router.post('/treatments/:id/items', asyncHandler(async (req, res) => {
  const item = await treatments.addItem(req.params.id, req.body || {});
  res.status(201).json({ data: item });
}));

router.patch('/treatment-items/:id', asyncHandler(async (req, res) => {
  const item = await treatments.patchItem(req.params.id, req.body || {});
  res.json({ data: item });
}));

router.delete('/treatment-items/:id', asyncHandler(async (req, res) => {
  const result = await treatments.deleteItem(req.params.id);
  res.json({ data: result });
}));

router.post('/treatments/:id/financing', asyncHandler(async (req, res) => {
  const financing = await treatments.createFinancing(req.params.id, req.body || {});
  res.status(201).json({ data: financing });
}));

router.patch('/financing/:id', asyncHandler(async (req, res) => {
  const financing = await treatments.patchFinancing(req.params.id, req.body || {});
  res.json({ data: financing });
}));

router.post('/financing/:id/status', asyncHandler(async (req, res) => {
  const financing = await treatments.changeFinancingStatus(req.params.id, req.body || {});
  res.json({ data: financing });
}));

router.get('/admin/products', requireInternalAdmin, asyncHandler(async (req, res) => {
  const products = await treatments.listProducts();
  res.json({ data: products });
}));

router.post('/admin/products', requireInternalAdmin, asyncHandler(async (req, res) => {
  const product = await treatments.createProduct(req.body || {}, req.user);
  res.status(201).json({ data: product });
}));

router.get('/admin/products/:id', requireInternalAdmin, asyncHandler(async (req, res) => {
  const product = await treatments.getProduct(req.params.id);
  res.json({ data: product });
}));

router.patch('/admin/products/:id', requireInternalAdmin, asyncHandler(async (req, res) => {
  const product = await treatments.patchProduct(req.params.id, req.body || {}, req.user);
  res.json({ data: product });
}));

module.exports = router;
