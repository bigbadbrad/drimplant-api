const LEAD_ENGAGEMENT_STATUSES = [
  'new',
  'first_attempt',
  'second_attempt',
  'third_attempt',
  'in_communication',
  'long_term_nurture',
];

const APPOINTMENT_STATUSES = ['scheduled', 'canceled', 'no_show', 'completed'];

const APPOINTMENT_TRANSITIONS = {
  scheduled: ['canceled', 'no_show', 'completed'],
  canceled: ['scheduled'],
  no_show: ['scheduled'],
  completed: [],
};

const TREATMENT_STATUSES = [
  'presented',
  'follow_up_1',
  'follow_up_2',
  'follow_up_3',
  'in_communication',
  'won',
  'lost',
  'closed',
];

const FINANCING_STATUSES = ['pending', 'approved', 'denied', 'canceled'];

const TASK_STATUSES = ['open', 'completed', 'canceled'];

const CONVERSATION_CHANNELS = ['facebook_messenger', 'sms', 'web_chat', 'whatsapp'];
const CONVERSATION_STATUSES = ['open', 'closed'];
const MESSAGE_DIRECTIONS = ['inbound', 'outbound'];
const MESSAGE_SENDER_TYPES = ['prospect', 'bot', 'agent', 'system'];
const CALL_DIRECTIONS = ['inbound', 'outbound'];

const USER_ROLES = ['admin', 'manager', 'staff', 'call_center_rep', 'treatment_coordinator'];
const USER_STATUSES = ['active', 'inactive'];

const IDENTITY_TYPES = [
  'visitor_uuid',
  'facebook_psid',
  'open_dental_pat_num',
  'salesforce_lead_id',
  'salesforce_contact_id',
  'salesforce_account_id',
  'telnyx_identity',
];

const SOURCE_TYPES = ['website', 'widget', 'phone', 'facebook_messenger', 'sms', 'referral', 'manual', 'other'];

function isOneOf(value, allowed) {
  return allowed.includes(value);
}

module.exports = {
  LEAD_ENGAGEMENT_STATUSES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TRANSITIONS,
  TREATMENT_STATUSES,
  FINANCING_STATUSES,
  TASK_STATUSES,
  CONVERSATION_CHANNELS,
  CONVERSATION_STATUSES,
  MESSAGE_DIRECTIONS,
  MESSAGE_SENDER_TYPES,
  CALL_DIRECTIONS,
  USER_ROLES,
  USER_STATUSES,
  IDENTITY_TYPES,
  SOURCE_TYPES,
  isOneOf,
};
