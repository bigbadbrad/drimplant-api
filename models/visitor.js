const { DataTypes, uuidPk, uuidCol, defineModel } = require('./_schema');

module.exports = defineModel(
  'Visitor',
  'visitors',
  {
    id: uuidPk(),
    visitor_uuid: uuidCol(),
    first_seen_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    last_seen_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    indexes: [{ unique: true, fields: ['visitor_uuid'] }],
  }
);
