# Dr. Implant API
## Initial Backend Refactor Specification

## 1. Objective

Create a new backend called:

```text
drimplant-api
```

This repository is a copy of an existing production Node/Express/MySQL backend called:

```text
space-api
```

Do not rebuild the backend from scratch.

`space-api` is known to work and contains infrastructure and integrations we want to preserve wherever they are generic and useful.

The goal is:

```text
space-api
    ↓
drimplant-api
```

Preserve proven infrastructure.

Remove Space-specific and ABM-specific business logic.

Replace the Space business domain with the Dr. Implant acquisition, lead-management, consult, treatment, conversation, and attribution domain.

Before changing code, inspect the entire repository and understand:

- application startup
- Express configuration
- routes
- controllers
- services
- Sequelize models
- `models/index.js`
- model relationships
- MySQL configuration
- migrations
- transactions
- middleware
- authentication
- API keys
- validation
- logging
- error handling
- environment variables
- Docker/deployment configuration
- tests
- reusable utilities
- PostHog code
- Salesforce code
- ABM-specific code
- queues/jobs
- integration helpers

Do not rewrite working infrastructure merely because another implementation is possible.

Use the existing project as the chassis.

---

# 2. Technology Stack

Preserve the existing stack:

```text
Node.js
Express
MySQL
Sequelize
```

Do not introduce:

```text
NestJS
GraphQL
MongoDB
Supabase
Prisma
TypeORM
Knex
Kafka
microservices
```

unless an existing dependency is already materially required.

The goal is a smaller, cleaner version of `space-api`.

---

# 3. Preserve Existing Sequelize Architecture

Continue using individual Sequelize model files and centralized model associations in:

```text
/models/index.js
```

Reuse the existing:

- Sequelize configuration
- connection setup
- connection pooling
- model-definition conventions
- timestamps
- migrations
- indexes
- validation
- transactions
- associations
- model export conventions

Before creating Dr. Implant models, inspect existing models to determine:

- primary-key conventions
- UUID usage
- snake_case / camelCase behavior
- `underscored` settings
- timestamps
- soft deletes / `paranoid`
- validation
- hooks
- ENUM usage
- JSON field usage
- scopes

Follow existing conventions where they are sound.

Do not redesign the persistence layer unnecessarily.

---

# 4. Overall Architecture

There is one Dr. Implant backend.

There is not a separate PHI backend and marketing backend.

Production will ultimately run inside Aptible.

Architecture:

```text
Website / Landing Pages / Widget / Videos
Facebook Messenger
Future Website Chat
Future SMS
                 |
                 v
           drimplant-api
           Node / Express
                 |
                 v
          MySQL / Sequelize
                 |
       +---------+----------+----------+----------+
       |         |          |          |          |
       v         v          v          v          v
    PostHog  Salesforce  Telnyx      Meta      Google
```

The backend should ultimately connect:

```text
acquisition
→ visitor
→ session
→ lead
→ conversations
→ calls
→ consults
→ treatment accepted
→ procedure scheduled
→ procedure completed
→ revenue
```

---

# 5. Security / PHI Philosophy

All production application data will ultimately live inside the protected Aptible environment.

Do not physically split PHI and non-PHI into separate applications or databases.

Use this principle:

> Store everything safely. Share selectively.

Internally, Dr. Implant should be able to connect:

```text
Meta ad
→ visitor
→ session
→ website or conversation activity
→ lead
→ booked consult
→ completed consult
→ treatment accepted
→ procedure completed
→ revenue
```

The PHI distinction is especially important when data leaves our backend.

External integration modules must explicitly control which fields are transmitted to:

```text
PostHog
Salesforce
Telnyx
Meta
Google
other vendors
```

Never blindly serialize complete Sequelize objects to third-party APIs.

Use explicit payload builders such as:

```javascript
buildPosthogPayload(...)
buildSalesforcePayload(...)
buildMetaPayload(...)
buildTelnyxPayload(...)
```

---

# 6. Local Development

Development should work like `space-api`.

Use:

```text
Node / Express
+
local MySQL
```

Local database:

```text
drimplant_db
```

Local development must use fake or synthetic patient data only.

Do not require real PHI locally.

Production will eventually use Aptible-hosted MySQL and production environment variables.

Provide:

```text
.env.example
```

with safe placeholder values only.

Never commit production secrets.

---

# 7. Canonical Lead Lifecycle

Use these exact conceptual stages:

```text
LEAD
BOOKED_CONSULT
COMPLETED_CONSULT
CANCELED
NO_SHOW
TREATMENT_ACCEPTED
PROCEDURE_SCHEDULED
PROCEDURE_COMPLETED
```

Suggested stored values:

```text
lead
booked_consult
completed_consult
canceled
no_show
treatment_accepted
procedure_scheduled
procedure_completed
```

Centralize these values.

Do not invent additional canonical stages such as:

```text
qualified
contacted
opportunity
closed_won
treatment_plan_presented
```

Those may later exist as events or activities.

---

# 8. Lifecycle Is Not Strictly Linear

Support real-world flows such as:

```text
LEAD
→ BOOKED_CONSULT
→ NO_SHOW
→ BOOKED_CONSULT
→ COMPLETED_CONSULT
```

and:

