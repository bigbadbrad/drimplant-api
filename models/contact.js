const { DataTypes, uuidPk, uuidCol, defineModel } = require('./_schema');

module.exports = defineModel(
  'Contact',
  'contacts',
  {
    id: uuidPk(),
    contact_uuid: uuidCol(),
    first_name: { type: DataTypes.STRING, allowNull: true },
    last_name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    preferred_language: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    street: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    postal_code: { type: DataTypes.STRING, allowNull: true },
    best_time_to_call: { type: DataTypes.STRING, allowNull: true },
    do_not_call: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
    primary_location_id: { type: DataTypes.UUID, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['contact_uuid'] },
      { fields: ['email'] },
      { fields: ['phone'] },
      { fields: ['created_at'] },
    ],
  }
);
