# 15 - Triage Workflow

## Goal

Allow dispatchers and admins to turn a newly created request into an explicitly classified, assignable request while preserving SLA continuity and an auditable transactional history.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
15 - Triage Workflow
```

## Scope

In scope:

```text
PATCH /api/v1/service-requests/:requestId/triage
TriageServiceRequestUseCase
RequestTriagePolicy
category, service type, SLA policy, priority, and estimated-duration replacement
required-skill snapshot replacement
SLA deadline recalculation from the original request creation time
ServiceRequestTriaged audit and outbox records
one transaction for the request, skills, audit, and outbox writes
focused domain, use-case, and PostgreSQL-backed API tests
```

## Out Of Scope

```text
assignment and eligible-technician search
triage after assignment or repeated triage of an already triaged request
changing customer, address, description, preferred window, or attachments
free-form service types or skills outside the active catalog
notifications, outbox processing, or dispatcher dashboard projection
manual SLA-policy selection or deadline overrides
schema changes or new indexes
```

## Dependencies

```text
12 Create Service Request
14 Dispatcher Queue
```

## Roles

```text
dispatcher
admin
```

Customers and technicians cannot triage requests.

## API Endpoint

### PATCH /api/v1/service-requests/:requestId/triage

Request:

```json
{
  "categoryId": "uuid",
  "serviceTypeId": "uuid",
  "priority": "high",
  "estimatedDurationMinutes": 120,
  "requiredSkillIds": ["uuid"]
}
```

All fields are required. `requiredSkillIds` may be an empty array.

Response:

```json
{
  "data": {
    "id": "uuid",
    "categoryId": "uuid",
    "serviceTypeId": "uuid",
    "slaPolicyId": "uuid",
    "status": "triaged",
    "priority": "high",
    "estimatedDurationMinutes": 120,
    "assignmentDeadlineAt": "2026-06-20T11:00:00.000Z",
    "completionDeadlineAt": "2026-06-20T18:00:00.000Z",
    "triagedAt": "2026-06-20T10:15:00.000Z",
    "requiredSkillIds": ["uuid"],
    "updatedAt": "2026-06-20T10:15:00.000Z"
  }
}
```

Status codes:

```text
200 triaged successfully
400 invalid UUID, priority, duration, skills array, or unknown field
401 unauthenticated
403 actor is not dispatcher or admin
404 request, active category, active service type, or active skill was not found
409 service type does not belong to category, target type is Other, or request status cannot be triaged
```

## Data Model Changes

```text
none
```

The transaction updates existing `service_requests` and replaces rows in `service_request_required_skills`; it inserts one row into each of `audit_logs` and `outbox_events`.

## Domain Rules

```text
only created and needs_triage requests can be triaged
cancelled, completed, assigned, and all other lifecycle states cannot be triaged
target category, service type, SLA policy, and every supplied skill must be active
target service type must belong to the supplied category
target service type cannot be Other
priority is an explicit dispatcher decision and need not equal the service type default
estimated duration must be a positive integer
required skill ids must be unique; an empty set is allowed
successful triage sets status to triaged and records triagedAt
successful triage replaces, rather than merges, the request required-skill snapshot
```

The target service type controls `slaPolicyId`. Assignment and completion deadlines are recalculated from the persisted request `createdAt` using that active policy. This keeps elapsed SLA time intact when classification changes.

## Conservative Assumptions

```text
Triage is a one-time pre-assignment transition because the documented lifecycle only permits created/needs_triage -> triaged.
The endpoint rejects Other rather than producing a triaged request that still cannot be assigned.
Explicit requiredSkillIds are authoritative because the API contract allows dispatchers to adjust skills; they are validated against the active skill catalog.
SLA deadlines follow the target service type policy while explicit priority remains a separate operational override.
Step 31 may harden SLA-policy rules but must not silently reset elapsed SLA time.
```

## Application Use Case

### TriageServiceRequestUseCase

```text
input: authenticated actor, request id, complete triage classification
authorization: dispatcher or admin
loads: request, active category, active target service type and SLA policy, active skill ids
domain: RequestTriagePolicy and ServiceRequest.triage
output: triaged request summary and required skill ids
persistence: ServiceRequestRepository.triage
```

The use case performs role validation as defense in depth in addition to `RolesGuard`.

## Repository Interface

`ServiceRequestRepository` gains:

```text
findById(requestId) -> ServiceRequest | null
triage(input) -> TriagedServiceRequest
```

The persistence operation uses the request's pre-triage status as an optimistic condition. A concurrent lifecycle change causes a conflict and rolls back all writes.

## Transaction Boundaries

One PostgreSQL transaction must:

```text
conditionally update service_requests from the expected pre-triage status
delete the previous service_request_required_skills rows
insert the replacement required-skill rows
insert ServiceRequestTriaged audit_logs row with old and new classification values
insert ServiceRequestTriaged outbox_events row
commit all changes together
```

Any failure rolls back every listed write.

## Events And Background Jobs

Outbox event:

```text
ServiceRequestTriaged
```

Payload includes request id, category id, service type id, status, priority, duration, required skills, SLA policy id, and both deadlines. Processing the event is deferred to the outbox foundation.

No background job is added in this step.

## Authorization Rules

```text
JWT authentication is required
RolesGuard allows dispatcher or admin
the use case independently rejects actors without dispatcher/admin role
customer and technician receive 403
```

## Validation Rules

```text
requestId, categoryId, serviceTypeId, and every requiredSkillId must be UUIDs
priority must be low, normal, high, or urgent
estimatedDurationMinutes must be an integer from 1 through 1440
requiredSkillIds is required, contains at most 50 values, and contains no duplicates
unknown request fields are rejected by the global whitelist policy
inactive catalog records are treated as unavailable
```

## Test Plan

### Domain unit tests

```text
created and needs_triage requests accept a non-Other classification
triage replaces classification, SLA fields, duration, and timestamp
Other target type is rejected
assigned, completed, and cancelled requests are rejected
```

### Use-case unit tests

```text
dispatcher and admin are authorized
customer and technician are rejected before repository access
missing/inactive request or catalog records produce the specified errors
category/service-type mismatch is rejected
inactive or duplicate skills are rejected
deadlines are recalculated from request createdAt and target SLA policy
validated triage input is passed to transactional persistence
```

### PostgreSQL-backed API tests

```text
dispatcher triages needs_triage and admin triages created
response and persisted request contain the replacement classification and triaged status
required skills are replaced
audit and outbox rows are written with expected values
unauthenticated, customer, and technician access is rejected
missing request/catalog records return 404
Other type, category mismatch, and invalid lifecycle state return 409 without partial writes
invalid DTO and unknown fields return 400
```

Do not add tests that only restate enum or constant values.

## Acceptance Criteria

```text
dispatcher/admin can convert a new request into a structured, assignable request
an Other request cannot leave triage still classified as Other
catalog and skill references are active and internally consistent
triage does not reset elapsed SLA time
request classification and required skills change atomically
every successful triage is auditable and emits one pending outbox event
unauthorized actors and invalid lifecycle transitions cannot mutate the request
```

## Manual Verification

```bash
npm run typecheck
npm run lint
npm test -- triage
npm run test:e2e -- triage
npm run build
```

PostgreSQL-backed verification requires migrations through `1781160006000-CreateServiceRequest`.

## Rollout Notes

```text
no migration or seed changes are required
existing created and needs_triage rows remain compatible
dispatcher queue reflects triage immediately because it reads normalized request rows
outbox processing remains intentionally deferred
```

## Open Questions

```text
none
```
