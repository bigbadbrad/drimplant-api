const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Session',
  'sessions',
  {
    id: uuidPk(),
    session_uuid: uuidCol(),
    visitor_id: fk('visitors', { allowNull: false }),
    started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    last_activity_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    landing_page: { type: DataTypes.STRING, allowNull: true },
    referrer: { type: DataTypes.STRING, allowNull: true },
    language: { type: DataTypes.STRING, allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    device_type: { type: DataTypes.STRING, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['session_uuid'] },
      { fields: ['visitor_id'] },
    ],
  }
);
