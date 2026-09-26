const axios = require('axios');

const SF_API_VERSION = 'v59.0';
const LOGIN_PRODUCTION = 'https://login.salesforce.com';
const LOGIN_SANDBOX = 'https://test.salesforce.com';

function hasClientCredentials() {
  return Boolean(
    process.env.SALESFORCE_CLIENT_ID &&
      process.env.SALESFORCE_CLIENT_SECRET &&
      process.env.SALESFORCE_LOGIN_URL
  );
}

function hasUsernamePassword() {
  return Boolean(process.env.SALESFORCE_USERNAME && process.env.SALESFORCE_PASSWORD);
}

function isConfigured() {
  return hasClientCredentials();
}

function getLoginBaseUrl() {
  return (process.env.SALESFORCE_LOGIN_URL || '').replace(/\/$/, '') || LOGIN_PRODUCTION;
}

function getLoginUrlsToTry() {
  const configured = getLoginBaseUrl();
  const urls = [configured];
  if (configured !== LOGIN_PRODUCTION) urls.push(LOGIN_PRODUCTION);
  if (configured !== LOGIN_SANDBOX) urls.push(LOGIN_SANDBOX);
  return urls;
}

function isDomainNotSupportedError(err) {
  const data = err.response?.data;
  const msg = String(data?.error_description || data?.error || data?.message || err.message || '');
  const body = data ? JSON.stringify(data) : '';
  return msg.toLowerCase().includes('request not supported on this domain')
    || body.toLowerCase().includes('request not supported on this domain');
}

async function getAccessTokenClientCredentials(baseUrl) {
  const res = await axios.post(
    `${baseUrl}/services/oauth2/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SALESFORCE_CLIENT_ID,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
  );
  return { accessToken: res.data.access_token, instanceUrl: res.data.instance_url };
}

async function getAccessTokenUsernamePassword(baseUrl) {
  const res = await axios.post(
    `${baseUrl}/services/oauth2/token`,
    new URLSearchParams({
      grant_type: 'password',
      client_id: process.env.SALESFORCE_CLIENT_ID,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET,
      username: process.env.SALESFORCE_USERNAME,
      password: process.env.SALESFORCE_PASSWORD,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
  );
  return { accessToken: res.data.access_token, instanceUrl: res.data.instance_url };
}

async function getAccessToken() {
  const tryToken = (baseUrl) =>
    hasUsernamePassword() ? getAccessTokenUsernamePassword(baseUrl) : getAccessTokenClientCredentials(baseUrl);
  const urls = getLoginUrlsToTry();
  let lastErr;
  for (const url of urls) {
    try {
      return await tryToken(url);
    } catch (err) {
      lastErr = err;
      if (!isDomainNotSupportedError(err)) throw err;
    }
  }
  throw lastErr;
}

async function createRecord(instanceUrl, accessToken, sobject, body) {
  const res = await axios.post(`${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${sobject}`, body, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return res.data.id;
}

async function updateRecord(instanceUrl, accessToken, sobject, id, body) {
  await axios.patch(`${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${sobject}/${id}`, body, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
}

async function query(instanceUrl, accessToken, soql) {
  const res = await axios.get(
    `${instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 }
  );
  return res.data;
}

function buildSalesforcePayload(lead) {
  return {
    FirstName: lead.first_name || undefined,
    LastName: lead.last_name || 'Unknown',
    Email: lead.email || undefined,
    Phone: lead.phone || undefined,
    LeadSource: 'Dr. Implant',
  };
}

module.exports = {
  isConfigured,
  getAccessToken,
  createRecord,
  updateRecord,
  query,
  buildSalesforcePayload,
};
