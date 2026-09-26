'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const uuid = () => ({
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    });
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    };

    await queryInterface.createTable('users', {
      id: uuid(),
      name: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      password_hash: { type: Sequelize.STRING, allowNull: true },
      role: { type: Sequelize.ENUM('internal_admin', 'staff'), allowNull: false, defaultValue: 'staff' },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('api_keys', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      key: { type: Sequelize.STRING, allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('visitors', {
      id: uuid(),
      visitor_uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      first_seen_at: { type: Sequelize.DATE, allowNull: false },
      last_seen_at: { type: Sequelize.DATE, allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('sessions', {
      id: uuid(),
      session_uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      visitor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'visitors', key: 'id' },
      },
      started_at: { type: Sequelize.DATE, allowNull: false },
      last_activity_at: { type: Sequelize.DATE, allowNull: false },
      landing_page: { type: Sequelize.STRING, allowNull: true },
      referrer: { type: Sequelize.STRING, allowNull: true },
      language: { type: Sequelize.STRING, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      device_type: { type: Sequelize.STRING, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('leads', {
      id: uuid(),
      lead_uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
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
      first_name: { type: Sequelize.STRING, allowNull: true },
      last_name: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      preferred_language: { type: Sequelize.STRING, allowNull: true },
      location_id: { type: Sequelize.UUID, allowNull: true },
      current_stage: { type: Sequelize.STRING, allowNull: false, defaultValue: 'lead' },
      ...timestamps,
    });

    await queryInterface.createTable('touchpoints', {
      id: uuid(),
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
      lead_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'leads', key: 'id' },
      },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      source: { type: Sequelize.STRING, allowNull: true },
      medium: { type: Sequelize.STRING, allowNull: true },
      campaign: { type: Sequelize.STRING, allowNull: true },
      campaign_id: { type: Sequelize.STRING, allowNull: true },
      adset_id: { type: Sequelize.STRING, allowNull: true },
      ad_id: { type: Sequelize.STRING, allowNull: true },
      creative_id: { type: Sequelize.STRING, allowNull: true },
      utm_source: { type: Sequelize.STRING, allowNull: true },
      utm_medium: { type: Sequelize.STRING, allowNull: true },
      utm_campaign: { type: Sequelize.STRING, allowNull: true },
      utm_term: { type: Sequelize.STRING, allowNull: true },
      utm_content: { type: Sequelize.STRING, allowNull: true },
      gclid: { type: Sequelize.STRING, allowNull: true },
      gbraid: { type: Sequelize.STRING, allowNull: true },
      wbraid: { type: Sequelize.STRING, allowNull: true },
      fbclid: { type: Sequelize.STRING, allowNull: true },
      landing_page: { type: Sequelize.STRING, allowNull: true },
      landing_page_variant: { type: Sequelize.STRING, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('events', {
      id: uuid(),
      event_uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
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
      lead_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'leads', key: 'id' },
      },
      event_type: { type: Sequelize.STRING, allowNull: false },
      event_source: { type: Sequelize.STRING, allowNull: true },
      properties: { type: Sequelize.JSON, allowNull: true },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('lead_stage_histories', {
      id: uuid(),
      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'leads', key: 'id' },
      },
      from_stage: { type: Sequelize.STRING, allowNull: true },
      to_stage: { type: Sequelize.STRING, allowNull: false },
      changed_at: { type: Sequelize.DATE, allowNull: false },
      source: { type: Sequelize.STRING, allowNull: true },
      changed_by: { type: Sequelize.UUID, allowNull: true },
      reason: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('consults', {
      id: uuid(),
      consult_uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'leads', key: 'id' },
      },
      location_id: { type: Sequelize.UUID, allowNull: true },
      provider_id: { type: Sequelize.UUID, allowNull: true },
      scheduled_at: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'scheduled' },
      canceled_at: { type: Sequelize.DATE, allowNull: true },
      cancel_reason: { type: Sequelize.STRING, allowNull: true },
      no_show_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      external_system: { type: Sequelize.STRING, allowNull: true },
      external_id: { type: Sequelize.STRING, allowNull: true },
      ...timestamps,
    });

    await queryInterface.addIndex('sessions', ['visitor_id']);
    await queryInterface.addIndex('leads', ['visitor_id']);
    await queryInterface.addIndex('leads', ['session_id']);
    await queryInterface.addIndex('leads', ['current_stage']);
    await queryInterface.addIndex('leads', ['created_at']);
    await queryInterface.addIndex('leads', ['email']);
    await queryInterface.addIndex('leads', ['phone']);
    await queryInterface.addIndex('touchpoints', ['visitor_id']);
    await queryInterface.addIndex('touchpoints', ['session_id']);
    await queryInterface.addIndex('touchpoints', ['lead_id']);
    await queryInterface.addIndex('touchpoints', ['gclid']);
    await queryInterface.addIndex('touchpoints', ['fbclid']);
    await queryInterface.addIndex('touchpoints', ['occurred_at']);
    await queryInterface.addIndex('events', ['visitor_id']);
    await queryInterface.addIndex('events', ['session_id']);
    await queryInterface.addIndex('events', ['lead_id']);
    await queryInterface.addIndex('events', ['event_type']);
    await queryInterface.addIndex('events', ['occurred_at']);
    await queryInterface.addIndex('lead_stage_histories', ['lead_id']);
    await queryInterface.addIndex('lead_stage_histories', ['to_stage']);
    await queryInterface.addIndex('lead_stage_histories', ['changed_at']);
    await queryInterface.addIndex('consults', ['lead_id']);
    await queryInterface.addIndex('consults', ['scheduled_at']);
    await queryInterface.addIndex('consults', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consults');
    await queryInterface.dropTable('lead_stage_histories');
    await queryInterface.dropTable('events');
    await queryInterface.dropTable('touchpoints');
    await queryInterface.dropTable('leads');
    await queryInterface.dropTable('sessions');
    await queryInterface.dropTable('visitors');
    await queryInterface.dropTable('api_keys');
    await queryInterface.dropTable('users');
  },
};
