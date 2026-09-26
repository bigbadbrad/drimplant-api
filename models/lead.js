const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');
const { STAGES } = require('../constants/leadStages');

class Lead extends Model {}

Lead.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    lead_uuid: {
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
    first_name: { type: DataTypes.STRING, allowNull: true },
    last_name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    preferred_language: { type: DataTypes.STRING, allowNull: true },
    location_id: { type: DataTypes.UUID, allowNull: true },
    source: { type: DataTypes.STRING, allowNull: true },
    source_detail: { type: DataTypes.STRING, allowNull: true },
    landing_page: { type: DataTypes.STRING, allowNull: true },
    current_stage: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: STAGES.LEAD,
    },
  },
  {
    sequelize,
    modelName: 'Lead',
    tableName: 'leads',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['lead_uuid'] },
      { fields: ['visitor_id'] },
      { fields: ['session_id'] },
      { fields: ['current_stage'] },
      { fields: ['source'] },
      { fields: ['source_detail'] },
      { fields: ['landing_page'] },
      { fields: ['created_at'] },
      { fields: ['email'] },
      { fields: ['phone'] },
    ],
  }
);

module.exports = Lead;
