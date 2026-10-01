const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Financing',
  'financings',
  {
    id: uuidPk(),
    financing_uuid: uuidCol(),
    treatment_id: fk('treatments', { allowNull: false }),
    provider: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    amount_requested: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    amount_approved: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    submitted_at: { type: DataTypes.DATE, allowNull: true },
    decision_at: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['financing_uuid'] },
      { fields: ['treatment_id'] },
      { fields: ['status'] },
    ],
  }
);
