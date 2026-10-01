const { DataTypes, uuidPk, uuidCol, fk, defineModel } = require('./_schema');

module.exports = defineModel(
  'Task',
  'tasks',
  {
    id: uuidPk(),
    task_uuid: uuidCol(),
    contact_id: fk('contacts', { allowNull: false }),
    lead_id: fk('leads'),
    appointment_id: fk('appointments'),
    treatment_id: fk('treatments'),
    assigned_user_id: fk('users'),
    task_type: { type: DataTypes.STRING, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'open' },
    priority: { type: DataTypes.STRING, allowNull: true },
    due_at: { type: DataTypes.DATE, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    created_by_user_id: fk('users'),
  },
  {
    indexes: [
      { unique: true, fields: ['task_uuid'] },
      { fields: ['contact_id'] },
      { fields: ['lead_id'] },
      { fields: ['assigned_user_id'] },
      { fields: ['status'] },
      { fields: ['due_at'] },
    ],
  }
);
