const { DataTypes, uuidPk, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'TreatmentItem',
  'treatment_items',
  {
    id: uuidPk(),
    treatment_id: fk('treatments', { allowNull: false }),
    product_id: fk('products', { allowNull: false }),
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    list_price_snapshot: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    total_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    created_by_user_id: fk('users'),
  },
  {
    indexes: [
      { fields: ['treatment_id'] },
      { fields: ['product_id'] },
    ],
  }
);
