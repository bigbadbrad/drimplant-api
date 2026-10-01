const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Treatment',
  'treatments',
  {
    id: uuidPk(),
    treatment_uuid: uuidCol(),
    contact_id: fk('contacts', { allowNull: false }),
    lead_id: fk('leads'),
    appointment_id: fk('appointments'),
    owner_user_id: fk('users'),
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'presented' },
    presented_at: { type: DataTypes.DATE, allowNull: true },
    accepted_at: { type: DataTypes.DATE, allowNull: true },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    quoted_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    accepted_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    close_reason: { type: DataTypes.STRING, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['treatment_uuid'] },
      { fields: ['contact_id'] },
      { fields: ['lead_id'] },
      { fields: ['appointment_id'] },
      { fields: ['status'] },
    ],
  }
);
