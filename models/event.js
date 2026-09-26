const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Event extends Model {}

Event.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    event_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    visitor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'visitors', key: 'id' },
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'sessions', key: 'id' },
    },
    lead_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'leads', key: 'id' },
    },
    event_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    event_source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    properties: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Event',
    tableName: 'events',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['event_uuid'] },
      { fields: ['visitor_id'] },
      { fields: ['session_id'] },
      { fields: ['lead_id'] },
      { fields: ['event_type'] },
      { fields: ['occurred_at'] },
    ],
  }
);

module.exports = Event;
