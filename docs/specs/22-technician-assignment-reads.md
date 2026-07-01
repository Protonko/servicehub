# 22 - Technician Assignment Reads

## Goal

Allow authenticated technicians to read their own assigned jobs so they can see
the work that later lifecycle steps will let them accept and progress.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
22 - Technician Assignment Reads
```

## Scope

In scope:

```text
GET /api/v1/technician/assignments
technician-owned assignment read model
status filter
assignment time-window filters
technician-only authorization
API, use-case, and read-query tests for visibility and filters
```

## Out Of Scope

```text
assignment creation or mutation
accept/on-the-way/start/complete assignment transitions
dispatcher/admin assignment list endpoint
customer assignment visibility
rescheduling and cancellation
technician calendar report expansion
pagination until the mobile technician workload needs it
```

## Roles

```text
technician
```

## API Endpoints

```text
GET /api/v1/technician/assignments
```

Role access:

```text
technician only
```

Query DTO:

```text
status?: AssignmentStatus
from?: ISO 8601 date-time
to?: ISO 8601 date-time
```

Response DTO:

```json
{
  "data": [
    {
      "id": "uuid",
      "status": "assigned",
      "startsAt": "2026-06-29T10:00:00.000Z",
      "endsAt": "2026-06-29T11:00:00.000Z",
      "acceptedAt": null,
      "onTheWayAt": null,
      "startedAt": null,
      "completedAt": null,
      "cancelledAt": null,
      "cancellationReason": null,
      "serviceRequest": {
        "id": "uuid",
        "status": "assigned",
        "priority": "normal",
        "description": "Kitchen sink leak",
        "preferredStartAt": "2026-06-29T10:00:00.000Z",
        "preferredEndAt": "2026-06-29T12:00:00.000Z",
        "assignmentDeadlineAt": "2026-06-29T09:00:00.000Z",
        "completionDeadlineAt": "2026-06-29T18:00:00.000Z",
        "category": { "id": "uuid", "code": "plumbing", "name": "Plumbing" },
        "serviceType": {
          "id": "uuid",
          "code": "leak_repair",
          "name": "Leak repair",
          "isOther": false
        },
        "address": {
          "id": "uuid",
          "city": "Tbilisi",
          "line1": "1 Rustaveli Ave"
        }
      },
      "createdAt": "2026-06-29T08:00:00.000Z",
      "updatedAt": "2026-06-29T08:00:00.000Z"
    }
  ]
}
```

Status codes:

```text
200 assignment list returned
400 invalid status/date filter or from >= to
401 unauthenticated
403 authenticated actor is not technician
404 authenticated technician user has no technician profile
```

Error cases:

```text
non-technician roles are rejected before the use case by role guards
a technician role without a persisted technician profile receives 404
date filters must form a valid half-open interval when both are present
```

## Data Model Changes

Tables/entities:

```text
none
```

Existing tables read:

```text
technicians
assignments
service_requests
service_categories
service_types
customer_addresses
```

Migration notes:

```text
none
```

## Domain Rules

```text
technician sees only assignments where assignments.technician_id belongs to their technician profile
dispatcher and admin continue to use dispatcher views instead of this endpoint
status filter matches assignment status exactly
from/to filters apply to assignment time overlap using half-open intervals
from only returns assignments ending after from
to only returns assignments starting before to
from and to together return assignments where startsAt < to and endsAt > from
results are ordered by startsAt ascending, then id ascending
```

## Application Use Cases

```text
ListTechnicianAssignmentsUseCase
```

Input:

```text
actor
criteria: status?, from?, to?
```

Output:

```text
assignments: TechnicianAssignmentItem[]
```

Loaded data:

```text
technician profile by actor.userId
assignment read rows for technician.id
```

Domain policies called:

```text
none; this read feature has no state transition
```

Repositories and read queries used:

```text
TechnicianRepository.findByUserId
TechnicianAssignmentReadQuery.listForTechnician
```

## Transaction Boundaries

No transaction is needed because this feature is read-only and does not need a
consistent multi-row mutation boundary.

## Events And Background Jobs

```text
none
```

## Authorization Rules

```text
JwtAuthGuard requires an authenticated actor
RolesGuard restricts endpoint access to technician role
use case resolves the actor's technician profile by actor.userId
read query always filters by resolved technician.id
```

## Validation Rules

```text
status must be a valid AssignmentStatus when present
from must be a valid ISO 8601 date-time when present
to must be a valid ISO 8601 date-time when present
from must be earlier than to when both are present
```

## Test Plan

Unit:

```text
use case returns only rows for the actor's technician profile
use case rejects technician role without profile as not found
```

Integration:

```text
read query joins service request summary fields
status filter works
from/to overlap filters work, including adjacent non-overlap
ordering is startsAt then id
```

API:

```text
technician sees own assignment
technician does not see another technician assignment
dispatcher/admin/customer receive 403
invalid status returns 400
invalid from/to range returns 400
technician without profile receives 404
```

## Manual Verification

```bash
npm run typecheck
npm test -- --runInBand src/application/use-cases/queries/list-technician-assignments
npm run test:e2e -- technician-assignment-reads.e2e-spec.ts
```

## Rollout Notes

```text
requires step 21 assignment transaction and existing assignments table
no seed data changes
compatible with later accept/on-the-way/start/complete assignment workflows
```

## Open Questions

```text
none
```
