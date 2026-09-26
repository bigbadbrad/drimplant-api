function logInfo(message, meta = {}) {
  console.log(JSON.stringify({ level: 'info', message, ...sanitize(meta) }));
}

function logError(message, meta = {}) {
  console.error(JSON.stringify({ level: 'error', message, ...sanitize(meta) }));
}

function sanitize(meta) {
  const allowed = [
    'visitor_uuid',
    'session_uuid',
    'lead_uuid',
    'consult_uuid',
    'event_type',
    'route',
    'status',
    'duration_ms',
    'code',
    'method',
  ];
  const out = {};
  for (const key of allowed) {
    if (meta[key] !== undefined) out[key] = meta[key];
  }
  return out;
}

module.exports = { logInfo, logError };
