'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const id = () => ({
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    });
    const uuid = () => ({
      type: Sequelize.UUID,
      allowNull: false,
      unique: true,
      defaultValue: Sequelize.UUIDV4,
    });
    const fk = (table, allowNull = true) => ({
      type: Sequelize.UUID,
      allowNull,
      references: { model: table, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: allowNull ? 'SET NULL' : 'RESTRICT',
    });
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    };

    await queryInterface.createTable('users', {
      id: id(),
      user_uuid: uuid(),
      first_name: { type: Sequelize.STRING, allowNull: true },
      last_name: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      password_hash: { type: Sequelize.STRING, allowNull: true },
      role: { type: Sequelize.STRING, allowNull: false, defaultValue: 'staff' },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'active' },
      primary_location_id: { type: Sequelize.UUID, allowNull: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['status']);

    await queryInterface.createTable('api_keys', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      key: { type: Sequelize.STRING, allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('visitors', {
      id: id(),
      visitor_uuid: uuid(),
      first_seen_at: { type: Sequelize.DATE, allowNull: false },
      last_seen_at: { type: Sequelize.DATE, allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('sessions', {
      id: id(),
      session_uuid: uuid(),
      visitor_id: fk('visitors', false),
      started_at: { type: Sequelize.DATE, allowNull: false },
      last_activity_at: { type: Sequelize.DATE, allowNull: false },
      landing_page: { type: Sequelize.STRING, allowNull: true },
      referrer: { type: Sequelize.STRING, allowNull: true },
      language: { type: Sequelize.STRING, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      device_type: { type: Sequelize.STRING, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('sessions', ['visitor_id']);

    await queryInterface.createTable('contacts', {
      id: id(),
      contact_uuid: uuid(),
      first_name: { type: Sequelize.STRING, allowNull: true },
      last_name: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      preferred_language: { type: Sequelize.STRING, allowNull: true },
      date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
      primary_location_id: { type: Sequelize.UUID, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('contacts', ['email']);
    await queryInterface.addIndex('contacts', ['phone']);
    await queryInterface.addIndex('contacts', ['created_at']);

    await queryInterface.createTable('contact_identities', {
      id: id(),
      contact_id: fk('contacts', false),
      identity_type: { type: Sequelize.STRING, allowNull: false },
      identity_value: { type: Sequelize.STRING, allowNull: false },
      source: { type: Sequelize.STRING, allowNull: true },
      verified_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('contact_identities', ['contact_id']);
    await queryInterface.addIndex('contact_identities', ['identity_type', 'identity_value'], { unique: true });

    await queryInterface.createTable('leads', {
      id: id(),
      lead_uuid: uuid(),
      contact_id: fk('contacts', false),
      owner_user_id: fk('users'),
      visitor_id: fk('visitors'),
      session_id: fk('sessions'),
      source_type: { type: Sequelize.STRING, allowNull: true },
      source_detail: { type: Sequelize.STRING, allowNull: true },
      landing_page: { type: Sequelize.STRING, allowNull: true },
      engagement_status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'new' },
      ...timestamps,
    });
    await queryInterface.addIndex('leads', ['contact_id']);
    await queryInterface.addIndex('leads', ['owner_user_id']);
    await queryInterface.addIndex('leads', ['visitor_id']);
    await queryInterface.addIndex('leads', ['session_id']);
    await queryInterface.addIndex('leads', ['engagement_status']);
    await queryInterface.addIndex('leads', ['source_type']);
    await queryInterface.addIndex('leads', ['source_detail']);
    await queryInterface.addIndex('leads', ['landing_page']);
    await queryInterface.addIndex('leads', ['created_at']);

    await queryInterface.createTable('lead_status_histories', {
      id: id(),
      lead_id: fk('leads', false),
      from_status: { type: Sequelize.STRING, allowNull: true },
      to_status: { type: Sequelize.STRING, allowNull: false },
      changed_by_user_id: fk('users'),
      source: { type: Sequelize.STRING, allowNull: true },
      reason: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      changed_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('lead_status_histories', ['lead_id']);
    await queryInterface.addIndex('lead_status_histories', ['to_status']);
    await queryInterface.addIndex('lead_status_histories', ['changed_at']);

    await queryInterface.createTable('touchpoints', {
      id: id(),
      touchpoint_uuid: uuid(),
      contact_id: fk('contacts'),
      lead_id: fk('leads'),
      visitor_id: fk('visitors'),
      session_id: fk('sessions'),
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      channel: { type: Sequelize.STRING, allowNull: true },
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
      metadata: { type: Sequelize.JSON, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('touchpoints', ['contact_id']);
    await queryInterface.addIndex('touchpoints', ['lead_id']);
    await queryInterface.addIndex('touchpoints', ['visitor_id']);
    await queryInterface.addIndex('touchpoints', ['session_id']);
    await queryInterface.addIndex('touchpoints', ['gclid']);
    await queryInterface.addIndex('touchpoints', ['fbclid']);
    await queryInterface.addIndex('touchpoints', ['occurred_at']);

    await queryInterface.createTable('events', {
      id: id(),
      event_uuid: uuid(),
      contact_id: fk('contacts'),
      lead_id: fk('leads'),
      visitor_id: fk('visitors'),
      session_id: fk('sessions'),
      event_type: { type: Sequelize.STRING, allowNull: false },
      event_source: { type: Sequelize.STRING, allowNull: true },
      properties: { type: Sequelize.JSON, allowNull: true },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('events', ['contact_id']);
    await queryInterface.addIndex('events', ['lead_id']);
    await queryInterface.addIndex('events', ['visitor_id']);
    await queryInterface.addIndex('events', ['session_id']);
    await queryInterface.addIndex('events', ['event_type']);
    await queryInterface.addIndex('events', ['occurred_at']);

    await queryInterface.createTable('smile_profiles', {
      id: id(),
      smile_profile_uuid: uuid(),
      contact_id: fk('contacts'),
      lead_id: fk('leads', false),
      visitor_id: fk('visitors'),
      session_id: fk('sessions'),
      workflow_id: { type: Sequelize.STRING, allowNull: true },
      workflow_version: { type: Sequelize.STRING, allowNull: true },
      landing_page: { type: Sequelize.STRING, allowNull: true },
      answers: { type: Sequelize.JSON, allowNull: false },
      ...timestamps,
    });
    await queryInterface.addIndex('smile_profiles', ['contact_id']);
    await queryInterface.addIndex('smile_profiles', ['lead_id']);
    await queryInterface.addIndex('smile_profiles', ['visitor_id']);
    await queryInterface.addIndex('smile_profiles', ['session_id']);
    await queryInterface.addIndex('smile_profiles', ['workflow_id']);

    await queryInterface.createTable('conversations', {
      id: id(),
      conversation_uuid: uuid(),
      contact_id: fk('contacts'),
      lead_id: fk('leads'),
      channel: { type: Sequelize.STRING, allowNull: false },
      external_conversation_id: { type: Sequelize.STRING, allowNull: true },
      external_user_id: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'open' },
      assigned_user_id: fk('users'),
      started_at: { type: Sequelize.DATE, allowNull: false },
      last_message_at: { type: Sequelize.DATE, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('conversations', ['contact_id']);
    await queryInterface.addIndex('conversations', ['lead_id']);
    await queryInterface.addIndex('conversations', ['channel']);
    await queryInterface.addIndex('conversations', ['status']);
    await queryInterface.addIndex('conversations', ['external_conversation_id']);

    await queryInterface.createTable('messages', {
      id: id(),
      message_uuid: uuid(),
      conversation_id: fk('conversations', false),
      direction: { type: Sequelize.STRING, allowNull: false },
      sender_type: { type: Sequelize.STRING, allowNull: false },
      external_message_id: { type: Sequelize.STRING, allowNull: true },
      message_type: { type: Sequelize.STRING, allowNull: true },
      body: { type: Sequelize.TEXT, allowNull: true },
      payload: { type: Sequelize.JSON, allowNull: true },
      sent_at: { type: Sequelize.DATE, allowNull: false },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('messages', ['conversation_id']);
    await queryInterface.addIndex('messages', ['sent_at']);

    await queryInterface.createTable('calls', {
      id: id(),
      call_uuid: uuid(),
      contact_id: fk('contacts'),
      lead_id: fk('leads'),
      user_id: fk('users'),
      direction: { type: Sequelize.STRING, allowNull: false },
      provider: { type: Sequelize.STRING, allowNull: true },
      provider_call_id: { type: Sequelize.STRING, allowNull: true },
      tracking_number: { type: Sequelize.STRING, allowNull: true },
      caller_number: { type: Sequelize.STRING, allowNull: true },
      destination_number: { type: Sequelize.STRING, allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: true },
      answered_at: { type: Sequelize.DATE, allowNull: true },
      ended_at: { type: Sequelize.DATE, allowNull: true },
      duration_seconds: { type: Sequelize.INTEGER, allowNull: true },
      disposition: { type: Sequelize.STRING, allowNull: true },
      recording_reference: { type: Sequelize.STRING, allowNull: true },
      transcript_reference: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('calls', ['contact_id']);
    await queryInterface.addIndex('calls', ['lead_id']);
    await queryInterface.addIndex('calls', ['user_id']);
    await queryInterface.addIndex('calls', ['provider_call_id']);
    await queryInterface.addIndex('calls', ['started_at']);

    await queryInterface.createTable('appointments', {
      id: id(),
      appointment_uuid: uuid(),
      contact_id: fk('contacts', false),
      lead_id: fk('leads'),
      location_id: { type: Sequelize.UUID, allowNull: true },
      provider_id: { type: Sequelize.UUID, allowNull: true },
      scheduled_at: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'scheduled' },
      open_dental_pat_num: { type: Sequelize.STRING, allowNull: true },
      open_dental_appointment_id: { type: Sequelize.STRING, allowNull: true },
      created_by_user_id: fk('users'),
      assigned_user_id: fk('users'),
      canceled_at: { type: Sequelize.DATE, allowNull: true },
      cancel_reason: { type: Sequelize.STRING, allowNull: true },
      no_show_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      external_system: { type: Sequelize.STRING, allowNull: true },
      external_id: { type: Sequelize.STRING, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('appointments', ['contact_id']);
    await queryInterface.addIndex('appointments', ['lead_id']);
    await queryInterface.addIndex('appointments', ['scheduled_at']);
    await queryInterface.addIndex('appointments', ['status']);
    await queryInterface.addIndex('appointments', ['open_dental_appointment_id']);

    await queryInterface.createTable('appointment_status_histories', {
      id: id(),
      appointment_id: fk('appointments', false),
      from_status: { type: Sequelize.STRING, allowNull: true },
      to_status: { type: Sequelize.STRING, allowNull: false },
      changed_by_user_id: fk('users'),
      source: { type: Sequelize.STRING, allowNull: true },
      reason: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      changed_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('appointment_status_histories', ['appointment_id']);
    await queryInterface.addIndex('appointment_status_histories', ['changed_at']);

    await queryInterface.createTable('products', {
      id: id(),
      product_uuid: uuid(),
      name: { type: Sequelize.STRING, allowNull: false },
      code: { type: Sequelize.STRING, allowNull: true, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      list_price: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: true },
      created_by_user_id: fk('users'),
      updated_by_user_id: fk('users'),
      ...timestamps,
    });
    await queryInterface.addIndex('products', ['active']);
    await queryInterface.addIndex('products', ['sort_order']);

    await queryInterface.createTable('treatments', {
      id: id(),
      treatment_uuid: uuid(),
      contact_id: fk('contacts', false),
      lead_id: fk('leads'),
      appointment_id: fk('appointments'),
      owner_user_id: fk('users'),
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'presented' },
      presented_at: { type: Sequelize.DATE, allowNull: true },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      quoted_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      accepted_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      close_reason: { type: Sequelize.STRING, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('treatments', ['contact_id']);
    await queryInterface.addIndex('treatments', ['lead_id']);
    await queryInterface.addIndex('treatments', ['appointment_id']);
    await queryInterface.addIndex('treatments', ['status']);

    await queryInterface.createTable('treatment_status_histories', {
      id: id(),
      treatment_id: fk('treatments', false),
      from_status: { type: Sequelize.STRING, allowNull: true },
      to_status: { type: Sequelize.STRING, allowNull: false },
      changed_by_user_id: fk('users'),
      source: { type: Sequelize.STRING, allowNull: true },
      reason: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      changed_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('treatment_status_histories', ['treatment_id']);
    await queryInterface.addIndex('treatment_status_histories', ['changed_at']);

    await queryInterface.createTable('treatment_items', {
      id: id(),
      treatment_id: fk('treatments', false),
      product_id: fk('products', false),
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      list_price_snapshot: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      total_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      created_by_user_id: fk('users'),
      ...timestamps,
    });
    await queryInterface.addIndex('treatment_items', ['treatment_id']);
    await queryInterface.addIndex('treatment_items', ['product_id']);

    await queryInterface.createTable('financings', {
      id: id(),
      financing_uuid: uuid(),
      treatment_id: fk('treatments', false),
      provider: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
      amount_requested: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      amount_approved: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      decision_at: { type: Sequelize.DATE, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('financings', ['treatment_id']);
    await queryInterface.addIndex('financings', ['status']);

    await queryInterface.createTable('financing_status_histories', {
      id: id(),
      financing_id: fk('financings', false),
      from_status: { type: Sequelize.STRING, allowNull: true },
      to_status: { type: Sequelize.STRING, allowNull: false },
      changed_by_user_id: fk('users'),
      source: { type: Sequelize.STRING, allowNull: true },
      reason: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      changed_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('financing_status_histories', ['financing_id']);
    await queryInterface.addIndex('financing_status_histories', ['changed_at']);

    await queryInterface.createTable('activities', {
      id: id(),
      activity_uuid: uuid(),
      contact_id: fk('contacts', false),
      lead_id: fk('leads'),
      appointment_id: fk('appointments'),
      treatment_id: fk('treatments'),
      user_id: fk('users'),
      activity_type: { type: Sequelize.STRING, allowNull: false },
      summary: { type: Sequelize.STRING, allowNull: true },
      details: { type: Sequelize.JSON, allowNull: true },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('activities', ['contact_id']);
    await queryInterface.addIndex('activities', ['lead_id']);
    await queryInterface.addIndex('activities', ['appointment_id']);
    await queryInterface.addIndex('activities', ['treatment_id']);
    await queryInterface.addIndex('activities', ['activity_type']);
    await queryInterface.addIndex('activities', ['occurred_at']);

    await queryInterface.createTable('tasks', {
      id: id(),
      task_uuid: uuid(),
      contact_id: fk('contacts', false),
      lead_id: fk('leads'),
      appointment_id: fk('appointments'),
      treatment_id: fk('treatments'),
      assigned_user_id: fk('users'),
      task_type: { type: Sequelize.STRING, allowNull: true },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'open' },
      priority: { type: Sequelize.STRING, allowNull: true },
      due_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      created_by_user_id: fk('users'),
      ...timestamps,
    });
    await queryInterface.addIndex('tasks', ['contact_id']);
    await queryInterface.addIndex('tasks', ['lead_id']);
    await queryInterface.addIndex('tasks', ['assigned_user_id']);
    await queryInterface.addIndex('tasks', ['status']);
    await queryInterface.addIndex('tasks', ['due_at']);
  },

  async down(queryInterface) {
    const tables = [
      'tasks',
      'activities',
      'financing_status_histories',
      'financings',
      'treatment_items',
      'treatment_status_histories',
      'treatments',
      'products',
      'appointment_status_histories',
      'appointments',
      'calls',
      'messages',
      'conversations',
      'smile_profiles',
      'events',
      'touchpoints',
      'lead_status_histories',
      'leads',
      'contact_identities',
      'contacts',
      'sessions',
      'visitors',
      'api_keys',
      'users',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  },
};
