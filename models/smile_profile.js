const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class SmileProfile extends Model {}

SmileProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    smile_profile_uuid: {
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
    workflow_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    workflow_version: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    landing_page: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    answers: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'SmileProfile',
    tableName: 'smile_profiles',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['smile_profile_uuid'] },
      { fields: ['lead_id'] },
      { fields: ['visitor_id'] },
      { fields: ['session_id'] },
      { fields: ['workflow_id'] },
    ],
  }
);

module.exports = SmileProfile;
