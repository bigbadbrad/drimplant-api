const bcrypt = require('bcrypt');
const { DataTypes, uuidPk, uuidCol, defineModel } = require('./_schema');
const { USER_ROLES, USER_STATUSES } = require('../constants/statuses');

const User = defineModel(
  'User',
  'users',
  {
    id: uuidPk(),
    user_uuid: uuidCol(),
    first_name: { type: DataTypes.STRING, allowNull: true },
    last_name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    password_hash: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'staff' },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
    primary_location_id: { type: DataTypes.UUID, allowNull: true },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['user_uuid'] },
      { fields: ['email'] },
      { fields: ['role'] },
      { fields: ['status'] },
    ],
    hooks: {
      async beforeCreate(user) {
        if (user.password_hash && !user.password_hash.startsWith('$2')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      },
      async beforeUpdate(user) {
        if (user.changed('password_hash') && user.password_hash && !user.password_hash.startsWith('$2')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      },
    },
  }
);

User.prototype.checkPassword = async function checkPassword(plain) {
  if (!this.password_hash) return false;
  return bcrypt.compare(plain, this.password_hash);
};

User.isAdminRole = function isAdminRole(role) {
  return role === 'admin' || role === 'manager' || role === 'internal_admin';
};

User.ROLES = USER_ROLES;
User.STATUSES = USER_STATUSES;

module.exports = User;
