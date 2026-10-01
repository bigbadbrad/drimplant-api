const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'SmileProfile',
  'smile_profiles',
  {
    id: uuidPk(),
    smile_profile_uuid: uuidCol(),
    contact_id: fk('contacts'),
    lead_id: fk('leads', { allowNull: false }),
    visitor_id: fk('visitors'),
    session_id: fk('sessions'),
    workflow_id: { type: DataTypes.STRING, allowNull: true },
    workflow_version: { type: DataTypes.STRING, allowNull: true },
    landing_page: { type: DataTypes.STRING, allowNull: true },
    answers: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  },
  {
    indexes: [
      { unique: true, fields: ['smile_profile_uuid'] },
      { fields: ['contact_id'] },
      { fields: ['lead_id'] },
      { fields: ['visitor_id'] },
      { fields: ['session_id'] },
      { fields: ['workflow_id'] },
    ],
  }
);
