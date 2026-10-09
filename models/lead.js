const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Lead',
  'leads',
  {
    id: uuidPk(),
    lead_uuid: uuidCol(),
    contact_id: fk('contacts', { allowNull: false }),
    owner_user_id: fk('users'),
    visitor_id: fk('visitors'),
    session_id: fk('sessions'),
    source_type: { type: DataTypes.STRING, allowNull: true },
    source_detail: { type: DataTypes.STRING, allowNull: true },
    landing_page: { type: DataTypes.STRING, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    service_interest: { type: DataTypes.STRING, allowNull: true },
    engagement_status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'new' },
  },
  {
    indexes: [
      { unique: true, fields: ['lead_uuid'] },
      { fields: ['contact_id'] },
      { fields: ['owner_user_id'] },
      { fields: ['visitor_id'] },
      { fields: ['session_id'] },
      { fields: ['engagement_status'] },
      { fields: ['source_type'] },
      { fields: ['source_detail'] },
      { fields: ['landing_page'] },
      { fields: ['location'] },
      { fields: ['service_interest'] },
      { fields: ['created_at'] },
    ],
  }
);
