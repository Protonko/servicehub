# 01 - Database Foundation

## What Was Built

Added the first database infrastructure slice for ServiceHub.

Implemented:

```text
shared TypeORM option builder
NestJS DatabaseModule usage of the shared options
TypeORM CLI data source
migration folder
baseline migration
migration npm scripts
unit tests for runtime and CLI database options
```

## Why It Was Needed

Every stateful ServiceHub workflow depends on reliable schema management.

This step establishes migrations as the schema-change path before roles, users,
catalog records, requests, assignments, inventory, audit logs, and outbox records
are added.

## Files Added Or Changed

Added:

```text
src/db/typeorm-options.ts
src/db/typeorm-options.spec.ts
src/db/data-source.ts
src/db/migrations/1781160000000-DatabaseFoundation.ts
docs/engineering-notes/01-database-foundation.md
```

Changed:

```text
src/db/database.module.ts
package.json
docs/specs/00-feature-roadmap.md
docs/specs/01-database-foundation.md
```

## Data Flow Through Layers

There is no business workflow in this feature.

Database configuration now flows as:

```text
environment variables
  -> appConfig()
  -> shared TypeORM option builder
  -> NestJS DatabaseModule or TypeORM CLI DataSource
```

The domain, application, API, and infrastructure business layers remain
untouched.

## Backend Concepts Demonstrated

```text
migration-first schema management
single source of truth for database connection options
separation between NestJS TypeOrmModule options and CLI DataSource options
explicit synchronize: false
baseline migration to verify migration execution before business tables exist
```

## How To Run Or Test

Use the standard verification commands:

```text
npm run typecheck
npm run build
npm test
npm run test:e2e
docker compose config
```

With PostgreSQL running:

```text
docker compose up -d postgres redis
npm run db:migration:show
npm run db:migration:run
npm run db:migration:revert
```

## Tradeoffs

The baseline migration intentionally does not create business tables.

`DATABASE_MIGRATIONS_RUN` remains environment-controlled and defaults to false.
Local development should use explicit migration commands unless a specific
environment opts into automatic migration execution.

`docs/IMPLEMENTATION_PLAN.md` describes a broad database foundation phase, but
`docs/specs/00-feature-roadmap.md` splits implementation into smaller feature
slices. This implementation follows the smaller first slice so role seed data,
user persistence, service catalog schema, and request workflow tables can be
specified and reviewed independently.

## Later Improvements

```text
add role table and seed migration in 02-role-seed-data
add user persistence in 03-user-persistence
add service catalog schema and seeds in 07-service-catalog-schema-seeds
add PostgreSQL-backed repository integration helpers when the first repository exists
document CI database setup after CI configuration is introduced
```
