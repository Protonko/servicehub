# 19 - Eligible Technician Search

## Goal

Return a deterministic advisory list of technicians who satisfy the request's
skills, service area, status, availability, and current-assignment constraints
for a dispatcher-selected time slot.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
19 - Eligible Technician Search
```

## Scope

In scope:

```text
GET /api/v1/service-requests/:requestId/eligible-technicians
dispatcher/admin authorization
assignable-request validation
skill, service-area, active-status, and availability filtering
active-assignment overlap exclusion
deterministic advisory ranking
assignments table read-side persistence foundation
focused query, use-case, migration, and PostgreSQL-backed API tests
```

## Out Of Scope

```text
assignment creation, rescheduling, cancellation, or status transitions
transactional double-booking prevention
AssignmentPolicy and final TechnicianEligibilityPolicy
daily assignment limit enforcement without a defined business timezone/day boundary
distance, route, travel-time, or location ranking
automatic assignment
pagination
audit and outbox writes because this endpoint is read-only
```

The active roadmap requires overlap exclusion in step 19, but assignment writes
are scheduled for step 21 and no assignments table exists yet. This slice adds
the documented assignments schema as a read-side foundation only. Step 21 owns
all assignment mutations and transactional consistency.

## Roles

```text
dispatcher searches eligible technicians before manual assignment
admin can perform the same operational search
```

## API Endpoint

### GET /api/v1/service-requests/:requestId/eligible-technicians

Roles: `dispatcher`, `admin`.

Query parameters:

```text
startsAt ISO 8601 datetime, required
endsAt ISO 8601 datetime, required
```

Response: `200 OK` with advisory candidates:

```text
requestId
startsAt
endsAt
candidates[]:
  technicianId
  user: id, fullName
  rating
  dailyAssignmentLimit
  skillIds
  serviceAreaIds
  activeAssignmentCount
```

Candidates are ordered by:

```text
activeAssignmentCount ascending
rating descending with null last
user fullName ascending
technicianId ascending
```

Errors:

```text
400 invalid UUID/datetime or startsAt >= endsAt
401 unauthenticated
403 actor is neither dispatcher nor admin
404 request does not exist
409 request status does not allow assignment
```

## Data Model Changes

### assignments read-side foundation

Create PostgreSQL enum `assignment_status`:

```text
assigned
accepted
on_the_way
in_progress
completed
cancelled
rejected
```

Create the documented `assignments` table:

```text
id uuid primary key default gen_random_uuid()
service_request_id uuid not null references service_requests(id) on delete restrict
technician_id uuid not null references technicians(id) on delete restrict
assigned_by_user_id uuid not null references users(id) on delete restrict
status assignment_status not null
starts_at timestamptz not null
ends_at timestamptz not null
accepted_at timestamptz null
on_the_way_at timestamptz null
started_at timestamptz null
completed_at timestamptz null
cancelled_at timestamptz null
cancellation_reason text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints and indexes:

```text
check starts_at < ends_at
idx_assignments_request_id(service_request_id)
idx_assignments_technician_time(technician_id, starts_at, ends_at)
idx_assignments_status(status)
```

No assignment repository or write use case is added in this slice.

## Domain Rules

Request:

```text
request must exist
request status must satisfy ServiceRequest.canBeAssigned()
```

Candidate:

```text
technician status is active
technician has every required skill snapshot on the request
technician serves the service area of the request address
one available window fully contains [startsAt, endsAt)
no blocked window overlaps [startsAt, endsAt)
no active assignment overlaps [startsAt, endsAt)
```

Overlap uses half-open intervals:

```text
existing.startsAt < requested.endsAt
existing.endsAt > requested.startsAt
```

Therefore adjacent windows where one ends exactly when another begins do not
overlap.

Active assignment statuses:

```text
assigned
accepted
on_the_way
in_progress
```

Completed, cancelled, and rejected assignments do not block availability.

Availability precedence:

