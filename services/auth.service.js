const jwt = require('jsonwebtoken');
const { User } = require('../models');
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
    created_at: user.created_at,
  };
}

async function login(payload = {}) {
  const password = typeof payload.password === 'string' ? payload.password : '';
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!password) throw new HttpError(400, 'Password is required', 'INVALID_LOGIN');
  if (!phone && !email) throw new HttpError(400, 'Phone or email is required', 'INVALID_LOGIN');

  const user = await User.findOne({ where: phone ? { phone } : { email } });
  if (!user || !(await user.checkPassword(password))) {
    throw new HttpError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }
  if (user.status && user.status !== 'active') {
    throw new HttpError(403, 'Account disabled', 'FORBIDDEN');
  }

  const token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '7d' });
  user.last_login_at = new Date();
  await user.save();
  return { token, user: publicUser(user) };
}

function toPublicUser(user) {
  return publicUser(user);
}

module.exports = { login, toPublicUser };
