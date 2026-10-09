'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('leads', 'location', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('leads', 'service_interest', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('leads', 'service_interest');
    await queryInterface.removeColumn('leads', 'location');
  },
};
