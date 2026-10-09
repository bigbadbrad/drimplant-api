'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('contacts', 'street', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('contacts', 'city', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('contacts', 'state', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('contacts', 'postal_code', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.sequelize.query(
      "UPDATE contacts SET street = address WHERE street IS NULL AND address IS NOT NULL AND address <> ''"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('contacts', 'postal_code');
    await queryInterface.removeColumn('contacts', 'state');
    await queryInterface.removeColumn('contacts', 'city');
    await queryInterface.removeColumn('contacts', 'street');
  },
};
