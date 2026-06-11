# 02 - Role Seed Data

## Goal

Create the persistence and seed foundation for platform roles.

This feature should make the four MVP roles available to later identity,
authentication, authorization, and admin workflows without implementing user
registration or login yet.

## Scope

Included:

```text
roles table
role code constants or enum
idempotent seed for customer, dispatcher, technician, and admin roles
database indexes and constraints for role lookup
focused migration and seed verification tests
engineering note for the implementation step
```

The implementation may create a TypeORM persistence model for `roles` if that
is the cleanest way to keep migrations, future repository code, and TypeORM
metadata aligned. This model remains a persistence model, not a domain model.

## Out Of Scope

Not included in this step:

```text
users table
user repository
customer registration
login, logout, refresh, or JWT cookies
password hashing
AuthController
authentication guards
role guards
current user decorator
permissions table
admin user management API
ownership policy implementation
audit logs or outbox events
```

These are deferred to the later identity slices:

```text
03-user-persistence.md
04-auth-registration.md
05-auth-login-cookies.md
06-current-user-guards.md
```

## Inputs

Read and keep aligned with:

```text
docs/REQUIREMENTS.md
docs/STACK.md
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_PLAN.md
docs/specs/00-feature-roadmap.md
docs/specs/01-database-foundation.md
docs/design/DATABASE_SCHEMA.md
docs/design/API_ENDPOINTS.md
docs/design/SERVICE_INTERACTIONS.md
src/db/typeorm-options.ts
src/db/migrations/1781160000000-DatabaseFoundation.ts
```

## User Roles

This feature defines the canonical role records:

```text
customer
dispatcher
technician
admin
```

No application actor uses this feature directly yet because authentication and
authorization endpoints are not implemented in this slice.

## API Endpoints

None.

This is a database and seed-data feature only.

## Data Model Changes

Create `roles`.

Columns:

```text
id uuid primary key
code varchar(50) not null
name varchar(100) not null
created_at timestamptz not null default now()
```

Constraints:

```text
unique(code)
code in ('customer', 'dispatcher', 'technician', 'admin')
```

Indexes:

```text
idx_roles_code
```

Seed rows:

```text
customer   Customer
dispatcher Dispatcher
technician Technician
admin      Admin
```

Do not create `user_roles` in this feature. It belongs in
`03-user-persistence.md`, where both `users` and `roles` foreign keys can be
created together without a temporary partial relationship.

## Domain Rules

Role codes are stable business identifiers.

Required rules:

```text
the four MVP role codes must always exist after migrations or seeds run
role codes must be unique
role codes must be lowercase snake_case-compatible strings
seed execution must be idempotent
later user assignment must reference existing role rows
```

No domain model is required yet. If a `RoleCode` enum or constant is added, it
should live where future identity code can depend on it without importing
TypeORM entities.

## Application Use Cases

None.

This slice does not add command or query use cases. Later features will consume
the seeded roles through user persistence and auth use cases.

## Authorization Rules

None.

There is no authenticated actor yet. This feature creates data required for
future RBAC but does not enforce RBAC.

## Validation Rules

Migration and seed validation:

```text
role code must be one of customer, dispatcher, technician, admin
role name must be non-empty
duplicate role codes must not be created when seed runs more than once
unexpected role codes should be rejected by the database constraint
```

The implementation should avoid relying only on application-side validation for
canonical role codes.

## Transaction Boundaries

Role schema creation and seed inserts run through the TypeORM migration
transaction.

Seed behavior must be idempotent. Use an upsert-style insert or equivalent
PostgreSQL conflict handling so rerunning migrations or seed commands cannot
duplicate role records.

The migration must revert the `roles` schema cleanly.

## Events And Background Jobs

None.

Role seeding does not emit domain events, outbox events, notifications, or
BullMQ jobs.

## Tests To Add

Add focused tests or verification coverage for:

```text
role code constants contain customer, dispatcher, technician, and admin
roles migration creates unique role codes
seed inserts exactly the four canonical roles
seed can run repeatedly without duplicate rows
unexpected role code violates the database constraint
migration revert removes role schema cleanly
```

If repository integration helpers are still not available, the implementation
may verify database behavior with migration commands and a small migration
inspection test. Prefer a real PostgreSQL-backed test when practical because
this feature is mostly database behavior.

## Manual Verification

Smallest useful verification commands:

```text
docker compose up -d postgres redis
npm run typecheck
npm run build
npm test
npm run db:migration:run
npm run db:migration:show
npm run db:migration:revert
```

After migration run, verify role rows manually with SQL:

```text
select code, name from roles order by code;
```

Expected result:

```text
admin      Admin
customer   Customer
dispatcher Dispatcher
technician Technician
```

## Implementation Checklist

- [x] Add role code constants or enum outside TypeORM entity classes.
- [x] Add migration creating `roles`.
- [x] Add idempotent seed insert for four canonical roles.
- [x] Defer `user_roles` to `03-user-persistence.md`.
- [x] Add focused tests or database verification for uniqueness and idempotency.
- [x] Update `docs/engineering-notes/02-role-seed-data.md`.
- [x] Run the manual verification commands.
- [x] Record tradeoffs and deferred identity behavior in the engineering note.

## Definition Of Done

This feature is complete when:

```text
roles table exists through a TypeORM migration
customer, dispatcher, technician, and admin roles are seeded once
role code uniqueness is enforced by the database
unexpected role codes cannot be inserted
seed behavior is repeatable without duplicates
future user persistence can reference role rows
no auth endpoint or guard behavior is introduced prematurely
verification commands pass or failures are documented with cause
```

## Dependencies

Required:

```text
01 Database foundation
Docker Compose PostgreSQL service
TypeORM migration CLI configuration
```

Downstream features:

```text
03 User persistence
04 Auth registration
05 Auth login and cookies
06 Current user and guards
all later role-protected APIs
```

## Assumptions

```text
The detailed roadmap is authoritative for implementation slicing, so Phase 02 Identity and access from docs/IMPLEMENTATION_PLAN.md is implemented across specs 02 through 06.
Permissions remain conceptual in this step; MVP enforcement starts with role checks and ownership checks in later slices.
Admin, dispatcher, and technician user creation is not needed before public customer registration.
```

## Open Questions

```text
Should role names be immutable seed data, or should future admin tooling be allowed to rename display labels while keeping codes stable?
```

## Requirements Review

Decision:

```text
ready
```

Findings:

```text
minor: docs/IMPLEMENTATION_PLAN.md groups roles, users, auth, cookies, and guards into one broad phase, while docs/specs/00-feature-roadmap.md splits that phase into smaller feature slices.
minor: docs/design/DATABASE_SCHEMA.md defines user_roles with both users and roles foreign keys, but this feature intentionally defers user_roles until users exist.
```

Required changes before implementation:

```text
none
```

Implementation should follow the smaller roadmap slice and defer `user_roles` to
`03-user-persistence.md`.

Open questions:

```text
none blocking
```

## Architecture Review

Architecture decision:

```text
approved
```

Findings:

```text
minor: if TypeORM entities are added for roles, they must stay in the persistence layer and must not become domain models.
```

Architecture notes:

```text
No controller, use case, guard, worker, outbox, or domain policy is needed for this slice.
Role code constants should be reusable by later application/API code without importing db entities.
The migration transaction is the only transaction boundary required in this feature.
```

Open questions:

```text
none blocking
```
