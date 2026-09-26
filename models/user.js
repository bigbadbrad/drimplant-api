const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const sequelize = require('../config/connection');

class User extends Model {
  async checkPassword(plain) {
    if (!this.password_hash) return false;
    return bcrypt.compare(plain, this.password_hash);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('internal_admin', 'staff'),
      allowNull: false,
      defaultValue: 'staff',
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
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

module.exports = User;
