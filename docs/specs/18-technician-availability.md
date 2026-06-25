# 18 - Technician Availability

## Goal

Allow administrators to record available or blocked time windows for a
technician and expose those windows through the technician calendar base read
model used by later scheduling features.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
18 - Technician Availability
```

## Scope

In scope:

```text
technician_availability_windows table and TypeORM entity
TechnicianAvailabilityWindow domain model
POST /api/v1/admin/technicians/:technicianId/availability-windows
GET /api/v1/technicians/:technicianId/calendar
admin availability creation use case
calendar availability read model and query
dispatcher/admin/own-technician calendar authorization
domain, migration, use-case, and PostgreSQL-backed API tests
```

## Out Of Scope

```text
updating or deleting availability windows
recurrence rules, templates, or timezone preferences
automatic working-hours generation
availability overlap rejection or normalization
eligible-technician search
assignment creation and double-booking checks
assignment entries in the calendar response
pagination and date-range filtering
audit-log and outbox writes, whose application foundations remain deferred
```

Step 34 will expand the calendar projection with active assignments and report
filtering. This step provides the availability-only base required by step 19.

## Roles

```text
admin creates availability and reads any technician calendar
dispatcher reads any technician calendar
technician reads only the calendar for their own technician profile
```

## API Endpoints

### POST /api/v1/admin/technicians/:technicianId/availability-windows

This endpoint is an intentional addition to `docs/design/API_ENDPOINTS.md`.
The roadmap requires admin availability creation but the endpoint catalog only
specifies the calendar read endpoint.

Role: `admin`.

Request DTO:

```text
startsAt ISO 8601 datetime, required
endsAt ISO 8601 datetime, required
isAvailable boolean, required
reason string or null, optional, maximum 160 characters after trimming
```

Response: `201 Created`:

```text
id
technicianId
startsAt
endsAt
isAvailable
reason
createdAt
updatedAt
```

Errors:

```text
400 invalid UUID, datetime, reason, or startsAt >= endsAt
401 unauthenticated
403 non-admin
404 technician does not exist
```

### GET /api/v1/technicians/:technicianId/calendar

Roles: `dispatcher`, `admin`, or the technician whose profile is requested.

Response: `200 OK`:

```text
technicianId
availabilityWindows ordered by startsAt, endsAt, and id
```

Each window has the same fields as the create response. Assignment entries are
deferred to step 34.

Errors:

```text
400 invalid technician UUID
401 unauthenticated
403 customer or technician requesting another technician's calendar
404 technician does not exist
```

## Data Model Changes

### technician_availability_windows

Columns:

```text
id uuid primary key default gen_random_uuid()
technician_id uuid not null
starts_at timestamptz not null
ends_at timestamptz not null
is_available boolean not null
reason varchar(160) null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints and indexes:

```text
foreign key technician_id references technicians(id) on delete cascade
check starts_at < ends_at
index idx_technician_availability_technician_time on (technician_id, starts_at, ends_at)
```

No seed data is required.

## Domain Rules

```text
availability belongs to exactly one technician
startsAt and endsAt must be valid dates
startsAt must be strictly before endsAt
isAvailable=false represents blocked time
reason is trimmed; blank becomes null; non-null reason is at most 160 characters
overlapping windows are permitted
```

Overlaps are not rejected because regular available windows and exceptional
blocked windows may intentionally overlap. Step 19 must define evaluation
precedence when determining whether a requested slot is available.

## Application Use Cases

### CreateTechnicianAvailabilityWindowUseCase

Input:

```text
technicianId
startsAt
endsAt
isAvailable
reason
```

The use case loads the technician to prove it exists, creates the domain model,
and persists it through `TechnicianAvailabilityRepository`.

### GetTechnicianCalendarUseCase

Input:

```text
authenticated actor
technicianId
```

The use case loads the technician, permits dispatcher/admin or an actor with the
technician role whose user ID owns the profile, and then loads the availability
projection through `TechnicianCalendarReadQuery`.

## Repository And Query Interfaces

