const sequelize = require('../config/connection');
const { Lead, LeadStatusHistory, SmileProfile, Touchpoint, Contact, ContactIdentity, User } = require('../models');
const { HttpError } = require('../utils/httpError');
const { clip } = require('../utils/fields');
const { logInfo } = require('../utils/logger');
const { LEAD_ENGAGEMENT_STATUSES } = require('../constants/statuses');
const { findVisitorByUuid, findSessionByUuid, findLeadByUuid } = require('./lookup');
const { resolveOrCreateContact, publicContact, contactAttrsFromPayload, applyAddressAttrs, setIdentity, upsertIdentity } = require('./contact.service');
const { recordActivity, recordEvent } = require('./activity.service');
const { transitionLeadStatus } = require('./status.service');
const { findDefaultLeadOwner, publicOwner, requireAssignableOwner } = require('./user.service');

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
    address: contact?.address ?? null,
    street: contact?.street ?? null,
    city: contact?.city ?? null,
    state: contact?.state ?? null,
    postal_code: contact?.postal_code ?? null,
    open_dental_pat_num:
      extras.extra?.open_dental_pat_num ??
      (contact?.identities || []).find((row) => row.identity_type === 'open_dental_pat_num')?.identity_value ??
      null,
    best_time_to_call: contact?.best_time_to_call ?? null,
    do_not_call: Boolean(contact?.do_not_call),
    owner_user_id: extras.owner?.id || lead.owner_user_id || null,
    owner: extras.owner ? publicOwner(extras.owner) : extras.extra?.owner || null,
    location: lead.location || null,
    service_interest: lead.service_interest || null,
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
  const owner = payload.owner_user_id
    ? await requireAssignableOwner(payload.owner_user_id)
    : await findDefaultLeadOwner();

  const result = await sequelize.transaction(async (transaction) => {
    const contact = await resolveOrCreateContact(payload, { visitor, transaction });
    const lead = await Lead.create(
      {
        contact_id: contact.id,
        visitor_id: visitor ? visitor.id : session ? session.visitor_id : null,
        session_id: session ? session.id : null,
        owner_user_id: owner?.id || null,
        location: clip(payload.location, 64) || null,
        service_interest: clip(payload.service_interest, 64) || null,
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
    owner,
  });
}

async function listLeads(query = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 200);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const rows = await Lead.findAll({
    include: [
      { model: Contact, as: 'contact', include: [{ model: ContactIdentity, as: 'identities' }] },
      { model: User, as: 'owner' },
      {
        model: SmileProfile,
        as: 'smileProfiles',
        separate: true,
        limit: 1,
        order: [['created_at', 'DESC']],
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
  const defaultOwner = await findDefaultLeadOwner();
  return rows.map((lead) =>
    publicLead(lead, lead.contact, {
      owner: lead.owner || defaultOwner,
      extra: { smile_profiles: (lead.smileProfiles || []).map(publicSmileProfile) },
    })
  );
}

async function getLead(leadUuid) {
  const lead = await findLeadByUuid(leadUuid);
  const contact = await lead.getContact({ include: [{ model: ContactIdentity, as: 'identities' }] });
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
  const identities = contact?.identities || [];
  const owner = lead.owner_user_id ? await User.findByPk(lead.owner_user_id) : null;
  return publicLead(lead, contact, {
    visitor_uuid: visitor?.visitor_uuid || null,
    session_uuid: session?.session_uuid || null,
    owner: owner || (await findDefaultLeadOwner()),
    extra: {
      open_dental_pat_num: identities.find((row) => row.identity_type === 'open_dental_pat_num')?.identity_value || null,
      contact: publicContact(contact, { identities: identities.map((row) => ({ identity_type: row.identity_type, identity_value: row.identity_value })) }),
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
  if (payload.owner_user_id !== undefined) {
    const owner = await requireAssignableOwner(payload.owner_user_id);
    nextLead.owner_user_id = owner?.id || null;
  }
  if (payload.location !== undefined) nextLead.location = clip(payload.location, 64) || null;
  if (payload.service_interest !== undefined) nextLead.service_interest = clip(payload.service_interest, 64) || null;
  if (Object.keys(nextLead).length) await lead.update(nextLead);

  const personPatch = {};
  for (const key of ['first_name', 'last_name', 'email', 'phone', 'preferred_language', 'address', 'street', 'city', 'state', 'postal_code', 'best_time_to_call', 'do_not_call', 'date_of_birth', 'location_id', 'primary_location_id']) {
    if (payload[key] !== undefined) personPatch[key] = payload[key];
  }
  if (Object.keys(personPatch).length) {
    await contact.update(applyAddressAttrs(contact, contactAttrsFromPayload(personPatch)));
  }
  if (payload.open_dental_pat_num !== undefined) {
    await setIdentity(contact, 'open_dental_pat_num', payload.open_dental_pat_num, 'dashboard');
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
  listLeads,
  getLead,
  patchLead,
  addSmileProfile,
  changeStatus,
};
