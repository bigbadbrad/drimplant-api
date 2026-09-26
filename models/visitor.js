const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Visitor extends Model {}

Visitor.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    visitor_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    first_seen_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Visitor',
    tableName: 'visitors',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['visitor_uuid'] }],
  }
);

module.exports = Visitor;
