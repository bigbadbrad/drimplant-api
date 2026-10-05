const sequelize = require('../config/connection');
const { Lead, LeadStatusHistory, SmileProfile, Touchpoint } = require('../models');
const { HttpError } = require('../utils/httpError');
const { clip } = require('../utils/fields');
const { logInfo } = require('../utils/logger');
const { LEAD_ENGAGEMENT_STATUSES } = require('../constants/statuses');
const { findVisitorByUuid, findSessionByUuid, findLeadByUuid } = require('./lookup');
const { resolveOrCreateContact, publicContact, contactAttrsFromPayload, upsertIdentity } = require('./contact.service');
const { recordActivity, recordEvent } = require('./activity.service');
const { transitionLeadStatus } = require('./status.service');

function originFromPayload(payload, session) {
  const sourceType = clip(payload.source_type || payload.source, 32) || 'api';
  const sourceDetail = clip(payload.source_detail, 64);
  let landingPage = clip(payload.landing_page, 255);
  if (!landingPage && session?.landing_page) landingPage = clip(session.landing_page, 255);
  if (landingPage && /^https?:\/\//i.test(landingPage)) {
    try {
      landingPage = new URL(landingPage).pathname.slice(0, 255);
    } catch {
      /* keep clipped path */
    }
  }
  return { source_type: sourceType, source_detail: sourceDetail, landing_page: landingPage };
}

