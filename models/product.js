const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Product',
  'products',
  {
    id: uuidPk(),
    product_uuid: uuidCol(),
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    list_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: true },
    created_by_user_id: fk('users'),
    updated_by_user_id: fk('users'),
  },
  {
    indexes: [
      { unique: true, fields: ['product_uuid'] },
      { unique: true, fields: ['code'] },
      { fields: ['active'] },
      { fields: ['sort_order'] },
    ],
  }
);
