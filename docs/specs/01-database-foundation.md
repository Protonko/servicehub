# 01 - Database Foundation

## Goal

Create the TypeORM database foundation needed for future stateful features.

This step should make migrations, entity registration, database CLI usage, and
repository integration testing possible without implementing the full business
schema yet.

## Scope

Included:

```text
TypeORM data source config for CLI migration commands
database module alignment with the same TypeORM options used by the app
standard persistence conventions for ids, timestamps, enums, and table names
migration folder structure
initial empty or baseline migration if needed to prove the migration pipeline
test database setup for repository/integration tests
documentation of migration and verification commands
```

Allowed but not required:

```text
small shared persistence helpers only if they reduce real duplication
example no-op migration used only to validate migration execution
```

## Out Of Scope

Not included in this step:

```text
roles table and role seed data
users table and identity persistence
service catalog tables and seeds
service requests, assignments, technicians, inventory, notifications, audit logs, or outbox tables
HTTP endpoints
domain models
application use cases
authorization guards
background jobs
real seed data beyond a migration infrastructure proof
```

These are intentionally deferred to later roadmap items, starting with
`02-role-seed-data.md`.

## Inputs

Read and keep aligned with:

```text
docs/REQUIREMENTS.md
docs/STACK.md
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_PLAN.md
docs/specs/00-feature-roadmap.md
docs/design/DATABASE_SCHEMA.md
docs/design/ER_DIAGRAM.md
docs/design/SERVICE_INTERACTIONS.md
src/db/database.module.ts
```

## User Roles

No product user role directly uses this feature.

This is platform infrastructure for developers and CI.

## API Endpoints

None.

## Data Model Changes

This step defines the conventions every later table must follow:

```text
snake_case table names
snake_case column names
uuid primary keys
timestamptz timestamp columns
created_at and updated_at for mutable business tables
explicit foreign keys in migrations
explicit indexes for lookup and workflow queries
synchronize disabled in all environments
migrations as the only schema-change mechanism
```

No business table has to be created in this feature.

If an initial migration is added, it should be a baseline/proof migration and
must not pretend to implement business schema that belongs to later specs.

## Domain Rules

No domain rules are implemented in this step.

Architectural rules that must be preserved:

```text
TypeORM entities are persistence models, not domain models.
Domain code must not import TypeORM decorators, entities, repositories, or database config.
Application use cases should depend on repository interfaces in later steps.
Infrastructure repositories should hide TypeORM details from application code.
```

## Application Use Cases

None.

## Authorization Rules

None.

No authenticated actor exists yet in this feature.

## Validation Rules

Configuration validation should reject or surface invalid database settings before
runtime behavior becomes misleading.

Expected settings:

```text
DATABASE_HOST
DATABASE_PORT
DATABASE_USER
DATABASE_PASSWORD
DATABASE_NAME
DATABASE_SSL
DATABASE_MIGRATIONS_RUN
```

The CLI data source should use the same environment-derived settings as the
NestJS `DatabaseModule`.

## Transaction Boundaries

No business transactions are implemented.

The migration command itself must run through TypeORM's migration mechanism.
Later write use cases will define their own transaction boundaries.

## Events And Background Jobs

None.

Outbox schema and workers are deferred to later roadmap items.

## Tests To Add

Add focused tests or verification coverage for:

```text
database config can be created from environment values
TypeORM app module compiles with migrations disabled by default
CLI data source imports successfully
migration command can be invoked against PostgreSQL
repository integration test setup can connect and clean up
```

Do not add tests for business repositories in this step because the business
tables are not part of this feature.

## Manual Verification

Smallest useful verification commands:

```text
docker compose up -d postgres redis
npm run typecheck
npm run build
npm test
npm run test:e2e
docker compose config
```

If migration scripts are added in `package.json`, also verify:

```text
npm run db:migration:run
npm run db:migration:revert
```

The exact migration script names may differ, but they must be documented before
implementation is marked done.

## Implementation Checklist

- [x] Confirm current TypeORM package version and migration CLI support.
- [x] Add or confirm `src/db/migrations/` exists and is used by build output.
- [x] Add TypeORM CLI data source config under `src/db/`.
- [x] Ensure the NestJS `DatabaseModule` and CLI data source share the same config assumptions.
- [x] Keep `synchronize: false`.
- [x] Decide whether `migrationsRun` remains environment-controlled or manual-only for local development.
- [x] Add migration npm scripts if missing.
- [x] Add test database setup notes or helper for future repository integration tests.
- [x] Add the minimal test/verification coverage listed above.
- [x] Update or create `docs/engineering-notes/01-database-foundation.md` during implementation.
- [x] Run the manual verification commands.
- [x] Record any tradeoffs or deferred schema work in the engineering note.

## Definition Of Done

This feature is complete when:

```text
database config compiles
API app can start with TypeORM configured
worker app can start without requiring business entities
migration CLI can be invoked
migrations are the documented schema-change path
synchronize remains disabled
future specs have a clear place to add entities and migrations
verification commands pass or failures are documented with cause
```

## Dependencies

Required:

```text
00 project setup
Docker Compose PostgreSQL service
existing NestJS DatabaseModule
```

Downstream features:

```text
02 Role seed data
03 User persistence
07 Service catalog schema and seeds
all later stateful workflow features
```

## Assumptions

```text
The first implementation slice should stay smaller than Phase 01 in docs/IMPLEMENTATION_PLAN.md.
Role seed data is separated into roadmap item 02 and should not be bundled here.
Business table creation should happen in the feature that first needs each table unless a later architecture review intentionally groups schema work.
```

## Open Questions

```text
Should local development run migrations automatically with DATABASE_MIGRATIONS_RUN=true, or should migrations always be triggered manually?
Should repository integration tests use the compose database with a separate test schema, or a dedicated test database name?
```

## Requirements Review

Decision:

```text
ready
```

Findings:

```text
minor: docs/IMPLEMENTATION_PLAN.md Phase 01 lists all MVP tables, while docs/specs/00-feature-roadmap.md splits persistence into smaller slices.
```

Required changes before implementation:

```text
none
```

Implementation should follow the smaller roadmap slice in this spec unless the
scope is intentionally expanded in a later architecture review.
