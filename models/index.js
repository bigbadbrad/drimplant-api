const User = require('./user');
const ApiKey = require('./api_key');
const Visitor = require('./visitor');
const Session = require('./session');
const Touchpoint = require('./touchpoint');
const Event = require('./event');
const Lead = require('./lead');
const SmileProfile = require('./smile_profile');
const LeadStageHistory = require('./lead_stage_history');
const Consult = require('./consult');

Visitor.hasMany(Session, { foreignKey: 'visitor_id', as: 'sessions' });
Session.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });

Visitor.hasMany(Touchpoint, { foreignKey: 'visitor_id', as: 'touchpoints' });
Session.hasMany(Touchpoint, { foreignKey: 'session_id', as: 'touchpoints' });
Touchpoint.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
Touchpoint.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });
Touchpoint.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Lead.hasMany(Touchpoint, { foreignKey: 'lead_id', as: 'touchpoints' });

Lead.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
Lead.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });
Visitor.hasMany(Lead, { foreignKey: 'visitor_id', as: 'leads' });
Session.hasMany(Lead, { foreignKey: 'session_id', as: 'leads' });

Lead.hasMany(SmileProfile, { foreignKey: 'lead_id', as: 'smileProfiles' });
SmileProfile.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Visitor.hasMany(SmileProfile, { foreignKey: 'visitor_id', as: 'smileProfiles' });
Session.hasMany(SmileProfile, { foreignKey: 'session_id', as: 'smileProfiles' });
SmileProfile.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
SmileProfile.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });

Lead.hasMany(LeadStageHistory, { foreignKey: 'lead_id', as: 'stageHistory' });
LeadStageHistory.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

Lead.hasMany(Consult, { foreignKey: 'lead_id', as: 'consults' });
Consult.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

Visitor.hasMany(Event, { foreignKey: 'visitor_id', as: 'events' });
Session.hasMany(Event, { foreignKey: 'session_id', as: 'events' });
Lead.hasMany(Event, { foreignKey: 'lead_id', as: 'events' });
Event.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
Event.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });
Event.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

module.exports = {
  User,
  ApiKey,
  Visitor,
  Session,
  Touchpoint,
  Event,
  Lead,
  SmileProfile,
  LeadStageHistory,
  Consult,
};
