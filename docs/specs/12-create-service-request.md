# 12 - Create Service Request

## Goal

Allow authenticated customers to create service requests from an active service category, active service type, and one of their saved customer addresses.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
12 - Create Service Request
```

## Scope

In scope:

```text
POST /api/v1/service-requests
CreateServiceRequestUseCase
service_requests persistence
service_request_required_skills snapshot persistence
service_request_attachments metadata persistence
minimal audit_logs persistence for ServiceRequestCreated
minimal outbox_events persistence for ServiceRequestCreated
SLA deadline calculation from the selected service type SLA policy
customer ownership check for address
API, use case, migration, and transaction tests
roadmap status update to done
```

## Out Of Scope

```text
request list/detail read models
dispatcher triage endpoint
assignment and scheduling
attachment upload/storage handling
outbox worker processing and retries
notification delivery
SLA deadline background jobs
admin audit log read API
customer cancellation
```

## Roles

```text
customer
```

## API Endpoints

```text
POST /api/v1/service-requests
```

Role access:

```text
customer
```

Request DTO:

```json
{
  "categoryId": "uuid",
  "serviceTypeId": "uuid",
  "addressId": "uuid",
  "description": "The air conditioner turns on, but the room stays warm.",
  "preferredStartAt": "2026-06-12T10:00:00.000Z",
  "preferredEndAt": "2026-06-12T14:00:00.000Z",
  "additionalContactInstructions": "Call before arrival.",
  "attachments": [
    {
      "fileName": "photo.jpg",
      "mimeType": "image/jpeg",
      "storageKey": "uploads/request/photo.jpg"
    }
  ]
}
```

Response DTO:

```json
{
  "data": {
    "id": "uuid",
    "customerId": "uuid",
    "categoryId": "uuid",
    "serviceTypeId": "uuid",
    "addressId": "uuid",
    "slaPolicyId": "uuid",
    "status": "created",
    "priority": "normal",
    "description": "The air conditioner turns on, but the room stays warm.",
    "additionalContactInstructions": "Call before arrival.",
    "preferredStartAt": "2026-06-12T10:00:00.000Z",
    "preferredEndAt": "2026-06-12T14:00:00.000Z",
    "estimatedDurationMinutes": 90,
    "assignmentDeadlineAt": "2026-06-11T14:00:00.000Z",
    "completionDeadlineAt": "2026-06-12T10:00:00.000Z",
    "requiredSkillIds": ["uuid"],
    "attachments": [
      {
        "id": "uuid",
        "fileName": "photo.jpg",
        "mimeType": "image/jpeg",
        "storageKey": "uploads/request/photo.jpg",
        "kind": "request_photo"
      }
    ],
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:00:00.000Z"
  }
}
```

Status codes:

```text
201 created
400 validation error, invalid preferred time window, preferred window not in the future
401 unauthenticated
403 authenticated actor without customer role
404 active category, active service type, active SLA policy, or owned address not found
409 service type does not belong to selected category
```

## Data Model Changes

Tables/entities:

```text
service_requests
service_request_required_skills
service_request_attachments
audit_logs
outbox_events
```

`service_requests`:

```text
columns follow docs/design/DATABASE_SCHEMA.md
preferred_start_at < preferred_end_at
estimated_duration_minutes > 0
status check constraint matches ServiceRequestStatus
priority check constraint matches RequestPriority
foreign keys to users, service_categories, service_types, customer_addresses, sla_policies
indexes for customer, status/priority, service type, assignment deadline, completion deadline, created_at
```

`service_request_required_skills`:

```text
service_request_id uuid references service_requests(id) on delete cascade
skill_id uuid references skills(id) on delete restrict
primary key(service_request_id, skill_id)
```

`service_request_attachments`:

```text
metadata only
uploaded_by_user_id is the creating customer
kind defaults to request_photo for this endpoint
file_name, mime_type, and storage_key must not be blank
```

`audit_logs` and `outbox_events`:

```text
minimal schema from docs/design/DATABASE_SCHEMA.md
written by the create service request transaction
worker claim/update behavior remains out of scope
```

## Domain Rules

```text
category must be active
service type must be active
service type must belong to category
service type must reference an active SLA policy
address must belong to the authenticated customer
description must not be blank
preferredStartAt must be before preferredEndAt
preferredStartAt and preferredEndAt must be in the future at use-case execution time
normal service type requests start in created status
Other service type requests start in needs_triage status
priority, estimated duration, SLA policy, and required skills are copied from service type metadata
assignment and completion deadlines are calculated from creation time plus the SLA policy minute offsets
```

Conservative assumptions:

```text
Both preferredStartAt and preferredEndAt must be future dates so customers cannot request an already-expired window.
The response includes the created request plus copied required skill ids and attachment metadata because request detail read models are not implemented yet.
This slice writes one ServiceRequestCreated outbox event. NotificationRequested is deferred until outbox processing and notification features exist.
```

## Application Use Cases

```text
CreateServiceRequestUseCase
```

Input:

```text
actor customer id
categoryId
serviceTypeId
addressId
description
additionalContactInstructions
preferredStartAt
preferredEndAt
attachments metadata
```

Output:

```text
created service request
required skill ids
attachment metadata
```

Loaded data:

```text
active category
active service type with required skills and active SLA policy
customer-owned address
```

Repositories used:

```text
ServiceCatalogAdminRepository for active catalog metadata
CustomerAddressRepository for owner-scoped address lookup
ServiceRequestRepository for transactional persistence
```

## Transaction Boundaries

One database transaction writes:

```text
service_requests row
service_request_required_skills rows
service_request_attachments rows
audit_logs row
outbox_events row
```

No external side effects run inside the transaction.

## Events And Background Jobs

Outbox event:

```text
ServiceRequestCreated
```

Payload:

```json
{
  "requestId": "uuid",
  "customerId": "uuid",
  "categoryId": "uuid",
  "serviceTypeId": "uuid",
  "status": "created",
  "priority": "normal",
  "assignmentDeadlineAt": "2026-06-11T14:00:00.000Z",
  "completionDeadlineAt": "2026-06-12T10:00:00.000Z"
}
```

Background jobs:

```text
none in this slice
```

## Authorization Rules

```text
only authenticated customers can create service requests
the request customerId is always the authenticated actor user id
customer can use only addresses owned by their user id
dispatchers, technicians, and admins cannot use this customer endpoint
```

## Validation Rules

```text
categoryId, serviceTypeId, and addressId must be UUIDs
description is required, trimmed, and limited to 4000 characters
additionalContactInstructions is optional, trimmed to null, and limited to 1000 characters
preferredStartAt and preferredEndAt must be ISO date strings
preferredStartAt must be before preferredEndAt
preferredStartAt and preferredEndAt must be in the future
attachments is optional and limited to 10 items
attachment fileName is required, trimmed, and limited to 240 characters
attachment mimeType is required, trimmed, and limited to 120 characters
attachment storageKey is required, trimmed, and limited to 500 characters
```

## Test Plan

Unit:

```text
use case creates normal request with created status and copied service type metadata
use case creates Other request with needs_triage status
use case rejects past preferred windows
use case rejects service type from another category
use case rejects address not owned by customer
```

Integration:

```text
migration creates service request, attachment, audit, and outbox tables with key constraints
repository transaction persists request, required skill snapshot, attachment metadata, audit log, and outbox event
```

API:

```text
customer creates request and receives 201 response
Other service type creates needs_triage
dispatcher receives 403
invalid DTO receives 400
another customer's address returns 404
service type/category mismatch returns 409
```

## Manual Verification

```bash
npm run typecheck
npm run lint
npm test -- create-service-request
npm run test:e2e -- service-requests
npm run build
```

Database-backed e2e verification requires PostgreSQL with migrations applied by the test environment.

## Rollout Notes

```text
Migration 1781160006000 depends on identity, catalog, and customer address tables.
Later outbox foundation can add worker-specific repository methods without changing the create request transaction contract.
Later request read models can reuse service_requests and snapshot tables.
```

## Open Questions

```text
none
```
