const FIRST_PARTY_HOSTS = new Set([
  'dr-implant.netlify.app',
  'drimplantexpert.com',
  'localhost',
  '127.0.0.1',
]);

function hostnameOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isInternalReferrer(referrer) {
  const value = String(referrer || '').trim();
  if (!value) return true;
  const host = hostnameOf(value);
  if (!host) return true;
  if (FIRST_PARTY_HOSTS.has(host)) return true;
  if (host.endsWith('--dr-implant.netlify.app')) return true;
  if (host.endsWith('.drimplantexpert.com')) return true;
  return false;
}

function searchSource(host) {
  if (!host) return null;
  if (host.includes('google.')) return 'google';
  if (host === 'bing.com' || host.endsWith('.bing.com')) return 'bing';
  if (host.includes('facebook.com') || host === 'fb.com' || host.includes('instagram.com')) return 'facebook';
  return null;
}

function resolveVisitorSource(touchpoint, sessions = []) {
  const utm = String(touchpoint?.utm_source || '').trim();
  if (utm) return utm;

  const raw = String(touchpoint?.source || '').trim();
  if (raw && raw.toLowerCase() !== 'referral') return raw;

  const session =
    (sessions || []).find((row) => row.id && touchpoint?.session_id && row.id === touchpoint.session_id) ||
    (sessions || [])[sessions.length - 1] ||
    null;
  const referrer = session?.referrer || '';
  if (isInternalReferrer(referrer)) return 'direct';
  return searchSource(hostnameOf(referrer)) || (referrer ? 'referral' : 'direct');
}

module.exports = {
  isInternalReferrer,
  resolveVisitorSource,
};