```text
LEAD
→ BOOKED_CONSULT
→ CANCELED
→ BOOKED_CONSULT
→ COMPLETED_CONSULT
```

Keep:

```text
Lead.current_stage
```

plus complete lifecycle history.

Never destroy prior lifecycle transitions.

---

# 9. Initial Core Models

Likely reusable generic models:

```text
User
ApiKey
```

Keep these only if they support useful generic authentication/admin infrastructure.

Create these core Dr. Implant models:

```text
Visitor
Session
Touchpoint
Event

Lead
LeadResponse
LeadStageHistory
Consult
```

Future models the architecture must support cleanly:

```text
Conversation
Message
ConversationParticipant

Call
Communication

Treatment
Procedure
Revenue
Consent
AuditLog
LeadIdentity
```

Do not necessarily implement every future model now.

Design V1 so they can be added naturally without restructuring the core architecture.

---

# 10. Remove Old Space / ABM Domain Logic

Remove Space-specific and ABM-specific code unless it is genuinely reusable infrastructure.

Examples include:

```text
CustomerCompany
ProspectCompany
CompanyDomain
Contact
ContactIdentity
IntentSignal
LeadRequest
DailyAccountIntent
AccountAiSummary

AbmScoreConfig
AbmScoreWeight
AbmEventRule
AbmPromptTemplate
AbmAdminAuditLog
AbmOperatorAction
AbmTopicRule
AbmSourceWeight
AbmProgramRule
AbmProgramSuppressionRule
AbmLaneDefinition
AbmAgencyBlacklist

Mission models
Procurement models
Program models
Pursuit models
Enrichment models
Publisher models
```

Also inspect/remove corresponding:

- routes
- controllers
- services
- tests
- jobs
- constants
- migrations
- environment variables
- documentation
- scheduled tasks
- ABM-specific analytics logic

Do not simply rename old ABM concepts to Dr. Implant concepts.

---

# 11. Preserve Working Integration Infrastructure

This is a critical rule.

Known-good integration code is an asset.

Do not delete or rewrite working generic integration code merely because the Space business domain is changing.

Specifically preserve working generic code related to:

```text
PostHog identity stitching
PostHog client setup
PostHog capture helpers

Salesforce authentication
Salesforce API client
Salesforce token handling
Salesforce retries
Salesforce webhooks
Salesforce sync helpers
Salesforce queue/job infrastructure

generic retry handling
generic queue infrastructure
generic integration error handling
```

The rule is:

> Remove old business semantics, not proven infrastructure.

---

# 12. Replace Old ABM Client with Future Dr. Implant Dashboard

The old Space system supported an ABM client.

Dr. Implant will instead eventually have a:

```text
Dr. Implant Dashboard
```

Conceptual architecture:

```text
drimplant-dashboard
        |
        | HTTPS API
        v
   drimplant-api
        |
        v
      MySQL
```

The future dashboard will support areas such as:

```text
Executive analytics

Acquisition analytics

Leads

Lead detail

Consults

Lifecycle funnel

Calls

Conversations

Messenger conversations

SMS

Call-center workflow

Locations

Sales reps / agents

Campaign attribution

Treatment acceptance

Procedure status

Revenue attribution
```

Do not build the dashboard frontend during this backend refactor.

Design the backend so the dashboard can be added cleanly later.

---

# 13. Public vs Internal APIs

The same backend should eventually support both:

```text
public acquisition APIs
```

and:

```text
authenticated dashboard APIs
```

Conceptually:

```text
PUBLIC

/v1/visitors
/v1/sessions
/v1/touchpoints
/v1/events
/v1/leads
```

Future internal routes may use something such as:

```text
/v1/admin/*
```

Use existing repository conventions where appropriate.

Keep public acquisition authorization separate from future dashboard authorization.

---

# 14. Visitor Model

A Visitor represents a persistent anonymous browser identity.

Suggested fields:

```text
id
visitor_uuid

first_seen_at
last_seen_at

created_at
updated_at
```

Use a safe public UUID.

Do not expose sequential internal IDs publicly where avoidable.

A Visitor should persist across multiple Sessions where technically possible.

---

# 15. Session Model

A Visitor may have many Sessions.

Suggested fields:

```text
id
session_uuid
visitor_id

started_at
last_activity_at

landing_page
referrer
language

user_agent
device_type

created_at
updated_at
```

Relationship:

```text
Visitor 1 → many Sessions
```

`session_uuid` is an important acquisition and conversion attribution bridge.

---

# 16. Anonymous Identity Strategy

When someone first arrives on a Dr. Implant site, the frontend should create or retrieve a stable:

```text
visitor_uuid
```

Example:

```text
visitor_uuid = V123
```

Do not create a new Visitor for every page view.

Persist the visitor identifier using an appropriate first-party browser mechanism.

Each browsing session receives:

```text
session_uuid
```

Example:

```text
visitor_uuid = V123
session_uuid = S001
```

Anonymous behavioral data should therefore be attributable to:

```text
Visitor V123
Session S001
```

---

# 17. Touchpoint Model

Create:

```text
Touchpoint
```

Purpose:

Store raw acquisition and attribution information.

Suggested fields:

```text
id

visitor_id
session_id
lead_id nullable

occurred_at

source
medium
campaign

campaign_id
adset_id
ad_id
creative_id

utm_source
utm_medium
utm_campaign
utm_term
utm_content

gclid
gbraid
wbraid
fbclid

landing_page
landing_page_variant

created_at
updated_at
```

