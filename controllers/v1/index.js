const router = require('express').Router();
const { asyncHandler } = require('../../utils/httpError');
const acquisition = require('../../services/acquisition.service');
const leads = require('../../services/lead.service');
const consults = require('../../services/consult.service');

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'drimplant-api' });
});

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
      id: touchpoint.id,
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

router.post('/leads/:id/stage', asyncHandler(async (req, res) => {
  const lead = await leads.changeStage(req.params.id, req.body || {});
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

router.get('/leads/:id/consults', asyncHandler(async (req, res) => {
  const rows = await consults.listConsults(req.params.id);
  res.json({ data: rows });
}));

router.post('/leads/:id/consults', asyncHandler(async (req, res) => {
  const consult = await consults.createConsult(req.params.id, req.body || {});
  res.status(201).json({ data: consult });
}));

router.patch('/consults/:id', asyncHandler(async (req, res) => {
  const consult = await consults.patchConsult(req.params.id, req.body || {});
  res.json({ data: consult });
}));

module.exports = router;
