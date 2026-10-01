# Dr. Implant API
## Backend / Database Refactor Specification — V2

## 1. Objective

Refactor the existing `space-api` repository into:

```text
drimplant-api
```

The existing codebase is the technical chassis.

Do **not** rebuild working generic infrastructure from scratch.

The new application will eventually replace:

```text
Dental Implant Machine (DIM)
+
custom Salesforce call-center / treatment workflow
```

with one Dr. Implant-owned backend and dashboard.

Open Dental will remain a separate downstream patient/clinical/financial system and should eventually integrate through its API.

The desired long-term system is:

```text
                  ACQUISITION CHANNELS

 Website       Meta/Messenger       Phone       SMS
    │                │                │          │
    └────────────────┴────────────────┴──────────┘
                         │
                         ▼
                   drimplant-api
                  Node / Express
                         │
                         ▼
                 MySQL / Sequelize
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
     Dr Implant Dashboard       Integrations
                                PostHog
                                Salesforce
                                Telnyx
                                Meta
                                Google Ads
                                Open Dental
```

The immediate implementation may replace DIM first while retaining Salesforce temporarily, then absorb Salesforce workflow later.

---

# 2. Product Model

The application will eventually have two primary operational workspaces:

```text
LEADS

TREATMENTS
```

There are multiple underlying state machines, but every state machine does **not** require a separate top-level screen.

## Leads workspace

Covers:

```text
Contact acquisition
Lead engagement
Call attempts
Communication
Tasks
Calls
Messages
Appointment scheduling
No-show / cancellation / rescheduling
```

## Treatments workspace

Covers:

```text
Treatment presentation
Treatment follow-up
Financing
Products / pricing
Treatment acceptance
Won / lost
Procedure progression
```

An `Appointment` bridges the two workspaces.

---

# 3. Fundamental Domain Concepts

Use these definitions consistently.

## Contact

A human being Dr. Implant knows about.

A Contact may initially be a prospect and later become a patient.

The Contact persists across the entire journey.

Examples:

```text
Maria Rodriguez
John Smith
```

Do not create a different person entity merely because a Contact later becomes a patient.

## User

A Dr. Implant employee who logs into the application.

Examples:

```text
call-center rep
treatment coordinator
manager
administrator
```

Users are completely separate from Contacts.

## Lead

An acquisition / sales-entry episode associated with a Contact.

A Lead answers:

> How and when did this Contact enter this acquisition process?

Design for:

```text
Contact 1 → many Leads
```

even if most Contacts initially have only one Lead.

## Appointment

A scheduled consultation / clinic visit.

A Lead may have multiple Appointments because the prospect may:

```text
schedule
cancel
reschedule
no-show
reschedule
complete
```

## Treatment

The commercial treatment workflow that begins after the relevant Appointment is completed and treatment is presented.

This replaces the conceptual role of the Salesforce Opportunity.

---

# 4. Do Not Use One Giant Lead Stage

Do not model the entire business with one `Lead.current_stage` enum containing every operational state.

The current workflows reveal multiple different dimensions of state:

```text
Lead engagement state
Appointment state
Treatment state
Financing state
```

These states have different meanings, owners, transitions, and reporting uses.

They should remain distinct.

---

# 5. Technology Stack

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
Prisma
TypeORM
Knex
Supabase
Kafka
microservices
```

unless an existing dependency genuinely requires it.

The goal is a smaller, cleaner, Dr. Implant-focused version of `space-api`.

---

# 6. Preserve Existing Sequelize Architecture

`space-api` already uses individual Sequelize model files and a centralized `models/index.js` containing model associations.

Preserve that architecture.

Inspect before modifying:

```text
/models
/models/index.js
/config
/migrations
/services
/routes
/controllers
/middleware
/jobs
/integrations
```

Preserve, where sound:

```text
Sequelize initialization
connection pooling
transaction patterns
migration tooling
field naming conventions
UUID conventions
timestamps
logging
error handling
validation infrastructure
test infrastructure
```

Do not redesign persistence merely for stylistic reasons.

---

# 7. Database Reset Strategy

There is little useful Dr. Implant data in the current development / Aptible databases.

Create a **clean Dr. Implant baseline schema** instead of retaining a long migration history inherited from Space/ABM or earlier experimental Dr. Implant work.

Desired outcome:

```text
001_initial_drimplant_schema
```

followed by normal future migrations:

```text
002_...
003_...
```

Do not carry dozens of obsolete Space/ABM migrations into the new application.

## Safety requirement

Cursor must **not** make destructive reset behavior happen automatically when the app starts.

Provide an explicit reset workflow.

Conceptually:

```text
npm run db:reset
```

or use the repository's existing database tooling.

The reset operation should:

```text
1. require an explicit command
2. refuse accidental production execution
3. require an explicit override/confirmation for production
4. drop/recreate the intended schema
5. run clean baseline migrations
6. optionally seed synthetic development data
```

Local reset should be easy.

Aptible reset must be deliberate.

---

# 8. Environments

## Local

```text
Mac
 │
 ├── Node / Express
 │
 └── MySQL
      drimplant_dev
```

Use synthetic/fake patient data only.

## Production

```text
Aptible
 │
 ├── drimplant-api
 └── managed MySQL
```

All production PHI-related application data lives in the protected Aptible environment.

Do not require production credentials or real patient data for local development.

---

# 9. Core Architecture Principle

Use this principle throughout:

> Store everything safely. Share selectively.

There is one backend and one primary MySQL environment in production.

Do not split the application into separate PHI and non-PHI backends.

Instead, control what may leave the environment through explicit integration mappings.

---

# 10. Initial Core Model Set

Implement these core models:

```text
User

Contact
ContactIdentity

Lead
LeadStatusHistory

Touchpoint
Event
Activity
Task
Conversation
Message
Call

