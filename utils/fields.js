const { HttpError } = require('./httpError');
const normalizePhoneNumber = require('./normalizePhoneNumber');

function clip(value, max) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

function normalizeEmail(value) {
  if (value == null || value === '') return null;
  const email = String(value).trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Invalid email', 'INVALID_EMAIL');
  }
  return email;
}

function normalizePhone(value) {
  if (value == null || value === '') return null;
  const phone = normalizePhoneNumber(value);
  if (!phone) return null;
  if (phone.length < 10 || phone.length > 15) {
    throw new HttpError(400, 'Invalid phone', 'INVALID_PHONE');
  }
  return phone;
}

function parseDate(value, fieldName) {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `Invalid ${fieldName}`, 'INVALID_TIMESTAMP');
  }
  return date;
}

function money(value) {
  if (value == null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new HttpError(400, 'Invalid amount', 'INVALID_AMOUNT');
  }
  return amount.toFixed(2);
}

module.exports = {
  clip,
  normalizeEmail,
  normalizePhone,
  parseDate,
  money,
};