Most acquisition fields should be nullable.

Do not assume every source supplies every identifier.

Do not collapse all attribution information into Lead.

Store raw touchpoints so the system can later support:

```text
first touch
lead-creation touch
last touch
conversion touch
```

Do not build sophisticated attribution algorithms yet.

Capture the underlying data correctly.

---

# 18. Event Model

Create:

```text
Event
```

Suggested fields:

```text
id
event_uuid

visitor_id nullable
session_id nullable
lead_id nullable

event_type
event_source

properties JSON nullable

occurred_at
created_at
```

Examples:

```text
page_viewed

video_started
video_progress
video_completed

widget_opened
widget_started
widget_step_viewed
widget_step_completed
widget_completed
widget_abandoned

conversation_started
conversation_message_received
conversation_message_sent
conversation_handoff_requested
conversation_handoff_completed

lead_created

consult_booked
consult_canceled
consult_no_show
consult_completed

treatment_accepted

procedure_scheduled
procedure_completed
```

Use `properties` for event-specific metadata.

Do not put sensitive questionnaire content into generic analytics events when a dedicated `LeadResponse` is more appropriate.

---

# 19. Preserve Existing PostHog Infrastructure

Inspect all existing PostHog-related code before changing anything.

The existing Space/full-orbit implementation already has working PostHog behavior.

Treat that implementation as known-good unless inspection shows otherwise.

Specifically look for:

```text
anonymous identity handling
distinct_id
identify
alias
identity merge
visitor UUID logic
session identity
lead/contact identity
anonymous → known stitching
event capture
frontend/backend coordination
PostHog client initialization
retry/error handling
configuration
environment-variable handling
```

If existing code handles this correctly:

> KEEP IT.

Prefer:

```text
retain
adapt
rename
simplify
```

over:

```text
delete
rewrite
replace
```

Remove only Space/ABM-specific business logic layered on top of generic PostHog infrastructure.

For example, ABM-specific:

```text
account scoring
account intent
company-level classification
ABM dashboards
ABM event interpretation
```

may be removed.

Do not remove working generic PostHog infrastructure.

---

# 20. PostHog Anonymous Identity Strategy

The desired Dr. Implant anonymous identity is:

```text
visitor_uuid
```

Conceptually:

```text
PostHog distinct_id = visitor_uuid
```

Example:

```text
V123 → page_viewed
V123 → video_started
V123 → video_75_percent
V123 → widget_started
V123 → widget_completed
```

Do not intentionally create unrelated analytics identities for different parts of the same anonymous journey.

If the existing working implementation uses a slightly different internal mechanism but achieves the same result reliably, preserve the proven mechanism rather than changing it merely to match this document cosmetically.

---

# 21. Lead Model

Create:

```text
Lead
```

Suggested fields:

```text
id
lead_uuid

visitor_id nullable
session_id nullable

first_name
last_name
email
phone

preferred_language
location_id nullable

current_stage

created_at
updated_at
```

A Lead may originate from:

```text
website widget
website form
Facebook Messenger
phone call
SMS
manual call-center entry
referral
future channels
```

Therefore:

```text
visitor_id
session_id
```

must remain nullable.

Do not assume every Lead originates from a website Session.

---

# 22. Anonymous-to-Known Identity Stitching

This is a core architectural requirement.

Example:

```text
Visitor = V123
Session = S001
```

The person:

```text
views landing page
watches video
uses widget
submits contact information
```

The backend creates:

```text
Lead = L456
```

The system must preserve:

```text
V123 → L456
```

and:

```text
S001 → conversion session for L456
```

Conceptually:

```text
Meta Ad
   ↓
Visitor V123
   ↓
Session S001
   ↓
anonymous activity
   ↓
Lead L456
```

Do not create the Lead as a disconnected identity.

The Dr. Implant database is the authoritative identity map.

---

# 23. Canonical Known Lead Identity

Once a Lead exists, use:

```text
lead_uuid
```

as the canonical internal known Lead identifier.

Example:

```text
lead_uuid = L456
```

Do not use:

```text
email
phone
name
```

as the canonical analytics identity.

Desired relationship:

```text
anonymous:
V123

known:
L456

mapping:
V123 → L456
```

---

# 24. PostHog Identity Merge

When a Lead becomes known, the system must preserve the ability to associate that Lead with prior anonymous PostHog history.

Example:

```text
BEFORE CONVERSION

V123
 ├─ page_viewed
 ├─ video_75_percent
 ├─ widget_started
 └─ widget_completed
```

Then:

```text
Dr Implant:
V123 → L456
```

Then the known Lead should be associated with that earlier anonymous history using the existing proven PostHog identify/alias/merge implementation.

Critical instruction:

> If existing code in `space-api` already performs this anonymous-to-known PostHog stitching, KEEP THAT CODE.

Do not rewrite it simply because the business entity changes from Space concepts to Dr. Implant Lead concepts.

Adapt only the domain mapping.

Preserve existing:

```text
identify logic
alias logic
distinct_id handling
anonymous visitor handling
session linkage
frontend/backend identity coordination
tests
error handling
```

where they are generic and working.

---

# 25. Returning Visitor Behavior

If the same browser returns:

