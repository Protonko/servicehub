# 20 - Assignment Domain Policy

## Goal

Define framework-free assignment rules that step 21 can apply again inside the
assignment transaction before creating an assignment.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
20 - Assignment Domain Policy
```

## Scope

In scope:

```text
AssignmentPolicy for request state and overlap result
TechnicianEligibilityPolicy for technician status, skills, service area, and availability
half-open assignment time-slot domain vocabulary
ScheduleOverlapChecker contract for the transactional persistence adapter
assignment-specific domain exceptions
focused domain unit tests
domain exports
roadmap status update
```

## Out Of Scope

```text
POST /api/v1/service-requests/:requestId/assignments
AssignTechnicianUseCase
Assignment domain model or repository implementation
TypeORM writes, migrations, locks, or transaction manager
audit log or outbox writes
request status mutation to assigned
daily assignment limit enforcement without a defined business timezone/day boundary
rescheduling, cancellation, and technician lifecycle transitions
automatic technician selection
```

## Roles

No actor directly invokes this domain-only slice. Step 21 will allow dispatcher
and admin actors to assign technicians and will call these policies from the
application use case.

## API Endpoints

None.

`POST /api/v1/service-requests/:requestId/assignments` remains in step 21.

## Data Model Changes

None.

The assignments read-side table already introduced by step 19 is unchanged.

## Domain Rules

### Assignment time slot

```text
startsAt and endsAt must be valid dates
startsAt must be strictly before endsAt
time intervals use half-open [startsAt, endsAt) semantics
adjacent intervals do not overlap
```

Past slots remain valid domain input because requirements do not define a
scheduling horizon or business timezone. A future rule can be added without
changing overlap semantics.

### Request assignment

```text
created and triaged requests are assignable
needs_triage requests are not assignable
assigned, in-progress, completed, cancelled, and failed requests are not assignable
```

`AssignmentPolicy` delegates status truth to `ServiceRequest.canBeAssigned()` so
the lifecycle state machine remains the single source of truth.

### Technician eligibility

```text
technician must be active
technician must contain every required skill snapshot from the request
technician must serve the request address service area
an available window must fully contain the selected slot
any blocked window overlapping the selected slot makes the technician unavailable
```

Skill matching uses set inclusion. An empty required-skill set is valid.
Availability uses the same precedence and half-open overlap rules as step 19.

### Schedule overlap

```text
only active assignment statuses block a slot
the transaction adapter reports whether an active overlap exists
AssignmentPolicy rejects a reported overlap
step 21 must perform this check while holding the documented transaction lock
```

The domain contract accepts ordinary values and does not expose TypeORM or SQL.
It does not prescribe the locking implementation.

## Application Use Cases

None in this slice.

Step 21 `AssignTechnicianUseCase` will:

```text
load request and technician data in a transaction
call AssignmentPolicy and TechnicianEligibilityPolicy
call ScheduleOverlapChecker under the transaction locking strategy
pass the overlap result back to AssignmentPolicy
create assignment, update request, and write audit/outbox rows atomically
```

## Repository Interfaces

No repository interface is added.

Add the persistence-neutral `ScheduleOverlapChecker` service contract:

```text
hasActiveOverlap(technicianId, slot) -> Promise<boolean>
```

Its implementation belongs to infrastructure in step 21.

## Transaction Boundaries

None in this domain-only slice.

The policies are synchronous and side-effect free. The checker contract is
asynchronous because step 21 will implement it with a database query inside the
assignment transaction. This slice does not open or own that transaction.

## Events And Background Jobs

```text
none
```

`TechnicianAssigned` remains a step-21 outbox event.

## Authorization Rules

None in this slice.

Step 21 must restrict assignment to dispatcher and admin. Authorization stays in
the API/application layers and is not duplicated in domain eligibility rules.

## Validation Rules

```text
slot dates are valid Date values
slot start is before slot end
technician, required skill, and service-area identifiers are non-blank domain values
availability windows are valid domain models
```

The policies reject business failures with specific domain exceptions so the
future API layer can map them to stable conflict responses.

## Test Plan

Unit:

```text
AssignmentPolicy allows created and triaged requests
AssignmentPolicy rejects needs_triage, assigned, completed, cancelled, and failed requests
AssignmentTimeSlot rejects invalid slots
AssignmentTimeSlot treats adjacent slots as non-overlapping
AssignmentPolicy allows a free schedule and rejects a reported active overlap
TechnicianEligibilityPolicy allows an active technician with all skills, area, and availability
inactive technician is rejected
missing required skill is rejected
outside service area is rejected
slot without full available coverage is rejected
overlapping blocked window is rejected
adjacent blocked window does not reject the slot
empty required-skill set is allowed
```

Integration:

```text
none; transactional overlap locking belongs to step 21
```

API:

```text
none
```

## Manual Verification

```bash
npm run typecheck
npm run build
npm run lint -- --quiet
npm test -- --runInBand
```

No database or e2e verification is required because the slice changes only
framework-free domain code.

## Rollout Notes

No migration, seed, endpoint, or runtime wiring is added.

Step 21 must not treat the advisory result from step 19 as proof of eligibility;
it must reconstruct the policy input and rerun all checks transactionally.

## Open Questions

```text
none
```

## Requirements Review

Decision: ready

Findings:

```text
none
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

Architecture decision: approved

Findings:

```text
none
```

Architecture notes:

```text
request state remains owned by the ServiceRequest state machine
cross-object eligibility rules live in domain policies
database overlap detection is represented by a persistence-neutral contract
transaction and locking ownership remains in the step-21 application/infrastructure slice
```

Open questions:

```text
none
```

## Implementation Checklist

- [x] Add assignment time-slot domain vocabulary.
- [x] Add assignment-specific domain exceptions.
- [x] Implement `AssignmentPolicy`.
- [x] Implement `TechnicianEligibilityPolicy`.
- [x] Add `ScheduleOverlapChecker` contract.
- [x] Add focused policy unit tests.
- [x] Export the new domain API.
- [x] Update the relevant engineering note with advisory-versus-transactional validation.
- [x] Run focused verification.
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
```

Transactional locking, rollback, and PostgreSQL overlap tests remain mandatory
for step 21, where the persistence adapter and transaction boundary will exist.

## Stakeholder Review

Stakeholder decision: accepted

Business fit:

```text
dispatcher suggestions remain advisory
final assignment must repeat request, technician, skill, area, availability, and overlap checks
invalid technicians fail with specific business reasons
adjacent jobs remain schedulable while actual overlaps are rejected
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
