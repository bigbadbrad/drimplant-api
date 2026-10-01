const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Event',
  'events',
  {
    id: uuidPk(),
    event_uuid: uuidCol(),
    contact_id: fk('contacts'),
    lead_id: fk('leads'),
    visitor_id: fk('visitors'),
    session_id: fk('sessions'),
    event_type: { type: DataTypes.STRING, allowNull: false },
    event_source: { type: DataTypes.STRING, allowNull: true },
    properties: { type: DataTypes.JSON, allowNull: true },
    occurred_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['event_uuid'] },
      { fields: ['contact_id'] },
      { fields: ['lead_id'] },
      { fields: ['visitor_id'] },
      { fields: ['session_id'] },
      { fields: ['event_type'] },
      { fields: ['occurred_at'] },
    ],
  }
);
