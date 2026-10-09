'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_logins', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      success: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ip: { type: Sequelize.STRING, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('user_logins', ['user_id']);
    await queryInterface.addIndex('user_logins', ['occurred_at']);
    await queryInterface.addIndex('user_logins', ['success']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_logins');
  },
};
