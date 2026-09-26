'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('smile_profiles', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      smile_profile_uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'leads', key: 'id' },
      },
      visitor_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'visitors', key: 'id' },
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'sessions', key: 'id' },
      },
      workflow_id: { type: Sequelize.STRING, allowNull: true },
      workflow_version: { type: Sequelize.STRING, allowNull: true },
      landing_page: { type: Sequelize.STRING, allowNull: true },
      answers: { type: Sequelize.JSON, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('smile_profiles', ['lead_id']);
    await queryInterface.addIndex('smile_profiles', ['visitor_id']);
    await queryInterface.addIndex('smile_profiles', ['session_id']);
    await queryInterface.addIndex('smile_profiles', ['workflow_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('smile_profiles');
  },
};
