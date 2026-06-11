# 02 - Role Seed Data

## What Was Built

Added the role seed data foundation for ServiceHub identity and access.

Implemented:

```text
canonical role code enum
roles table migration
idempotent role seed rows
focused tests for role enum and migration SQL
```

## Why It Was Needed

Later identity features need stable role records before users can be persisted,
registered, authenticated, or authorized.

This step creates the four MVP roles:

```text
customer
dispatcher
technician
admin
```

## Files Added Or Changed

Added:

```text
src/domain/model/role-code.ts
src/db/migrations/1781160001000-RoleSeedData.ts
src/db/migration-tests/role-seed-data.spec.ts
docs/engineering-notes/02-role-seed-data.md
```

Changed:

```text
docs/specs/00-feature-roadmap.md
docs/specs/02-role-seed-data.md
```

## Data Flow Through Layers

There is no HTTP or application workflow in this feature.

Role seed data flows as:

```text
TypeORM migration
  -> roles table
  -> canonical role rows
  -> later user persistence and auth features
```

`RoleCode` enum lives outside the database layer so later application and
API code can use canonical role values without importing TypeORM persistence
classes.

## Backend Concepts Demonstrated

```text
database-enforced canonical role codes
unique lookup by role code
idempotent seed data with PostgreSQL conflict handling
migration-first schema changes
framework-free role enum
```

## Implementation Decisions

The `roles` table uses generated UUIDs for seed rows. Role `code` is the stable
business identifier; `id` is only a surrogate primary key. UUIDs are generated
in the TypeORM migration process so this slice does not require a PostgreSQL UUID
extension.

The migration creates a unique index named `idx_roles_code` instead of a
separate duplicate non-unique index. The index both enforces uniqueness and
supports role lookup by code.

`user_roles` is intentionally deferred to `03-user-persistence.md`. Creating it
now would require a temporary table without the `users` foreign key, which would
make the schema less honest than creating both relationships together.

## Tests

Added focused Jest tests for:

```text
roles migration table shape
roles migration check constraints
idempotent ON CONFLICT seed inserts
migration revert order
```

The migration tests inspect generated SQL with a mocked `QueryRunner`. Real
PostgreSQL verification remains part of the manual migration command flow.

Test review:

```text
Test decision: sufficient
```

The slice has no API, authorization, ownership, state transition, outbox, or
worker behavior. The relevant risks are seed idempotency and migration
reversibility; those are covered by migration tests and PostgreSQL migration
verification.

## How To Run Or Test

Use:

```text
npm run typecheck
npm run build
npm test
```

With PostgreSQL running:

```text
docker compose up -d postgres redis
npm run db:migration:run
npm run db:migration:show
npm run db:migration:revert
```

Manual role query after migration run:

```text
select code, name from roles order by code;
```

Expected rows:

```text
admin      Admin
customer   Customer
dispatcher Dispatcher
technician Technician
```

Commands verified during implementation:

```text
npm run typecheck
npm run build
npm test
docker compose config
docker compose up -d postgres redis
npm run db:migration:run
npm run db:migration:show
npm run db:migration:revert
```

`db:migration:run` inserted exactly four role rows. `db:migration:revert`
successfully dropped the role schema. A manual insert with role code `manager`
was rejected by PostgreSQL through `chk_roles_code`. After verification, the
local database was left with the baseline migration applied and
`RoleSeedData1781160001000` pending.

## Stakeholder Review

```text
Stakeholder decision: accepted
```

The feature supports the four ServiceHub actors needed by future workflows:
customer, dispatcher, technician, and admin. It does not expose any user-facing
behavior yet, which is appropriate because registration, login, guards, and
ownership checks belong to later identity slices.

## Tradeoffs

The automated tests do not open a PostgreSQL connection yet. They verify the
role enum and migration SQL shape, while the migration CLI commands verify the
database behavior manually.

The migration keeps seed rows local instead of importing domain constants. That
preserves layer direction for production code; the tests protect against drift
between the migration rows and canonical role codes.

## Later Improvements

```text
create users and user_roles in 03-user-persistence
add repository integration helpers once the first repository exists
add role guard behavior in 06-current-user-guards
```