Appointment
AppointmentStatusHistory

Treatment
TreatmentStatusHistory
Product
TreatmentItem

Financing
FinancingStatusHistory
```

Future models may include:

```text
Procedure
Revenue
Consent
AuditLog
ConversationParticipant
```

Do not add future abstractions until they are needed, but do not make schema choices that block them.

---

# 11. User Model

`User` means a Dr. Implant employee who can log into the application.

Suggested fields:

```text
id
user_uuid

first_name
last_name
email
phone

role
status

primary_location_id nullable

created_at
updated_at
```

Possible future roles:

```text
call_center_rep
treatment_coordinator
manager
admin
```

Do not overbuild RBAC during this refactor, but preserve reusable auth infrastructure from `space-api`.

Product catalog maintenance is an internal administrative capability. The authorization model must be able to restrict Product create/edit/activate/deactivate actions to appropriate admin/manager Users.

---

# 12. Contact Model

`Contact` is the canonical human being. Keep this model simple.

Suggested fields:

```text
id
contact_uuid

first_name
last_name
email
phone

preferred_language nullable
date_of_birth nullable

primary_location_id nullable

created_at
updated_at
```

For V1, `email` and `phone` belong directly on Contact.

Normalize phone and email values in application/service logic as needed for matching and deduplication.

If the business later proves it needs multiple phone numbers or multiple email addresses per Contact, extend the model then rather than adding that complexity now.

A Contact can exist before a Lead or can be created as part of Lead creation.

---

# 13. Contact Core Fields

Keep core contact information intentionally simple:

```text
Contact.first_name
Contact.last_name
Contact.email
Contact.phone
```

Do not introduce a generalized contact-method abstraction in V1.

Other channel/system identifiers such as Messenger IDs, Visitor IDs, Open Dental IDs, and Salesforce IDs belong in `ContactIdentity`, not in email/phone fields.

---

# 14. ContactIdentity Model

Create:

```text
ContactIdentity
```

This links a Contact to identities used by other systems and channels.

Suggested fields:

```text
id
contact_id

identity_type
identity_value
source

verified_at nullable

created_at
updated_at
```

Examples:

```text
visitor_uuid
facebook_psid
open_dental_pat_num
salesforce_lead_id
salesforce_contact_id
salesforce_account_id
telnyx_identity
```

Use appropriate unique constraints per identity type/value.

This is the long-term cross-system identity map.

---

# 15. Visitor / Session Identity

Preserve the concept of persistent anonymous visitor identity from the existing PostHog/full-orbit implementation.

If the current code already has a working `AnonymousVisitor`, visitor UUID, session identity, or similar mechanism, **preserve and adapt it rather than replacing it**.

The target conceptual model is:

```text
Visitor V123
  ├─ Session S001
  ├─ Session S002
  └─ Session S003
```

The exact model names may follow the existing working code if changing them would unnecessarily break proven identity stitching.

The important behavior is:

```text
stable anonymous visitor
+
multiple sessions
+
event/touchpoint history
+
later association to known Contact / Lead
```

---

# 16. Lead Model

`Lead` represents an acquisition / sales-entry episode.

Suggested fields:

```text
id
lead_uuid

contact_id

owner_user_id nullable

source_type nullable
source_detail nullable

engagement_status

created_at
updated_at
```

Potential source types:

```text
website
phone
facebook_messenger
sms
referral
manual
other
```

Do not assume every Lead originated from a web session.

A Contact may have multiple Leads over time.

---

# 17. Lead Engagement State

Lead engagement status represents call-center / contact-attempt workflow.

Initial statuses should reflect the documented operation:

```text
new
first_attempt
second_attempt
third_attempt
in_communication
long_term_nurture
```

Do not mix Appointment states or Treatment states into this field.

Do not assume progression is strictly linear.

A User must be able to move directly to an appropriate state when the real-world situation requires it.

Example:

```text
new
→ in_communication
```

may be valid if the person answers immediately.

---

# 18. LeadStatusHistory

Create:

```text
LeadStatusHistory
```

Suggested fields:

```text
id
lead_id

from_status nullable
to_status

changed_by_user_id nullable
source

reason nullable
metadata JSON nullable

changed_at
created_at
```

Every Lead engagement-state change must be historically preserved.

Do not overwrite history.

Status change and history creation must occur in one Sequelize transaction.

---

# 19. Touchpoint Model

`Touchpoint` answers:

> Where did this acquisition interaction come from?

Suggested fields:

```text
id
touchpoint_uuid

contact_id nullable
lead_id nullable
visitor_id nullable
session_id nullable

occurred_at

channel
source
medium
campaign

campaign_id nullable
adset_id nullable
ad_id nullable
creative_id nullable

utm_source nullable
utm_medium nullable
utm_campaign nullable
utm_term nullable
utm_content nullable

gclid nullable
gbraid nullable
wbraid nullable
fbclid nullable

landing_page nullable
landing_page_variant nullable

metadata JSON nullable

created_at
updated_at
```

A Touchpoint should be able to exist before a Lead is known.

Do not make `lead_id` mandatory.

---

# 20. Event Model

`Event` represents machine-generated application/analytics behavior.

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

lead_created
appointment_created
appointment_completed
treatment_created
```

Suggested fields:

```text
id
event_uuid

contact_id nullable
lead_id nullable
visitor_id nullable
session_id nullable

event_type
event_source

properties JSON nullable

occurred_at
created_at
```

Do not use Event as a dumping ground for all operational history.

---

# 21. Activity Model

`Activity` is the rep-visible business timeline.

Examples:

```text
note_added
status_changed
call_completed
voicemail_left
task_completed
message_sent
message_received
appointment_created
appointment_rescheduled
appointment_no_show
appointment_completed
treatment_presented
financing_submitted
```

