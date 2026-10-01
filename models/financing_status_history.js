const { DataTypes, uuidPk, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'FinancingStatusHistory',
  'financing_status_histories',
  {
    id: uuidPk(),
    financing_id: fk('financings', { allowNull: false }),
    from_status: { type: DataTypes.STRING, allowNull: true },
    to_status: { type: DataTypes.STRING, allowNull: false },
    changed_by_user_id: fk('users'),
    source: { type: DataTypes.STRING, allowNull: true },
    reason: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    changed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    indexes: [
      { fields: ['financing_id'] },
      { fields: ['to_status'] },
      { fields: ['changed_at'] },
    ],
  }
);
