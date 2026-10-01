const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Message',
  'messages',
  {
    id: uuidPk(),
    message_uuid: uuidCol(),
    conversation_id: fk('conversations', { allowNull: false }),
    direction: { type: DataTypes.STRING, allowNull: false },
    sender_type: { type: DataTypes.STRING, allowNull: false },
    external_message_id: { type: DataTypes.STRING, allowNull: true },
    message_type: { type: DataTypes.STRING, allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: true },
    payload: { type: DataTypes.JSON, allowNull: true },
    sent_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delivered_at: { type: DataTypes.DATE, allowNull: true },
    read_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['message_uuid'] },
      { fields: ['conversation_id'] },
      { fields: ['sent_at'] },
    ],
  }
);
