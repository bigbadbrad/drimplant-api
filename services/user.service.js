const { Op } = require('sequelize');
const { User, UserLogin } = require('../models');
const { HttpError } = require('../utils/httpError');
const { clip, normalizeEmail } = require('../utils/fields');

const ASSIGNABLE_ROLES = ['super_admin', 'admin', 'staff'];
const OWNER_ROLES = ['admin', 'manager'];
const DEFAULT_LEAD_OWNER = {
  email: 'roxanne.v@drimplantexpert.com',
  first_name: 'Roxanne',
  last_name: 'V',
};

function displayName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email || user.phone;
}

function isFixtureUser(user) {
  return String(user?.email || '').toLowerCase().endsWith('@example.com');
}

function publicStaffUser(user) {
  return {
    id: user.id,
    user_uuid: user.user_uuid,
    name: displayName(user),
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
  };
}

async function listUsers() {
  const rows = await User.findAll({
    attributes: { exclude: ['password_hash'] },
    order: [
      ['last_name', 'ASC'],
      ['first_name', 'ASC'],
    ],
  });
  return rows.filter((user) => !isFixtureUser(user)).map(publicStaffUser);
}

async function createUser(payload = {}) {
  const firstName = clip(payload.first_name, 64);
  const lastName = clip(payload.last_name, 64);
  const email = normalizeEmail(payload.email);
  const password = typeof payload.password === 'string' ? payload.password : '';
  const role = ASSIGNABLE_ROLES.includes(payload.role) ? payload.role : 'admin';

  if (!firstName) throw new HttpError(400, 'First name is required', 'INVALID_USER');
  if (!lastName) throw new HttpError(400, 'Last name is required', 'INVALID_USER');
  if (!email) throw new HttpError(400, 'Email is required', 'INVALID_USER');
  if (!password) throw new HttpError(400, 'Password is required', 'INVALID_USER');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters', 'INVALID_USER');

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new HttpError(409, 'A user with that email already exists', 'USER_EXISTS');

  const user = await User.create({
    first_name: firstName,
    last_name: lastName,
    email,
    password_hash: password,
    role,
    status: 'active',
  });
  return publicStaffUser(user);
}

async function deleteUser(id, actor) {
  if (!id) throw new HttpError(400, 'User id is required', 'INVALID_USER');
  if (actor && actor.id === id) throw new HttpError(400, 'You cannot remove your own account', 'INVALID_USER');

  const user = await User.findByPk(id);
  if (!user) throw new HttpError(404, 'User not found', 'NOT_FOUND');

  if (User.isSuperRole(user.role)) {
    const superCount = await User.count({
      where: { role: { [Op.in]: ['super_admin', 'internal_admin'] }, status: 'active' },
    });
    if (superCount <= 1) {
      throw new HttpError(400, 'Cannot remove the last super user', 'INVALID_USER');
    }
  }

  await user.destroy();
  return { ok: true, id };
}

async function listLogins(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
  const rows = await UserLogin.findAll({
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'user_uuid', 'first_name', 'last_name', 'email', 'phone', 'role', 'status', 'last_login_at', 'created_at'],
      },
    ],
    order: [['occurred_at', 'DESC']],
    limit,
  });

  return rows.map((row) => ({
    id: row.id,
    occurred_at: row.occurred_at,
    success: row.success,
    ip: row.ip,
    user_agent: row.user_agent,
    user: row.user ? publicStaffUser(row.user) : null,
  }));
}

function isAssignableOwner(user) {
  return Boolean(user && user.status === 'active' && OWNER_ROLES.includes(user.role) && !isFixtureUser(user));
}

async function findDefaultLeadOwner() {
  const byEmail = await User.findOne({
    where: { email: DEFAULT_LEAD_OWNER.email, status: 'active' },
  });
  if (isAssignableOwner(byEmail)) return byEmail;

  const byName = await User.findOne({
    where: {
      first_name: DEFAULT_LEAD_OWNER.first_name,
      last_name: DEFAULT_LEAD_OWNER.last_name,
      status: 'active',
    },
  });
  if (isAssignableOwner(byName)) return byName;

  const fallbacks = await User.findAll({
    where: { role: 'admin', status: 'active' },
    order: [
      ['last_name', 'ASC'],
      ['first_name', 'ASC'],
    ],
  });
  return fallbacks.find((user) => !isFixtureUser(user)) || null;
}

async function requireAssignableOwner(id) {
  if (!id) return findDefaultLeadOwner();
  const user = await User.findByPk(id);
  if (!isAssignableOwner(user)) {
    throw new HttpError(400, 'Owner must be an active admin user', 'INVALID_OWNER');
  }
  return user;
}

function publicOwner(user) {
  if (!user) return null;
  const staff = publicStaffUser(user);
  return {
    id: staff.id,
    name: staff.name,
    first_name: staff.first_name,
    last_name: staff.last_name,
    email: staff.email,
    role: staff.role,
  };
}

module.exports = {
  listUsers,
  listLogins,
  createUser,
  deleteUser,
  publicStaffUser,
  publicOwner,
  findDefaultLeadOwner,
  requireAssignableOwner,
  isAssignableOwner,
};