```text
visitor_uuid = V123
```

the Visitor remains V123.

A new Session may be:

```text
S002
```

but the Visitor identity remains stable.

If V123 is already associated with Lead L456, later activity should remain attributable to L456 where appropriate.

Do not automatically create duplicate Leads because a new Session exists.

---

# 26. Cross-Channel Identity

The architecture must allow multiple external identities to eventually resolve to one Lead.

Example:

```text
Website Visitor V123
        |
        v
      Lead L456
        ^
        |
Facebook Messenger User M789
```

or:

```text
Phone identity
      |
      v
    Lead L456
```

Do not implement sophisticated identity resolution now.

But do not design the system as though:

```text
Lead = one browser
```

or:

```text
Lead = one Messenger user
```

Lead is the canonical business entity.

---

# 27. Future LeadIdentity Model

The architecture should allow a future:

```text
LeadIdentity
```

Conceptual fields:

```text
id
lead_id

identity_type
identity_value
source

verified_at nullable

created_at
updated_at
```

Possible identity types:

```text
visitor_uuid
email
phone
facebook_psid
salesforce_contact_id
telnyx_identity
```

Do not introduce this abstraction prematurely if direct V1 relationships are sufficient.

---

# 28. LeadResponse Model

Create:

```text
LeadResponse
```

Suggested fields:

```text
id
lead_id

question_key
response_value nullable
response_json nullable

created_at
updated_at
```

Examples:

```text
implant_interest
number_of_missing_teeth
current_dentures
timeline
financing_interest
preferred_contact_method
```

Do not hardcode every widget response directly into Lead.

---

# 29. LeadStageHistory Model

Create:

```text
LeadStageHistory
```

Suggested fields:

```text
id
lead_id

from_stage nullable
to_stage

changed_at

source
changed_by nullable
reason nullable

metadata JSON nullable

created_at
```

Lifecycle changes must atomically:

```text
update Lead.current_stage
+
insert LeadStageHistory
+
insert Event where appropriate
```

Use Sequelize transactions.

---

# 30. Consult Model

Create:

```text
Consult
```

Consults are first-class business records.

Suggested fields:

```text
id
consult_uuid

lead_id

location_id nullable
provider_id nullable

scheduled_at

status

canceled_at nullable
cancel_reason nullable

no_show_at nullable
completed_at nullable

external_system nullable
external_id nullable

created_at
updated_at
```

Suggested statuses:

```text
scheduled
canceled
no_show
completed
```

A Lead may have multiple Consult records.

Example:

```text
Consult #1
canceled

Consult #2
no_show

Consult #3
completed
```

Lifecycle effects:

```text
Consult scheduled
→ BOOKED_CONSULT

Consult canceled
→ CANCELED

Consult no-show
→ NO_SHOW

Consult completed
→ COMPLETED_CONSULT

Consult rebooked
→ BOOKED_CONSULT
```

Keep this logic in the service/business layer.

---

# 31. Core Model Relationships

Define associations centrally in:

```text
models/index.js
```

Conceptually:

```text
Visitor 1 → many Sessions

Visitor 1 → many Touchpoints
Session  1 → many Touchpoints

Lead belongsTo Visitor optionally
Lead belongsTo Session optionally

Lead 1 → many LeadResponses
Lead 1 → many LeadStageHistory records
Lead 1 → many Consults

Visitor / Session / Lead
→ Events
```

Conceptual Sequelize relationships:

```javascript
Visitor.hasMany(Session, {
  foreignKey: 'visitor_id',
  as: 'sessions'
});

Session.belongsTo(Visitor, {
  foreignKey: 'visitor_id',
  as: 'visitor'
});

Lead.belongsTo(Visitor, {
  foreignKey: 'visitor_id',
  as: 'visitor'
});

Lead.belongsTo(Session, {
  foreignKey: 'session_id',
  as: 'session'
});

Lead.hasMany(LeadResponse, {
  foreignKey: 'lead_id',
  as: 'responses'
});

LeadResponse.belongsTo(Lead, {
  foreignKey: 'lead_id',
  as: 'lead'
});

Lead.hasMany(LeadStageHistory, {
  foreignKey: 'lead_id',
  as: 'stageHistory'
});

LeadStageHistory.belongsTo(Lead, {
  foreignKey: 'lead_id',
  as: 'lead'
});

Lead.hasMany(Consult, {
  foreignKey: 'lead_id',
  as: 'consults'
});

Consult.belongsTo(Lead, {
  foreignKey: 'lead_id',
  as: 'lead'
});
```

Adapt exact syntax to existing conventions.

---

# 32. Initial API

Implement approximately:

```text
POST /v1/visitors

POST /v1/sessions

POST /v1/touchpoints

POST /v1/events

POST  /v1/leads
GET   /v1/leads/:id
PATCH /v1/leads/:id

POST /v1/leads/:id/stage

POST /v1/leads/:id/responses

GET  /v1/leads/:id/consults
POST /v1/leads/:id/consults

PATCH /v1/consults/:id
```

Follow existing repository routing conventions where they are sound.

---

# 33. Lead Creation

Lead creation should:

