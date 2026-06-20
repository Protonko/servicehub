# 13 - Request Read Models

## Goal

Allow authenticated customers, dispatchers, and admins to search and read service requests with actor-specific visibility, stable pagination, and response models suitable for request tracking and later operational workflows.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
13 - Request Read Models
```

## Scope

In scope:

```text
GET /api/v1/service-requests
GET /api/v1/service-requests/:requestId
SearchServiceRequestsUseCase
GetServiceRequestUseCase
ServiceRequestReadQuery implemented over normalized PostgreSQL tables
customer ownership visibility
dispatcher/admin all-request visibility
status, priority, category, service type, and creation-time filters
offset pagination with a deterministic sort order
request summary and request detail response DTOs
focused use case, PostgreSQL-backed query integration, and API e2e tests
```

## Out Of Scope

```text
GET /api/v1/dispatcher/queue
dispatcher queue defaults, ranking, or active-work projections
technician request visibility before assignments exist
assignment or technician data
triage, reclassification, priority changes, or any other request mutation
request comments, history timeline, or audit log read API
attachment upload, download URLs, or storage access authorization
materialized views, denormalized read tables, Redis caching, or a separate read database
full-text search
cursor pagination
new database migrations or indexes
events, outbox writes, notifications, or background jobs
roadmap status change to done before implementation is complete
```

## Dependencies

```text
06 Current User And Guards
12 Create Service Request
```

The slice reads the identity, catalog, customer address, and service request tables already created by earlier steps.

## Roles

```text
customer
dispatcher
admin
```

Technician access is deferred until assignment persistence exists. Both endpoints return `403` to an authenticated actor whose only role is `technician`.

## API Endpoints

### GET /api/v1/service-requests

Lists service requests visible to the authenticated actor.

Role access:

```text
customer
dispatcher
admin
```

Query parameters:

```text
status optional ServiceRequestStatus value
priority optional RequestPriority value
categoryId optional UUID
serviceTypeId optional UUID
createdFrom optional ISO 8601 timestamp, inclusive
createdTo optional ISO 8601 timestamp, inclusive
limit optional integer, default 20, minimum 1, maximum 100
offset optional integer, default 0, minimum 0
```

Multiple values for one filter are not supported in this slice. All supplied filters are combined with logical `AND` and are applied inside the actor's visibility scope.

Response DTO:

```json
{
  "data": [
    {
      "id": "uuid",
      "customer": {
        "id": "uuid",
        "fullName": "Customer Name"
      },
      "category": {
        "id": "uuid",
        "code": "HVAC",
        "name": "HVAC"
      },
      "serviceType": {
        "id": "uuid",
        "code": "AC_NOT_COOLING",
        "name": "Air conditioner does not cool",
        "isOther": false
      },
      "address": {
        "id": "uuid",
        "city": "Tbilisi",
        "line1": "12 Rustaveli Avenue"
      },
      "status": "created",
      "priority": "normal",
      "preferredStartAt": "2026-06-20T10:00:00.000Z",
      "preferredEndAt": "2026-06-20T14:00:00.000Z",
      "assignmentDeadlineAt": "2026-06-19T14:00:00.000Z",
      "completionDeadlineAt": "2026-06-20T10:00:00.000Z",
      "createdAt": "2026-06-19T10:00:00.000Z",
      "updatedAt": "2026-06-19T10:00:00.000Z"
    }
  ],
  "meta": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

`total` is the number of visible rows matching all filters before `limit` and `offset` are applied.

Ordering:

```text
createdAt descending
id descending as a deterministic tie-breaker
```

Status codes:

```text
200 success, including an empty result
400 invalid filter or pagination value
401 unauthenticated
403 authenticated actor lacks an allowed role
```

### GET /api/v1/service-requests/:requestId

Returns one visible service request with request metadata, customer and location context, copied required skills, and attachment metadata.

Role access:

```text
customer owner
dispatcher
admin
```

Request DTO:

```text
requestId path param, UUID
```

Response DTO:

```json
{
  "data": {
    "id": "uuid",
    "customer": {
      "id": "uuid",
      "fullName": "Customer Name",
      "email": "customer@example.com",
      "phone": "+995555000000"
    },
    "category": {
      "id": "uuid",
      "code": "HVAC",
      "name": "HVAC"
    },
    "serviceType": {
      "id": "uuid",
      "code": "AC_NOT_COOLING",
      "name": "Air conditioner does not cool",
      "isOther": false
    },
    "address": {
      "id": "uuid",
      "serviceArea": {
        "id": "uuid",
        "code": "TBILISI_CENTRAL",
        "name": "Tbilisi Central"
      },
      "line1": "12 Rustaveli Avenue",
      "line2": "Apartment 14",
      "city": "Tbilisi",
      "postalCode": "0108",
      "notes": "Use the rear entrance."
    },
    "slaPolicy": {
      "id": "uuid",
      "code": "STANDARD_24H",
      "name": "Standard 24 Hour Response"
    },
    "status": "created",
    "priority": "normal",
    "description": "The air conditioner turns on, but the room stays warm.",
    "additionalContactInstructions": "Call before arrival.",
    "preferredStartAt": "2026-06-20T10:00:00.000Z",
    "preferredEndAt": "2026-06-20T14:00:00.000Z",
    "estimatedDurationMinutes": 90,
    "assignmentDeadlineAt": "2026-06-19T14:00:00.000Z",
    "completionDeadlineAt": "2026-06-20T10:00:00.000Z",
    "triagedAt": null,
    "assignedAt": null,
    "completedAt": null,
    "cancelledAt": null,
    "cancellationReason": null,
    "escalatedAt": null,
    "requiredSkills": [
      {
        "id": "uuid",
        "code": "HVAC_REPAIR",
        "name": "HVAC Repair"
      }
    ],
    "attachments": [
      {
        "id": "uuid",
        "uploadedByUserId": "uuid",
        "fileName": "photo.jpg",
        "mimeType": "image/jpeg",
        "storageKey": "uploads/request/photo.jpg",
        "kind": "request_photo",
        "createdAt": "2026-06-19T10:00:00.000Z"
      }
    ],
    "createdAt": "2026-06-19T10:00:00.000Z",
    "updatedAt": "2026-06-19T10:00:00.000Z"
  }
}
```

Collection ordering inside the detail response:

```text
requiredSkills by name ascending, then id ascending
attachments by createdAt ascending, then id ascending
```

Status codes:

```text
200 success
400 requestId is not a UUID
401 unauthenticated
403 authenticated actor lacks an allowed role
404 request does not exist or is not visible to the actor
```

## Data Model Changes

```text
none
```

Reads use existing normalized tables:

```text
service_requests
users
service_categories
service_types
customer_addresses
service_areas
sla_policies
service_request_required_skills
skills
service_request_attachments
```

No read-model table or migration is introduced. The existing indexes on `customer_id`, `status/priority`, `service_type_id`, and `created_at` support the initial query shape. Index changes require measured evidence and a separate migration.

## Read Model Rules

```text
a customer search is always constrained by service_requests.customer_id = actor.userId
a customer detail lookup is constrained by both request id and actor user id
dispatcher and admin searches and detail lookups may read all requests
an actor with dispatcher or admin plus another role receives operational all-request visibility
inactive referenced catalog, SLA, skill, or service-area rows remain visible for existing requests
list and detail are read-only projections and do not enforce write-side business invariants
list joins must not duplicate requests when required skills or attachments contain multiple rows
date and time values are returned as UTC ISO 8601 strings
nullable persisted values are returned as null rather than omitted
```

The query returns current names and current address fields from referenced rows. This schema does not contain historical snapshots for those descriptive fields. Request-owned values such as priority, estimated duration, deadlines, and required skills come from the request and its copied skill rows.

## Conservative Assumptions

```text
Cross-customer detail access returns 404 rather than 403 so request existence is not disclosed.
The general request list includes completed, cancelled, and failed requests when no status filter is supplied; active-only defaults belong to the dispatcher queue in step 14.
Filtering uses request creation timestamps, not preferred service dates or update timestamps.
createdFrom and createdTo are inclusive; when both are supplied, createdFrom must not be later than createdTo.
Technician visibility is not represented by a placeholder branch because assignment persistence does not exist yet.
Attachment storageKey is metadata already returned by request creation; this slice does not turn it into a public file URL or authorize file access.
```

## Application Use Cases

```text
SearchServiceRequestsUseCase
GetServiceRequestUseCase
```

`SearchServiceRequestsUseCase`:

```text
input: authenticated actor, validated filters, limit, offset
output: request summaries and pagination metadata
authorization: derive customer-owned or all-request visibility from actor roles
query: ServiceRequestReadQuery.search
```

`GetServiceRequestUseCase`:

```text
input: authenticated actor and requestId
output: request detail read model
authorization: derive customer-owned or all-request visibility from actor roles
query: ServiceRequestReadQuery.findById
error: ServiceRequestNotFoundError when no row exists inside the visibility scope
```

The controller performs DTO validation and response mapping. Use cases derive visibility and call the read query. They do not import TypeORM entities or build SQL.

## Read Query Contract

This read-only slice uses an application-owned query port implemented in infrastructure:

```text
ServiceRequestReadQuery
SERVICE_REQUEST_READ_QUERY injection token
ServiceRequestTypeOrmReadQuery
```

Visibility is passed as an explicit discriminated union:

```text
{ kind: 'customer'; customerId: string }
{ kind: 'all' }
```

Methods:

```text
search(criteria, visibility, pagination) -> { items, total }
findById(requestId, visibility) -> ServiceRequestDetail | null
```

The infrastructure query applies visibility in SQL before pagination or detail selection. It must not accept the authenticated actor or role codes and must not decide which role is privileged.

Summary and detail interfaces live under `src/application/read-models`. The query port lives under `src/application/queries`. TypeORM query construction and raw-row aggregation live under `src/infra/queries`.

## Authorization Rules

```text
both endpoints require JWT authentication
RolesGuard allows customer, dispatcher, or admin
customer visibility is limited to requests whose customerId equals actor.userId
dispatcher and admin visibility includes all requests
technician-only actor receives 403 in this slice
customer receives 404 for another customer's request id
dispatcher and admin receive 404 only when the request id does not exist
```

Resource visibility is enforced by `SearchServiceRequestsUseCase` and `GetServiceRequestUseCase` through an explicit scoped query. A controller must not load an unrestricted request and perform an ownership check afterward.

The existing `POST /api/v1/service-requests` remains customer-only. When GET roles are added to the shared controller, role metadata must be applied per handler (or through an equivalent arrangement) so dispatcher/admin read access does not grant create access.

## Validation Rules

```text
requestId, categoryId, and serviceTypeId must be UUIDs
status must be one implemented ServiceRequestStatus value
priority must be one RequestPriority value: low, normal, high, urgent
createdFrom and createdTo must be valid ISO 8601 timestamps
createdFrom must be less than or equal to createdTo
limit must be an integer from 1 through 100
offset must be a non-negative integer
unknown categoryId or serviceTypeId is a valid filter and returns an empty list
unknown but syntactically valid requestId returns 404
unknown query parameters are rejected by the global whitelist validation policy
```

The status filter follows the implemented `ServiceRequestStatus` enum used by persistence. Static enum values do not need standalone tests; API behavior for accepted and rejected filters is tested instead.

## Transaction Boundaries

```text
none
```

Both use cases are read-only. They do not acquire write locks, write audit logs, or create outbox events.

## Events And Background Jobs

```text
none
```

## Test Plan

### Unit

```text
SearchServiceRequestsUseCase derives customer visibility with actor user id
SearchServiceRequestsUseCase derives all-request visibility for dispatcher and admin
SearchServiceRequestsUseCase forwards validated filters and pagination and returns query totals
GetServiceRequestUseCase uses customer-owned visibility for a customer
GetServiceRequestUseCase uses all-request visibility for dispatcher and admin
GetServiceRequestUseCase maps a null scoped lookup to ServiceRequestNotFoundError
```

Do not add tests that only restate enum constants, read-model interfaces, or response object literals.

### PostgreSQL-backed query integration

```text
customer scope returns only that customer's requests
all scope returns requests from multiple customers
status and priority filters work independently and together
categoryId and serviceTypeId filters work
createdFrom and createdTo inclusive boundaries work
pagination returns the correct total independently of limit and offset
ordering is createdAt descending with id descending tie-breaker
multiple required skills and attachments do not duplicate list rows or inflate total
detail query returns nested customer, category, service type, address, service area, SLA policy, required skills, and attachments
detail query returns inactive referenced metadata for an existing request
customer-scoped detail query returns null for another customer's request
```

### API e2e

```text
customer lists only own requests
customer reads own request detail
customer receives 404 for another customer's request detail
dispatcher lists requests from multiple customers and reads their details
admin lists requests from multiple customers and reads their details
technician receives 403 for list and detail
unauthenticated actor receives 401 for list and detail
valid status and priority filters return matching requests
valid combined category, service type, and date filters return matching requests
empty filtered result returns 200 with empty data and total 0
invalid status, priority, UUID, date range, limit, and offset receive 400
unknown request id receives 404
list response has stable ordering and pagination metadata
detail response returns required skills and attachments in the specified order
```

## Acceptance Criteria

```text
customer can track all of their own requests, including terminal requests
customer cannot discover or read another customer's request
dispatcher and admin can find and inspect customer requests needed for operational work
filters narrow only the set already visible to the actor
pagination metadata and deterministic ordering allow clients to navigate results reliably
detail response provides the classification, location, SLA, skill, and attachment context required by later workflows
read operations cause no database writes or asynchronous side effects
dispatcher-specific queue behavior remains isolated to step 14
```

## Manual Verification

```bash
npm run typecheck
npm run lint
npm test -- request-read
npm run test:e2e -- service-requests
npm run build
```

PostgreSQL-backed integration and e2e verification require the test database with migrations through `1781160006000-CreateServiceRequest` applied.

## Rollout Notes

```text
implementation extends the existing service request controller instead of adding a second controller for the same resource
the existing customer-only role restriction for POST moves to handler-level metadata when GET handlers add broader read roles
the read query is registered in InfraModule and consumed through its application query token
query use cases are registered in UseCasesModule
step 14 can reuse request summary vocabulary but owns its separate active-queue filters and ranking
future assignment work may extend visibility for assigned technicians without weakening customer ownership rules
```

## Open Questions

```text
none
```
