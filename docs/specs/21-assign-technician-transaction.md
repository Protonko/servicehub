# 21 - Assign Technician Transaction

## Goal

Allow a dispatcher or admin to assign an eligible technician to an assignable
service request while preventing concurrent double booking and persisting the
request transition, assignment, audit record, and outbox event atomically.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
21 - Assign Technician Transaction
```

## Scope

In scope:

```text
POST /api/v1/service-requests/:requestId/assignments
AssignTechnicianUseCase
Assignment domain model and TypeORM mapper
AssignmentRepository transaction port and TypeORM implementation
request and technician pessimistic locking
transactional eligibility, availability, and overlap revalidation
service request transition to assigned
assignment row creation
TechnicianAssigned audit and outbox rows
availability writes coordinated through the technician lock
unit and PostgreSQL-backed e2e/concurrency/rollback tests
```

## Out Of Scope

```text
assignment list/detail endpoints
technician assignment reads
accept, reject, on-the-way, start, complete, cancel, or reschedule operations
notification processing
outbox worker implementation
daily assignment limit enforcement without a defined business timezone/day boundary
automatic technician selection
PostgreSQL exclusion constraint
```

## Roles

```text
dispatcher assigns technicians operationally
admin may perform the same assignment action
customer and technician may not assign
```

## API Endpoint

### POST /api/v1/service-requests/:requestId/assignments

Roles: `dispatcher`, `admin`.

Request:

```json
{
  "technicianId": "uuid",
  "startsAt": "2026-07-10T09:00:00.000Z",
  "endsAt": "2026-07-10T11:00:00.000Z"
}
```

Response: `201 Created`.

```text
data:
  id
  serviceRequestId
  technicianId
  assignedByUserId
  status
  startsAt
  endsAt
  createdAt
  updatedAt
```

Errors:

```text
400 invalid UUID/datetime or startsAt >= endsAt
401 unauthenticated
403 actor is neither dispatcher nor admin
404 request or technician does not exist
409 request is not assignable
409 technician is inactive, missing a required skill, outside the area, or unavailable
409 technician has an overlapping active assignment
```

## Data Model Changes

No migration is required. Step 19 already created the documented
`assignment_status` enum, `assignments` table, range check, foreign keys, and
indexes.

This slice begins writing:

```text
assignments
service_requests.status and service_requests.assigned_at
audit_logs
outbox_events
```

The Assignment domain model remains separate from `AssignmentEntity`.

## Domain Rules

```text
request must be created or triaged
needs_triage, assigned, active-work, completed, cancelled, and failed requests are rejected
technician must be active
technician must contain every request required-skill snapshot
technician must serve the request address service area
an available window must fully cover the selected half-open slot
an overlapping blocked window rejects the selected slot
active assignment statuses assigned, accepted, on_the_way, and in_progress block overlap
adjacent assignments do not overlap
assignment starts in assigned status
```

Past slots remain allowed because requirements still define no scheduling
horizon or business timezone.

## Application Use Case

### AssignTechnicianUseCase

Input:

```text
actor
requestId
technicianId
startsAt
endsAt
```

Flow:

```text
defensively verify dispatcher/admin role
construct AssignmentTimeSlot
open AssignmentRepository transaction
lock and load request with required skills and address service area
return 404 when request is absent
lock and load technician with skills, service areas, and availability windows
return 404 when technician is absent
call AssignmentPolicy for request status
call TechnicianEligibilityPolicy with transaction snapshot
check active overlap through transaction-scoped ScheduleOverlapChecker
call AssignmentPolicy for the overlap result
create Assignment and transition ServiceRequest to assigned
persist request, assignment, audit, and outbox rows
return saved Assignment
```

## Repository Interfaces

Add `AssignmentRepository` as the assignment unit-of-work port:

```text
executeTransaction(lookup, work)
```

The callback receives an `AssignmentTransactionContext` containing:

```text
locked request snapshot or null
required skill ids
request service area id
locked technician snapshot or null
technician availability windows
transaction-scoped hasActiveOverlap implementation
saveAssignmentOutcome operation
```

The application callback owns workflow and policies. The TypeORM implementation
owns locking, mapping, queries, and atomic persistence only.

## Transaction Boundaries

One PostgreSQL transaction contains:

```text
SELECT service_requests ... FOR UPDATE
SELECT technicians ... FOR UPDATE
load request required skills and service area
load technician skills, service areas, and availability
check active assignment overlap
update service_requests status and assigned_at
insert assignments
insert audit_logs
insert outbox_events
commit
```

Lock order is always:

```text
service request row
technician row
```

Locking the technician row serializes assignments for that technician. The
second transaction waits, then observes the first assignment during overlap
revalidation. Locking the request row serializes competing assignments of the
same request and makes the second transaction observe `assigned` status.

`TechnicianAvailabilityTypeOrmRepository.save` must lock the same technician row
before inserting an availability window. This prevents availability changes
from racing with assignment validation.

The first implementation uses the documented transaction-safe check rather than
a PostgreSQL exclusion constraint.

## Events And Background Jobs

Write one pending outbox row in the assignment transaction:

```text
eventType: TechnicianAssigned
aggregateType: service_request
aggregateId: requestId
payload: requestId, assignmentId, technicianId, technicianUserId,
         assignedByUserId, status, startsAt, endsAt
