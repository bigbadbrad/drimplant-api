const jwt = require('jsonwebtoken');
const { fn, col, where } = require('sequelize');
const { User, UserLogin } = require('../models');
const { HttpError } = require('../utils/httpError');

function publicUser(user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return {
    id: user.id,
    user_uuid: user.user_uuid,
    name: name || user.email || user.phone,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
  };
}

function clip(value, max) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

async function findUserForLogin(payload = {}) {
  const identifier = clip(payload.identifier || payload.email || payload.phone, 255);
  const phone = clip(payload.phone, 32);
  const emailRaw = clip(payload.email, 255);
  if (!identifier && !phone && !emailRaw) return null;

  const looksLikeEmail = (value) => Boolean(value && value.includes('@'));

  if (looksLikeEmail(identifier) || looksLikeEmail(emailRaw)) {
    const email = (identifier && identifier.includes('@') ? identifier : emailRaw).toLowerCase();
    return User.findOne({ where: where(fn('LOWER', col('email')), email) });
  }

  if (phone || identifier) {
    const byPhone = await User.findOne({ where: { phone: phone || identifier } });
    if (byPhone) return byPhone;
  }

  if (identifier) {
    return User.findOne({ where: where(fn('LOWER', col('email')), identifier.toLowerCase()) });
  }

  return null;
}

async function recordLogin(user, success, meta = {}) {
  if (!user) return;
  await UserLogin.create({
    user_id: user.id,
    occurred_at: new Date(),
    success,
    ip: clip(meta.ip, 64),
    user_agent: clip(meta.userAgent, 512),
  });
}

async function login(payload = {}, meta = {}) {
  const password = typeof payload.password === 'string' ? payload.password : '';
  const identifier = clip(payload.identifier || payload.email || payload.phone, 255);
  if (!password) throw new HttpError(400, 'Password is required', 'INVALID_LOGIN');
  if (!identifier) throw new HttpError(400, 'Phone or email is required', 'INVALID_LOGIN');

  const user = await findUserForLogin(payload);
  if (!user || !(await user.checkPassword(password))) {
    await recordLogin(user, false, meta);
    throw new HttpError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }
  if (user.status && user.status !== 'active') {
    await recordLogin(user, false, meta);
    throw new HttpError(403, 'Account disabled', 'FORBIDDEN');
  }

  const token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '7d' });
  user.last_login_at = new Date();
  await user.save();
  await recordLogin(user, true, meta);
  return { token, user: publicUser(user) };
}

async function changePassword(userId, payload = {}) {
  const currentPassword = typeof payload.current_password === 'string' ? payload.current_password : '';
  const newPassword = typeof payload.new_password === 'string' ? payload.new_password : '';
  if (!currentPassword) throw new HttpError(400, 'Current password is required', 'INVALID_PASSWORD');
  if (!newPassword) throw new HttpError(400, 'New password is required', 'INVALID_PASSWORD');
  if (newPassword.length < 8) throw new HttpError(400, 'New password must be at least 8 characters', 'INVALID_PASSWORD');
  if (newPassword === currentPassword) throw new HttpError(400, 'New password must be different', 'INVALID_PASSWORD');

  const user = await User.findByPk(userId);
  if (!user) throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
  if (user.status && user.status !== 'active') throw new HttpError(403, 'Account disabled', 'FORBIDDEN');
  if (!(await user.checkPassword(currentPassword))) {
    throw new HttpError(400, 'Current password is incorrect', 'INVALID_PASSWORD');
  }

  user.password_hash = newPassword;
  await user.save();
  return { ok: true };
}

function toPublicUser(user) {
  return publicUser(user);
}

module.exports = { login, changePassword, toPublicUser };