1. validate input
2. normalize fields
3. create Lead
4. set initial stage to `LEAD`
5. create initial LeadStageHistory
6. store LeadResponses
7. associate Visitor if available
8. associate conversion Session if available
9. associate relevant Touchpoints
10. create `lead_created` Event
11. preserve existing PostHog anonymous-to-known identity stitching where applicable
12. perform database writes transactionally
13. return public `lead_uuid`

Lead creation must also work without Visitor or Session for:

```text
Messenger
phone
SMS
manual entry
referral
```

---

# 34. Stage Transition Service

Create one centralized lifecycle transition mechanism.

Conceptually:

```javascript
transitionLeadStage({
  leadId,
  toStage,
  source,
  changedBy,
  reason,
  metadata
});
```

The service should:

1. load Lead
2. validate destination stage
3. validate transition
4. start transaction
5. update `Lead.current_stage`
6. insert LeadStageHistory
7. create related Event where appropriate
8. commit
9. roll back on failure

Do not allow arbitrary code throughout the application to directly mutate lifecycle stage.

---

# 35. Allowed Lifecycle Transitions

Support at minimum:

```text
LEAD → BOOKED_CONSULT

BOOKED_CONSULT → COMPLETED_CONSULT
BOOKED_CONSULT → CANCELED
BOOKED_CONSULT → NO_SHOW

CANCELED → BOOKED_CONSULT
NO_SHOW → BOOKED_CONSULT

COMPLETED_CONSULT → TREATMENT_ACCEPTED

TREATMENT_ACCEPTED → PROCEDURE_SCHEDULED

PROCEDURE_SCHEDULED → PROCEDURE_COMPLETED
```

Reject nonsensical transitions.

Keep transition rules centralized.

---

# 36. Future Conversation Architecture

The backend must be ready for conversational lead acquisition through:

```text
Facebook Messenger
website chat
SMS
possibly WhatsApp
```

Do not build the complete messaging system now.

Design for:

```text
Conversation
→ Messages
→ Lead
```

Conceptual flow:

```text
Facebook Messenger Ad
        |
        v
Messenger
        |
        | webhook
        v
drimplant-api
        |
        v
Conversation
        |
        +→ Message
        +→ Message
        +→ Message
        |
        v
Lead
```

The backend should eventually control qualification and conversational logic.

---

# 37. Future Conversation Model

Plan for:

```text
Conversation
```

Conceptual fields:

```text
id
conversation_uuid

lead_id nullable
visitor_id nullable
session_id nullable

channel

external_conversation_id nullable
external_user_id nullable

status

assigned_user_id nullable

started_at
last_message_at
closed_at nullable

metadata JSON nullable

created_at
updated_at
```

Possible channels:

```text
facebook_messenger
web_chat
sms
whatsapp
```

Use one vendor-neutral Conversation domain.

---

# 38. Future Message Model

Plan for:

```text
Message
```

Conceptual fields:

```text
id
message_uuid

conversation_id

direction
sender_type

external_message_id nullable

message_type
body nullable

payload JSON nullable

sent_at
delivered_at nullable
read_at nullable

created_at
```

Directions:

```text
inbound
outbound
```

Sender types:

```text
prospect
bot
agent
system
```

Support future:

```text
bot
→ human agent
→ automation
```

inside the same Conversation.

---

# 39. Conversation-to-Lead Relationship

A Conversation may begin before identity is known.

Example:

```text
Messenger user M789
→ conversation
→ qualification
→ person provides identifying information
→ Lead L456 created
```

Therefore:

```text
Conversation.lead_id
```

must be nullable initially.

Later:

```text
Conversation → Lead L456
```

Conversation history must remain intact.

---

# 40. Messenger Acquisition Attribution

Do not treat Messenger as a disconnected lead source.

Future architecture should support:

```text
Meta campaign
→ ad
→ click-to-Messenger
→ Conversation
→ Lead
→ Consult
→ Treatment
```

Where identifiers are available, attribution should connect:

```text
Touchpoint
Conversation
Lead
```

This should eventually support reporting such as:

```text
Meta Ad 92834

Messenger conversations: 420
Leads: 217
Booked consults: 83
Completed consults: 61
Treatment accepted: 19
Revenue: ...
```

---

# 41. Conversation Channel Adapters

Vendor-specific messaging logic should use adapters.

Conceptually:

```text
ConversationService
        |
        +→ MetaMessengerAdapter
        +→ TelnyxSmsAdapter
        +→ WebChatAdapter
```

Core logic should operate on:

```text
Conversation
Message
Lead
```

Do not tightly couple business logic to Meta or Telnyx.

---

# 42. Messenger Webhook Readiness

Future routes may include:

```text
GET  /v1/webhooks/meta/messenger
POST /v1/webhooks/meta/messenger
```

Future flow:

```text
verify webhook
normalize inbound payload
find/create Conversation
store Message
invoke ConversationService
create/update Lead if appropriate
generate response
send through Meta adapter
```

Keep vendor payload handling isolated.

---

# 43. Bot Logic Must Be Vendor-Neutral

Avoid future functions like:

```javascript
handleFacebookQuestion(...)
```

Prefer:

```javascript
processInboundMessage(...)
advanceConversation(...)
askNextQuestion(...)
captureLeadField(...)
handoffToAgent(...)
```

Then the same logic can power:

```text
Messenger
website chat
SMS
future channels
```

---

# 44. Human Handoff

Future Conversation state should support concepts such as:

