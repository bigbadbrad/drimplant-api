require('dotenv').config();

const { User } = require('../models');
const sequelize = require('../config/connection');
const { seedStaffUsers } = require('./staff-users');

async function seed() {
  await sequelize.authenticate();
  const result = await seedStaffUsers(User);
  await sequelize.close();
  console.log(
    `Staff users ready. created=${result.created.length} updated=${result.updated.length}`
  );
  if (result.created.length) {
    console.log(`Created: ${result.created.join(', ')}`);
  }
  if (result.updated.length) {
    console.log(`Updated: ${result.updated.join(', ')}`);
  }
}

seed().catch((err) => {
  console.error('db:seed-staff failed:', err.message);
  process.exit(1);
});
