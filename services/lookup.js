const {
  User,
  Visitor,
  Session,
  Contact,
  Lead,
  Appointment,
  Treatment,
  Product,
  TreatmentItem,
  Financing,
  Task,
  Conversation,
  Call,
} = require('../models');
const { HttpError } = require('../utils/httpError');
const { isUuid } = require('../utils/ids');

async function requireByUuid(Model, field, value, notFound) {
  if (!isUuid(value)) throw new HttpError(400, `Invalid ${field}`, 'INVALID_UUID');
  const row = await Model.findOne({ where: { [field]: value } });
  if (!row) throw new HttpError(404, notFound.message, notFound.code);
  return row;
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
  return requireByUuid(Lead, 'lead_uuid', leadUuid, { message: 'Lead not found', code: 'LEAD_NOT_FOUND' });
}

async function findContactByUuid(contactUuid) {
  return requireByUuid(Contact, 'contact_uuid', contactUuid, { message: 'Contact not found', code: 'CONTACT_NOT_FOUND' });
}

async function findAppointmentByUuid(appointmentUuid) {
  return requireByUuid(Appointment, 'appointment_uuid', appointmentUuid, {
    message: 'Appointment not found',
    code: 'APPOINTMENT_NOT_FOUND',
  });
}

async function findTreatmentByUuid(treatmentUuid) {
  return requireByUuid(Treatment, 'treatment_uuid', treatmentUuid, {
    message: 'Treatment not found',
    code: 'TREATMENT_NOT_FOUND',
  });
}

async function findProductByUuid(productUuid) {
  return requireByUuid(Product, 'product_uuid', productUuid, { message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
}

async function findTreatmentItemById(id) {
  if (!isUuid(id)) throw new HttpError(400, 'Invalid treatment item id', 'INVALID_UUID');
  const row = await TreatmentItem.findByPk(id);
  if (!row) throw new HttpError(404, 'Treatment item not found', 'TREATMENT_ITEM_NOT_FOUND');
  return row;
}

async function findFinancingByUuid(financingUuid) {
  return requireByUuid(Financing, 'financing_uuid', financingUuid, {
    message: 'Financing not found',
    code: 'FINANCING_NOT_FOUND',
  });
}

async function findTaskByUuid(taskUuid) {
  return requireByUuid(Task, 'task_uuid', taskUuid, { message: 'Task not found', code: 'TASK_NOT_FOUND' });
}

async function findConversationByUuid(conversationUuid) {
  return requireByUuid(Conversation, 'conversation_uuid', conversationUuid, {
    message: 'Conversation not found',
    code: 'CONVERSATION_NOT_FOUND',
  });
}

async function findCallByUuid(callUuid) {
  return requireByUuid(Call, 'call_uuid', callUuid, { message: 'Call not found', code: 'CALL_NOT_FOUND' });
}

async function optionalUser(userUuid) {
  if (!userUuid) return null;
  if (!isUuid(userUuid)) throw new HttpError(400, 'Invalid user_uuid', 'INVALID_UUID');
  const user = await User.findOne({ where: { user_uuid: userUuid } });
  if (!user) throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
  return user;
}

module.exports = {
  isUuid,
  findVisitorByUuid,
  findSessionByUuid,
  findLeadByUuid,
  findContactByUuid,
  findAppointmentByUuid,
  findTreatmentByUuid,
  findProductByUuid,
  findTreatmentItemById,
  findFinancingByUuid,
  findTaskByUuid,
  findConversationByUuid,
  findCallByUuid,
  optionalUser,
};
