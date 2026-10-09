const { DataTypes, uuidPk, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'UserLogin',
  'user_logins',
  {
    id: uuidPk(),
    user_id: fk('users', { allowNull: false }),
    occurred_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ip: { type: DataTypes.STRING, allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    indexes: [
      { fields: ['user_id'] },
      { fields: ['occurred_at'] },
      { fields: ['success'] },
    ],
  }
);
