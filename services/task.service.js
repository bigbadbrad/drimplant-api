const { Op } = require('sequelize');
const { Task } = require('../models');
const { HttpError } = require('../utils/httpError');
const { clip, parseDate } = require('../utils/fields');
const { TASK_STATUSES } = require('../constants/statuses');
const { findContactByUuid, findLeadByUuid, findTaskByUuid, optionalUser } = require('./lookup');
const { recordActivity } = require('./activity.service');

function publicTask(row) {
  return {
    task_uuid: row.task_uuid,
    contact_id: row.contact_id,
    lead_id: row.lead_id,
    appointment_id: row.appointment_id,
    treatment_id: row.treatment_id,
    assigned_user_id: row.assigned_user_id,
    task_type: row.task_type,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    due_at: row.due_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listTasks(query = {}) {
  const where = {};
  if (query.status) {
    if (!TASK_STATUSES.includes(query.status)) throw new HttpError(400, 'Invalid task status', 'INVALID_STATUS');
    where.status = query.status;
  }
  if (query.contact_uuid) {
    const contact = await findContactByUuid(query.contact_uuid);
    where.contact_id = contact.id;
  }
  if (query.lead_uuid) {
    const lead = await findLeadByUuid(query.lead_uuid);
    where.lead_id = lead.id;
  }
  if (query.due_before) {
    where.due_at = { [Op.lte]: parseDate(query.due_before, 'due_before') };
  }
  const rows = await Task.findAll({ where, order: [['due_at', 'ASC'], ['created_at', 'DESC']] });
  return rows.map(publicTask);
}

async function createTask(payload) {
  if (!payload.title) throw new HttpError(400, 'title is required', 'INVALID_TASK');
  if (!payload.contact_uuid && !payload.lead_uuid) {
    throw new HttpError(400, 'contact_uuid or lead_uuid is required', 'INVALID_TASK');
  }
  const lead = payload.lead_uuid ? await findLeadByUuid(payload.lead_uuid) : null;
  const contact = payload.contact_uuid ? await findContactByUuid(payload.contact_uuid) : null;
  const assigned = await optionalUser(payload.assigned_user_uuid);
  const createdBy = await optionalUser(payload.created_by_user_uuid);

  const row = await Task.create({
    contact_id: contact?.id || lead.contact_id,
    lead_id: lead?.id || null,
    appointment_id: payload.appointment_id || null,
    treatment_id: payload.treatment_id || null,
    assigned_user_id: assigned?.id || null,
    created_by_user_id: createdBy?.id || null,
    task_type: clip(payload.task_type, 64),
    title: clip(payload.title, 255),
    description: payload.description || null,
    status: 'open',
    priority: clip(payload.priority, 32),
    due_at: payload.due_at ? parseDate(payload.due_at, 'due_at') : null,
  });

  await recordActivity({
    contact_id: row.contact_id,
    lead_id: row.lead_id,
    user_id: createdBy?.id || null,
    activity_type: 'task_created',
    summary: row.title,
  });

  return publicTask(row);
}

async function patchTask(taskUuid, payload) {
  const row = await findTaskByUuid(taskUuid);
  const next = {};
  if (payload.title !== undefined) next.title = clip(payload.title, 255);
  if (payload.description !== undefined) next.description = payload.description || null;
  if (payload.priority !== undefined) next.priority = clip(payload.priority, 32);
  if (payload.due_at !== undefined) next.due_at = payload.due_at ? parseDate(payload.due_at, 'due_at') : null;
  if (payload.assigned_user_uuid !== undefined) {
    const assigned = await optionalUser(payload.assigned_user_uuid);
    next.assigned_user_id = assigned?.id || null;
  }
  if (payload.status !== undefined) {
    if (!TASK_STATUSES.includes(payload.status)) throw new HttpError(400, 'Invalid task status', 'INVALID_STATUS');
    next.status = payload.status;
    if (payload.status === 'completed') next.completed_at = new Date();
    if (payload.status === 'open') next.completed_at = null;
  }
  await row.update(next);
  if (next.status === 'completed' || next.status === 'canceled') {
    await recordActivity({
      contact_id: row.contact_id,
      lead_id: row.lead_id,
      user_id: row.assigned_user_id,
      activity_type: `task_${next.status}`,
      summary: row.title,
    });
  }
  return publicTask(row);
}

module.exports = {
  publicTask,
  listTasks,
  createTask,
  patchTask,
};
