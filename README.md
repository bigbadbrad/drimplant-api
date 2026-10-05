# drimplant-api

Backend for Dr. Implant: contacts, leads, appointments, treatments, and the identity graph that powers acquisition, call-center work, and (later) the dashboard.

This is a Node / Express / MySQL / Sequelize service. Production runs on Aptible. Local development uses fake/synthetic patient data only — never real PHI.

## Stack

- Node.js 20
- Express
- MySQL
- Sequelize

Do not introduce Nest, GraphQL, Mongo, Prisma, or extra databases.

## Domain model

**User** is a Dr. Implant employee (call-center rep, treatment coordinator, manager, admin).

**Contact** is the person. Email and phone live on Contact. External IDs (visitor, Open Dental, Salesforce) live on **ContactIdentity**.

**Lead** is one acquisition episode for a Contact. A Contact can have many Leads. Lead `engagement_status` is call-center workflow only:

```text
new
first_attempt
second_attempt
third_attempt
in_communication
long_term_nurture
```

**Appointment** is a scheduled consult (`scheduled`, `canceled`, `no_show`, `completed`). Booking an appointment does **not** change Lead engagement status.

**Treatment** is the post-consult commercial workflow (`presented` → follow-ups → `won` / `lost` / `closed`). **Product** is an admin catalog. **TreatmentItem** snapshots list price at assignment. **Financing** is a separate status dimension.

Anonymous web identity is still **Visitor** / **Session**. When a widget submit creates a Lead, the visitor is stitched to the Contact (`ContactIdentity.visitor_uuid`) and PostHog `$identify` uses `contact_uuid`.

The live widget still `POST /v1/leads` with name, email, phone, visitor/session, source fields, and smile-profile `answers` JSON.

## Run locally

**Node 20** and **MySQL 8+** on `127.0.0.1:3306`.

```bash
cp .env.example .env
# edit DB_USER / DB_PASSWORD to match your local MySQL

mysql -u root -e "CREATE DATABASE IF NOT EXISTS drimplant_db;"

npm install
npm run db:reset
npm run dev
```

`npm run db:reset` drops all tables, runs `001_initial_drimplant_schema`, and seeds fake admin/staff users plus the product catalog. The app does **not** wipe or sync schema on boot.

Health check: [http://localhost:3005/health](http://localhost:3005/health)

Public acquisition routes live under `/v1`. If `PUBLIC_API_KEY` is set, send it as `x-api-key`. Dashboard reads (including `GET /v1/visitors`) send a User JWT as `Authorization: Bearer …` and skip the public key check. Staff login is `POST /v1/auth/login` with the seeded local user `3055550100` / `local-dev-only`. Product catalog admin routes also require a JWT for a User with role `admin` or `manager`.

```bash
curl -s -X POST http://localhost:3005/v1/visitors -H 'Content-Type: application/json' -d '{}'
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Nodemon on port 3005 |
| `npm start` | `node server.js` |
| `npm test` | API tests (server must already be running) |
| `npm run migrate` | Run Sequelize migrations |
| `npm run db:reset` | Drop all tables, migrate, seed fake data |
| `npm run db:seed` | Seed fake users and products |

Production reset is refused unless `ALLOW_DB_RESET=true`. Aptible reset must be deliberate.

## Integrations

PostHog and Salesforce **clients are preserved**. They do nothing until env vars are set.

- PostHog: anonymous events use `visitor_uuid`; known people use `contact_uuid` plus `$identify` with `$anon_distinct_id`. Lead create also stores `ContactIdentity.posthog_distinct_id`. HogQL (`runQuery`, `getPersonDistinctIds`) enriches the authenticated visitor list when a personal/query key is set.
- Salesforce: OAuth + CRUD helpers live in `integrations/salesforce/client.js`. Dr. Implant object mapping is not wired yet. Salesforce can stay downstream during Phase 1.

Never send full Sequelize objects to vendors. Use explicit payload builders.

Open Dental stays a separate clinical/financial system. `open_dental_pat_num` / `open_dental_appointment_id` and ContactIdentity types are ready for a later API integration.

Messenger / SMS / Telnyx are not built. `Conversation`, `Message`, and `Call` models and `/v1` endpoints exist as extension points.

## Workspaces (product)

The dashboard (not in this repo) will have two operational workspaces: **Leads** (acquisition, engagement, tasks, calls, appointments) and **Treatments** (presentation, products, financing, won/lost). This API is the shared backend.

Store everything safely. Share selectively.

## Aptible (developer)

Do not run Docker locally. Aptible still builds from a `Dockerfile` **on their servers** when GitHub Action deploys — they dropped Heroku-style buildpacks. That file is a build recipe, not a local Docker workflow.

Set CORS after the app exists:

```bash
aptible config:set --app drimplant-api --environment drimplant-dev \
  NODE_ENV=production \
  CORS_ORIGIN=https://drimplant-widget.netlify.app,https://dr-implant.netlify.app
```

Migrations run on release via `.aptible.yml` (`npm run migrate`). Production does not `sequelize.sync()` and will not run `db:reset` unless `ALLOW_DB_RESET=true`.