```text
an available window must fully cover the requested slot
any overlapping is_available=false window excludes the slot
```

## Application Use Case

### GetEligibleTechniciansUseCase

Input:

```text
requestId
startsAt
endsAt
```

Flow:

```text
load request through ServiceRequestRepository
return 404 when missing
reject when ServiceRequest.canBeAssigned() is false
call TechnicianEligibilityQuery with requestId and selected slot
return the ordered advisory read model
```

Coarse dispatcher/admin authorization remains in guards. Final assignment must
repeat all eligibility and overlap checks inside the step-21 transaction.

## Query Interface

Add `TechnicianEligibilityQuery`:

```text
findEligibleTechnicians(requestId, startsAt, endsAt)
```

The TypeORM implementation owns the SQL joins and anti-joins across:

```text
service_requests
customer_addresses
service_request_required_skills
technicians
users
technician_skills
technician_service_areas
technician_availability_windows
assignments
```

## Transaction Boundaries

This is a read-only advisory query and opens no transaction. Its result can
become stale immediately; step 21 must revalidate under its assignment
transaction and locking strategy.

## Events And Background Jobs

```text
none
```

## Authorization Rules

```text
all requests require authentication
dispatcher and admin may search
customer and technician may not search
```

## Validation Rules

```text
requestId is a UUID
startsAt and endsAt are required ISO 8601 datetimes
startsAt is strictly before endsAt
unknown query parameters are rejected by the global validation pipe
```

Past slots are not rejected because no explicit scheduling horizon or business
timezone policy exists. Assignment policy may tighten this later.

## Test Plan

Unit:

```text
use case rejects missing request
use case rejects needs_triage, assigned, completed, and cancelled requests
use case delegates an assignable request and preserves advisory ordering
```

Migration:

```text
assignment enum contains documented statuses
assignments table has foreign keys, range check, and lookup indexes
down migration drops table before enum
```

PostgreSQL query/API:

```text
matching active technician is returned
inactive technician is excluded
technician missing any required skill is excluded
technician serving another area is excluded
slot outside available coverage is excluded
overlapping blocked window excludes technician
overlapping active assignment excludes technician
adjacent active assignment does not exclude technician
completed/cancelled/rejected assignment does not exclude technician
candidates are ranked deterministically by workload, rating, name, and ID
unauthenticated and wrong-role requests are rejected
missing request returns 404
non-assignable request returns 409
invalid slot returns 400
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
18 technician availability
19 assignment read foundation
```

The migration is additive and requires no backfill.

## Open Questions

```text
none
```

## Requirements Review

Decision: ready

Findings:

- [major] The roadmap requires active-assignment overlap exclusion before any
  assignment persistence step exists. This spec adds the documented assignments
  table as a read-only foundation and leaves all mutations in step 21.
- [minor] Daily assignment limits lack a defined timezone and day boundary.
  Enforcement remains in the step-20/21 policy work instead of introducing an
  arbitrary server-time interpretation here.

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
the use case owns request-state validation
the infra query owns joins, availability predicates, overlap anti-joins, and ranking
the endpoint returns an application read model rather than persistence entities
the assignments entity is read-only in this slice and prepares step 21 without implementing it
```

Open questions:

```text
none
```

## Implementation Checklist

- [x] Add the assignment read-foundation enum, entity, and migration.
- [x] Add the eligible-technician application read model and query contract.
- [x] Implement skill, area, status, availability, blocked-window, and overlap filtering.
- [x] Implement deterministic workload/rating/name/ID ranking.
- [x] Add request-state validation and dispatcher/admin HTTP handling.
- [x] Add use-case, migration, PostgreSQL query, authorization, and validation tests.
- [x] Update the API contract and relevant ignored engineering note.
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
Dispatchers receive a focused advisory candidate list and retain the final assignment decision.
Required skills, service area, blocked time, and current work prevent operationally invalid suggestions.
The result explicitly remains advisory so concurrent assignment changes cannot bypass final validation.
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
