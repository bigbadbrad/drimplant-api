const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Call',
  'calls',
  {
    id: uuidPk(),
    call_uuid: uuidCol(),
    contact_id: fk('contacts'),
    lead_id: fk('leads'),
    user_id: fk('users'),
    direction: { type: DataTypes.STRING, allowNull: false },
    provider: { type: DataTypes.STRING, allowNull: true },
    provider_call_id: { type: DataTypes.STRING, allowNull: true },
    tracking_number: { type: DataTypes.STRING, allowNull: true },
    caller_number: { type: DataTypes.STRING, allowNull: true },
    destination_number: { type: DataTypes.STRING, allowNull: true },
    started_at: { type: DataTypes.DATE, allowNull: true },
    answered_at: { type: DataTypes.DATE, allowNull: true },
    ended_at: { type: DataTypes.DATE, allowNull: true },
    duration_seconds: { type: DataTypes.INTEGER, allowNull: true },
    disposition: { type: DataTypes.STRING, allowNull: true },
    recording_reference: { type: DataTypes.STRING, allowNull: true },
    transcript_reference: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['call_uuid'] },
      { fields: ['contact_id'] },
      { fields: ['lead_id'] },
      { fields: ['user_id'] },
      { fields: ['provider_call_id'] },
      { fields: ['started_at'] },
    ],
  }
);
