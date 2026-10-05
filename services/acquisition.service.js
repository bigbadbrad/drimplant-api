const sequelize = require('../config/connection');
const { Visitor, Session, Touchpoint, Event, Lead, Contact, ContactIdentity } = require('../models');
const { HttpError } = require('../utils/httpError');
const { findVisitorByUuid, findSessionByUuid, findLeadByUuid, isUuid } = require('./lookup');
const { friendlyEventDisplay, isUsefulEvent, collapseEvents, pageTitle, widgetCta } = require('../utils/visitorEvents');

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
    contact_id: lead?.contact_id || null,
    visitor_id: visitor?.id || session?.visitor_id || null,
    session_id: session?.id || null,
    lead_id: lead?.id || null,
    occurred_at: occurredAt,
    channel: payload.channel || null,
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
    metadata: payload.metadata || null,
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

  let visitor = payload.visitor_uuid ? await findVisitorByUuid(payload.visitor_uuid) : null;
  if (payload.visitor_uuid && !visitor) {
    visitor = await upsertVisitor({ visitor_uuid: payload.visitor_uuid });
  }

  const session = payload.session_uuid ? await findSessionByUuid(payload.session_uuid) : null;

  let lead = null;
  if (payload.lead_uuid) lead = await findLeadByUuid(payload.lead_uuid);

  const occurredAt = payload.occurred_at ? new Date(payload.occurred_at) : new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new HttpError(400, 'Invalid occurred_at', 'INVALID_TIMESTAMP');

  const event = await Event.create({
    contact_id: lead?.contact_id || null,
    visitor_id: visitor?.id || session?.visitor_id || null,
    session_id: session?.id || null,
    lead_id: lead?.id || null,
    event_type: payload.event_type,
    event_source: payload.event_source || null,
    properties: payload.properties || null,
    occurred_at: occurredAt,
  });

  if (visitor) {
    visitor.last_seen_at = occurredAt;
    await visitor.save();
  }

  return event;
}

function displayName(contact) {
  if (!contact) return 'Anonymous visitor';
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();
  return name || contact.email || contact.phone || 'Anonymous visitor';
}

function visitorStatus(contact, lead) {
  if (lead) return 'converted';
  if (contact && (contact.email || contact.phone)) return 'identified';
  return 'browsing';
}

function publicVisitor(visitor, extras = {}) {
  const sessions = extras.sessions || [];
  const touchpoints = extras.touchpoints || [];
  const lead = extras.lead || null;
  const contact = extras.contact || lead?.contact || null;
  const latestSession = sessions[0] || null;
  const firstTouch = touchpoints[0] || null;
  return {
    visitor_uuid: visitor.visitor_uuid,
    display_name: displayName(contact),
    email: contact?.email || null,
    phone: contact?.phone || null,
    location: null,
    landing_page: firstTouch?.landing_page || latestSession?.landing_page || null,
    last_page: extras.last_page || latestSession?.landing_page || firstTouch?.landing_page || null,
    source: firstTouch?.utm_source || firstTouch?.source || latestSession?.referrer || 'direct',
    source_detail: firstTouch?.utm_campaign || firstTouch?.campaign || firstTouch?.medium || null,
    last_seen_at: visitor.last_seen_at,
    first_seen_at: visitor.first_seen_at,
    page_views: extras.page_views ?? sessions.length,
    device: latestSession?.device_type || null,
    status: visitorStatus(contact, lead),
    lead_uuid: lead?.lead_uuid || null,
    contact_uuid: contact?.contact_uuid || null,
  };
}

