require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && process.env.ALLOW_DB_RESET !== 'true') {
  console.error('Refusing to reset a production database. Set ALLOW_DB_RESET=true to override.');
  process.exit(1);
}

const sequelize = require('../config/connection');

async function reset() {
  await sequelize.authenticate();
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  const [rows] = await sequelize.query('SHOW TABLES');
  const key = rows.length ? Object.keys(rows[0])[0] : null;
  for (const row of rows) {
    const table = row[key];
    await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  await sequelize.close();
  console.log('Dropped all tables. Run npm run migrate next (db:reset does this for you).');
}

reset().catch((err) => {
  console.error('db:reset failed:', err.message);
  process.exit(1);
});
