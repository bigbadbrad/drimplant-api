const { Activity, Event } = require('../models');

async function recordActivity(payload, transaction) {
  return Activity.create(
    {
      contact_id: payload.contact_id,
      lead_id: payload.lead_id || null,
      appointment_id: payload.appointment_id || null,
      treatment_id: payload.treatment_id || null,
      user_id: payload.user_id || null,
      activity_type: payload.activity_type,
      summary: payload.summary || null,
      details: payload.details || null,
      occurred_at: payload.occurred_at || new Date(),
    },
    { transaction }
  );
}

async function recordEvent(payload, transaction) {
  return Event.create(
    {
      contact_id: payload.contact_id || null,
      lead_id: payload.lead_id || null,
      visitor_id: payload.visitor_id || null,
      session_id: payload.session_id || null,
      event_type: payload.event_type,
      event_source: payload.event_source || null,
      properties: payload.properties || null,
      occurred_at: payload.occurred_at || new Date(),
    },
    { transaction }
  );
}

function publicActivity(row) {
  return {
    activity_uuid: row.activity_uuid,
    contact_id: row.contact_id,
    lead_id: row.lead_id,
    appointment_id: row.appointment_id,
    treatment_id: row.treatment_id,
    activity_type: row.activity_type,
    summary: row.summary,
    details: row.details,
    occurred_at: row.occurred_at,
    created_at: row.created_at,
  };
}

module.exports = {
  recordActivity,
  recordEvent,
  publicActivity,
};
