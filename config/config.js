require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'drimplant_db',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    port: Number(process.env.DB_PORT || 3306),
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'drimplant_db',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    port: Number(process.env.DB_PORT || 3306),
  },
  production: {
    use_env_variable: process.env.JAWSDB_URL ? 'JAWSDB_URL' : 'DATABASE_URL',
    dialect: 'mysql',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
