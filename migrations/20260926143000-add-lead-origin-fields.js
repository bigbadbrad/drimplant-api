'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('leads', 'source', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('leads', 'source_detail', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('leads', 'landing_page', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addIndex('leads', ['source']);
    await queryInterface.addIndex('leads', ['source_detail']);
    await queryInterface.addIndex('leads', ['landing_page']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('leads', ['landing_page']);
    await queryInterface.removeIndex('leads', ['source_detail']);
    await queryInterface.removeIndex('leads', ['source']);
    await queryInterface.removeColumn('leads', 'landing_page');
    await queryInterface.removeColumn('leads', 'source_detail');
    await queryInterface.removeColumn('leads', 'source');
  },
};