Suggested fields:

```text
id
activity_uuid

contact_id
lead_id nullable
appointment_id nullable
treatment_id nullable

user_id nullable

activity_type
summary nullable
details JSON nullable

occurred_at
created_at
```

The future Dashboard should be able to show one chronological Activity timeline for a Contact.

The Activity feed should unify operational history without forcing every item into one giant model.

---

# 22. Task Model

Tasks are first-class operational work items.

Suggested fields:

```text
id
task_uuid

contact_id
lead_id nullable
appointment_id nullable
treatment_id nullable

assigned_user_id

task_type
title
description nullable

status
priority nullable

due_at nullable
completed_at nullable

created_by_user_id nullable

created_at
updated_at
```

Suggested statuses:

```text
open
completed
canceled
```

Examples:

```text
call tomorrow
follow up Friday
reschedule no-show
check financing
treatment follow-up #2
```

Tasks should not be encoded as Lead stages.

---

# 23. Conversation Model

The backend must support a unified conversation domain that can later power:

```text
Facebook Messenger
SMS
web chat
possibly WhatsApp
```

Create:

```text
Conversation
```

Suggested fields:

```text
id
conversation_uuid

contact_id nullable
lead_id nullable

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

Suggested channels:

```text
facebook_messenger
sms
web_chat
whatsapp
```

A Conversation may begin before a Contact is known.

That is why `contact_id` must be nullable initially.

---

# 24. Message Model

Create:

```text
Message
```

Suggested fields:

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

This should support future bot → human → automation handoff inside the same Conversation.

---

# 25. Call Model

Calls are first-class records.

Create:

```text
Call
```

Suggested fields:

```text
id
call_uuid

contact_id nullable
lead_id nullable

user_id nullable

direction
provider nullable
provider_call_id nullable

tracking_number nullable
caller_number nullable
destination_number nullable

started_at
answered_at nullable
ended_at nullable
duration_seconds nullable

disposition nullable

recording_reference nullable
transcript_reference nullable

metadata JSON nullable

created_at
updated_at
```

Do not store call history directly on Lead.

Call recordings/transcripts are PHI-sensitive and must not be casually logged or passed to analytics systems.

---

# 26. Appointment Model

Create:

```text
Appointment
```

An Appointment is a scheduled consult visit.

Suggested fields:

```text
id
appointment_uuid

contact_id
lead_id nullable

location_id nullable
provider_id nullable

scheduled_at

status

open_dental_pat_num nullable
open_dental_appointment_id nullable

created_by_user_id nullable
assigned_user_id nullable

canceled_at nullable
cancel_reason nullable

no_show_at nullable
completed_at nullable

external_system nullable
external_id nullable

created_at
updated_at
```

Initial statuses:

```text
scheduled
canceled
no_show
completed
```

A Contact / Lead may have multiple Appointments.

Rescheduling should normally create or preserve meaningful scheduling history rather than erase prior behavior.

---

# 27. AppointmentStatusHistory

Create:

```text
AppointmentStatusHistory
```

Suggested fields:

```text
id
appointment_id

from_status nullable
to_status

changed_by_user_id nullable
source
reason nullable

metadata JSON nullable

changed_at
created_at
```

Appointment state changes must be historically preserved.

---

# 28. Appointment Workflow

The Appointment workflow should support:

```text
scheduled
→ canceled

scheduled
→ no_show

scheduled
→ completed
```

Then:

```text
canceled/no_show
→ future new/rescheduled Appointment
```

A no-show should be able to trigger creation of a Task for the call center to follow up and reschedule.

Do not encode that task as a stage.

---

# 29. Treatment Model

Create:

```text
Treatment
```

A Treatment is the post-consult commercial treatment workflow.

Suggested fields:

```text
id
treatment_uuid

contact_id
lead_id nullable
appointment_id nullable

owner_user_id nullable

status

presented_at nullable
accepted_at nullable
closed_at nullable

quoted_amount nullable
accepted_amount nullable

close_reason nullable

created_at
updated_at
```

This is conceptually similar to the current Salesforce Opportunity.

---

# 30. Treatment State

Initial treatment workflow statuses should support the documented process.

Use a clear initial set such as:

```text
presented
follow_up_1
follow_up_2
follow_up_3
in_communication
won
lost
closed
```

Exact final names may be adjusted during implementation if current Salesforce terminology maps more cleanly.

Do not mix financing status into Treatment.status.

Do not mix Appointment status into Treatment.status.

The workflow is not assumed to be strictly linear.

---

# 31. TreatmentStatusHistory

Create:

```text
TreatmentStatusHistory
```

Suggested fields:

```text
id
treatment_id

from_status nullable
to_status

changed_by_user_id nullable
source
reason nullable

metadata JSON nullable

changed_at
created_at
```

Preserve all state transitions.

---

# 32. Product Model

Create a first-class, admin-managed catalog model:

```text
Product
```

A Product is a treatment/product option that Dr. Implant administrators maintain centrally and that can later be assigned to a Treatment.

Suggested fields:

```text
id
product_uuid

name
code nullable
description nullable

list_price nullable
active

sort_order nullable

created_by_user_id nullable
updated_by_user_id nullable

created_at
updated_at
```

Initial catalog examples documented in the existing Salesforce workflow include:

```text
Cancellation Fee              $1,500
Full Arch PMMA                $20,000
Full Arch Zirconia            $25,000
Full Arch Premium Zirconia    configurable
Non-Full Arch                 configurable
```

These are seed/example values, not hardcoded application constants.

Administrators must be able to:

```text
create Product
edit Product
activate/deactivate Product
change list price
change display order
```

Avoid hard-deleting Products that have already been used on Treatments. Prefer `active = false` so historical treatment records remain valid.

Product is a catalog/master-data entity. A Product being edited later must not silently rewrite historical prices on existing Treatments.

---

# 33. TreatmentItem Model

Create:

```text
TreatmentItem
```

This is the join/line-item model that assigns one or more Products to a Treatment.

Suggested fields:

```text
id
treatment_id
product_id

