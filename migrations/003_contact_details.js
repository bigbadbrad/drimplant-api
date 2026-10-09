'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('contacts', 'address', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('contacts', 'best_time_to_call', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('contacts', 'do_not_call', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('contacts', 'do_not_call');
    await queryInterface.removeColumn('contacts', 'best_time_to_call');
    await queryInterface.removeColumn('contacts', 'address');
  },
};