function publicSmileProfile(row) {
  return {
    smile_profile_uuid: row.smile_profile_uuid,
    workflow_id: row.workflow_id,
    workflow_version: row.workflow_version,
    landing_page: row.landing_page,
    answers: row.answers || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function answersFromPayload(payload) {
  if (payload.answers && typeof payload.answers === 'object' && !Array.isArray(payload.answers)) {
    return payload.answers;
  }
  const rows = Array.isArray(payload.responses) ? payload.responses : [];
  if (!rows.length) return null;
  const answers = {};
  for (const row of rows) {
    if (!row || !row.question_key) continue;
    answers[row.question_key] = row.response_json != null ? row.response_json : row.response_value;
  }
  return Object.keys(answers).length ? answers : null;
}

function publicLead(lead, contact, extras = {}) {
  return {
    lead_uuid: lead.lead_uuid,
    contact_uuid: contact?.contact_uuid || extras.contact_uuid || null,
    visitor_uuid: extras.visitor_uuid || null,
    session_uuid: extras.session_uuid || null,
    first_name: contact?.first_name ?? null,
    last_name: contact?.last_name ?? null,
    email: contact?.email ?? null,
    phone: contact?.phone ?? null,
    preferred_language: contact?.preferred_language ?? null,
    source: lead.source_type,
    source_type: lead.source_type,
    source_detail: lead.source_detail,
    landing_page: lead.landing_page,
    engagement_status: lead.engagement_status,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    ...extras.extra,
  };
}

async function writeSmileProfile(lead, contact, payload, origin, visitor, session, transaction) {
  const answers = answersFromPayload(payload);
  if (!answers) return null;
  return SmileProfile.create(
    {
      contact_id: contact.id,
      lead_id: lead.id,
      visitor_id: visitor?.id || lead.visitor_id || null,
      session_id: session?.id || lead.session_id || null,
      workflow_id: origin.source_detail || payload.workflow_id || null,
      workflow_version: clip(payload.workflow_version, 32) || '1',
      landing_page: origin.landing_page || clip(payload.landing_page, 255),
      answers,
    },
    { transaction }
  );
}

async function createLead(payload) {
  const visitor = await findVisitorByUuid(payload.visitor_uuid);
  if (payload.visitor_uuid && !visitor) {
    throw new HttpError(404, 'Visitor not found', 'VISITOR_NOT_FOUND');
  }

  const session = await findSessionByUuid(payload.session_uuid);
  if (payload.session_uuid && !session) {
    throw new HttpError(404, 'Session not found', 'SESSION_NOT_FOUND');
  }
  if (visitor && session && session.visitor_id !== visitor.id) {
    throw new HttpError(400, 'Session does not belong to visitor', 'SESSION_VISITOR_MISMATCH');
  }

  const origin = originFromPayload(payload, session);

  const result = await sequelize.transaction(async (transaction) => {
    const contact = await resolveOrCreateContact(payload, { visitor, transaction });
    const lead = await Lead.create(
      {
        contact_id: contact.id,
        visitor_id: visitor ? visitor.id : session ? session.visitor_id : null,
        session_id: session ? session.id : null,
        source_type: origin.source_type,
        source_detail: origin.source_detail,
        landing_page: origin.landing_page,
        engagement_status: 'new',
      },
      { transaction }
    );

    await LeadStatusHistory.create(
      {
        lead_id: lead.id,
        from_status: null,
        to_status: 'new',
        source: origin.source_type,
        reason: 'lead_created',
        changed_at: new Date(),
      },
      { transaction }
    );

    await writeSmileProfile(lead, contact, payload, origin, visitor, session, transaction);

    const tracking = payload.tracking && typeof payload.tracking === 'object' ? payload.tracking : {};
    const posthogDistinctId = tracking.posthog_distinct_id || visitor?.visitor_uuid || null;
    if (posthogDistinctId) {
      await upsertIdentity(contact, 'posthog_distinct_id', posthogDistinctId, origin.source_type, transaction);
    }

    const touchWhere = session
      ? { session_id: session.id, lead_id: null }
      : visitor
        ? { visitor_id: visitor.id, lead_id: null }
        : null;
    if (touchWhere) {
      await Touchpoint.update(
        { lead_id: lead.id, contact_id: contact.id },
        { where: touchWhere, transaction }
      );
    }

    await recordEvent(
      {
        contact_id: contact.id,
        visitor_id: lead.visitor_id,
        session_id: lead.session_id,
        lead_id: lead.id,
        event_type: 'lead_created',
        event_source: origin.source_type,
      },
      transaction
    );
    await recordActivity(
      {
        contact_id: contact.id,
        lead_id: lead.id,
        activity_type: 'lead_created',
        summary: 'Lead created',
        details: { source_type: origin.source_type, source_detail: origin.source_detail },
      },
      transaction
    );

    return { lead, contact };
  });

  logInfo('lead_created', {
    lead_uuid: result.lead.lead_uuid,
    contact_uuid: result.contact.contact_uuid,
    visitor_uuid: visitor?.visitor_uuid,
    session_uuid: session?.session_uuid,
  });

  return publicLead(result.lead, result.contact, {
    visitor_uuid: visitor?.visitor_uuid || null,
    session_uuid: session?.session_uuid || null,
  });
}

async function getLead(leadUuid) {
  const lead = await findLeadByUuid(leadUuid);
  const contact = await lead.getContact();
  const visitor = lead.visitor_id ? await lead.getVisitor() : null;
  const session = lead.session_id ? await lead.getSession() : null;
  const profiles = await SmileProfile.findAll({
    where: { lead_id: lead.id },
    order: [['created_at', 'DESC']],
  });
  const history = await LeadStatusHistory.findAll({
    where: { lead_id: lead.id },
    order: [['changed_at', 'ASC']],
  });
  return publicLead(lead, contact, {
    visitor_uuid: visitor?.visitor_uuid || null,
    session_uuid: session?.session_uuid || null,
    extra: {
      contact: publicContact(contact),
      smile_profiles: profiles.map(publicSmileProfile),
      status_history: history.map((row) => ({
        from_status: row.from_status,
        to_status: row.to_status,
        source: row.source,
        reason: row.reason,
        changed_at: row.changed_at,
      })),
    },
  });
}

async function patchLead(leadUuid, payload) {
  const lead = await findLeadByUuid(leadUuid);
  const contact = await lead.getContact();
  const nextLead = {};
  if (payload.source_type !== undefined || payload.source !== undefined) {
    nextLead.source_type = clip(payload.source_type || payload.source, 32);
  }
  if (payload.source_detail !== undefined) nextLead.source_detail = clip(payload.source_detail, 64);
  if (payload.landing_page !== undefined) nextLead.landing_page = clip(payload.landing_page, 255);
  if (Object.keys(nextLead).length) await lead.update(nextLead);

  const personPatch = {};
  for (const key of ['first_name', 'last_name', 'email', 'phone', 'preferred_language', 'date_of_birth', 'location_id', 'primary_location_id']) {
    if (payload[key] !== undefined) personPatch[key] = payload[key];
  }
  if (Object.keys(personPatch).length) {
    await contact.update(contactAttrsFromPayload(personPatch));
  }
  return getLead(leadUuid);
}

async function addSmileProfile(leadUuid, payload = {}) {
  const lead = await findLeadByUuid(leadUuid);
  if (!answersFromPayload(payload)) {
    throw new HttpError(400, 'answers object is required', 'INVALID_SMILE_PROFILE');
  }
  const contact = await lead.getContact();
  const visitor = lead.visitor_id ? await lead.getVisitor() : null;
  const session = payload.session_uuid
    ? await findSessionByUuid(payload.session_uuid)
    : lead.session_id
      ? await lead.getSession()
      : null;
  const origin = originFromPayload(payload, session);
  await writeSmileProfile(lead, contact, payload, origin, visitor, session);
  return getLead(leadUuid);
}

async function changeStatus(leadUuid, payload) {
  const lead = await findLeadByUuid(leadUuid);
  const toStatus = payload.engagement_status || payload.to_status;
  if (!LEAD_ENGAGEMENT_STATUSES.includes(toStatus)) {
    throw new HttpError(400, 'Invalid engagement_status', 'INVALID_STATUS');
  }
  await transitionLeadStatus({
    lead,
    toStatus,
    source: payload.source || 'api',
    changedByUserId: payload.changed_by_user_id || null,
    reason: payload.reason || null,
    metadata: payload.metadata || null,
  });
  return getLead(leadUuid);
}

module.exports = {
  publicLead,
  createLead,
  getLead,
  patchLead,
  addSmileProfile,
  changeStatus,
};
