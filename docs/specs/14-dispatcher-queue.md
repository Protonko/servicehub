# 14 - Dispatcher Queue

## Goal

Expose a dispatcher-focused, paginated queue that keeps active service requests visible and ranks SLA breaches, urgent work, and approaching deadlines ahead of routine work.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
14 - Dispatcher Queue
```

## Scope

In scope:

```text
GET /api/v1/dispatcher/queue
GetDispatcherQueueUseCase
DispatcherQueueReadQuery implemented over existing normalized PostgreSQL tables
dispatcher/admin authorization
default active-request scope
status, priority, service area, and SLA-state filters
stable offset pagination
dispatcher-specific SLA state and ranking
focused use case and PostgreSQL-backed API tests
```

## Out Of Scope

```text
triage or any request mutation
eligible technician search or assignment data
dispatcher service-area ownership restrictions
SLA breach persistence, notifications, or background jobs
dashboard metrics or reports
materialized views, Redis caching, or new read-model tables
new migrations or indexes without measured evidence
```

## Dependencies

```text
06 Current User And Guards
13 Request Read Models
```

## Roles

```text
dispatcher
admin
```

Customer and technician actors cannot access this operational queue.

## API Endpoint

### GET /api/v1/dispatcher/queue

Query parameters:

```text
status optional ServiceRequestStatus value
priority optional RequestPriority value
serviceAreaId optional UUID
slaState optional: breached, at_risk, on_track
limit optional integer, default 20, minimum 1, maximum 100
offset optional integer, default 0, minimum 0
```

All supplied filters are combined with logical `AND`.

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "customer": { "id": "uuid", "fullName": "Customer Name" },
      "category": { "id": "uuid", "code": "HVAC", "name": "HVAC" },
      "serviceType": {
        "id": "uuid",
        "code": "AC_NOT_COOLING",
        "name": "Air conditioner does not cool",
        "isOther": false
      },
      "address": { "id": "uuid", "city": "Tbilisi", "line1": "12 Rustaveli Avenue" },
      "serviceArea": { "id": "uuid", "code": "TBILISI_CENTRAL", "name": "Tbilisi Central" },
      "status": "created",
      "priority": "urgent",
      "slaState": "at_risk",
      "relevantDeadlineAt": "2026-06-20T11:00:00.000Z",
      "preferredStartAt": "2026-06-21T10:00:00.000Z",
      "preferredEndAt": "2026-06-21T14:00:00.000Z",
      "assignmentDeadlineAt": "2026-06-20T11:00:00.000Z",
      "completionDeadlineAt": "2026-06-21T10:00:00.000Z",
      "createdAt": "2026-06-20T10:00:00.000Z",
      "updatedAt": "2026-06-20T10:00:00.000Z"
    }
  ],
  "meta": { "limit": 20, "offset": 0, "total": 1 }
}
```

Status codes:

```text
200 success, including an empty result
400 invalid filter or pagination value
401 unauthenticated
403 authenticated actor lacks dispatcher or admin role
```

## Data Model Changes

```text
none
```

The query reads:

```text
service_requests
users
service_categories
service_types
customer_addresses
service_areas
```

Existing status/priority and deadline indexes support the initial queue. Query-plan-driven index changes remain separate work.

## Queue And Domain Rules

Default active statuses:

```text
created
needs_triage
triaged
assigned
accepted_by_technician
technician_on_the_way
in_progress
```

When `status` is omitted, `completed`, `cancelled`, and `failed` are excluded. An explicit valid status overrides the active default so operations can intentionally inspect a terminal slice.

Relevant SLA deadline:

```text
created, needs_triage, triaged -> assignmentDeadlineAt
assigned, accepted_by_technician, technician_on_the_way, in_progress -> completionDeadlineAt
explicit terminal status filter -> completionDeadlineAt
```

SLA state is evaluated at query time:

```text
breached: relevantDeadlineAt <= current time
at_risk: relevantDeadlineAt > current time and <= current time + 60 minutes
on_track: relevantDeadlineAt > current time + 60 minutes
```