```text
BOT_ACTIVE
HANDOFF_REQUESTED
AGENT_ACTIVE
CLOSED
```

These are Conversation states.

They are not Lead lifecycle stages.

---

# 45. Preserve Existing Salesforce Integration

This is another critical preservation rule.

The existing `space-api` Salesforce integration is known to work.

Do not delete it.

Before changing Salesforce code, inspect:

```text
authentication
OAuth/token handling
refresh logic
API client initialization
request helpers
retry logic
webhooks
sync helpers
background jobs
queues
upserts
external ID handling
mapping infrastructure
error handling
environment variables
tests
```

Preserve all generic working Salesforce infrastructure.

Prefer:

```text
reuse auth
reuse API client
reuse retries
reuse webhook handling
reuse queues/jobs
reuse upsert helpers
reuse external-ID handling
```

Only adapt the old Space-specific domain mapping.

For example, old entities may have mapped:

```text
ProspectCompany
Contact
LeadRequest
Mission
Pursuit
```

Dr. Implant mappings will eventually involve:

```text
Lead
Consult
Treatment
Procedure
Revenue
```

Do not assume exact Salesforce object mapping until the actual Dr. Implant Salesforce setup is inspected.

Preserve the transport and synchronization infrastructure first.

---

# 46. Integration Structure

Use clean integration boundaries.

Conceptually:

```text
integrations/
  posthog/
  salesforce/
  telnyx/
  meta/
  googleAds/
```

But do not move working code merely for aesthetic reasons if doing so creates unnecessary risk.

PostHog and Salesforce are existing proven integrations.

Preserve them and adapt them.

Future Meta code should eventually contain Messenger-specific adapters/webhooks.

Do not tightly couple integrations to Sequelize models.

---

# 47. Future Calls

Calls should eventually be first-class records.

Conceptual fields:

```text
lead_id
session_id

provider
provider_call_id

tracking_number
caller_number

location_id

started_at
answered_at
ended_at

duration

agent_id
direction
disposition

recording
transcript
```

Do not put call history directly on Lead.

---

# 48. Future Treatment / Procedure / Revenue

Future models:

```text
Treatment
Procedure
Revenue
```

The canonical Lead lifecycle ends at:

```text
PROCEDURE_COMPLETED
```

Revenue is financial data associated with downstream treatment, not a lifecycle stage.

---

# 49. Dashboard Analytics

The future Dr. Implant Dashboard should use the same underlying identity graph.

It should eventually support:

```text
Visitors
Sessions
Leads
Lead conversion rate

Booked consults
Completed consults
Canceled
No-shows

Treatment accepted
Procedure scheduled
Procedure completed

performance by:
campaign
ad
creative
landing page
video
location
language
lead source
conversation channel
```

Example:

```text
Creative A

2,402 visitors
311 leads
107 booked consults
81 completed consults
26 treatments accepted
```

Do not build disconnected marketing and operations datasets.

---

# 50. End-to-End Journey

The backend should ultimately reconstruct:

```text
Meta Campaign
      ↓
Ad 92834
      ↓
Visitor V123
      ↓
Session S001
      ↓
video/widget/conversation activity
      ↓
Lead L456
      ↓
Booked Consult
      ↓
Completed Consult
      ↓
Treatment Accepted
      ↓
Procedure Scheduled
      ↓
Procedure Completed
      ↓
Revenue
```

The Dr. Implant database is the source of truth.

PostHog and external systems consume selected views of that journey.

---

# 51. Validation

Reuse existing validation infrastructure where good.

Validate:

```text
UUIDs
email
phone
timestamps
lifecycle values
event payloads
questionnaire payloads
Consult statuses
required fields
request size
```

Do not trust frontend input.

Reject invalid lifecycle transitions.

---

# 52. Indexes

Add practical indexes including:

```text
Visitor.visitor_uuid

Session.session_uuid
Session.visitor_id

Touchpoint.visitor_id
Touchpoint.session_id
Touchpoint.lead_id
Touchpoint.gclid
Touchpoint.fbclid
Touchpoint.occurred_at

Event.visitor_id
Event.session_id
Event.lead_id
Event.event_type
Event.occurred_at

Lead.lead_uuid
Lead.visitor_id
Lead.session_id
Lead.current_stage
Lead.created_at
Lead.email
Lead.phone

LeadResponse.lead_id
LeadResponse.question_key

LeadStageHistory.lead_id
LeadStageHistory.to_stage
LeadStageHistory.changed_at

Consult.consult_uuid
Consult.lead_id
Consult.scheduled_at
Consult.status
```

Future Conversation/Message indexes should consider:

```text
conversation_uuid
lead_id
channel
external_conversation_id
external_user_id
conversation_id
external_message_id
sent_at
```

Do not over-index.

---

# 53. Migrations

Preserve the current migration tooling if sound.

Create a clean migration history appropriate for Dr. Implant.

Do not depend on manual production schema changes.

Local and production databases must be reproducible from the same migrations.

---

# 54. Logging

Preserve good logging infrastructure.

Do not routinely log:

```text
patient names
phone numbers
emails
questionnaire responses
Consult details
treatment details
financial information
full request bodies
Messenger messages
SMS contents
conversation bodies
call transcripts
```

Prefer:

```text
visitor_uuid
session_uuid
lead_uuid
consult_uuid
conversation_uuid
event_type
route
status
duration
error code
```

