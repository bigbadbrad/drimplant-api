const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Activity',
  'activities',
  {
    id: uuidPk(),
    activity_uuid: uuidCol(),
    contact_id: fk('contacts', { allowNull: false }),
    lead_id: fk('leads'),
    appointment_id: fk('appointments'),
    treatment_id: fk('treatments'),
    user_id: fk('users'),
    activity_type: { type: DataTypes.STRING, allowNull: false },
    summary: { type: DataTypes.STRING, allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
    occurred_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['activity_uuid'] },
      { fields: ['contact_id'] },
      { fields: ['lead_id'] },
      { fields: ['appointment_id'] },
      { fields: ['treatment_id'] },
      { fields: ['activity_type'] },
      { fields: ['occurred_at'] },
    ],
  }
);
