const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Touchpoint extends Model {}

Touchpoint.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
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
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    source: { type: DataTypes.STRING, allowNull: true },
    medium: { type: DataTypes.STRING, allowNull: true },
    campaign: { type: DataTypes.STRING, allowNull: true },
    campaign_id: { type: DataTypes.STRING, allowNull: true },
    adset_id: { type: DataTypes.STRING, allowNull: true },
    ad_id: { type: DataTypes.STRING, allowNull: true },
    creative_id: { type: DataTypes.STRING, allowNull: true },
    utm_source: { type: DataTypes.STRING, allowNull: true },
    utm_medium: { type: DataTypes.STRING, allowNull: true },
    utm_campaign: { type: DataTypes.STRING, allowNull: true },
    utm_term: { type: DataTypes.STRING, allowNull: true },
    utm_content: { type: DataTypes.STRING, allowNull: true },
    gclid: { type: DataTypes.STRING, allowNull: true },
    gbraid: { type: DataTypes.STRING, allowNull: true },
    wbraid: { type: DataTypes.STRING, allowNull: true },
    fbclid: { type: DataTypes.STRING, allowNull: true },
    landing_page: { type: DataTypes.STRING, allowNull: true },
    landing_page_variant: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Touchpoint',
    tableName: 'touchpoints',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['visitor_id'] },
      { fields: ['session_id'] },
      { fields: ['lead_id'] },
      { fields: ['gclid'] },
      { fields: ['fbclid'] },
      { fields: ['occurred_at'] },
    ],
  }
);

module.exports = Touchpoint;