Do not dump Sequelize objects containing PHI into logs.

---

# 55. Error Handling

Reuse centralized error handling where appropriate.

Do not expose:

```text
SQL errors
Sequelize internals
stack traces
database credentials
environment variables
internal infrastructure details
```

through public API responses.

---

# 56. Authentication / API Security

Do not overbuild employee authentication yet.

Public acquisition endpoints need:

```text
validation
rate limiting
request-size limits
abuse protection
CORS
secure headers
```

Retain useful generic:

```text
User
ApiKey
```

infrastructure where appropriate.

Future Dashboard routes will require authenticated internal access.

Keep public and internal authorization concerns separate.

---

# 57. Environment Configuration

Clean out Space-specific environment variables.

Initial concepts:

```text
NODE_ENV
PORT

DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

Preserve working existing PostHog and Salesforce environment configuration where those integrations are retained.

Future variables may include:

```text
TELNYX_*

META_APP_ID
META_APP_SECRET
META_VERIFY_TOKEN
META_PAGE_ACCESS_TOKEN

GOOGLE_ADS_*
```

Do not require integrations that are not yet used.

---

# 58. Repository Cleanup

Perform repository-wide cleanup of Space-specific business logic.

However:

> Do not blindly delete code because it lives inside an old Space or ABM directory.

Inspect first.

Specifically preserve useful generic code related to:

```text
PostHog identity stitching
PostHog event capture
PostHog client configuration

Salesforce authentication
Salesforce API client
Salesforce synchronization
Salesforce webhook handling

generic queues
generic retry logic
generic background jobs
generic integration error handling
generic API security
generic authentication
generic logging
```

Delete only code genuinely tied to obsolete Space/ABM business behavior.

---

# 59. README

Rewrite README for:

```text
drimplant-api
```

Document:

- application purpose
- technology stack
- local development
- MySQL setup
- `.env`
- `drimplant_db`
- migrations
- tests
- lifecycle stages
- Visitor / Session / Lead identity model
- PostHog identity stitching
- Salesforce preservation
- Consult model
- fake-data-only local rule
- eventual Aptible deployment
- future Dr. Implant Dashboard
- future Messenger/SMS/web-chat architecture

Use actual repository commands.

---

# 60. Tests

Reuse the existing test framework.

Preserve useful existing integration tests.

## Lead Creation

Test:

```text
Lead creation succeeds

initial stage = LEAD

initial LeadStageHistory exists

LeadResponses stored

Visitor association works

Session association works

Lead creation works without Visitor/Session

lead_created Event created

invalid payload rejected
```

## Identity Stitching

Preserve and adapt existing working PostHog identity tests.

Test:

```text
Visitor persists across Sessions

Lead may link to Visitor

conversion Session links to Lead

Visitor → Lead mapping is preserved

returning Session does not automatically create duplicate Lead

anonymous PostHog history can be associated with known Lead identity
```

If working PostHog alias/identify tests already exist:

> KEEP AND ADAPT THEM.

Do not replace equivalent working test coverage unnecessarily.

## Lifecycle

Test:

```text
LEAD → BOOKED_CONSULT

BOOKED_CONSULT → COMPLETED_CONSULT

BOOKED_CONSULT → CANCELED

BOOKED_CONSULT → NO_SHOW

CANCELED → BOOKED_CONSULT

NO_SHOW → BOOKED_CONSULT

COMPLETED_CONSULT → TREATMENT_ACCEPTED

TREATMENT_ACCEPTED → PROCEDURE_SCHEDULED

PROCEDURE_SCHEDULED → PROCEDURE_COMPLETED
```

Test invalid transitions.

## Consults

Test:

```text
create Consult
cancel Consult
mark Consult no-show
complete Consult
rebook Consult
multiple Consults for one Lead
```

Verify Lead lifecycle synchronization.

## Events

Test:

```text
anonymous Visitor event
Session event
Lead-linked event
JSON properties
invalid event rejection
```

## Transactions

Verify failures do not leave:

```text
Lead without initial history

Lead stage changed without history

