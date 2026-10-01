const { Conversation, Message, Call } = require('../models');
const { HttpError } = require('../utils/httpError');
const { clip, parseDate } = require('../utils/fields');
const {
  CONVERSATION_CHANNELS,
  CONVERSATION_STATUSES,
  MESSAGE_DIRECTIONS,
  MESSAGE_SENDER_TYPES,
  CALL_DIRECTIONS,
} = require('../constants/statuses');
const {
  findContactByUuid,
  findLeadByUuid,
  findConversationByUuid,
  findCallByUuid,
  optionalUser,
} = require('./lookup');
const { recordActivity } = require('./activity.service');

function publicConversation(row) {
  return {
    conversation_uuid: row.conversation_uuid,
    contact_id: row.contact_id,
    lead_id: row.lead_id,
    channel: row.channel,
    external_conversation_id: row.external_conversation_id,
    external_user_id: row.external_user_id,
    status: row.status,
    started_at: row.started_at,
    last_message_at: row.last_message_at,
    closed_at: row.closed_at,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function publicMessage(row) {
  return {
    message_uuid: row.message_uuid,
    conversation_id: row.conversation_id,
    direction: row.direction,
    sender_type: row.sender_type,
    message_type: row.message_type,
    body: row.body,
    payload: row.payload,
    sent_at: row.sent_at,
    delivered_at: row.delivered_at,
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

function publicCall(row) {
  return {
    call_uuid: row.call_uuid,
    contact_id: row.contact_id,
    lead_id: row.lead_id,
    direction: row.direction,
    provider: row.provider,
    provider_call_id: row.provider_call_id,
    tracking_number: row.tracking_number,
    caller_number: row.caller_number,
    destination_number: row.destination_number,
    started_at: row.started_at,
    answered_at: row.answered_at,
    ended_at: row.ended_at,
    duration_seconds: row.duration_seconds,
    disposition: row.disposition,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createConversation(payload) {
  if (!CONVERSATION_CHANNELS.includes(payload.channel)) {
    throw new HttpError(400, 'Invalid conversation channel', 'INVALID_CHANNEL');
  }
  const contact = payload.contact_uuid ? await findContactByUuid(payload.contact_uuid) : null;
  const lead = payload.lead_uuid ? await findLeadByUuid(payload.lead_uuid) : null;
  const assigned = await optionalUser(payload.assigned_user_uuid);
  const row = await Conversation.create({
    contact_id: contact?.id || lead?.contact_id || null,
    lead_id: lead?.id || null,
    channel: payload.channel,
    external_conversation_id: clip(payload.external_conversation_id, 128),
    external_user_id: clip(payload.external_user_id, 128),
    status: 'open',
    assigned_user_id: assigned?.id || null,
    started_at: new Date(),
    metadata: payload.metadata || null,
  });
  return publicConversation(row);
}

async function getConversation(conversationUuid) {
  const row = await findConversationByUuid(conversationUuid);
  const messages = await Message.findAll({
    where: { conversation_id: row.id },
    order: [['sent_at', 'ASC']],
  });
  return { ...publicConversation(row), messages: messages.map(publicMessage) };
}

async function addMessage(conversationUuid, payload) {
  const conversation = await findConversationByUuid(conversationUuid);
  if (!MESSAGE_DIRECTIONS.includes(payload.direction)) {
    throw new HttpError(400, 'Invalid message direction', 'INVALID_MESSAGE');
  }
  if (!MESSAGE_SENDER_TYPES.includes(payload.sender_type)) {
    throw new HttpError(400, 'Invalid sender_type', 'INVALID_MESSAGE');
  }
  const row = await Message.create({
    conversation_id: conversation.id,
    direction: payload.direction,
    sender_type: payload.sender_type,
    external_message_id: clip(payload.external_message_id, 128),
    message_type: clip(payload.message_type, 32) || 'text',
    body: payload.body || null,
    payload: payload.payload || null,
    sent_at: payload.sent_at ? parseDate(payload.sent_at, 'sent_at') : new Date(),
  });
  await conversation.update({ last_message_at: row.sent_at });
  if (conversation.contact_id) {
    await recordActivity({
      contact_id: conversation.contact_id,
      lead_id: conversation.lead_id,
      activity_type: payload.direction === 'inbound' ? 'message_received' : 'message_sent',
      summary: payload.direction === 'inbound' ? 'Message received' : 'Message sent',
    });
  }
  return publicMessage(row);
}

async function createCall(payload) {
  if (!CALL_DIRECTIONS.includes(payload.direction)) {
    throw new HttpError(400, 'Invalid call direction', 'INVALID_CALL');
  }
  const contact = payload.contact_uuid ? await findContactByUuid(payload.contact_uuid) : null;
  const lead = payload.lead_uuid ? await findLeadByUuid(payload.lead_uuid) : null;
  const user = await optionalUser(payload.user_uuid);
  const row = await Call.create({
    contact_id: contact?.id || lead?.contact_id || null,
    lead_id: lead?.id || null,
    user_id: user?.id || null,
    direction: payload.direction,
    provider: clip(payload.provider, 64),
    provider_call_id: clip(payload.provider_call_id, 128),
    tracking_number: clip(payload.tracking_number, 32),
    caller_number: clip(payload.caller_number, 32),
    destination_number: clip(payload.destination_number, 32),
    started_at: payload.started_at ? parseDate(payload.started_at, 'started_at') : new Date(),
    answered_at: payload.answered_at ? parseDate(payload.answered_at, 'answered_at') : null,
    ended_at: payload.ended_at ? parseDate(payload.ended_at, 'ended_at') : null,
    duration_seconds: payload.duration_seconds != null ? Number(payload.duration_seconds) : null,
    disposition: clip(payload.disposition, 64),
    recording_reference: clip(payload.recording_reference, 255),
    transcript_reference: clip(payload.transcript_reference, 255),
    metadata: payload.metadata || null,
  });
  if (row.contact_id) {
    await recordActivity({
      contact_id: row.contact_id,
      lead_id: row.lead_id,
      user_id: row.user_id,
      activity_type: row.disposition === 'voicemail' ? 'voicemail_left' : 'call_completed',
      summary: `Call ${row.direction}`,
      details: { disposition: row.disposition },
    });
  }
  return publicCall(row);
}

async function getCall(callUuid) {
  return publicCall(await findCallByUuid(callUuid));
}

async function patchCall(callUuid, payload) {
  const row = await findCallByUuid(callUuid);
  const next = {};
  if (payload.disposition !== undefined) next.disposition = clip(payload.disposition, 64);
  if (payload.ended_at !== undefined) next.ended_at = payload.ended_at ? parseDate(payload.ended_at, 'ended_at') : null;
  if (payload.answered_at !== undefined) next.answered_at = payload.answered_at ? parseDate(payload.answered_at, 'answered_at') : null;
  if (payload.duration_seconds !== undefined) next.duration_seconds = Number(payload.duration_seconds);
  if (payload.recording_reference !== undefined) next.recording_reference = clip(payload.recording_reference, 255);
  if (payload.transcript_reference !== undefined) next.transcript_reference = clip(payload.transcript_reference, 255);
  if (Object.keys(next).length) await row.update(next);
  return publicCall(row);
}

module.exports = {
  createConversation,
  getConversation,
  addMessage,
  createCall,
  getCall,
  patchCall,
  CONVERSATION_STATUSES,
};
