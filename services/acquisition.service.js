const { Visitor, Session, Touchpoint, Event } = require('../models');
const { HttpError } = require('../utils/httpError');
const { isUuid, findVisitorByUuid, findSessionByUuid, findLeadByUuid } = require('./lead.service');
const posthog = require('../integrations/posthog/client');

async function upsertVisitor(payload = {}) {
  if (payload.visitor_uuid) {
    if (!isUuid(payload.visitor_uuid)) throw new HttpError(400, 'Invalid visitor_uuid', 'INVALID_UUID');
    const existing = await Visitor.findOne({ where: { visitor_uuid: payload.visitor_uuid } });
    if (existing) {
      existing.last_seen_at = new Date();
      await existing.save();
      return existing;
    }
  }

  return Visitor.create({
    visitor_uuid: payload.visitor_uuid || undefined,
    first_seen_at: new Date(),
    last_seen_at: new Date(),
  });
}

async function createSession(payload) {
  const visitor = await findVisitorByUuid(payload.visitor_uuid);
  if (!visitor) throw new HttpError(404, 'Visitor not found', 'VISITOR_NOT_FOUND');

  const session = await Session.create({
    visitor_id: visitor.id,
    landing_page: payload.landing_page || null,
    referrer: payload.referrer || null,
    language: payload.language || null,
    user_agent: payload.user_agent || null,
    device_type: payload.device_type || null,
  });

  visitor.last_seen_at = new Date();
  await visitor.save();

  return { visitor, session };
}

async function createTouchpoint(payload) {
  const visitor = payload.visitor_uuid ? await findVisitorByUuid(payload.visitor_uuid) : null;
  if (payload.visitor_uuid && !visitor) throw new HttpError(404, 'Visitor not found', 'VISITOR_NOT_FOUND');

  const session = payload.session_uuid ? await findSessionByUuid(payload.session_uuid) : null;
  if (payload.session_uuid && !session) throw new HttpError(404, 'Session not found', 'SESSION_NOT_FOUND');

  let lead = null;
  if (payload.lead_uuid) lead = await findLeadByUuid(payload.lead_uuid);

  const occurredAt = payload.occurred_at ? new Date(payload.occurred_at) : new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new HttpError(400, 'Invalid occurred_at', 'INVALID_TIMESTAMP');

  const touchpoint = await Touchpoint.create({
    visitor_id: visitor?.id || session?.visitor_id || null,
    session_id: session?.id || null,
    lead_id: lead?.id || null,
    occurred_at: occurredAt,
    source: payload.source || null,
    medium: payload.medium || null,
    campaign: payload.campaign || null,
    campaign_id: payload.campaign_id || null,
    adset_id: payload.adset_id || null,
    ad_id: payload.ad_id || null,
    creative_id: payload.creative_id || null,
    utm_source: payload.utm_source || null,
    utm_medium: payload.utm_medium || null,
    utm_campaign: payload.utm_campaign || null,
    utm_term: payload.utm_term || null,
    utm_content: payload.utm_content || null,
    gclid: payload.gclid || null,
    gbraid: payload.gbraid || null,
    wbraid: payload.wbraid || null,
    fbclid: payload.fbclid || null,
    landing_page: payload.landing_page || null,
    landing_page_variant: payload.landing_page_variant || null,
  });

  if (session) {
    session.last_activity_at = occurredAt;
    await session.save();
  }

  return touchpoint;
}

async function createEvent(payload) {
  if (!payload.event_type || typeof payload.event_type !== 'string') {
    throw new HttpError(400, 'event_type is required', 'INVALID_EVENT');
  }

  const visitor = payload.visitor_uuid ? await findVisitorByUuid(payload.visitor_uuid) : null;
  if (payload.visitor_uuid && !visitor) throw new HttpError(404, 'Visitor not found', 'VISITOR_NOT_FOUND');

  const session = payload.session_uuid ? await findSessionByUuid(payload.session_uuid) : null;
  if (payload.session_uuid && !session) throw new HttpError(404, 'Session not found', 'SESSION_NOT_FOUND');

  let lead = null;
  if (payload.lead_uuid) lead = await findLeadByUuid(payload.lead_uuid);

  const occurredAt = payload.occurred_at ? new Date(payload.occurred_at) : new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new HttpError(400, 'Invalid occurred_at', 'INVALID_TIMESTAMP');

  const event = await Event.create({
    visitor_id: visitor?.id || session?.visitor_id || null,
    session_id: session?.id || null,
    lead_id: lead?.id || null,
    event_type: payload.event_type,
    event_source: payload.event_source || null,
    properties: payload.properties || null,
    occurred_at: occurredAt,
  });

  const distinctId = lead?.lead_uuid || visitor?.visitor_uuid;
  if (distinctId) {
    posthog
      .capture({
        distinctId,
        event: payload.event_type,
        properties: payload.properties || {},
        timestamp: occurredAt,
      })
      .catch(() => {});
  }

  return event;
}

module.exports = {
  upsertVisitor,
  createSession,
  createTouchpoint,
  createEvent,
};