quantity
list_price_snapshot nullable
unit_price
total_price

created_by_user_id nullable

created_at
updated_at
```

Relationship:

```text
Treatment 1 → many TreatmentItems
Product       1 → many TreatmentItems
```

A Treatment can therefore contain multiple Products.

When a Product is assigned to a Treatment:

1. copy the Product's current `list_price` into `list_price_snapshot`
2. initialize `unit_price` from the current list price unless the User intentionally overrides it
3. calculate `total_price` from quantity × unit price
4. preserve the case-specific price even if the Product catalog price changes later

Price must be editable per Treatment because the documented Salesforce workflow allows treatment pricing to be changed for the specific patient/case.

Do not represent Products as a string, JSON list, or comma-separated field on Treatment.

---

# 34. Financing Model

Create:

```text
Financing
```

A Treatment may have one or more financing attempts over time.

Suggested fields:

```text
id
financing_uuid

treatment_id

provider nullable

status
amount_requested nullable
amount_approved nullable

submitted_at nullable
decision_at nullable

metadata JSON nullable

created_at
updated_at
```

Initial statuses may include:

```text
pending
approved
denied
canceled
```

Financing is a separate state dimension.

---

# 35. FinancingStatusHistory

Create:

```text
FinancingStatusHistory
```

Suggested fields:

```text
id
financing_id

from_status nullable
to_status

changed_by_user_id nullable
source
reason nullable

metadata JSON nullable

changed_at
created_at
```

---

# 36. Contact / Lead Activity Domain

The following models form the operational activity domain:

```text
TOUCHPOINTS
EVENTS
ACTIVITIES
TASKS
CONVERSATIONS
MESSAGES
CALLS
```

Conceptually:

```text
Contact = who the human is

Lead = the acquisition / sales episode

Touchpoint = where acquisition came from

Event = machine/analytics event

Activity = user-visible operational timeline item

Task = work that must be done

Conversation = messaging thread

Message = item inside a Conversation

Call = structured phone interaction
```

These objects may attach to Contact, Lead, or both depending on context.

Do not force everything to belong only to Lead.

---

# 37. High-Level Entity Model

Conceptually:

```text
                    CONTACT                  USER
                      │                       │
        ┌─────────────┼──────────────┐        │
        │             │              │        │
        ▼             ▼              ▼        │
      LEADS       IDENTITIES       Contact fields
        │        Visitor ID        Phone
        │        Messenger         Email
        │        OpenDental
        │        Salesforce
        │        Salesforce
        │
        ├──────── TOUCHPOINTS
        ├──────── EVENTS
        ├──────── ACTIVITIES
        ├──────── TASKS
        ├──────── CONVERSATIONS
        └──────── CALLS
                      │
                      ▼
                 APPOINTMENTS
                      │
              ┌───────┴────────┐
              ▼                ▼
          NO SHOW          COMPLETED
                               │
                               ▼
                       TREATMENT CASE
                               │
             ┌─────────────────┼──────────────┐
             ▼                 ▼              ▼
          PRODUCTS         FINANCING      FOLLOW-UPS
             │
             ▼
       ACCEPTED / WON
             │
             ▼
          PROCEDURE
             │
             ▼
         OPEN DENTAL
```

---

# 38. Two Main Application Workspaces

Even though the backend has multiple state machines, the primary operational UI remains:

```text
LEADS
TREATMENTS
```

## Leads

The Leads workspace should eventually combine:

```text
Lead engagement
Contact information
Calls
Tasks
Conversations
Activity timeline
Attribution
Appointment workflow
```

## Treatments

The Treatments workspace should eventually combine:

```text
Treatment state
Products assigned to Treatments
Quoted value
Financing
Follow-ups
Treatment acceptance
Procedure progression
```

Appointment remains a first-class database entity without needing to become a third primary workspace.

---

# 39. Preserve Existing PostHog Infrastructure

This is a critical instruction.

The existing `space-api` / full-orbit implementation already contains working PostHog identity-stitching behavior.

Before changing anything, locate all code related to:

```text
PostHog initialization
capture
distinct_id
identify
alias
identity merge
anonymous visitors
session identity
frontend/backend identity coordination
event wrappers
retry/error handling
configuration
tests
```

Classify each section as:

```text
GENERIC / KEEP
DOMAIN-SPECIFIC / ADAPT
OBSOLETE ABM / DELETE
```

If generic identity-stitching code already works:

> KEEP IT.

Do not rewrite proven identity behavior merely to make code look newer.

---

# 40. Anonymous → Known Identity Stitching

The system must connect anonymous acquisition history to a known Contact / Lead.

Conceptually:

```text
Visitor V123
    ↓
Session S001
    ↓
page/video/widget activity
    ↓
Contact C789
    ↓
Lead L456
```

The database is the authoritative identity map.

PostHog consumes that identity relationship.

Do not use:

```text
name
phone
email
```

as canonical PostHog identity keys.

Prefer stable internal UUIDs.

If the existing Space/full-orbit PostHog implementation already has a proven visitor → known-person merge pattern, preserve it and adapt the domain mapping.

---

# 41. ContactIdentity and PostHog

Where appropriate, `ContactIdentity` can represent external identities such as:

```text
visitor_uuid
facebook_psid
open_dental_pat_num
salesforce IDs
```

Do not duplicate identity-resolution logic across integrations.

The goal is:

```text
one Contact
many identities
```

---

# 42. Preserve Existing Salesforce Integration

The existing Salesforce integration is known to work.

Do not delete it.

Inspect all code related to:

```text
authentication
OAuth/token handling
refresh handling
API client initialization
request helpers
retry logic
webhooks
sync helpers
queues/jobs
upserts
external IDs
mapping infrastructure
tests
```

Classify each component as:

```text
GENERIC / KEEP
DOMAIN MAPPING / ADAPT
OBSOLETE SPACE-SPECIFIC / DELETE
```

Preserve generic transport and synchronization infrastructure.

Do not rewrite known-good Salesforce code.

---

# 43. Salesforce Transition Strategy

The application may replace DIM first while Salesforce remains temporarily in production.

Therefore Phase 1 should allow:

```text
Dr Implant App
       ↓
