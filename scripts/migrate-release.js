require('dotenv').config();

const { spawnSync } = require('child_process');
const sequelize = require('../config/connection');

function run(command) {
  const result = spawnSync(command, {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function columnNames(rows) {
  return rows.map((row) => row.Field || row.field || Object.values(row)[0]);
}

async function hasV1Schema() {
  const [tables] = await sequelize.query('SHOW TABLES');
  if (!tables.length) return false;
  const tableKey = Object.keys(tables[0])[0];
  const names = tables.map((row) => row[tableKey]);
  if (!names.includes('users')) return false;
  const [cols] = await sequelize.query('SHOW COLUMNS FROM `users`');
  return !columnNames(cols).includes('status');
}

async function main() {
  if (process.env.ALLOW_DB_RESET === 'true') {
    console.log('ALLOW_DB_RESET=true: dropping all tables, then migrating and seeding.');
    run('node scripts/db-reset.js');
    run('npm run migrate');
    run('npm run db:seed');
    return;
  }

  await sequelize.authenticate();
  const dirty = await hasV1Schema();
  await sequelize.close();

  if (dirty) {
    console.error('Refusing to run v2 baseline migration on the existing v1 schema.');
    console.error('The Aptible database still has old tables (users has no status column).');
    console.error('One-shot reset: aptible config:set --app drimplant-dev --environment drimplant-dev ALLOW_DB_RESET=true');
    console.error('Then redeploy. After it succeeds: aptible config:unset --app drimplant-dev --environment drimplant-dev ALLOW_DB_RESET');
    process.exit(1);
  }

  run('npm run migrate');
  run('npm run db:seed-staff');
}

main().catch((err) => {
  console.error('migrate:release failed:', err.message);
  process.exit(1);
});
