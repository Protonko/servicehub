# API Endpoint Design

## 1. Purpose

This document defines the initial REST API surface for ServiceHub.

The API is designed around use cases, not table CRUD. Controllers should validate input, authorize the actor, call one use case, and return a response DTO.

---

## 2. API Conventions

Base path:

```text
/api/v1
```

Authentication:

```text
JWT access token in httpOnly cookie
refresh token in httpOnly cookie
```

Response shape for successful object responses:

```json
{
  "data": {}
}
```

Response shape for lists:

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100
  }
}
```

Error shape:

```json
{
  "error": {
    "code": "REQUEST_CANNOT_BE_ASSIGNED",
    "message": "Request cannot be assigned before triage.",
    "details": {}
  }
}
```

HTTP status mapping:

```text
400 validation error
401 unauthenticated
403 forbidden
404 not found
409 business invariant conflict
500 unexpected error
```

---

## 3. Auth

## POST /api/v1/auth/register

Creates a customer account.

Role:

```text
public
```

Request:

```json
{
  "email": "customer@example.com",
  "password": "strong-password",
  "fullName": "Jane Customer",
  "phone": "+995..."
}
```

Response:

```text
201 Created
```

Notes:

```text
Admin-created dispatcher, technician, and admin users should be handled by admin endpoints later.
```

## POST /api/v1/auth/login

Authenticates a user and sets auth cookies.

Role:

```text
public
```

Request:

```json
{
  "email": "customer@example.com",
  "password": "strong-password"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "fullName": "Jane Customer",
      "roles": ["customer"]
    }
  }
}
```

## POST /api/v1/auth/refresh

Refreshes access token cookie.

Role:

```text
authenticated
```

## POST /api/v1/auth/logout

Clears auth cookies.

Role:

```text
authenticated
```

## GET /api/v1/auth/me

Returns current user.

Role:

```text
authenticated
```

---

## 4. Service Catalog

## GET /api/v1/service-catalog/categories

Lists active service categories.

Role:

```text
customer dispatcher technician admin
```

## GET /api/v1/service-catalog/categories/:categoryId/service-types

Lists active service types for a category.

Role:

```text
customer dispatcher admin
```

## POST /api/v1/admin/service-catalog/categories

Creates a service category.

Role:

```text
admin
```

## PATCH /api/v1/admin/service-catalog/categories/:categoryId

Updates a service category.

Role:

```text
admin
```

## POST /api/v1/admin/service-catalog/service-types

Creates a service type with required skills and SLA policy.

Role:

```text
admin
```

## PATCH /api/v1/admin/service-catalog/service-types/:serviceTypeId

Updates a service type.

Role:

```text
admin
```

---

## 5. Service Requests

## POST /api/v1/service-requests

Creates a service request.

Role:

```text
customer
```

Request:

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

Response:

```text
201 Created
```

Business rules:

```text
category must be active
service type must be active and belong to category
preferred time window must be in the future
status is needs_triage when service type is Other
status is created otherwise
SLA deadlines are calculated during creation
```

## GET /api/v1/service-requests

Lists service requests visible to the current actor.

Role:

```text
customer dispatcher admin
```

Visibility:

```text
customer sees own requests
dispatcher/admin sees all requests
```

Query params:

```text
status
priority
categoryId
serviceTypeId
createdFrom
createdTo
limit
offset
```

## GET /api/v1/service-requests/:requestId

Returns service request details.

Role:

```text
customer owner
dispatcher
admin
assigned technician
```

## PATCH /api/v1/service-requests/:requestId/triage

Triages or reclassifies a request.

Role:

```text
dispatcher admin
```

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

Business rules:

```text
cancelled or completed request cannot be triaged
Other service type must be replaced before assignment
required skills are copied to service_request_required_skills
```

## POST /api/v1/service-requests/:requestId/cancel

Cancels a request.

Role:

```text
customer owner
dispatcher
admin
```

Request:

```json
{
  "reason": "No longer needed."
}
```

Business rules:

```text
customer can cancel only before technician_on_the_way
dispatcher can cancel before in_progress
admin can cancel with special reason
completed request cannot be cancelled
```

---

## 6. Dispatcher Operations

## GET /api/v1/dispatcher/queue

Returns dispatcher dashboard queue.

Role:

```text
dispatcher admin
```

Query params:

```text
status
priority
serviceAreaId
slaState
limit
offset
```

## GET /api/v1/service-requests/:requestId/eligible-technicians

Returns advisory technician candidates for a selected time window.

Role:

```text
dispatcher admin
```

Query params:

```text
startsAt
endsAt
```

Business rules:

```text
technician must be active
technician must have required skills
technician must serve request service area
technician must be available
technician must not have overlapping active assignments
```

## POST /api/v1/service-requests/:requestId/assignments

Assigns a technician.

Role:

```text
dispatcher admin
```

Request:

```json
{
  "technicianId": "uuid",
  "startsAt": "2026-06-12T10:00:00.000Z",
  "endsAt": "2026-06-12T11:30:00.000Z"
}
```

Business rules:

```text
request must be triaged or created without Other service type
request cannot be cancelled or completed
technician must be active
technician must have required skills
technician must serve request area
technician must be available
technician cannot have overlapping active assignments
operation must be transaction-safe
```

## PATCH /api/v1/assignments/:assignmentId/reschedule

Reschedules an assignment.

Role:

```text
dispatcher admin
```

Request:

```json
{
  "startsAt": "2026-06-12T12:00:00.000Z",
  "endsAt": "2026-06-12T13:30:00.000Z"
}
```

---

## 7. Technician Operations

## GET /api/v1/technician/assignments

Returns current technician's assignments.

Role:

```text
technician
```

Query params:

```text
status
from
to
```

## POST /api/v1/assignments/:assignmentId/accept

Technician accepts assignment.

Role:

```text
assigned technician
```

## POST /api/v1/assignments/:assignmentId/on-the-way

Technician marks assignment as on the way.

Role:

```text
assigned technician
```

## POST /api/v1/assignments/:assignmentId/start

Technician starts work.

Role:

```text
assigned technician
```

## POST /api/v1/assignments/:assignmentId/complete

Technician completes work.

Role:

```text
assigned technician
```

Request:

```json
{
  "summary": "Replaced filter and cleaned outdoor unit.",
  "internalNotes": "Customer may need follow-up maintenance.",
  "materials": [
    {
      "inventoryItemId": "uuid",
      "quantity": 1
    }
  ],
  "attachments": [
    {
      "fileName": "completion.jpg",
      "mimeType": "image/jpeg",
      "storageKey": "uploads/completion/completion.jpg"
    }
  ]
}
```

Business rules:

```text
assignment must belong to technician
request must be in_progress
work report summary is required
inventory quantity cannot go below zero
```

---

## 8. Technician Management

## GET /api/v1/admin/technicians

Lists technicians.

Role:

```text
admin dispatcher
```

## POST /api/v1/admin/technicians

Creates a technician profile for an existing user.

Role:

```text
admin
```

## PATCH /api/v1/admin/technicians/:technicianId

Updates technician status, daily limit, skills, and service areas.

Role:

```text
admin
```

## GET /api/v1/technicians/:technicianId/calendar

Returns technician calendar.

Role:

```text
dispatcher admin own technician
```

---

## 9. Inventory

## GET /api/v1/admin/inventory/items

Lists inventory items.

Role:

```text
admin dispatcher
```

## POST /api/v1/admin/inventory/items

Creates inventory item.

Role:

```text
admin
```

## PATCH /api/v1/admin/inventory/items/:itemId

Updates inventory item metadata or quantity.

Role:

```text
admin
```

---

## 10. SLA, Notifications, Audit, Reports

## GET /api/v1/sla/breaches

Lists SLA breaches.

Role:

```text
dispatcher admin
```

## GET /api/v1/notifications

Lists current user's notifications.

Role:

```text
authenticated
```

## POST /api/v1/notifications/:notificationId/read

Marks a notification as read.

Role:

```text
notification recipient
```

## GET /api/v1/admin/audit-logs

Lists audit logs.

Role:

```text
admin
```

## GET /api/v1/reports/dispatcher-dashboard

Returns operational dashboard metrics.

Role:

```text
dispatcher admin
```

## GET /api/v1/reports/technician-performance

Returns technician performance report.

Role:

```text
admin
```

---

## 11. First Implementation Slice

Implement endpoints in this order:

```text
POST /auth/register
POST /auth/login
GET /auth/me
GET /service-catalog/categories
GET /service-catalog/categories/:categoryId/service-types
POST /service-requests
GET /service-requests
GET /service-requests/:requestId
PATCH /service-requests/:requestId/triage
GET /dispatcher/queue
GET /service-requests/:requestId/eligible-technicians
POST /service-requests/:requestId/assignments
POST /assignments/:assignmentId/accept
POST /assignments/:assignmentId/on-the-way
POST /assignments/:assignmentId/start
POST /assignments/:assignmentId/complete
POST /service-requests/:requestId/cancel
```

Admin CRUD endpoints can be added after the core workflow exists.
