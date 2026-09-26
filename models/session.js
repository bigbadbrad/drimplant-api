const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Session extends Model {}

Session.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    session_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    visitor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'visitors', key: 'id' },
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_activity_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    landing_page: { type: DataTypes.STRING, allowNull: true },
    referrer: { type: DataTypes.STRING, allowNull: true },
    language: { type: DataTypes.STRING, allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    device_type: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'sessions',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['session_uuid'] },
      { fields: ['visitor_id'] },
    ],
  }
);

module.exports = Session;
