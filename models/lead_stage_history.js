const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class LeadStageHistory extends Model {}

LeadStageHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    lead_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'leads', key: 'id' },
    },
    from_stage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    to_stage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    changed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    changed_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'LeadStageHistory',
    tableName: 'lead_stage_histories',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['lead_id'] },
      { fields: ['to_stage'] },
      { fields: ['changed_at'] },
    ],
  }
);

module.exports = LeadStageHistory;
