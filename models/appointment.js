const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Appointment',
  'appointments',
  {
    id: uuidPk(),
    appointment_uuid: uuidCol(),
    contact_id: fk('contacts', { allowNull: false }),
    lead_id: fk('leads'),
    location_id: { type: DataTypes.UUID, allowNull: true },
    provider_id: { type: DataTypes.UUID, allowNull: true },
    scheduled_at: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'scheduled' },
    open_dental_pat_num: { type: DataTypes.STRING, allowNull: true },
    open_dental_appointment_id: { type: DataTypes.STRING, allowNull: true },
    created_by_user_id: fk('users'),
    assigned_user_id: fk('users'),
    canceled_at: { type: DataTypes.DATE, allowNull: true },
    cancel_reason: { type: DataTypes.STRING, allowNull: true },
    no_show_at: { type: DataTypes.DATE, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    external_system: { type: DataTypes.STRING, allowNull: true },
    external_id: { type: DataTypes.STRING, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['appointment_uuid'] },
      { fields: ['contact_id'] },
      { fields: ['lead_id'] },
      { fields: ['scheduled_at'] },
      { fields: ['status'] },
      { fields: ['open_dental_appointment_id'] },
    ],
  }
);
