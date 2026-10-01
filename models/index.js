const User = require('./user');
const ApiKey = require('./api_key');
const Visitor = require('./visitor');
const Session = require('./session');
const Contact = require('./contact');
const ContactIdentity = require('./contact_identity');
const Lead = require('./lead');
const LeadStatusHistory = require('./lead_status_history');
const Touchpoint = require('./touchpoint');
const Event = require('./event');
const SmileProfile = require('./smile_profile');
const Activity = require('./activity');
const Task = require('./task');
const Conversation = require('./conversation');
const Message = require('./message');
const Call = require('./call');
const Appointment = require('./appointment');
const AppointmentStatusHistory = require('./appointment_status_history');
const Product = require('./product');
const Treatment = require('./treatment');
const TreatmentStatusHistory = require('./treatment_status_history');
const TreatmentItem = require('./treatment_item');
const Financing = require('./financing');
const FinancingStatusHistory = require('./financing_status_history');

Visitor.hasMany(Session, { foreignKey: 'visitor_id', as: 'sessions' });
Session.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });

Contact.hasMany(ContactIdentity, { foreignKey: 'contact_id', as: 'identities' });
ContactIdentity.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });

Contact.hasMany(Lead, { foreignKey: 'contact_id', as: 'leads' });
Lead.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
Lead.belongsTo(User, { foreignKey: 'owner_user_id', as: 'owner' });
Lead.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
Lead.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });
Visitor.hasMany(Lead, { foreignKey: 'visitor_id', as: 'leads' });
Session.hasMany(Lead, { foreignKey: 'session_id', as: 'leads' });

Lead.hasMany(LeadStatusHistory, { foreignKey: 'lead_id', as: 'statusHistory' });
LeadStatusHistory.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
LeadStatusHistory.belongsTo(User, { foreignKey: 'changed_by_user_id', as: 'changedBy' });

Contact.hasMany(Touchpoint, { foreignKey: 'contact_id', as: 'touchpoints' });
Visitor.hasMany(Touchpoint, { foreignKey: 'visitor_id', as: 'touchpoints' });
Session.hasMany(Touchpoint, { foreignKey: 'session_id', as: 'touchpoints' });
Lead.hasMany(Touchpoint, { foreignKey: 'lead_id', as: 'touchpoints' });
Touchpoint.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
Touchpoint.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
Touchpoint.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });
Touchpoint.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

Contact.hasMany(Event, { foreignKey: 'contact_id', as: 'events' });
Visitor.hasMany(Event, { foreignKey: 'visitor_id', as: 'events' });
Session.hasMany(Event, { foreignKey: 'session_id', as: 'events' });
Lead.hasMany(Event, { foreignKey: 'lead_id', as: 'events' });
Event.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
Event.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
Event.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });
Event.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

Contact.hasMany(SmileProfile, { foreignKey: 'contact_id', as: 'smileProfiles' });
Lead.hasMany(SmileProfile, { foreignKey: 'lead_id', as: 'smileProfiles' });
Visitor.hasMany(SmileProfile, { foreignKey: 'visitor_id', as: 'smileProfiles' });
Session.hasMany(SmileProfile, { foreignKey: 'session_id', as: 'smileProfiles' });
SmileProfile.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
SmileProfile.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
SmileProfile.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
SmileProfile.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });

Contact.hasMany(Activity, { foreignKey: 'contact_id', as: 'activities' });
Lead.hasMany(Activity, { foreignKey: 'lead_id', as: 'activities' });
Appointment.hasMany(Activity, { foreignKey: 'appointment_id', as: 'activities' });
Treatment.hasMany(Activity, { foreignKey: 'treatment_id', as: 'activities' });
Activity.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
Activity.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Activity.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
Activity.belongsTo(Treatment, { foreignKey: 'treatment_id', as: 'treatment' });
Activity.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Contact.hasMany(Task, { foreignKey: 'contact_id', as: 'tasks' });
Lead.hasMany(Task, { foreignKey: 'lead_id', as: 'tasks' });
Task.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
Task.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Task.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
Task.belongsTo(Treatment, { foreignKey: 'treatment_id', as: 'treatment' });
Task.belongsTo(User, { foreignKey: 'assigned_user_id', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });

Contact.hasMany(Conversation, { foreignKey: 'contact_id', as: 'conversations' });
Lead.hasMany(Conversation, { foreignKey: 'lead_id', as: 'conversations' });
Conversation.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
Conversation.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Conversation.belongsTo(User, { foreignKey: 'assigned_user_id', as: 'assignee' });
Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' });

Contact.hasMany(Call, { foreignKey: 'contact_id', as: 'calls' });
Lead.hasMany(Call, { foreignKey: 'lead_id', as: 'calls' });
Call.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
Call.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Call.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Contact.hasMany(Appointment, { foreignKey: 'contact_id', as: 'appointments' });
Lead.hasMany(Appointment, { foreignKey: 'lead_id', as: 'appointments' });
Appointment.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
Appointment.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Appointment.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
Appointment.belongsTo(User, { foreignKey: 'assigned_user_id', as: 'assignee' });
Appointment.hasMany(AppointmentStatusHistory, { foreignKey: 'appointment_id', as: 'statusHistory' });
AppointmentStatusHistory.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
AppointmentStatusHistory.belongsTo(User, { foreignKey: 'changed_by_user_id', as: 'changedBy' });

Contact.hasMany(Treatment, { foreignKey: 'contact_id', as: 'treatments' });
Lead.hasMany(Treatment, { foreignKey: 'lead_id', as: 'treatments' });
Appointment.hasMany(Treatment, { foreignKey: 'appointment_id', as: 'treatments' });
Treatment.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
Treatment.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Treatment.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
Treatment.belongsTo(User, { foreignKey: 'owner_user_id', as: 'owner' });
Treatment.hasMany(TreatmentStatusHistory, { foreignKey: 'treatment_id', as: 'statusHistory' });
TreatmentStatusHistory.belongsTo(Treatment, { foreignKey: 'treatment_id', as: 'treatment' });
TreatmentStatusHistory.belongsTo(User, { foreignKey: 'changed_by_user_id', as: 'changedBy' });

Product.hasMany(TreatmentItem, { foreignKey: 'product_id', as: 'treatmentItems' });
Treatment.hasMany(TreatmentItem, { foreignKey: 'treatment_id', as: 'items' });
TreatmentItem.belongsTo(Treatment, { foreignKey: 'treatment_id', as: 'treatment' });
TreatmentItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
TreatmentItem.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
Product.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
Product.belongsTo(User, { foreignKey: 'updated_by_user_id', as: 'updatedBy' });

Treatment.hasMany(Financing, { foreignKey: 'treatment_id', as: 'financings' });
Financing.belongsTo(Treatment, { foreignKey: 'treatment_id', as: 'treatment' });
Financing.hasMany(FinancingStatusHistory, { foreignKey: 'financing_id', as: 'statusHistory' });
FinancingStatusHistory.belongsTo(Financing, { foreignKey: 'financing_id', as: 'financing' });
FinancingStatusHistory.belongsTo(User, { foreignKey: 'changed_by_user_id', as: 'changedBy' });

module.exports = {
  User,
  ApiKey,
  Visitor,
  Session,
  Contact,
  ContactIdentity,
  Lead,
  LeadStatusHistory,
  Touchpoint,
  Event,
  SmileProfile,
  Activity,
  Task,
  Conversation,
  Message,
  Call,
  Appointment,
  AppointmentStatusHistory,
  Product,
  Treatment,
  TreatmentStatusHistory,
  TreatmentItem,
  Financing,
  FinancingStatusHistory,
};