Ranking:

```text
1. breached requests
2. urgent requests that are not breached
3. at_risk requests that are not urgent
4. all remaining requests
5. relevantDeadlineAt ascending
6. createdAt ascending
7. id ascending as deterministic tie-breaker
```

Filtering is applied before pagination and `total` counts all matching rows before `limit` and `offset`.

## Conservative Assumptions

```text
The 60-minute at-risk horizon is a fixed MVP presentation rule because no configurable warning threshold exists yet.
The queue is global because dispatcher-to-service-area ownership is not represented in the current schema.
An explicit terminal status is allowed because the API contract exposes status and the roadmap only requires terminal rows to be excluded by default.
SLA state is computed, not persisted; step 30 owns durable SLA deadline events.
```

## Application Use Case

### GetDispatcherQueueUseCase

```text
input: authenticated actor, validated filters, pagination
output: queue items and pagination metadata
authorization: actor must have dispatcher or admin role
query: DispatcherQueueReadQuery.search
```

The use case performs defense-in-depth role validation even though the endpoint also uses `RolesGuard`.

## Read Query Contract

Application-owned port:

```text
DispatcherQueueReadQuery
DISPATCHER_QUEUE_READ_QUERY
```

Method:

```text
search(criteria, pagination) -> { items, total }
```

The infrastructure implementation owns TypeORM query construction, active defaults, computed SLA state, and ranking. It does not receive the actor or make role decisions.

## Authorization Rules

```text
JWT authentication is required
RolesGuard allows dispatcher or admin
GetDispatcherQueueUseCase rejects any actor without dispatcher or admin role
customer and technician receive 403
```

## Validation Rules

```text
status must be one implemented ServiceRequestStatus value
priority must be low, normal, high, or urgent
serviceAreaId must be a UUID
slaState must be breached, at_risk, or on_track
limit must be an integer from 1 through 100
offset must be a non-negative integer
unknown serviceAreaId is valid and returns an empty result
unknown query parameters are rejected by the global whitelist policy
```

## Transaction Boundaries

```text
none
```

This feature is read-only and creates no audit or outbox records.

## Events And Background Jobs

```text
none
```

## Test Plan

### Unit

```text
dispatcher and admin actors are accepted and filters/pagination are forwarded
customer and technician actors are rejected before the query executes
query totals and pagination are returned unchanged
```

### PostgreSQL-backed API and query verification

```text
dispatcher and admin can access the queue
unauthenticated, customer, and technician actors cannot access the queue
default queue excludes completed, cancelled, and failed requests
explicit terminal status can retrieve that status
status, priority, serviceAreaId, and slaState filters work independently and together
breached rows rank before urgent rows; urgent rows rank before non-urgent at-risk rows
relevant deadline switches from assignment to completion after assignment
pagination total is independent of limit and offset
relevantDeadlineAt, SLA state, service area, and stable ordering are returned
invalid enum, UUID, limit, offset, and unknown query parameters return 400
```

Do not add tests that only restate enum or constant values.

## Acceptance Criteria

```text
dispatcher and admin can see actionable requests in operational order
customer and technician cannot access cross-customer operational data
terminal requests do not clutter the default queue
dispatchers can narrow work by status, priority, service area, and SLA state
urgent and deadline-risk requests appear before routine work
queue reads have no write or asynchronous side effects
```

## Manual Verification

```bash
npm run typecheck
npm run lint
npm test -- dispatcher-queue
npm run test:e2e -- dispatcher-queue
npm run build
```

PostgreSQL-backed verification requires migrations through `1781160006000-CreateServiceRequest`.

## Rollout Notes

```text
add a dedicated dispatcher controller rather than expanding the customer-facing resource controller
reuse request summary vocabulary while keeping queue criteria and ranking in a separate query port
no migration or seed changes are required
step 15 can use queue request ids without coupling triage writes to this read query
```

## Open Questions

```text
none
```
