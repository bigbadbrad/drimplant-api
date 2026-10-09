const STAFF_PASSWORD = 'password';

const STAFF_USERS = [
  {
    first_name: 'Kiriat',
    last_name: 'Alberto',
    email: 'kalberto@drimplantexpert.com',
    role: 'super_admin',
    aliases: ['kiriat.alberto@drimplantexpert.com'],
  },
  {
    first_name: 'Jose',
    last_name: 'Alberto',
    email: 'jalberto@drimplantexpert.com',
    role: 'super_admin',
    aliases: ['jose.alberto@drimplantexpert.com'],
  },
  {
    first_name: 'Brad',
    last_name: 'Meinert',
    email: 'bradmeinert@gmail.com',
    role: 'super_admin',
    aliases: ['brad.meinert@drimplantexpert.com'],
  },
  {
    first_name: 'Grenda',
    last_name: 'Borges',
    email: 'grenda.b@drimplantexpert.com',
    role: 'admin',
    aliases: ['grenda.borges@drimplantexpert.com'],
  },
  { first_name: 'Roxanne', last_name: 'V', email: 'roxanne.v@drimplantexpert.com', role: 'admin' },
  { first_name: 'Antonella', last_name: 'G', email: 'antonella.g@drimplantexpert.com', role: 'admin' },
  {
    first_name: 'Clinic',
    last_name: 'Generic',
    email: 'clinic.g@drimplantexpert.com',
    role: 'admin',
    aliases: ['clinic.generic@drimplantexpert.com'],
  },
  {
    first_name: 'Jacqueline',
    last_name: 'Troncoso',
    email: 'jacqueline.t@drimplantexpert.com',
    role: 'admin',
    aliases: ['jacqueline.troncoso@drimplantexpert.com'],
  },
  {
    first_name: 'Marian',
    last_name: 'Figueroa',
    email: 'marian.f@drimplantexpert.com',
    role: 'admin',
    aliases: ['marian.figueroa@drimplantexpert.com'],
  },
  { first_name: 'Natalia', last_name: 'P', email: 'natalia.p@drimplantexpert.com', role: 'admin' },
  { first_name: 'Paola', last_name: 'A', email: 'paola.a@drimplantexpert.com', role: 'admin' },
  {
    first_name: 'Patricia',
    last_name: 'Pardo',
    email: 'patricia.p@drimplantexpert.com',
    role: 'admin',
    aliases: ['patricia.pardo@drimplantexpert.com'],
  },
  {
    first_name: 'Rayza',
    last_name: 'Castillo',
    email: 'rayza.c@drimplantexpert.com',
    role: 'admin',
    aliases: ['rayza.castillo@drimplantexpert.com'],
  },
  {
    first_name: 'Setter Center',
    last_name: 'Generic',
    email: 'setter.g@drimplantexpert.com',
    role: 'admin',
    aliases: ['setter.center.generic@drimplantexpert.com'],
  },
];

async function findExisting(User, person) {
  const emails = [person.email, ...(person.aliases || [])];
  for (const email of emails) {
    const user = await User.findOne({ where: { email } });
    if (user) return user;
  }
  return User.findOne({
    where: { first_name: person.first_name, last_name: person.last_name },
  });
}

async function seedStaffUsers(User) {
  const created = [];
  const updated = [];

  for (const person of STAFF_USERS) {
    const user = await findExisting(User, person);
    if (!user) {
      await User.create({
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        password_hash: STAFF_PASSWORD,
        role: person.role,
        status: 'active',
      });
      created.push(person.email);
      continue;
    }

    user.first_name = person.first_name;
    user.last_name = person.last_name;
    user.email = person.email;
    user.role = person.role;
    user.status = 'active';
    if (!user.password_hash) user.password_hash = STAFF_PASSWORD;
    await user.save();
    updated.push(person.email);
  }

  return { created, updated };
}

module.exports = { STAFF_PASSWORD, STAFF_USERS, seedStaffUsers };
