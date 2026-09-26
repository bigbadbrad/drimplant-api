const sequelize = require('../config/connection');
const { Visitor, Session, Lead, SmileProfile, LeadStageHistory, Event, Touchpoint } = require('../models');
const { STAGES } = require('../constants/leadStages');
const { HttpError } = require('../utils/httpError');
const { logInfo } = require('../utils/logger');
const normalizePhoneNumber = require('../utils/normalizePhoneNumber');
const posthog = require('../integrations/posthog/client');
const { transitionLeadStage } = require('./leadStage.service');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function publicLead(lead, extras = {}) {
  return {
    lead_uuid: lead.lead_uuid,
    visitor_uuid: extras.visitor_uuid || null,
    session_uuid: extras.session_uuid || null,
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    preferred_language: lead.preferred_language,
    location_id: lead.location_id,
    source: lead.source,
    source_detail: lead.source_detail,
    landing_page: lead.landing_page,
    current_stage: lead.current_stage,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    ...extras.extra,
  };
}

async function findVisitorByUuid(visitorUuid) {
  if (!visitorUuid) return null;
  if (!isUuid(visitorUuid)) throw new HttpError(400, 'Invalid visitor_uuid', 'INVALID_UUID');
  return Visitor.findOne({ where: { visitor_uuid: visitorUuid } });
}

async function findSessionByUuid(sessionUuid) {
  if (!sessionUuid) return null;
  if (!isUuid(sessionUuid)) throw new HttpError(400, 'Invalid session_uuid', 'INVALID_UUID');
  return Session.findOne({ where: { session_uuid: sessionUuid } });
}

async function findLeadByUuid(leadUuid) {
  if (!isUuid(leadUuid)) throw new HttpError(400, 'Invalid lead_uuid', 'INVALID_UUID');
  const lead = await Lead.findOne({ where: { lead_uuid: leadUuid } });
  if (!lead) throw new HttpError(404, 'Lead not found', 'LEAD_NOT_FOUND');
  return lead;
}

function clip(value, max) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

function originFromPayload(payload, session) {
  const source = clip(payload.source, 32) || 'api';
  const sourceDetail = clip(payload.source_detail, 64);
  let landingPage = clip(payload.landing_page, 255);
  if (!landingPage && session?.landing_page) landingPage = clip(session.landing_page, 255);
  if (landingPage && /^https?:\/\//i.test(landingPage)) {
    try {
      landingPage = new URL(landingPage).pathname.slice(0, 255);
    } catch {
      /* keep original clipped path */
    }
  }
  return { source, source_detail: sourceDetail, landing_page: landingPage };
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

async function writeSmileProfile(lead, payload, origin, visitor, session, transaction) {
  const answers = answersFromPayload(payload);
  if (!answers) return null;
  return SmileProfile.create(
    {
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
  const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Invalid email', 'INVALID_EMAIL');
  }
  const phone = payload.phone ? normalizePhoneNumber(payload.phone) : null;
  if (phone && (phone.length < 10 || phone.length > 15)) {
    throw new HttpError(400, 'Invalid phone', 'INVALID_PHONE');
  }

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
    const lead = await Lead.create(
      {
        visitor_id: visitor ? visitor.id : session ? session.visitor_id : null,
        session_id: session ? session.id : null,
        first_name: payload.first_name || null,
        last_name: payload.last_name || null,
        email,
        phone: phone || null,
        preferred_language: payload.preferred_language || null,
        location_id: payload.location_id && isUuid(payload.location_id) ? payload.location_id : null,
        source: origin.source,
        source_detail: origin.source_detail,
        landing_page: origin.landing_page,
        current_stage: STAGES.LEAD,
      },
      { transaction }
    );

    await LeadStageHistory.create(
      {
        lead_id: lead.id,
        from_stage: null,
        to_stage: STAGES.LEAD,
        source: origin.source,
        reason: 'lead_created',
      },
      { transaction }
    );

    await writeSmileProfile(lead, payload, origin, visitor, session, transaction);

    if (session) {
      await Touchpoint.update(
        { lead_id: lead.id },
        { where: { session_id: session.id, lead_id: null }, transaction }
      );
    } else if (visitor) {
      await Touchpoint.update(
        { lead_id: lead.id },
        { where: { visitor_id: visitor.id, lead_id: null }, transaction }
      );
    }

    await Event.create(
      {
        visitor_id: lead.visitor_id,
        session_id: lead.session_id,
        lead_id: lead.id,
        event_type: 'lead_created',
        event_source: origin.source,
        occurred_at: new Date(),
      },
      { transaction }
    );

    return lead;
  });

  if (visitor) {
    posthog
      .identifyLead({ visitorUuid: visitor.visitor_uuid, leadUuid: result.lead_uuid })
      .catch(() => {});
  }

  logInfo('lead_created', { lead_uuid: result.lead_uuid, visitor_uuid: visitor?.visitor_uuid, session_uuid: session?.session_uuid });

  return publicLead(result, {
    visitor_uuid: visitor?.visitor_uuid || null,
    session_uuid: session?.session_uuid || null,
  });
}