```

No worker or notification row is created in this slice.

Write one audit row in the same transaction:

```text
action: TechnicianAssigned
entityType: service_request
entityId: requestId
oldValue: request status and assignedAt
newValue: request status, assignedAt, and assignment summary
actorUserId: dispatcher/admin user id
```

## Authorization Rules

```text
all requests require authentication
RolesGuard permits dispatcher and admin
use case repeats the role check defensively
customer and technician receive 403
```

There is no resource ownership rule for dispatcher/admin assignment in the MVP.
Service-area-scoped dispatcher authorization is not yet modeled.

## Validation Rules

```text
requestId is a UUID path parameter
technicianId is a required UUID
startsAt and endsAt are required ISO 8601 datetimes
startsAt is strictly before endsAt
unknown body fields are rejected
request and technician foreign resources must exist
all step-20 domain policy rules are rerun inside the transaction
```

## Test Plan

Unit:

```text
dispatcher and admin can execute assignment workflow
wrong role is rejected before transaction
missing request and technician are rejected
domain policy failures propagate and no save occurs
successful workflow checks overlap and saves assigned request plus assignment
```

PostgreSQL-backed API/integration:

```text
dispatcher and admin can assign and receive 201 response
customer and technician receive 403; unauthenticated receives 401
invalid DTO and reversed slot receive 400
missing request and technician receive 404
needs_triage request receives 409
inactive, missing-skill, wrong-area, unavailable, and blocked technicians receive 409
existing overlapping active assignment receives 409
adjacent and terminal assignments do not block the slot
success writes assigned request, assignment, audit, and outbox rows
two concurrent assignments for the same technician and overlapping slot produce one success and one conflict
two concurrent assignments for the same request produce one success and one conflict
persistence failure after request update rolls back request, assignment, audit, and outbox changes
```

## Manual Verification

```bash
npm run typecheck
npm run build
npm run lint -- --quiet
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run db:migration:show
```

## Rollout Notes

```text
requires migrations through 1781160009000-AssignmentReadFoundation
no new migration or seed data
availability writes now coordinate with assignment through technician row locking
outbox processing remains pending until step 29
```

## Open Questions

```text
none
```

## Requirements Review

Decision: ready

Findings:

- [major] Concurrency safety requires all writers of technician schedule inputs
  to coordinate on the same lock. Availability creation currently inserts
  without locking the technician row. This slice must update that repository to
  take the technician lock before saving the window.

Required changes:

```text
implement the documented request-then-technician lock order
make availability writes acquire the technician row lock
prove overlap and rollback behavior with PostgreSQL-backed tests
```

Resolution: implemented and verified in this slice.

Open questions:

```text
none
```

## Architecture Review

Architecture decision: approved

Findings:

```text
none after adopting a callback-based AssignmentRepository transaction port
```

Architecture notes:

```text
the use case callback owns policies and workflow decisions
the TypeORM adapter owns EntityManager, row locks, queries, mapping, and atomic writes
request and technician domain models stay separate from TypeORM entities
audit and outbox writes are part of the same transaction
```

Open questions:

```text
none
```

## Implementation Checklist

- [x] Add Assignment domain model and mapper.
- [x] Add AssignmentRepository transaction port.
- [x] Implement AssignTechnicianUseCase and application errors.
- [x] Implement TypeORM transaction, locks, overlap check, audit, and outbox writes.
- [x] Coordinate availability writes through the technician lock.
- [x] Add assignment DTO/response mapping and controller endpoint.
- [x] Register providers and exports.
- [x] Add focused unit, e2e, concurrency, and rollback tests.
- [x] Update relevant design docs and engineering note.
- [x] Run full verification.
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

Risk coverage:

```text
the success test asserts request, assignment, audit, and outbox persistence
real concurrent HTTP requests prove technician double-booking prevention
real concurrent HTTP requests prove one-request/one-active-assignment behavior
completed, cancelled, and rejected overlaps are proven non-blocking
an induced assignment foreign-key failure proves transaction rollback
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
dispatcher and admin retain explicit control of technician assignment
advisory candidate results are revalidated before the write
customers and technicians cannot assign work
invalid skills, area, status, availability, and schedule conflicts prevent assignment
successful assignment is auditable and produces a reliable pending event
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
