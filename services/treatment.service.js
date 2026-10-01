const sequelize = require('../config/connection');
const { Product, Treatment, TreatmentItem, Financing, FinancingStatusHistory, TreatmentStatusHistory } = require('../models');
const { HttpError } = require('../utils/httpError');
const { clip, money } = require('../utils/fields');
const {
  findContactByUuid,
  findLeadByUuid,
  findAppointmentByUuid,
  findTreatmentByUuid,
  findProductByUuid,
  findTreatmentItemById,
  findFinancingByUuid,
  optionalUser,
} = require('./lookup');
const { recordActivity, recordEvent } = require('./activity.service');
const { transitionTreatmentStatus, transitionFinancingStatus } = require('./status.service');

function publicProduct(row) {
  return {
    product_uuid: row.product_uuid,
    name: row.name,
    code: row.code,
    description: row.description,
    list_price: row.list_price,
    active: Boolean(row.active),
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function publicItem(row, product) {
  return {
    id: row.id,
    product_uuid: product?.product_uuid || null,
    product_name: product?.name || null,
    quantity: row.quantity,
    list_price_snapshot: row.list_price_snapshot,
    unit_price: row.unit_price,
    total_price: row.total_price,
    created_at: row.created_at,
  };
}

function publicTreatment(row, extras = {}) {
  return {
    treatment_uuid: row.treatment_uuid,
    contact_id: row.contact_id,
    lead_id: row.lead_id,
    appointment_id: row.appointment_id,
    status: row.status,
    presented_at: row.presented_at,
    accepted_at: row.accepted_at,
    closed_at: row.closed_at,
    quoted_amount: row.quoted_amount,
    accepted_amount: row.accepted_amount,
    close_reason: row.close_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...extras,
  };
}

function publicFinancing(row) {
  return {
    financing_uuid: row.financing_uuid,
    treatment_id: row.treatment_id,
    provider: row.provider,
    status: row.status,
    amount_requested: row.amount_requested,
    amount_approved: row.amount_approved,
    submitted_at: row.submitted_at,
    decision_at: row.decision_at,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listProducts() {
  const rows = await Product.findAll({ order: [['sort_order', 'ASC'], ['name', 'ASC']] });
  return rows.map(publicProduct);
}

async function createProduct(payload, user) {
  if (!payload.name) throw new HttpError(400, 'name is required', 'INVALID_PRODUCT');
  const row = await Product.create({
    name: clip(payload.name, 128),
    code: clip(payload.code, 64),
    description: payload.description || null,
    list_price: payload.list_price != null ? money(payload.list_price) : null,
    active: payload.active !== false,
    sort_order: payload.sort_order != null ? Number(payload.sort_order) : null,
    created_by_user_id: user?.id || null,
    updated_by_user_id: user?.id || null,
  });
  return publicProduct(row);
}

async function getProduct(productUuid) {
  return publicProduct(await findProductByUuid(productUuid));
}

async function patchProduct(productUuid, payload, user) {
  const row = await findProductByUuid(productUuid);
  const next = {};
  if (payload.name !== undefined) next.name = clip(payload.name, 128);
  if (payload.code !== undefined) next.code = clip(payload.code, 64);
  if (payload.description !== undefined) next.description = payload.description || null;
  if (payload.list_price !== undefined) next.list_price = payload.list_price != null ? money(payload.list_price) : null;
  if (payload.active !== undefined) next.active = Boolean(payload.active);
  if (payload.sort_order !== undefined) next.sort_order = payload.sort_order != null ? Number(payload.sort_order) : null;
  next.updated_by_user_id = user?.id || null;
  await row.update(next);
  return publicProduct(row);
}

async function createTreatment(payload) {
  let appointment = null;
  let lead = null;
  let contact = null;
  if (payload.appointment_uuid) {
    appointment = await findAppointmentByUuid(payload.appointment_uuid);
    if (appointment.status !== 'completed') {
      throw new HttpError(409, 'Treatment requires a completed appointment', 'APPOINTMENT_NOT_COMPLETED');
    }
  }
  if (payload.lead_uuid) lead = await findLeadByUuid(payload.lead_uuid);
  if (payload.contact_uuid) contact = await findContactByUuid(payload.contact_uuid);
  if (!contact && lead) contact = await lead.getContact();
  if (!contact && appointment) contact = await appointment.getContact();
  if (!contact) throw new HttpError(400, 'contact_uuid, lead_uuid, or appointment_uuid is required', 'INVALID_TREATMENT');
  if (!lead && appointment?.lead_id) lead = await appointment.getLead();

  const owner = await optionalUser(payload.owner_user_uuid);
  const treatment = await sequelize.transaction(async (transaction) => {
    const row = await Treatment.create(
      {
        contact_id: contact.id,
        lead_id: lead?.id || appointment?.lead_id || null,
        appointment_id: appointment?.id || null,
        owner_user_id: owner?.id || null,
        status: 'presented',
        presented_at: new Date(),
        quoted_amount: payload.quoted_amount != null ? money(payload.quoted_amount) : null,
        accepted_amount: payload.accepted_amount != null ? money(payload.accepted_amount) : null,
      },
      { transaction }
    );
    await TreatmentStatusHistory.create(
      {
        treatment_id: row.id,
        from_status: null,
        to_status: 'presented',
        source: payload.source || 'api',
        reason: 'treatment_created',
        changed_at: new Date(),
      },
      { transaction }
    );
    await recordActivity(
      {
        contact_id: contact.id,
        lead_id: row.lead_id,
        treatment_id: row.id,
        activity_type: 'treatment_presented',
        summary: 'Treatment presented',
      },
      transaction
    );
    await recordEvent(
      {
        contact_id: contact.id,
        lead_id: row.lead_id,
        event_type: 'treatment_created',
        event_source: payload.source || 'api',
      },
      transaction
    );
    return row;
  });
  return publicTreatment(treatment);
}

async function getTreatment(treatmentUuid) {
  const row = await findTreatmentByUuid(treatmentUuid);
  const items = await TreatmentItem.findAll({ where: { treatment_id: row.id } });
  const products = {};
  for (const item of items) {
    products[item.product_id] = await item.getProduct();
  }
  const history = await TreatmentStatusHistory.findAll({
    where: { treatment_id: row.id },
    order: [['changed_at', 'ASC']],
  });
  return publicTreatment(row, {
    items: items.map((item) => publicItem(item, products[item.product_id])),
    status_history: history.map((h) => ({
      from_status: h.from_status,
      to_status: h.to_status,
      source: h.source,
      reason: h.reason,
      changed_at: h.changed_at,
    })),
  });
}

async function patchTreatment(treatmentUuid, payload) {
  const row = await findTreatmentByUuid(treatmentUuid);
  const next = {};
  if (payload.quoted_amount !== undefined) next.quoted_amount = payload.quoted_amount != null ? money(payload.quoted_amount) : null;
  if (payload.accepted_amount !== undefined) {
    next.accepted_amount = payload.accepted_amount != null ? money(payload.accepted_amount) : null;
  }
  if (payload.close_reason !== undefined) next.close_reason = clip(payload.close_reason, 255);
  if (Object.keys(next).length) await row.update(next);
  return getTreatment(treatmentUuid);
}

async function changeTreatmentStatus(treatmentUuid, payload) {
  const row = await findTreatmentByUuid(treatmentUuid);
  await transitionTreatmentStatus({
    treatment: row,
    toStatus: payload.to_status || payload.status,
    source: payload.source || 'api',
    changedByUserId: payload.changed_by_user_id || null,
    reason: payload.reason || null,
    metadata: payload.metadata || null,
  });
  return getTreatment(treatmentUuid);
}

async function listItems(treatmentUuid) {
  const treatment = await findTreatmentByUuid(treatmentUuid);
  const items = await TreatmentItem.findAll({ where: { treatment_id: treatment.id } });
  const out = [];
  for (const item of items) {
    out.push(publicItem(item, await item.getProduct()));
  }
  return out;
}

async function addItem(treatmentUuid, payload) {
  const treatment = await findTreatmentByUuid(treatmentUuid);
  if (!payload.product_uuid && !payload.product_id) {
    throw new HttpError(400, 'product_uuid is required', 'INVALID_TREATMENT_ITEM');
  }
  const product = payload.product_uuid
    ? await findProductByUuid(payload.product_uuid)
    : await findProductByUuid(payload.product_id);
  const quantity = Number(payload.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new HttpError(400, 'quantity must be a positive integer', 'INVALID_QUANTITY');
  }
  const snapshot = product.list_price != null ? money(product.list_price) : null;
  const unit = payload.unit_price != null ? money(payload.unit_price) : snapshot;
  if (unit == null) throw new HttpError(400, 'unit_price is required when product has no list price', 'INVALID_PRICE');
  const total = (Number(unit) * quantity).toFixed(2);
  const item = await TreatmentItem.create({
    treatment_id: treatment.id,
    product_id: product.id,
    quantity,
    list_price_snapshot: snapshot,
    unit_price: unit,
    total_price: total,
  });
  return publicItem(item, product);
}

async function patchItem(itemId, payload) {
  const item = await findTreatmentItemById(itemId);
  const next = {};
  if (payload.quantity !== undefined) {
    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new HttpError(400, 'quantity must be a positive integer', 'INVALID_QUANTITY');
    }
    next.quantity = quantity;
  }
  if (payload.unit_price !== undefined) next.unit_price = money(payload.unit_price);
  const quantity = next.quantity || item.quantity;
  const unit = next.unit_price || item.unit_price;
  next.total_price = (Number(unit) * Number(quantity)).toFixed(2);
  await item.update(next);
  return publicItem(item, await item.getProduct());
}

async function deleteItem(itemId) {
  const item = await findTreatmentItemById(itemId);
  await item.destroy();
  return { deleted: true };
}

async function createFinancing(treatmentUuid, payload) {
  const treatment = await findTreatmentByUuid(treatmentUuid);
  const financing = await sequelize.transaction(async (transaction) => {
    const row = await Financing.create(
      {
        treatment_id: treatment.id,
        provider: clip(payload.provider, 64),
        status: 'pending',
        amount_requested: payload.amount_requested != null ? money(payload.amount_requested) : null,
        amount_approved: payload.amount_approved != null ? money(payload.amount_approved) : null,
        submitted_at: new Date(),
        metadata: payload.metadata || null,
      },
      { transaction }
    );
    await FinancingStatusHistory.create(
      {
        financing_id: row.id,
        from_status: null,
        to_status: 'pending',
        source: payload.source || 'api',
        reason: 'financing_created',
        changed_at: new Date(),
      },
      { transaction }
    );
    await recordActivity(
      {
        contact_id: treatment.contact_id,
        lead_id: treatment.lead_id,
        treatment_id: treatment.id,
        activity_type: 'financing_submitted',
        summary: 'Financing submitted',
      },
      transaction
    );
    return row;
  });
  return publicFinancing(financing);
}

async function patchFinancing(financingUuid, payload) {
  const row = await findFinancingByUuid(financingUuid);
  const next = {};
  if (payload.provider !== undefined) next.provider = clip(payload.provider, 64);
  if (payload.amount_requested !== undefined) {
    next.amount_requested = payload.amount_requested != null ? money(payload.amount_requested) : null;
  }
  if (payload.amount_approved !== undefined) {
    next.amount_approved = payload.amount_approved != null ? money(payload.amount_approved) : null;
  }
  if (payload.metadata !== undefined) next.metadata = payload.metadata;
  if (Object.keys(next).length) await row.update(next);
  return publicFinancing(row);
}

async function changeFinancingStatus(financingUuid, payload) {
  const row = await findFinancingByUuid(financingUuid);
  const treatment = await row.getTreatment();
  await transitionFinancingStatus({
    financing: row,
    treatment,
    toStatus: payload.to_status || payload.status,
    source: payload.source || 'api',
    changedByUserId: payload.changed_by_user_id || null,
    reason: payload.reason || null,
    metadata: payload.metadata || null,
  });
  await row.reload();
  return publicFinancing(row);
}

module.exports = {
  listProducts,
  createProduct,
  getProduct,
  patchProduct,
  createTreatment,
  getTreatment,
  patchTreatment,
  changeTreatmentStatus,
  listItems,
  addItem,
  patchItem,
  deleteItem,
  createFinancing,
  patchFinancing,
  changeFinancingStatus,
};
