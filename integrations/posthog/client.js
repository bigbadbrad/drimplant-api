const { logError } = require('../../utils/logger');

function isEnabled() {
  return Boolean(process.env.POSTHOG_API_KEY);
}

function host() {
  return (process.env.POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
}

async function posthogFetch(body) {
  if (!isEnabled()) return null;
  const res = await fetch(`${host()}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.POSTHOG_API_KEY,
      ...body,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog capture failed ${res.status}: ${text}`);
  }
  return res.json().catch(() => ({}));
}

async function capture({ distinctId, event, properties, timestamp }) {
  if (!isEnabled() || !distinctId || !event) return;
  try {
    await posthogFetch({
      event,
      distinct_id: distinctId,
      properties: properties || {},
      timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
    });
  } catch (err) {
    logError('posthog_capture_failed', { event_type: event });
  }
}

/**
 * Merge anonymous visitor history into the known lead identity.
 * distinct_id becomes lead_uuid; $anon_distinct_id is the prior visitor_uuid.
 */
async function identifyLead({ visitorUuid, leadUuid }) {
  if (!isEnabled() || !visitorUuid || !leadUuid) return;
  try {
    await posthogFetch({
      event: '$identify',
      distinct_id: leadUuid,
      properties: {
        $anon_distinct_id: visitorUuid,
      },
    });
  } catch (err) {
    logError('posthog_identify_failed', { visitor_uuid: visitorUuid, lead_uuid: leadUuid });
  }
}

async function runQuery(hogql, name = 'drimplant-query') {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_PROJECT_API_KEY || process.env.POSTHOG_API_KEY;
  if (!projectId || !apiKey) {
    throw new Error('POSTHOG_PROJECT_ID and a PostHog API key are required');
  }
  const queryHost = (process.env.POSTHOG_HOST || 'https://us.posthog.com').replace(/\/$/, '');
  const res = await fetch(`${queryHost}/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: { kind: 'HogQLQuery', query: hogql },
      name,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog query failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  return { results: data.results || [], columns: data.columns };
}

module.exports = {
  isEnabled,
  capture,
  identifyLead,
  runQuery,
};
