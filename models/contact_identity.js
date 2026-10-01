const { DataTypes, uuidPk, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'ContactIdentity',
  'contact_identities',
  {
    id: uuidPk(),
    contact_id: fk('contacts', { allowNull: false }),
    identity_type: { type: DataTypes.STRING, allowNull: false },
    identity_value: { type: DataTypes.STRING, allowNull: false },
    source: { type: DataTypes.STRING, allowNull: true },
    verified_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['identity_type', 'identity_value'] },
      { fields: ['contact_id'] },
      { fields: ['identity_type'] },
    ],
  }
);
