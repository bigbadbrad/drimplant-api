const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Conversation',
  'conversations',
  {
    id: uuidPk(),
    conversation_uuid: uuidCol(),
    contact_id: fk('contacts'),
    lead_id: fk('leads'),
    channel: { type: DataTypes.STRING, allowNull: false },
    external_conversation_id: { type: DataTypes.STRING, allowNull: true },
    external_user_id: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'open' },
    assigned_user_id: fk('users'),
    started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    last_message_at: { type: DataTypes.DATE, allowNull: true },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['conversation_uuid'] },
      { fields: ['contact_id'] },
      { fields: ['lead_id'] },
      { fields: ['channel'] },
      { fields: ['status'] },
      { fields: ['external_conversation_id'] },
    ],
  }
);
