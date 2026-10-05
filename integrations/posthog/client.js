const { logError } = require('../../utils/logger');
const { friendlyEventDisplay, isUsefulEvent, collapseEvents, hrefFromElementsChain, normalizePath, pageTitle } = require('../../utils/visitorEvents');

function isEnabled() {
  return Boolean(process.env.POSTHOG_API_KEY);
}

function queryApiKey() {
  return process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_PROJECT_API_KEY || process.env.POSTHOG_API_KEY;
}

function isQueryEnabled() {
  if (process.env.POSTHOG_ENABLED === 'false') return false;
  return Boolean(process.env.POSTHOG_PROJECT_ID && queryApiKey());
}

function host() {
  return (process.env.POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
}

function queryHost() {
  const explicit = process.env.POSTHOG_QUERY_HOST;
  if (explicit) return explicit.replace(/\/$/, '');
  const ingest = host();
  if (ingest.includes('us.i.posthog.com')) return 'https://us.posthog.com';
  if (ingest.includes('eu.i.posthog.com')) return 'https://eu.posthog.com';
  return ingest || 'https://us.posthog.com';
}

function escapeHogql(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "''");
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
 * Merge anonymous visitor history into the known Contact identity.
 * distinct_id becomes contact_uuid; $anon_distinct_id is the prior visitor_uuid.
 */
async function identifyContact({ visitorUuid, contactUuid }) {
  if (!isEnabled() || !visitorUuid || !contactUuid) return;
  try {
    await posthogFetch({
      event: '$identify',
      distinct_id: contactUuid,
      properties: {
        $anon_distinct_id: visitorUuid,
      },
    });
  } catch (err) {
    logError('posthog_identify_failed', { visitor_uuid: visitorUuid, contact_uuid: contactUuid });
  }
}

async function identifyLead({ visitorUuid, leadUuid, contactUuid }) {
  return identifyContact({ visitorUuid, contactUuid: contactUuid || leadUuid });
}

async function runQuery(hogql, name = 'drimplant-query') {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = queryApiKey();
  if (!projectId || !apiKey) {
    throw new Error('POSTHOG_PROJECT_ID and a PostHog API key are required');
  }
  const res = await fetch(`${queryHost()}/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: { kind: 'HogQLQuery', query: hogql },
      name,
      refresh: 'force_blocking',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog query failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  return { results: data.results || [], columns: data.columns };
}

async function getPersonDistinctIds(identifiedDistinctId) {
  if (!isQueryEnabled() || !identifiedDistinctId) return identifiedDistinctId ? [String(identifiedDistinctId)] : [];
  const idEsc = escapeHogql(identifiedDistinctId);
  try {
    const { results } = await runQuery(
      `
        SELECT DISTINCT distinct_id
        FROM events
        WHERE person_id = (
          SELECT person_id FROM events
          WHERE distinct_id = '${idEsc}'
          AND timestamp >= now() - INTERVAL 30 DAY
          LIMIT 1
        )
        AND timestamp >= now() - INTERVAL 30 DAY
        LIMIT 50
      `,
      'person-distinct-ids'
    );
    const ids = (results || []).map((row) => String(Array.isArray(row) ? row[0] : row?.distinct_id || '')).filter(Boolean);
    return ids.length ? ids : [String(identifiedDistinctId)];
  } catch (err) {
    logError('posthog_person_ids_failed', { distinct_id: identifiedDistinctId });
    return [String(identifiedDistinctId)];
  }
}

/**
 * Last page + page counts for a set of anonymous/known distinct ids.
 * Groups by person_id so events after $identify still attach to the visitor.
 */
async function fetchVisitorPageStats(distinctIds) {
  const ids = [...new Set((distinctIds || []).filter(Boolean).map(String))].slice(0, 200);
  const byDistinct = new Map();
  if (!isQueryEnabled() || !ids.length) return byDistinct;

  const list = ids.map((id) => `'${escapeHogql(id)}'`).join(', ');
  try {
    const { results } = await runQuery(
      `
        SELECT
          distinct_id,
          person_id,
          countIf(event IN ('content_viewed', '$pageview', 'page_view')) AS page_count,
          argMax(coalesce(nullIf(toString(properties.path), ''), toString(properties.$pathname)), timestamp) AS last_page
        FROM events
        WHERE timestamp >= now() - INTERVAL 90 DAY
          AND toString(distinct_id) IN (${list})
        GROUP BY distinct_id, person_id
      `,
      'visitor-list-pages'
    );

    const byPerson = new Map();
    for (const row of results || []) {
      const arr = Array.isArray(row) ? row : [];
      const distinctId = String(arr[0] || '');
      const personId = String(arr[1] || distinctId);
      const pageCount = Number(arr[2] || 0);
      const lastPage = arr[3] ? String(arr[3]) : null;
      const current = byPerson.get(personId) || { pageCount: 0, lastPage: null, ids: new Set() };
      current.pageCount += pageCount;
      if (lastPage) current.lastPage = lastPage;
      current.ids.add(distinctId);
      byPerson.set(personId, current);
    }
    for (const stats of byPerson.values()) {
      for (const id of stats.ids) {
        byDistinct.set(id, { pageCount: stats.pageCount, lastPage: stats.lastPage });
      }
    }
  } catch (err) {
    logError('posthog_visitor_stats_failed', {});
  }
  return byDistinct;
}

function pathFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(String(url)).pathname;
  } catch {
    return String(url);
  }
}

function rowValue(columns, row, name) {
  const index = columns.indexOf(name);
  if (index < 0) return null;
  return Array.isArray(row) ? row[index] : null;
}

async function fetchEventsByDistinctIds(distinctIds, { limit = 500 } = {}) {
  const ids = [...new Set((distinctIds || []).filter(Boolean).map(String))].slice(0, 25);
  if (!isQueryEnabled() || !ids.length) return [];
  const list = ids.map((id) => `'${escapeHogql(id)}'`).join(', ');
  try {
    const { results, columns } = await runQuery(
      `
        SELECT
          distinct_id,
          event,
          timestamp,
          properties.path AS path,
          properties.$pathname AS pathname,
          properties.$current_url AS url,
          properties.$el_text AS el_text,
          properties.video_title AS video_title,
          properties.cta AS cta,
          properties.href AS href,
          properties.page_title AS page_title,
          elements_chain
        FROM events
        WHERE toString(distinct_id) IN (${list})
           OR toString(properties.visitor_uuid) IN (${list})
        ORDER BY timestamp DESC
        LIMIT ${Math.min(parseInt(limit, 10) || 500, 5000)}
      `,
      'visitor-activity'
    );
    const cols = columns || [];
    return collapseEvents(
      (results || [])
        .map((row) => {
          const eventName = String(rowValue(cols, row, 'event') || '');
          const pathVal = rowValue(cols, row, 'path');
          const pathnameVal = rowValue(cols, row, 'pathname');
          const urlVal = rowValue(cols, row, 'url');
          const href = rowValue(cols, row, 'href') ? String(rowValue(cols, row, 'href')) : hrefFromElementsChain(rowValue(cols, row, 'elements_chain'));
          const elText = rowValue(cols, row, 'el_text') ? String(rowValue(cols, row, 'el_text')) : '';
          const isVideo = eventName === 'video_played' || (eventName === '$autocapture' && /watch the video/i.test(elText));
          const isPageView = eventName === 'content_viewed' || eventName === '$pageview' || eventName === 'page_view';
          const isNav = !isVideo && (eventName === 'link_clicked' || eventName === 'cta_clicked' || eventName === '$autocapture');
          const actualPath = pathnameVal || pathFromUrl(urlVal);
          const claimedPath = pathVal || null;
          if (isPageView && claimedPath && actualPath && normalizePath(claimedPath) !== normalizePath(actualPath)) {
            return null;
          }
          const path = isNav && href ? normalizePath(href) : claimedPath || actualPath || urlVal || null;
          const mapped = {
            distinct_id: String(rowValue(cols, row, 'distinct_id') || ''),
            event: eventName,
            timestamp: rowValue(cols, row, 'timestamp'),
            path,
            el_text: elText,
            video_title: rowValue(cols, row, 'video_title') ? String(rowValue(cols, row, 'video_title')) : '',
            cta: rowValue(cols, row, 'cta') ? String(rowValue(cols, row, 'cta')) : '',
            href,
            page_title: pageTitle(path) || (rowValue(cols, row, 'page_title') ? String(rowValue(cols, row, 'page_title')) : ''),
            elements_chain: rowValue(cols, row, 'elements_chain') ? String(rowValue(cols, row, 'elements_chain')) : '',
          };
          mapped.event_display = friendlyEventDisplay(mapped);
          return mapped;
        })
        .filter(Boolean)
        .filter(isUsefulEvent)
    );
  } catch (err) {
    logError('posthog_visitor_events_failed', {});
    return [];
  }
}

module.exports = {
  isEnabled,
  isQueryEnabled,
  capture,
  identifyContact,
  identifyLead,
  runQuery,
  getPersonDistinctIds,
  fetchVisitorPageStats,
  fetchEventsByDistinctIds,
};
