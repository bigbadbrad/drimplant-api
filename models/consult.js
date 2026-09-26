const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');
const { CONSULT_STATUSES } = require('../constants/leadStages');

class Consult extends Model {}

Consult.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    consult_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    lead_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'leads', key: 'id' },
    },
    location_id: { type: DataTypes.UUID, allowNull: true },
    provider_id: { type: DataTypes.UUID, allowNull: true },
    scheduled_at: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: CONSULT_STATUSES.SCHEDULED,
    },
    canceled_at: { type: DataTypes.DATE, allowNull: true },
    cancel_reason: { type: DataTypes.STRING, allowNull: true },
    no_show_at: { type: DataTypes.DATE, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    external_system: { type: DataTypes.STRING, allowNull: true },
    external_id: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Consult',
    tableName: 'consults',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['consult_uuid'] },
      { fields: ['lead_id'] },
      { fields: ['scheduled_at'] },
      { fields: ['status'] },
    ],
  }
);

module.exports = Consult;
