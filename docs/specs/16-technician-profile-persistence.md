# 16 - Technician Profile Persistence

## Goal

Create the technician domain and persistence foundation needed by technician
management, availability, eligibility, and assignment features.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
16 - Technician Profile Persistence
```

## Scope

In scope:

```text
Technician domain model and status vocabulary
active-user profile creation policy
technicians table
technician_skills join table
technician_service_areas join table
TypeORM persistence entities and mapper
TechnicianRepository contract and TypeORM implementation
atomic synchronization of profile, skills, and service areas
focused domain, mapper, migration, and PostgreSQL-backed repository tests
```

## Out Of Scope

```text
technician management HTTP endpoints and application use cases
admin authorization and request DTO validation
technician availability windows
eligible technician search and ranking
assignment and overlap checks
technician calendar
rating updates or performance calculation
audit log and outbox events
```

These capabilities remain in roadmap steps 17 and later.

## Roles

```text
technician
admin
```

No role invokes this slice through HTTP. Step 17 will let an admin manage
profiles for users that act as technicians.

## API Endpoints

None. This is a persistence foundation only.

The endpoints below remain deferred to step 17:

```text
GET /api/v1/admin/technicians
POST /api/v1/admin/technicians
PATCH /api/v1/admin/technicians/:technicianId
```

## Data Model Changes

### technicians

Columns:

```text
id uuid primary key default gen_random_uuid()
user_id uuid not null
status technician_status not null default active
daily_assignment_limit integer not null
rating numeric(3,2) null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints and indexes:

```text
unique(user_id)
foreign key(user_id) references users(id) on delete restrict
daily_assignment_limit > 0
rating is null or between 0 and 5 inclusive
idx_technicians_status
```

The migration creates PostgreSQL enum `technician_status` with:

```text
active
inactive
on_leave
suspended
```

### technician_skills

Columns and constraints:

```text
technician_id uuid not null references technicians(id) on delete cascade
skill_id uuid not null references skills(id) on delete restrict
primary key(technician_id, skill_id)
index(skill_id)
```

### technician_service_areas

Columns and constraints:

```text
technician_id uuid not null references technicians(id) on delete cascade
service_area_id uuid not null references service_areas(id) on delete restrict
primary key(technician_id, service_area_id)
index(service_area_id)
```

No seed data is required.

## Domain Rules

```text
one user can have zero or one technician profile
a new technician profile may be created only for an active user
a technician must serve at least one service area
daily assignment limit must be a positive integer
rating is null or a finite value from 0 through 5
skill ids and service area ids are unique within a profile
only status active is assignment-eligible
inactive, on_leave, and suspended are not assignment-eligible
```

The active-user rule is dynamic and cannot be represented safely by a foreign
key or check constraint. `TechnicianProfilePolicy` defines the rule for the
step-17 create use case. `TechnicianRepository` persists already validated
domain state and does not decide whether a user is active.

## Application Use Cases

None in this slice.

Step 17 will add create/update/list use cases and will call
`TechnicianProfilePolicy` before persistence.

## Repository Interface

Add `TechnicianRepository`:

```text
save(technician: Technician): Promise<Technician>
findById(id: string): Promise<Technician | null>
findByUserId(userId: string): Promise<Technician | null>
```

`save` inserts or updates the profile and replaces skill and service-area links
with the IDs in the domain model.

## Transaction Boundaries

`TechnicianTypeOrmRepository.save` runs in one database transaction:

```text
upsert technicians row
replace technician_skills rows
replace technician_service_areas rows
reload and map the complete persisted profile
```

Any failure rolls back all profile and link changes. No audit or outbox rows are
written because no business command is exposed in this step and the audit/outbox
foundations are scheduled later.

## Events And Background Jobs

```text
none
```

## Authorization Rules

None in this slice because there is no endpoint or actor-facing use case.

Step 17 must restrict profile management to admins. Direct infrastructure
repository access is not an authorization boundary.

## Validation Rules

Domain validation:

```text
userId is non-blank
dailyAssignmentLimit is a positive integer
rating is null or a finite number between 0 and 5
at least one serviceAreaId is present
duplicate skillIds are normalized away
duplicate serviceAreaIds are normalized away
```

Database validation:

```text
user, skill, and service-area foreign keys must exist
one profile per user
duplicate join rows are rejected
daily assignment limit and rating checks are enforced
```

Active skill and active service-area checks are business validations for the
step-17 management use case. Existing links remain valid if catalog or service
area records are deactivated later.

## Test Plan

Unit:

```text
Technician rejects empty service areas and invalid daily limits/ratings
Technician removes duplicate skill and service-area ids
only active status reports assignment eligibility
TechnicianProfilePolicy rejects an inactive user
mapper preserves profile, links, status, rating, and timestamps
```

Migration:

```text
technicians schema has enum, unique user, foreign key, checks, and status index
join tables have composite keys, foreign keys, and lookup indexes
down migration removes tables before enum type
```

PostgreSQL-backed repository:

```text
create and reload technician profile
duplicate user profile is rejected by PostgreSQL
skills link to technician
service areas link to technician
profile and links update atomically
missing foreign-key target rolls back the profile write
```

API:

```text
none
```

## Manual Verification

```bash
docker compose up -d postgres redis
npm run typecheck
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run db:migration:run
npm run db:migration:show
```

Optional SQL inspection:

```text
\d technicians
\d technician_skills
\d technician_service_areas
```

## Rollout Notes

Migration order:

```text
03 user persistence
07 service catalog schema and seeds
10 service areas and customer addresses
16 technician profile persistence
```

The migration is additive. No existing rows require backfill.

## Implementation Checklist

- [x] Add technician domain model, status, and profile policy.
- [x] Add repository contract.
- [x] Add TypeORM entities and mapper.
- [x] Add TypeORM repository implementation and module wiring.
- [x] Add migration and focused tests.
- [x] Update the relevant ignored engineering note.
- [x] Run verification commands.
- [x] Complete tester and stakeholder reviews.

## Open Questions

```text
none
```

## Requirements Review

Decision: ready

Findings:

- [minor] Active skill and service-area validation cannot be exercised through
  this persistence-only slice and is explicitly assigned to step 17.

Required changes:

```text
none
```

Open questions:

```text
none
```

## Architecture Review

Architecture decision: approved

Findings:

```text
none
```

Architecture notes:

```text
The domain model remains framework-free.
TypeORM entities stay under db and mapping stays under infra.
The repository transaction synchronizes the profile and both join tables.
The active-user policy remains in domain/application flow rather than persistence.
```

Open questions:

```text
none
```

## Test Review

Test decision: sufficient

Missing tests:

```text
none
```

Redundant/weak tests:

```text
none
```

Recommended verification completed:

```text
npm run typecheck
npm run lint
npm run build
npm test -- --runInBand
npm run db:migration:run
npm run test:e2e -- --runInBand
```

The PostgreSQL-backed repository tests prove profile creation, duplicate-user
rejection, link replacement, and transaction rollback after a foreign-key
failure.

## Stakeholder Review

Stakeholder decision: accepted

Business fit:

- The feature creates the technician data foundation required for admin
  management and dispatcher assignment while keeping incomplete API and
  availability behavior out of scope.

Findings:

```text
none
```

Missing acceptance criteria:

```text
none
```

Open questions:

```text
none
```
