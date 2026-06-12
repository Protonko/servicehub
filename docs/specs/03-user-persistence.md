# 03 - User Persistence

## Goal

Implement user persistence without exposing authentication workflows yet.

This step should create the database schema, persistence entities, domain model,
repository contract, TypeORM repository, and mapper needed by later registration,
login, current-user, and authorization features.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
03 - User Persistence
```

## Scope

In scope:

```text
users table migration
user_roles join table migration
TypeORM persistence entities for users, roles, and user_roles
domain User model
UserRepository interface
UserTypeOrmRepository implementation
user mapper between persistence and domain
focused tests for mapping, repository contract behavior, and migration shape
engineering note for the implementation step
```

The existing `roles` table from `02-role-seed-data.md` is reused. This step may
add a `RoleEntity` persistence model for that table but must not recreate role
seed data.

## Out Of Scope

Not included:

```text
customer registration endpoint
login, logout, refresh, or JWT cookies
password hashing adapter
AuthController
current user endpoint
authentication guard
role guard
current user decorator
admin user management API
technician profile creation
audit logs
outbox events
notification jobs
```

These are deferred to later identity slices, starting with
`04-auth-registration.md`.

## Roles

This feature persists users that may later have these role codes:

```text
customer
dispatcher
technician
admin
```

No actor can call this feature through HTTP yet.

## API Endpoints

None.

This is a persistence feature only.

## Data Model Changes

Create `users`.

Columns:

```text
id uuid primary key
email varchar(320) not null
password_hash varchar not null
full_name varchar(200) not null
phone varchar(40) null
is_active boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

```text
unique(email)
email = lower(email)
length(btrim(email)) > 0
length(btrim(password_hash)) > 0
length(btrim(full_name)) > 0
```

Indexes:

```text
idx_users_email
idx_users_is_active
```

Create `user_roles`.

Columns:

```text
user_id uuid not null
role_id uuid not null
created_at timestamptz not null default now()
```

Constraints:

```text
primary key(user_id, role_id)
foreign key(user_id) references users(id) on delete cascade
foreign key(role_id) references roles(id) on delete restrict
```

Indexes:

```text
idx_user_roles_user_id
idx_user_roles_role_id
```

No new seed data is required.

## Domain Rules

Required rules:

```text
user email is stored lowercase
user email must be non-empty
password_hash must be non-empty
full_name must be non-empty
user may have one or more roles
assigned roles must exist in roles table
duplicate role assignment for the same user is not allowed
inactive users remain persisted but later auth features must reject login
```

No password hashing is performed in this feature. Inputs to the repository are
already expected to contain a password hash.

## Application Use Cases

None.

No command or query use case is exposed yet. Later use cases will depend on the
repository contract added here:

```text
RegisterCustomerUseCase
LoginUseCase
GetCurrentUserUseCase
```

## Repository Contract

Add `UserRepository` with methods needed by the next identity slices:

```text
save(user: User): Promise<User>
findById(id: string): Promise<User | null>
findByEmail(email: string): Promise<User | null>
```

`save` must create or update user core fields and synchronize user role links.
Email lookup must normalize input to lowercase before querying.

## Transaction Boundaries

Schema changes run through TypeORM migrations.

`UserTypeOrmRepository.save` must persist user core fields and user role links
in one transaction so a user cannot be stored without the intended role links or
with partial role changes.

No audit or outbox rows are written in this feature because there is no
business workflow exposed yet.

## Events And Background Jobs

None.

User creation in this slice does not publish domain events, enqueue jobs, or
write outbox events. Registration can decide event/audit requirements in
`04-auth-registration.md`.

## Authorization Rules

None.

There is no authenticated actor or HTTP route yet. Authorization and ownership
checks start in later auth/guard features.

## Validation Rules

Repository/domain validation:

```text
email is trimmed and lowercased
email must include non-whitespace characters
password_hash must include non-whitespace characters
full_name must include non-whitespace characters
phone may be null
roles must be valid RoleCode values
```

Database validation:

```text
email uniqueness is enforced
lowercase email is enforced
required fields are not null
blank email, password_hash, and full_name are rejected
duplicate user_roles rows are rejected
missing user or role FK is rejected
```

DTO validation is out of scope because no endpoint exists yet.

## Test Plan

Unit:

```text
User model normalizes email
User model rejects blank email, password hash, and full name
User model prevents duplicate roles
user mapper preserves id, email, active flag, phone, timestamps, and roles
```

Migration/repository verification:

```text
users table contains required constraints and indexes
user_roles table contains composite primary key and foreign keys
repository can save a user with a role
repository can find a user by lowercase or mixed-case email
repository synchronizes assigned roles
unique email is enforced by PostgreSQL
duplicate user_roles row is rejected by PostgreSQL
```

API:

```text
none
```

Avoid tests that only assert constants or enum values.

## Manual Verification

```text
docker compose up -d postgres redis
npm run typecheck
npm run build
npm test
npm run db:migration:run
npm run db:migration:show
npm run db:migration:revert
```

After migration run, verify schema manually:

```text
\d users
\d user_roles
```

Optional SQL checks:

```text
insert lowercase user succeeds
insert duplicate email fails
insert mixed-case email fails
assign known role succeeds
assign missing role fails
```

## Rollout Notes

Migration order:

```text
01 database foundation
02 role seed data
03 user persistence
```

`03-user-persistence` depends on the `roles` table created by
`02-role-seed-data`.

## Implementation Checklist

- [x] Add domain `User` model.
- [x] Add user repository contract.
- [x] Add TypeORM entities for users, roles, and user_roles.
- [x] Add mapper between TypeORM entities and domain model.
- [x] Add TypeORM repository implementation.
- [x] Add migration creating users and user_roles.
- [x] Add focused tests for domain behavior, mapper behavior, and migration/repository risk.
- [x] Update `docs/engineering-notes/03-user-persistence.md`.
- [x] Run verification commands.

## Open Questions

```text
none
```

## Requirements Review

Decision:

```text
ready
```

Findings:

```text
minor: this feature intentionally does not expose API behavior, so auth endpoint status codes from docs/design/API_ENDPOINTS.md are deferred to later specs.
```

Required changes:

```text
none
```

Open questions:

```text
none
```

## Architecture Review

Architecture decision:

```text
approved
```

Findings:

```text
minor: repository integration must keep TypeORM entities in db/ and mapping in infra/, not in domain.
```

Architecture notes:

```text
Domain User remains framework-free.
TypeORM entities are persistence models only.
Repository save owns the transaction for user plus user_roles synchronization.
No controller, guard, audit, outbox, or worker behavior is required in this slice.
```

Open questions:

```text
none
```

## Test Review

Test decision:

```text
sufficient
```

Missing tests:

```text
none
```

Recommended verification:

```text
npm run typecheck
npm run build
npm test
npm run db:migration:run
npm run db:migration:show
npm run db:migration:revert
```

## Stakeholder Review

Stakeholder decision:

```text
accepted
```

Business fit:

```text
This creates the account persistence foundation required for customer registration, dispatcher/admin operations, technician identity, and future RBAC without exposing incomplete authentication behavior.
```

Findings:

```text
none
```

Open questions:

```text
none
```
