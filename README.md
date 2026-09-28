# drimplant-api

Backend for the Dr. Implant system: acquisition, leads, consults, and the identity graph that will later power conversations, calls, and the dashboard.

This is a Node / Express / MySQL / Sequelize service. Production will eventually run on Aptible. Local development uses fake/synthetic patient data only — never real PHI.

## Stack

- Node.js 20
- Express
- MySQL
- Sequelize

Do not introduce Nest, GraphQL, Mongo, Prisma, or extra databases.

## Identity model

```text
visitor_uuid   persistent anonymous browser identity (also PostHog distinct_id while anonymous)
session_uuid   one browsing session under a Visitor
lead_uuid      canonical known lead (email/phone/name are attributes, not identity keys)
```

A Visitor can have many Sessions. A Lead may point at a Visitor and a conversion Session, but Leads can also be created from Messenger, phone, SMS, or manual entry with no browser identity.

When a Lead is created from a Visitor, the API records `V → L` in MySQL and (if PostHog is configured) identifies the lead so anonymous history can merge.

## Lead lifecycle

Stored values:

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

Lifecycle is not strictly linear. A lead can book, no-show, and book again. `Lead.current_stage` is the current value; `lead_stage_histories` keeps every transition.

Consults are first-class records. One lead can have many consults (canceled, no-show, then completed).

## Run locally

**Node 20** and **MySQL 8+** on `127.0.0.1:3306`.

```bash
cp .env.example .env
# edit DB_USER / DB_PASSWORD to match your local MySQL

mysql -u root -e "CREATE DATABASE IF NOT EXISTS drimplant_db;"

npm install
npm run dev
```

Health check: [http://localhost:3005/health](http://localhost:3005/health)

Public acquisition routes live under `/v1`. If `PUBLIC_API_KEY` is set, send it as `x-api-key`.

```bash
# visitor + session + lead (synthetic data)
curl -s -X POST http://localhost:3005/v1/visitors -H 'Content-Type: application/json' -d '{}'
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Nodemon on port 3005 |
| `npm start` | `node server.js` |
| `npm test` | Core API tests (server must be running, or tests start it) |
| `npm run migrate` | Run Sequelize migrations |

In development the server also `sequelize.sync()` so empty local databases get tables without a separate migrate step. Production should use migrations only.

## Integrations

PostHog and Salesforce **clients are preserved**. They do nothing until env vars are set.

- PostHog: anonymous events use `visitor_uuid`; known leads use `lead_uuid` plus `$identify` with `$anon_distinct_id`.
- Salesforce: OAuth + CRUD helpers live in `integrations/salesforce/client.js`. Dr. Implant object mapping is not wired yet.

Never send full Sequelize objects to vendors. Use explicit payload builders.

## What this version does not include

Messenger, SMS chat, call-center UI, dashboard frontend, scoring, and revenue accounting. The schema and `/v1` APIs are designed so those can attach later without splitting PHI into a second app.

Store everything safely. Share selectively.

## Aptible (developer)

Do not run Docker locally. Aptible still builds from a `Dockerfile` **on their servers** when you `git push` — they dropped Heroku-style buildpacks. That file is a build recipe, not a local Docker workflow.

Until that file is in the repo, Aptible will not accept a git deploy.

Once logged in (`aptible login`):

```bash
aptible environment:create drimplant-dev
aptible db:create drimplant-db --type mysql --version 8.4 --environment drimplant-dev
aptible apps:create drimplant-api --environment drimplant-dev
# add the git remote printed by Aptible, then:
git push aptible main
```

Set CORS after the app exists:

```bash
aptible config:set --app drimplant-api --environment drimplant-dev \
  NODE_ENV=production \
  CORS_ORIGIN=https://drimplant-widget.netlify.app,https://dr-implant.netlify.app
```

Expose the `web` service with an HTTPS endpoint, then point the widget’s `VITE_API_URL` at that URL and redeploy the widget.

Migrations run on release via `.aptible.yml` (`npm run migrate`). Production does not `sequelize.sync()`.