Consult state changed without corresponding Lead lifecycle update
```

## Salesforce

Preserve generic existing Salesforce integration tests where still valid.

Adapt domain-specific fixtures and mappings rather than deleting working coverage.

---

# 61. Do Not Build Yet

Do not newly build:

```text
Messenger integration
Messenger bot logic
website chat UI
agent conversation UI
call-center UI
new Telnyx implementation unless existing reusable code already exists
call recording/transcription
Meta Conversions API
Google Ads offline conversions
financing integrations
complex lead scoring
AI conversation logic
automated follow-up
revenue accounting
patient portal
full employee RBAC
dashboard frontend
```

Do not rebuild working:

```text
PostHog identity infrastructure
Salesforce integration infrastructure
```

Preserve and adapt those.

---

# 62. Core Architecture Principles

Use these principles throughout the refactor:

> Store everything safely. Share selectively.

> One patient journey, many identifiers.

> Dr. Implant owns the identity graph.

> PostHog and external vendors consume selected views of that graph.

> Lead is the canonical known business entity.

> Visitor, Session, Messenger identity, phone identity, and other identifiers may eventually resolve to a Lead.

> Consult is a first-class Dr. Implant business entity.

> Known-good integration code is an asset.

> Remove old business logic, not proven infrastructure.

---

# 63. Definition of Done

The initial refactor is complete when:

1. Application is clearly `drimplant-api`.
2. Space-specific business logic is removed.
3. ABM-specific business logic is removed.
4. Useful generic Space infrastructure remains.
5. Sequelize remains the ORM.
6. Model relationships follow centralized existing conventions.
7. Application runs locally.
8. Local MySQL database is `drimplant_db`.
9. Migrations build a clean Dr. Implant schema.
10. Visitors work.
11. Visitors persist across Sessions.
12. Sessions work.
13. Touchpoints work.
14. Events work.
15. Leads work.
16. Leads can exist without Visitor/Session.
17. Visitor → Lead relationship works.
18. conversion Session → Lead relationship works.
19. LeadResponses work.
20. canonical lifecycle works.
21. LeadStageHistory works.
22. invalid lifecycle transitions are rejected.
23. Consults work.
24. multiple Consults per Lead work.
25. canceled/no-show/rebooking Consult flows work.
26. Consult changes synchronize with Lead lifecycle.
27. transaction integrity is enforced.
28. logging avoids unnecessary PHI.
29. `.env.example` contains no secrets.
30. tests cover core behavior.
31. README accurately documents the project.
32. old Space-domain dependencies required only by the old business are removed.
33. old ABM client assumptions are removed.
34. backend architecture supports a future Dr. Implant Dashboard.
35. public and internal APIs can use different authorization rules.
36. `visitor_uuid` is the persistent anonymous browser identity.
37. `session_uuid` represents browsing sessions beneath the Visitor.
38. `lead_uuid` is the canonical known Lead identity.
39. Visitor → Lead identity mapping is preserved.
40. existing working PostHog anonymous-to-known stitching code is preserved and adapted.
41. existing working PostHog tests are preserved where applicable.
42. email, phone, and name are not canonical analytics identity keys.
43. existing generic Salesforce integration infrastructure is preserved.
44. Salesforce domain-specific mappings are adapted rather than rewriting working transport/auth infrastructure.
45. existing generic Salesforce tests remain where applicable.
46. architecture supports future Conversation and Message models.
47. future Messenger/SMS/web-chat identities can resolve to the same Lead.
48. Conversation architecture remains vendor-neutral.
49. future Messenger webhooks can be added without restructuring core Lead architecture.
50. the future Dashboard can query one unified acquisition-to-treatment identity graph.
51. the system can ultimately reconstruct campaign/ad/visitor/session/lead/consult/treatment/revenue journeys.

---

# 64. First Step Before Editing

Before making changes, inspect the repository and provide a concise assessment.

## Keep

Identify reusable infrastructure such as:

```text
Express startup
Sequelize configuration
database handling
middleware
logging
error handling
API keys
authentication
Docker
tests
deployment utilities
queues
jobs
generic integration helpers
```

## PostHog Assessment

Find all PostHog code.

Classify each area as:

```text
GENERIC / KEEP

DOMAIN-SPECIFIC / ADAPT

OBSOLETE ABM / DELETE
```

Pay particular attention to:

```text
anonymous identity
distinct_id
identify
alias
merge
Visitor identity
Session identity
frontend/backend identity coordination
event capture
```

Assume this code is valuable until inspection proves otherwise.

Do not break working identity stitching.

## Salesforce Assessment

Find all Salesforce code.

Classify each area as:

```text
GENERIC / KEEP

DOMAIN MAPPING / ADAPT

OBSOLETE SPACE-SPECIFIC / DELETE
```

Preserve working:

```text
authentication
tokens
API client
retries
queues
jobs
upserts
webhooks
error handling
configuration
tests
```

Do not delete working Salesforce infrastructure during broad cleanup.

## Adapt

Identify components that should become Dr. Implant-specific.

## Delete

Identify Space/ABM-specific:

```text
models
routes
controllers
services
jobs
migrations
tests
constants
environment variables
client assumptions
```

that should disappear.

## Persistence Assessment

Explain:

- Sequelize conventions
- primary-key conventions
- migration system
- transaction support
- timestamp conventions
- model naming
- reusable model behavior

## Identity Stitching Assessment

Evaluate whether anything makes it difficult to support:

```text
persistent visitor_uuid
multiple Sessions per Visitor
Visitor → Lead association
conversion Session → Lead association
existing PostHog alias/identify behavior
cross-channel Lead identity
```

Preserve known-good identity code.

## Dashboard Readiness

Evaluate whether old ABM/client assumptions make it difficult to later expose authenticated APIs for a Dr. Implant Dashboard.

Remove those assumptions.

## Conversation Readiness

Evaluate whether anything would make it difficult to later add:

```text
Conversation
Message
Facebook Messenger webhooks
SMS
website chat
bot/human handoff
```

Fix architectural blockers without prematurely implementing the messaging system.

## Risks

Identify anything that could make the refactor unsafe or unnecessarily difficult.

After the assessment, proceed with the refactor.

Do not stop because the repository differs slightly from this specification.

Use good engineering judgment.

When old Space or ABM business logic conflicts with this specification:

**this Dr. Implant specification wins.**

When generic working PostHog or Salesforce infrastructure conflicts only cosmetically with this specification:

**preserve the working infrastructure and adapt the Dr. Implant domain around it.**