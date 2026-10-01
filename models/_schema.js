const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

function uuidPk() {
  return {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  };
}

function uuidCol(options = {}) {
  return {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    defaultValue: DataTypes.UUIDV4,
    ...options,
  };
}

function fk(table, options = {}) {
  const allowNull = options.allowNull !== false;
  return {
    type: DataTypes.UUID,
    allowNull,
    unique: Boolean(options.unique),
    references: { model: table, key: 'id' },
  };
}

function defineModel(name, tableName, fields, extra = {}) {
  class Defined extends Model {}
  Defined.init(fields, {
    sequelize,
    modelName: name,
    tableName,
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    ...extra,
  });
  return Defined;
}

module.exports = {
  Model,
  DataTypes,
  sequelize,
  uuidPk,
  uuidCol,
  fk,
  defineModel,
};