existing Salesforce integration
       ↓
Salesforce workflows still used downstream
```

This can eliminate manual re-entry before Salesforce itself is replaced.

Later:

```text
Dr Implant App
       ↕
Open Dental
```

can replace Salesforce operationally.

Do not create architectural dependencies that require Salesforce permanently.

---

# 44. Future Open Dental Integration

Prepare a clean integration location:

```text
integrations/
  openDental/
```

Open Dental should eventually support operations such as:

```text
findPatient()
getPatient()
createPatient()
updatePatient()

createAppointment()
updateAppointment()
getAppointments()

getProcedures()
getBalances() / financial status where appropriate
```

Do not implement the full integration in this refactor unless explicitly requested.

The backend must be ready to store:

```text
open_dental_pat_num
open_dental_appointment_id
other Open Dental identifiers
```

as external identities/references.

---

# 45. Open Dental System Boundary

Long term:

```text
Dr Implant backend:
acquisition
marketing attribution
communications
lead management
tasks
call-center workflow
appointment orchestration
treatment sales
treatment acceptance
product/pricing workflow

Open Dental:
patient clinical record
clinical scheduling reality where applicable
procedures
ledger
balances
collections
patient-system identity
```

Do not unnecessarily duplicate Open Dental's clinical or financial ledger.

---

# 46. Future Meta / Messenger Integration

Prepare:

```text
integrations/
  meta/
```

Future architecture should allow:

```text
GET  /v1/webhooks/meta/messenger
POST /v1/webhooks/meta/messenger
```

Conceptual future flow:

```text
Meta webhook
  ↓
normalize payload
  ↓
find/create Conversation
  ↓
store Message
  ↓
resolve/create Contact/Lead when identity becomes known
  ↓
ConversationService
  ↓
send response through Meta adapter
```

Keep Meta-specific payload handling separate from core Conversation logic.

---

# 47. Vendor-Neutral Conversation Logic

Core conversation business logic should not be named around a specific provider.

Prefer:

```text
processInboundMessage()
advanceConversation()
captureLeadField()
handoffToAgent()
closeConversation()
```

rather than vendor-specific business logic.

The same conversation engine should eventually support:

```text
Messenger
SMS
web chat
future channels
```

---

# 48. Future Telnyx Integration

Prepare:

```text
integrations/
  telnyx/
```

Telnyx may eventually support:

```text
dynamic number insertion
call tracking
SMS
10DLC
call events
recordings
```

Do not build new Telnyx code in this pass unless generic working code already exists and is useful.

---

# 49. Integration Structure

Conceptually:

```text
integrations/
  posthog/
  salesforce/
  telnyx/
  meta/
  googleAds/
  openDental/
```

Do not move working code solely for aesthetics if it creates risk.

Do not tightly couple integrations directly to arbitrary Sequelize model objects.

Use explicit service/mapping boundaries.

---

# 50. Dashboard Architecture

The old ABM client is being replaced conceptually by a future:

```text
drimplant-dashboard
```

Architecture:

```text
drimplant-dashboard
      |
      | authenticated API
      v
drimplant-api
      |
      v
MySQL
```

Do not build the dashboard frontend in this task.

The backend should support future internal APIs for:

```text
Leads
Treatments
Contacts
Appointments
Tasks
Activities
Calls
Conversations
Users
Analytics
Attribution
```

---

# 51. Public vs Internal API Separation

The same backend may serve both public acquisition traffic and internal dashboard traffic.

Conceptually:

```text
PUBLIC