```text
TechnicianAvailabilityRepository.save(window)
TechnicianCalendarReadQuery.listAvailabilityWindows(technicianId)
```

The existing `TechnicianRepository` remains responsible for loading the
technician profile used for existence and ownership checks.

## Transaction Boundaries

Creating one availability window inserts one business row. No multi-row
transaction is needed. PostgreSQL enforces technician ownership through the
foreign key and the time-range invariant through a check constraint.

No audit or outbox row is written because those application services and event
contracts are not yet defined by the active roadmap.

## Events And Background Jobs

```text
none
```

## Authorization Rules

```text
all endpoints require authentication
only admin creates availability
admin and dispatcher read any technician calendar
technician reads only the profile whose userId equals the authenticated userId
customer cannot read technician calendars
```

Role guards provide coarse checks. `GetTechnicianCalendarUseCase` enforces
technician ownership because it depends on the requested resource.

## Validation Rules

```text
technicianId is a UUID
startsAt and endsAt are ISO 8601 datetimes
startsAt is strictly before endsAt
isAvailable is a boolean and is not coerced from strings
reason is optional, trimmed, blank-to-null, and at most 160 characters
unknown request fields are rejected by the global validation pipe
```

Past windows are allowed because availability history is valid operational
data and no retention policy is specified.

## Test Plan

Unit:

```text
domain model accepts available and blocked windows
domain model rejects invalid dates, reversed/equal ranges, and long reasons
create use case rejects a missing technician and persists a valid window
calendar use case permits admin/dispatcher and own technician
calendar use case rejects another technician and delegates ordered reads
```

Migration:

```text
table has UUID default, foreign key, time check, and composite lookup index
down migration removes index before table
```

API and PostgreSQL integration:

```text
admin creates available and blocked windows
non-admin cannot create a window
missing technician returns 404
invalid/equal/reversed range returns 400
database check rejects an invalid range
calendar includes windows in deterministic order
dispatcher/admin can read any calendar
technician can read own calendar but not another technician's
customer cannot read a calendar
```

## Manual Verification

```bash
npm run typecheck
npm run build
npm run lint -- --quiet
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run db:migration:run
npm run db:migration:show
```

## Rollout Notes

Migration order:

```text
16 technician profile persistence
18 technician availability
```

The migration is additive and requires no backfill.

## Open Questions

```text
none
```

## Requirements Review

Decision: ready

Findings:

- [minor] The roadmap requires availability creation but the API endpoint
  catalog originally omitted a write endpoint. This slice adds an admin-only
  nested resource endpoint and updates the endpoint catalog.
- [minor] Step 18 asks for availability in the technician calendar while step
  34 owns the complete calendar report. This spec limits step 18 to the
  availability-only base projection and defers assignment entries.

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
the availability model is framework-neutral
the command writes through a repository and the calendar projection uses a read query
resource-specific calendar ownership is enforced in the application use case
the database check duplicates the domain range invariant at the persistence boundary
```

Open questions:

```text
none
```

## Implementation Checklist

- [x] Add the availability window domain model and repository contract.
- [x] Add the TypeORM entity, mapper, repository, and migration.
- [x] Add admin availability creation with DTO and error mapping.
- [x] Add the calendar availability read query and ownership-aware use case.
- [x] Add dispatcher/admin/own-technician calendar HTTP access.
- [x] Add domain, use-case, migration, and PostgreSQL-backed API tests.
- [x] Update the API endpoint catalog and relevant ignored engineering note.
- [x] Run typecheck, build, lint, unit, e2e, and migration verification.
- [x] Complete tester and stakeholder reviews.

## Test Review

Test decision: sufficient

Missing tests:

```text
none
```

Redundant or weak tests:

```text
none
```

Recommended verification:

```text
npm run typecheck
npm run build
npm run lint -- --quiet
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run db:migration:show
```

## Stakeholder Review

Stakeholder decision: accepted

Business fit:

```text
Admins can record regular availability and exceptional blocked time.
Dispatchers can inspect technician availability before later assignment workflows exist.
Technicians can inspect their own availability without seeing another technician's calendar.
```

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
