const Sequelize = require('sequelize');
require('dotenv').config();

const databaseUrl = process.env.JAWSDB_URL || process.env.DATABASE_URL;

const mysqlSsl = {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
};

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'mysql',
    logging: false,
    dialectOptions: mysqlSsl,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'drimplant_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      dialect: 'mysql',
      port: Number(process.env.DB_PORT || 3306),
      logging: false,
    }
  );
}

module.exports = sequelize;