async function listVisitors(query = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 200);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);

  const visitors = await Visitor.findAll({
    include: [
      {
        model: Session,
        as: 'sessions',
        separate: true,
        limit: 5,
        order: [['last_activity_at', 'DESC']],
      },
      {
        model: Touchpoint,
        as: 'touchpoints',
        separate: true,
        limit: 5,
        order: [['occurred_at', 'ASC']],
      },
      {
        model: Lead,
        as: 'leads',
        separate: true,
        limit: 1,
        order: [['created_at', 'DESC']],
        include: [{ model: Contact, as: 'contact' }],
      },
    ],
    order: [['last_seen_at', 'DESC']],
    limit,
    offset,
  });

  const visitorIds = visitors.map((row) => row.id);
  const uuids = visitors.map((row) => row.visitor_uuid);
  const identities = uuids.length
    ? await ContactIdentity.findAll({
        where: {
          identity_type: ['visitor_uuid', 'posthog_distinct_id'],
          identity_value: uuids,
        },
        include: [{ model: Contact, as: 'contact' }],
      })
    : [];
  const contactByVisitor = new Map();
  for (const identity of identities) {
    if (!contactByVisitor.has(identity.identity_value) && identity.contact) {
      contactByVisitor.set(identity.identity_value, identity.contact);
    }
  }

  const sessionCounts = visitorIds.length
    ? await Session.findAll({
        attributes: ['visitor_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        where: { visitor_id: visitorIds },
        group: ['visitor_id'],
        raw: true,
      })
    : [];
  const countByVisitor = new Map(sessionCounts.map((row) => [row.visitor_id, Number(row.cnt) || 0]));

  const rows = visitors.map((visitor) => {
    const lead = visitor.leads?.[0] || null;
    const contact = contactByVisitor.get(visitor.visitor_uuid) || lead?.contact || null;
    return publicVisitor(visitor, {
      sessions: visitor.sessions || [],
      touchpoints: visitor.touchpoints || [],
      lead,
      contact,
      page_views: countByVisitor.get(visitor.id) || (visitor.sessions || []).length,
    });
  });

  const stats = await visitorPageStats(visitorIds);
  return rows.map((row, index) => {
    const match = stats.get(visitors[index].id);
    if (!match) return row;
    return {
      ...row,
      page_views: match.pageCount || row.page_views,
      last_page: match.lastPage || row.last_page,
    };
  });
}

async function visitorPageStats(visitorIds) {
  const stats = new Map();
  if (!visitorIds.length) return stats;
  const events = await Event.findAll({
    where: { visitor_id: visitorIds, event_type: 'content_viewed' },
    attributes: ['visitor_id', 'properties', 'occurred_at'],
    order: [['occurred_at', 'DESC']],
  });
  for (const ev of events) {
    const current = stats.get(ev.visitor_id) || { pageCount: 0, lastPage: null };
    current.pageCount += 1;
    if (!current.lastPage) {
    const props = eventProperties(ev);
      current.lastPage = props.path || null;
    }
    stats.set(ev.visitor_id, current);
  }
  return stats;
}

async function getVisitor(visitorUuid) {
  const visitor = await findVisitorByUuid(visitorUuid);
  if (!visitor) throw new HttpError(404, 'Visitor not found', 'VISITOR_NOT_FOUND');
  const rows = await listVisitors({ limit: 200 });
  return rows.find((item) => item.visitor_uuid === visitorUuid) || publicVisitor(visitor);
}

function eventProperties(row) {
  const props = row.properties;
  if (!props) return {};
  if (typeof props === 'string') {
    try {
      return JSON.parse(props);
    } catch {
      return {};
    }
  }
  return typeof props === 'object' ? props : {};
}

async function getVisitorActivity(visitorUuid) {
  const visitorRow = await findVisitorByUuid(visitorUuid);
  if (!visitorRow) throw new HttpError(404, 'Visitor not found', 'VISITOR_NOT_FOUND');
  const visitor = await getVisitor(visitorUuid);
  const rows = await Event.findAll({
    where: {
      visitor_id: visitorRow.id,
      event_type: [
        'content_viewed',
        'video_played',
        'widget_opened',
        'widget_step_viewed',
        'widget_closed',
        'widget_completed',
        'lead_created',
      ],
    },
    order: [['occurred_at', 'ASC']],
    limit: 500,
  });
  const mapped = rows.map((row) => {
    const props = eventProperties(row);
    const path = props.path || null;
    const item = {
      event: row.event_type,
      timestamp: row.occurred_at,
      path,
      page_title: props.page_title || pageTitle(path),
      video_title: props.video_title || '',
      workflow: props.workflow || '',
      widget_name: props.widget_name || '',
      cta: widgetCta({ workflow: props.workflow }),
      step_id: props.step_id || '',
      step_title: props.step_title || '',
      step_label: props.step_label || '',
      step_index: props.step_index || '',
      identity: 'anonymous',
    };
    item.event_display = friendlyEventDisplay(item);
    return item;
  });
  const events = collapseEvents(mapped.filter(isUsefulEvent));
  return {
    visitor,
    events,
  };
}

module.exports = {
  upsertVisitor,
  createSession,
  createTouchpoint,
  createEvent,
  listVisitors,
  getVisitor,
  getVisitorActivity,
};
