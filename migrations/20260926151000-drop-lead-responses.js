'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS lead_responses');
  },

  async down() {
    // Intentionally empty: smile_profiles replaced lead_responses.
  },
};
