require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && process.env.ALLOW_DB_RESET !== 'true') {
  console.error('Refusing to seed a production database. Set ALLOW_DB_RESET=true to override.');
  process.exit(1);
}

const { User, Product } = require('../models');
const sequelize = require('../config/connection');
const { seedStaffUsers } = require('./staff-users');

const PRODUCTS = [
  { name: 'Cancellation Fee', code: 'CANCEL_FEE', list_price: '1500.00', sort_order: 10 },
  { name: 'Full Arch PMMA', code: 'FULL_ARCH_PMMA', list_price: '20000.00', sort_order: 20 },
  { name: 'Full Arch Zirconia', code: 'FULL_ARCH_ZIRCONIA', list_price: '25000.00', sort_order: 30 },
  { name: 'Full Arch Premium Zirconia', code: 'FULL_ARCH_PREMIUM_ZIRCONIA', list_price: null, sort_order: 40 },
  { name: 'Non-Full Arch', code: 'NON_FULL_ARCH', list_price: null, sort_order: 50 },
];

async function seed() {
  await sequelize.authenticate();

  const [admin] = await User.findOrCreate({
    where: { email: 'jane.admin@example.com' },
    defaults: {
      first_name: 'Jane',
      last_name: 'Admin',
      email: 'jane.admin@example.com',
      phone: '3055550100',
      password_hash: 'local-dev-only',
      role: 'admin',
      status: 'active',
    },
  });

  await User.findOrCreate({
    where: { email: 'sam.staff@example.com' },
    defaults: {
      first_name: 'Sam',
      last_name: 'Staff',
      email: 'sam.staff@example.com',
      phone: '3055550101',
      password_hash: 'local-dev-only',
      role: 'call_center_rep',
      status: 'active',
    },
  });

  await seedStaffUsers(User);

  for (const product of PRODUCTS) {
    await Product.findOrCreate({
      where: { code: product.code },
      defaults: {
        ...product,
        active: true,
        created_by_user_id: admin.id,
      },
    });
  }

  await sequelize.close();
  console.log('Seeded fake admin/staff users, clinic staff accounts, and product catalog.');
}

seed().catch((err) => {
  console.error('db:seed failed:', err.message);
  process.exit(1);
});
