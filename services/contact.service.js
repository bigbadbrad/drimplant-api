const { Contact, ContactIdentity, Activity, Lead } = require('../models');
const { HttpError } = require('../utils/httpError');
const { clip, normalizeEmail, normalizePhone } = require('../utils/fields');
const { isUuid } = require('../utils/ids');
const { findContactByUuid } = require('./lookup');
const { publicActivity } = require('./activity.service');

function publicContact(contact, extras = {}) {
  return {
    contact_uuid: contact.contact_uuid,
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    preferred_language: contact.preferred_language,
    date_of_birth: contact.date_of_birth,
    primary_location_id: contact.primary_location_id,
    created_at: contact.created_at,
    updated_at: contact.updated_at,
    ...extras,
  };
}

function publicIdentity(row) {
  return {
    id: row.id,
    identity_type: row.identity_type,
    identity_value: row.identity_value,
    source: row.source,
    verified_at: row.verified_at,
    created_at: row.created_at,
  };
}

function contactAttrsFromPayload(payload) {
  const attrs = {};
  if (payload.first_name !== undefined) attrs.first_name = clip(payload.first_name, 64);
  if (payload.last_name !== undefined) attrs.last_name = clip(payload.last_name, 64);
  if (payload.email !== undefined) attrs.email = normalizeEmail(payload.email);
  if (payload.phone !== undefined) attrs.phone = normalizePhone(payload.phone);
  if (payload.preferred_language !== undefined) attrs.preferred_language = clip(payload.preferred_language, 32);
  if (payload.date_of_birth !== undefined) attrs.date_of_birth = payload.date_of_birth || null;
  if (payload.primary_location_id !== undefined || payload.location_id !== undefined) {
    const loc = payload.primary_location_id || payload.location_id;
    attrs.primary_location_id = loc && isUuid(loc) ? loc : null;
  }
  return attrs;
}

async function findContactByIdentity(identityType, identityValue, transaction) {
  if (!identityType || !identityValue) return null;
  const identity = await ContactIdentity.findOne({
    where: { identity_type: identityType, identity_value: String(identityValue) },
    transaction,
  });
  if (!identity) return null;
  return Contact.findByPk(identity.contact_id, { transaction });
}

async function findContactByEmailOrPhone(email, phone, transaction) {
  if (email) {
    const byEmail = await Contact.findOne({ where: { email }, transaction });
    if (byEmail) return byEmail;
  }
  if (phone) {
    const byPhone = await Contact.findOne({ where: { phone }, transaction });
    if (byPhone) return byPhone;
  }
  return null;
}

async function upsertIdentity(contact, identityType, identityValue, source, transaction) {
  if (!identityType || !identityValue) return null;
  const existing = await ContactIdentity.findOne({
    where: { identity_type: identityType, identity_value: String(identityValue) },
    transaction,
  });
  if (existing) {
    if (existing.contact_id !== contact.id) {
      throw new HttpError(409, 'Identity already belongs to another contact', 'IDENTITY_CONFLICT');
    }
    return existing;
  }
  return ContactIdentity.create(
    {
      contact_id: contact.id,
      identity_type: identityType,
      identity_value: String(identityValue),
      source: source || null,
    },
    { transaction }
  );
}

async function resolveOrCreateContact(payload, { visitor, transaction } = {}) {
  let contact = null;
  if (payload.contact_uuid) {
    contact = await findContactByUuid(payload.contact_uuid);
  }
  if (!contact && visitor) {
    contact = await findContactByIdentity('visitor_uuid', visitor.visitor_uuid, transaction);
  }
  const email = payload.email !== undefined ? normalizeEmail(payload.email) : undefined;
  const phone = payload.phone !== undefined ? normalizePhone(payload.phone) : undefined;
  if (!contact) {
    contact = await findContactByEmailOrPhone(email || null, phone || null, transaction);
  }

  const attrs = contactAttrsFromPayload(payload);
  if (contact) {
    const next = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null && value !== '') next[key] = value;
    }
    if (Object.keys(next).length) await contact.update(next, { transaction });
  } else {
    contact = await Contact.create(attrs, { transaction });
  }

  if (visitor) {
    await upsertIdentity(contact, 'visitor_uuid', visitor.visitor_uuid, payload.source_type || payload.source || 'api', transaction);
  }
  return contact;
}

async function listContacts(query = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 200);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const rows = await Contact.findAll({
    include: [{ model: Lead, as: 'leads', attributes: ['id'] }],
    order: [['updated_at', 'DESC'], ['created_at', 'DESC']],
    limit,
    offset,
  });
  return rows.map((contact) => publicContact(contact, { lead_count: (contact.leads || []).length }));
}

async function createContact(payload) {
  const attrs = contactAttrsFromPayload(payload);
  const existing = await findContactByEmailOrPhone(attrs.email || null, attrs.phone || null);
  if (existing) {
    await existing.update(attrs);
    return publicContact(existing);
  }
  const contact = await Contact.create(attrs);
  return publicContact(contact);
}

async function getContact(contactUuid) {
  const contact = await findContactByUuid(contactUuid);
  const identities = await ContactIdentity.findAll({
    where: { contact_id: contact.id },
    order: [['created_at', 'ASC']],
  });
  return publicContact(contact, { identities: identities.map(publicIdentity) });
}

async function patchContact(contactUuid, payload) {
  const contact = await findContactByUuid(contactUuid);
  await contact.update(contactAttrsFromPayload(payload));
  return getContact(contactUuid);
}

async function addIdentity(contactUuid, payload) {
  const contact = await findContactByUuid(contactUuid);
  const identityType = clip(payload.identity_type, 64);
  const identityValue = clip(payload.identity_value, 255);
  if (!identityType || !identityValue) {
    throw new HttpError(400, 'identity_type and identity_value are required', 'INVALID_IDENTITY');
  }
  const row = await upsertIdentity(contact, identityType, identityValue, payload.source || null);
  return publicIdentity(row);
}

async function listActivities(contactUuid) {
  const contact = await findContactByUuid(contactUuid);
  const rows = await Activity.findAll({
    where: { contact_id: contact.id },
    order: [['occurred_at', 'ASC'], ['created_at', 'ASC']],
  });
  return rows.map(publicActivity);
}

async function createActivity(contactUuid, payload) {
  const contact = await findContactByUuid(contactUuid);
  if (!payload.activity_type) throw new HttpError(400, 'activity_type is required', 'INVALID_ACTIVITY');
  const row = await Activity.create({
    contact_id: contact.id,
    lead_id: payload.lead_id || null,
    appointment_id: payload.appointment_id || null,
    treatment_id: payload.treatment_id || null,
    user_id: payload.user_id || null,
    activity_type: payload.activity_type,
    summary: clip(payload.summary, 255),
    details: payload.details || null,
    occurred_at: payload.occurred_at ? new Date(payload.occurred_at) : new Date(),
  });
  return publicActivity(row);
}

module.exports = {
  publicContact,
  contactAttrsFromPayload,
  resolveOrCreateContact,
  upsertIdentity,
  findContactByIdentity,
  listContacts,
  createContact,
  getContact,
  patchContact,
  addIdentity,
  listActivities,
  createActivity,
};