async function getLead(leadUuid) {
  const lead = await findLeadByUuid(leadUuid);
  const visitor = lead.visitor_id ? await Visitor.findByPk(lead.visitor_id) : null;
  const session = lead.session_id ? await Session.findByPk(lead.session_id) : null;
  const profiles = await SmileProfile.findAll({
    where: { lead_id: lead.id },
    order: [['created_at', 'DESC']],
  });
  return publicLead(lead, {
    visitor_uuid: visitor?.visitor_uuid || null,
    session_uuid: session?.session_uuid || null,
    extra: {
      smile_profiles: profiles.map(publicSmileProfile),
    },
  });
}

async function patchLead(leadUuid, payload) {
  const lead = await findLeadByUuid(leadUuid);
  const next = {};
  if (payload.first_name !== undefined) next.first_name = payload.first_name;
  if (payload.last_name !== undefined) next.last_name = payload.last_name;
  if (payload.email !== undefined) {
    const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'Invalid email', 'INVALID_EMAIL');
    }
    next.email = email;
  }
  if (payload.phone !== undefined) {
    const phone = payload.phone ? normalizePhoneNumber(payload.phone) : null;
    if (phone && (phone.length < 10 || phone.length > 15)) {
      throw new HttpError(400, 'Invalid phone', 'INVALID_PHONE');
    }
    next.phone = phone;
  }
  if (payload.preferred_language !== undefined) next.preferred_language = payload.preferred_language;
  if (payload.location_id !== undefined) next.location_id = payload.location_id || null;
  await lead.update(next);
  return getLead(leadUuid);
}

async function addSmileProfile(leadUuid, payload = {}) {
  const lead = await findLeadByUuid(leadUuid);
  if (!answersFromPayload(payload)) {
    throw new HttpError(400, 'answers object is required', 'INVALID_SMILE_PROFILE');
  }
  const visitor = lead.visitor_id ? await Visitor.findByPk(lead.visitor_id) : null;
  const session = payload.session_uuid
    ? await findSessionByUuid(payload.session_uuid)
    : lead.session_id
      ? await Session.findByPk(lead.session_id)
      : null;
  const origin = originFromPayload(payload, session);
  await writeSmileProfile(lead, payload, origin, visitor, session);
  return getLead(leadUuid);
}

async function changeStage(leadUuid, payload) {
  const lead = await findLeadByUuid(leadUuid);
  await sequelize.transaction(async (transaction) => {
    await transitionLeadStage({
      lead,
      toStage: payload.to_stage,
      source: payload.source || 'api',
      changedBy: payload.changed_by || null,
      reason: payload.reason || null,
      metadata: payload.metadata || null,
      transaction,
    });
  });
  return getLead(leadUuid);
}

module.exports = {
  isUuid,
  findVisitorByUuid,
  findSessionByUuid,
  findLeadByUuid,
  publicLead,
  createLead,
  getLead,
  patchLead,
  addSmileProfile,
  changeStage,
};