/v1/visitors
/v1/sessions
/v1/events
/v1/leads
```

Internal authenticated APIs may use:

```text
/v1/admin/*
```

or whatever pattern fits the existing repository.

Do not mix public acquisition authorization with internal employee authorization.

---

# 52. Suggested V1 API Surface

Follow existing route conventions where sound.

## Contacts

```text
POST  /v1/contacts
GET   /v1/contacts/:id
PATCH /v1/contacts/:id
```

## Leads

```text
POST  /v1/leads
GET   /v1/leads/:id
PATCH /v1/leads/:id

POST /v1/leads/:id/status
```

## Touchpoints / Events

```text
POST /v1/touchpoints
POST /v1/events
```

## Activities

```text
GET  /v1/contacts/:id/activities
POST /v1/contacts/:id/activities
```

## Tasks

```text
GET   /v1/tasks
POST  /v1/tasks
PATCH /v1/tasks/:id
```

## Conversations

If implemented now:

```text
POST /v1/conversations
GET  /v1/conversations/:id
POST /v1/conversations/:id/messages
```

Otherwise reserve this structure.

## Calls

If implemented now:

```text
POST  /v1/calls
GET   /v1/calls/:id
PATCH /v1/calls/:id
```

## Appointments

```text
GET   /v1/leads/:id/appointments
POST  /v1/leads/:id/appointments

GET   /v1/appointments/:id
PATCH /v1/appointments/:id
POST  /v1/appointments/:id/status
```

## Treatments

```text
POST  /v1/treatments
GET   /v1/treatments/:id
PATCH /v1/treatments/:id

POST /v1/treatments/:id/status
```

## Products / Treatment Items

Product catalog administration (authenticated admin routes):

```text
GET   /v1/admin/products
POST  /v1/admin/products
GET   /v1/admin/products/:id
PATCH /v1/admin/products/:id
```

Treatment Product assignment:

```text
GET    /v1/treatments/:id/items
POST   /v1/treatments/:id/items
PATCH  /v1/treatment-items/:id
DELETE /v1/treatment-items/:id
```

`POST /v1/treatments/:id/items` should accept a `product_id`, quantity, and optional case-specific unit-price override. It should not require the client to duplicate Product catalog metadata.

Only appropriately authorized internal Users should be able to create or edit Product catalog records.

## Financing

```text
POST  /v1/treatments/:id/financing
PATCH /v1/financing/:id
POST  /v1/financing/:id/status
```

Do not implement endpoints merely because they are listed here if their model is intentionally deferred.

---

# 53. Lead Creation Transaction

Lead creation should support both known and newly created Contacts.

Conceptually:

```text
1. validate payload
2. resolve or create Contact
3. store/update Contact.email and Contact.phone
4. create Lead
5. set initial engagement status
6. create LeadStatusHistory
7. associate acquisition identity/session when available
8. associate relevant Touchpoints
9. create lead_created Event
10. create user-visible Activity
11. run existing PostHog identity-stitching behavior where applicable
12. commit transaction
```

If any required database write fails, roll back the transaction.

---

# 54. Centralized Status Services

Do not permit arbitrary controllers to directly mutate operational status fields.

Create centralized services such as:

```text
transitionLeadStatus(...)
transitionAppointmentStatus(...)
transitionTreatmentStatus(...)
transitionFinancingStatus(...)
```

Each service should:

```text
load record
validate requested state
validate transition if needed
start transaction
update current status
insert status history
create Activity
create Event if appropriate
create resulting Tasks if appropriate
commit
```

Rollback on failure.

---

# 55. Workflow Automation Hooks

The backend should be ready for future workflow rules.

Examples:

```text
third failed contact attempt
→ move Lead to long_term_nurture

Appointment no-show
→ create reschedule Task

Appointment completed
→ make Contact eligible for Treatment creation

Treatment presented
→ schedule follow-up

Treatment aging beyond target period
→ create task / flag / remove from active queue

Financing decision
→ create next-step task
```

Do not build a complex generic rules engine now.

Implement straightforward business-service hooks where required and keep the design extensible.

---

# 56. 30-Day Treatment Workflow

The documented operation indicates Treatment Coordinators do not want unresolved cases sitting indefinitely in active queues.

The backend should eventually support treatment aging / queue-management rules.

Do not encode "30 days" as a permanent architectural assumption.

Provide fields and task/workflow mechanisms that can support configurable aging rules later.

---

# 57. Reporting Funnel vs Operational State

Keep a distinction between:

## Operational states

```text
Lead engagement state
Appointment status
Treatment status
Financing status
```

and:

## Executive/reporting milestones

Conceptually:

```text
Lead
Booked Appointment
Completed Appointment
Canceled
No Show
Treatment Accepted
Procedure Scheduled
Procedure Completed
Revenue
```

Reporting milestones may be derived from underlying records/events.

Do not force them all into one operational enum.

---

# 58. Activity Timeline

The future Contact detail screen should be able to render one chronological timeline including:

```text
website visit
form/widget submission
lead creation
call attempt
voicemail
Messenger message
SMS
task
note
status change
Appointment scheduled
Appointment canceled
Appointment no-show
Appointment completed
Treatment presented
Financing update
Treatment accepted
```

Design Activity and related joins/indexes with this use case in mind.

---

# 59. Data Ownership

The database should be the Dr. Implant source of truth for:

```text
Contact identity mapping
Lead acquisition data
workflow state
tasks
communication history
calls
Appointments
Treatment sales workflow
Product catalog and Treatment product/pricing selections
financing workflow
attribution
```

External systems remain authoritative only for the domains they truly own.

Examples:

```text
PostHog = analytics consumer
Salesforce = temporary downstream integration
Open Dental = clinical/patient/financial system
Meta = messaging/ad platform
Telnyx = telecom provider
Google Ads = ad platform
```

---

# 60. Logging

Preserve good existing logging infrastructure.

Do not routinely log:

```text
patient names
phone numbers
emails
questionnaire responses
message bodies
Appointment details
treatment details
financing details
full request bodies
call transcripts
recording URLs/tokens
```

Prefer identifiers:

```text
contact_uuid
lead_uuid
appointment_uuid
treatment_uuid
conversation_uuid
call_uuid
user_uuid
event_type
route
status
duration
error_code
```

Do not dump Sequelize objects containing PHI into logs.

---

# 61. Validation

Reuse existing validation infrastructure where sound.

Validate at minimum:

```text
UUIDs
email
phone
timestamps
Lead status
Appointment status
Treatment status
Financing status
Conversation channel
Task status
event payloads
required fields
request sizes
```

Do not trust frontend input.

---

# 62. Indexing

Add practical indexes for expected operational and reporting queries.

At minimum consider:

## User

```text
user_uuid
email
phone
status
```

## Contact

```text
contact_uuid
email
phone
created_at
```

Email and phone should be normalized consistently in application logic before matching/deduplication queries.

## ContactIdentity

```text
contact_id
identity_type
identity_value
```

and a useful uniqueness rule around identity type/value.

## Lead

```text
lead_uuid
contact_id
owner_user_id
engagement_status
created_at
source_type
```

## LeadStatusHistory

```text
lead_id
to_status
changed_at
```

## Touchpoint

```text
contact_id
lead_id
visitor_id
session_id
gclid
fbclid
occurred_at
```

## Event

```text
contact_id
lead_id
visitor_id
session_id
event_type
occurred_at
```

## Activity

```text
contact_id
lead_id
appointment_id
treatment_id
occurred_at
activity_type
```

## Task

```text
assigned_user_id
status
due_at
contact_id
lead_id
treatment_id
```

## Conversation

```text
conversation_uuid
contact_id
lead_id
channel
external_conversation_id
external_user_id
last_message_at
```

## Message

```text
conversation_id
external_message_id
sent_at
```

## Call

```text
call_uuid
contact_id
lead_id
user_id
provider_call_id
started_at
```

## Appointment

```text
appointment_uuid
contact_id
lead_id
status
scheduled_at
open_dental_pat_num
```

## Treatment

```text
treatment_uuid
contact_id
lead_id
appointment_id
owner_user_id
status
created_at
```

## Product

```text
product_uuid
name
code
active
sort_order
```

## TreatmentItem

```text
treatment_id
product_id
```

## Financing

```text
treatment_id
status
submitted_at
```

Do not over-index without a query reason.

---

# 63. Foreign-Key / Deletion Strategy

Be conservative with destructive cascades.

Do not automatically delete important business history if a parent record is deleted.

Prefer preservation for:

```text
Activities
status histories
Appointments
Treatments
Calls
Conversations
Messages
Tasks
```

If a future legal/compliance deletion workflow is needed, implement it deliberately.

---

# 64. Auditability

Status-changing actions should preserve:

```text
who changed it
what changed
when it changed
source of change
reason/metadata where relevant
```

This is especially important for:

```text
Lead status
Appointment status
Treatment status
Financing status
```

Future admin-sensitive changes may additionally use a dedicated AuditLog model.

---

# 65. Authentication

Preserve useful existing `User`, authentication, session/token, and API-key infrastructure from `space-api`.

Do not overbuild permissions initially.

The architecture should eventually support:

```text
call-center rep
treatment coordinator
manager
admin
```

with appropriate access restrictions.

---

# 66. API Security

Preserve/add:

```text
HTTPS in production
secure headers
CORS
rate limiting
request-size limits
input validation
parameterized Sequelize queries
safe error responses
secret management
```

MySQL must not be exposed publicly.

The API is the database access layer.

---

# 67. Environment Configuration

Clean up Space-specific environment variables.

Preserve working PostHog and Salesforce configuration.

Initial concepts include:

```text
NODE_ENV
PORT

DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

Preserve existing required variables for:

```text
PostHog
Salesforce
```

Future integrations may add:

```text
TELNYX_*

META_APP_ID
META_APP_SECRET
META_VERIFY_TOKEN
META_PAGE_ACCESS_TOKEN

GOOGLE_ADS_*

OPEN_DENTAL_*
```

Do not require credentials for integrations not yet enabled.

---

# 68. Repository Cleanup

Perform a repository-wide cleanup.

Remove old business logic for:

```text
ABM
ProspectCompany
CustomerCompany
Missions
Pursuits
Procurement
Enrichment
Publisher
old Space-specific scoring
old Space-specific workflows
```

But inspect before deleting.

Specifically preserve generic working infrastructure related to:

```text
PostHog identity stitching
PostHog capture
Salesforce integration
queues/jobs
retry logic
API clients
authentication
logging
error handling
validation
tests
deployment
Docker
Sequelize
```

Rule:

> Remove obsolete domain logic, not proven infrastructure.

---

# 69. Migration / Seed Data

After creating the baseline schema, provide synthetic seed data for development if useful.

Seed examples may include:

```text
Users with email/phone
Contacts with email/phone
Leads in different engagement states
Appointments
Treatments
Tasks
Activities
Products
Financing examples
```

Use obviously fake values.

Never copy real production PHI into local seed data.

---

# 70. Testing

Reuse the existing test framework.

## Contact tests

```text
create Contact
store/update Contact.email
store/update Contact.phone
add ContactIdentity
identity uniqueness
```

## Lead tests

```text
create Lead
associate Contact
set initial engagement status
create LeadStatusHistory
non-linear status transition
```

## Identity stitching tests

Preserve/adapt existing working PostHog tests.

Verify:

```text
anonymous Visitor persists
multiple Sessions can belong to Visitor
Contact/Lead becomes associated with anonymous history
returning session does not create duplicate Contact/Lead automatically
known identity mapping is preserved
```

## Task tests

```text
create
assign
complete
cancel
due-date querying
```

## Activity tests

```text
create operational Activity
query Contact timeline in chronological order
```

## Appointment tests

```text
create
cancel
no-show
complete
reschedule
multiple Appointments per Lead
status history
```

## Treatment tests

```text
create from completed Appointment
status changes
status history
quoted amount
accepted amount
admin can create Product
admin can edit Product
Product can be deactivated without deleting historical TreatmentItems
multiple Products can be assigned to one Treatment
TreatmentItem snapshots list price at assignment
case-specific unit price can be edited
changing Product.list_price does not rewrite existing TreatmentItem pricing
```

## Financing tests

```text
create attempt
approve
deny
history
multiple attempts if supported
```

## Transaction tests

Verify failures do not leave inconsistent data such as:

```text
Lead status changed without history
Appointment changed without history
Treatment changed without history
Contact created without required Lead transaction completion
```

## Salesforce tests

Preserve generic existing Salesforce integration tests where valid.

## PostHog tests

Preserve generic existing identity/capture tests where valid.

---

# 71. Initial Implementation Priority

Even though the schema is being designed for both current systems, implementation may be phased.

## Phase 1 — DIM Replacement

Priority functionality:

```text
Users
Contacts
ContactIdentity

Leads
Lead engagement states
Touchpoints
Events
Activities
Tasks

Calls
Conversations / Messages where appropriate

PostHog identity stitching
Attribution

Dashboard-ready APIs

Salesforce sync retained
```

Salesforce may remain the downstream operational system temporarily.

## Phase 2 — Salesforce Replacement

Add/complete:

```text
Appointments
Open Dental integration

Treatments
Products / TreatmentItems
Treatment follow-up workflow
Financing
Treatment acceptance
Procedure progression

Treatment coordinator queues
```

Then phase out Salesforce when Dr. Implant functionality is complete.

---

# 72. Do Not Build Yet Unless Already Reusable

Do not prematurely build:

```text
full AI conversation engine
complex rules engine
patient portal
complex RBAC
full accounting system
full clinical record
new Salesforce transport layer
new PostHog identity layer
```

Preserve existing working PostHog and Salesforce infrastructure.

Prepare clean extension points for everything else.

---

# 73. README

Rewrite README for `drimplant-api`.

Document:

```text
application purpose
technology stack
local development
MySQL setup
drimplant_dev
environment variables
database reset
migrations
seed data
tests
core domain model
Contact vs User
Lead engagement state
Appointment state
Treatment state
Product catalog and TreatmentItems
identity stitching
Salesforce preservation
PostHog preservation
Aptible production concept
future Open Dental integration
future Messenger architecture
two-workspace product model
```

Use actual repository commands from `package.json`.

Do not invent commands that do not exist.

---

# 74. Definition of Done

This refactor is complete when:

1. The application is clearly `drimplant-api`.
2. Obsolete Space/ABM business logic is removed.
3. Useful generic infrastructure remains.
4. Sequelize/MySQL architecture remains intact.
5. The old schema can be deliberately reset and replaced with a clean Dr. Implant baseline.
6. Local MySQL can be initialized from scratch.
7. Production reset cannot happen accidentally.
8. User is the employee/login model.
9. Contact is the canonical prospect/patient model.
10. Contact stores its primary email and phone directly.
11. User stores email and phone directly.
12. ContactIdentity supports external-system identities.
13. Lead is linked to Contact.
14. Contact can support multiple Leads.
15. Lead engagement state is separate from Appointment state.
16. Appointment state is separate from Treatment state.
17. Financing state is separate from Treatment state.
18. LeadStatusHistory works.
19. AppointmentStatusHistory works.
20. TreatmentStatusHistory works.
21. FinancingStatusHistory works.
22. Touchpoints support acquisition attribution.
23. Events support machine/analytics behavior.
24. Activities support the operational timeline.
25. Tasks are first-class work items.
26. Conversations and Messages fit the unified communication model.
27. Calls are first-class records.
28. Appointments support cancel/no-show/reschedule/completion.
29. Treatments model the post-consult commercial workflow.
30. Product is a first-class admin-managed catalog, and Products can be assigned to Treatments through TreatmentItems with preserved case-specific pricing.
31. Product catalog CRUD is available through authenticated internal/admin APIs and historical Treatment pricing is not changed by later catalog edits.
32. Existing generic PostHog identity-stitching code is preserved/adapted.
33. Existing generic Salesforce integration code is preserved/adapted.
34. Salesforce can remain temporarily downstream during Phase 1.
35. Architecture supports future Open Dental integration.
36. Open Dental identifiers can be stored cleanly.
37. Architecture supports future Messenger integration.
38. Public acquisition APIs and internal dashboard APIs can have separate auth policies.
39. Logging avoids unnecessary PHI.
40. Database operations that change state are transaction-safe.
41. Status/history changes are auditable.
42. Tests cover the new core domain.
43. README describes the new architecture accurately.
43. The backend can eventually reconstruct the journey:

```text
campaign/ad
→ anonymous visitor
→ Contact
→ Lead
→ engagement
→ Appointment
→ Treatment
→ accepted treatment
→ procedure
→ revenue
```

---

# 75. First Step Before Editing

Before changing code, inspect the entire existing repository and provide a concise implementation assessment.

## KEEP

Identify generic working infrastructure to preserve.

Pay particular attention to:

```text
Express startup
Sequelize config
database handling
authentication
API keys
validation
logging
error handling
queues/jobs
Docker/deployment
tests
PostHog
Salesforce
```

## POSTHOG

Classify all PostHog code as:

```text
GENERIC / KEEP
DOMAIN-SPECIFIC / ADAPT
OBSOLETE ABM / DELETE
```

Do not break proven anonymous-to-known identity stitching.

## SALESFORCE

Classify all Salesforce code as:

```text
GENERIC / KEEP
DOMAIN-MAPPING / ADAPT
OBSOLETE SPACE-SPECIFIC / DELETE
```

Preserve working auth, API clients, queues, retries, webhooks, sync helpers, IDs, and tests.

## ADAPT

Identify reusable code that should be converted to the Dr. Implant domain.

## DELETE

Identify old Space/ABM models, routes, services, jobs, tests, migrations, constants, and client assumptions that are no longer needed.

## DATABASE

Explain the current:

```text
Sequelize conventions
PK/UUID conventions
migration approach
transaction handling
timestamps
indexes
soft-delete behavior
```

Then propose the clean baseline migration.

## IDENTITY

Explain how the existing visitor/session/PostHog identity code maps into:

```text
Contact
ContactIdentity
Lead
```

Preserve proven behavior.

## SALESFORCE TRANSITION

Explain how the existing Salesforce integration can remain functional during Phase 1 while DIM functionality moves into `drimplant-api`.

## RISKS

Identify any architectural risks before editing.

After the assessment, proceed with the refactor using this specification.

When old Space/ABM business logic conflicts with this specification:

> **This Dr. Implant specification wins.**

When proven generic PostHog, Salesforce, Sequelize, authentication, logging, or infrastructure code conflicts only cosmetically with this document:

> **Preserve the working infrastructure and adapt the Dr. Implant domain around it.**
