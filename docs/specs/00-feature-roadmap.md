# 00 - Feature Roadmap

## 1. Purpose

This document is the working feature roadmap for ServiceHub.

It is more detailed than `docs/IMPLEMENTATION_PLAN.md` and is used to generate individual feature specs.

Each item here should be small enough to become a dedicated spec and implementation step.

Process:

```text
1. Pick the next feature from this roadmap.
2. Create docs/specs/NN-feature-name.md.
3. Expand the selected roadmap item into a full spec.
4. Implement only that feature.
5. Add tests.
6. Update docs/engineering-notes/NN-feature-name.md.
```

---

## 2. Feature Status Legend

```text
planned: not started
specified: feature spec exists
in_progress: implementation started
done: implemented and verified
blocked: cannot proceed without decision
```

Current baseline:

```text
00 Project setup: done
```

---

## 3. Roadmap Index

| Order | Feature | Status | Generates Spec |
|---:|---|---|---|
| 01 | Database foundation | done | `01-database-foundation.md` |
| 02 | Role seed data | done | `02-role-seed-data.md` |
| 03 | User persistence | done | `03-user-persistence.md` |
| 04 | Auth registration | done | `04-auth-registration.md` |
| 05 | Auth login and cookies | done | `05-auth-login-cookies.md` |
| 06 | Current user and guards | done | `06-current-user-guards.md` |
| 07 | Service catalog schema and seeds | done | `07-service-catalog-schema-seeds.md` |
| 08 | Service catalog read API | done | `08-service-catalog-read-api.md` |
| 09 | Admin service catalog management | done | `09-admin-service-catalog-management.md` |
| 10 | Service areas and customer addresses | done | `10-service-areas-customer-addresses.md` |
| 11 | Service request domain model | done | `11-service-request-domain-model.md` |
| 12 | Create service request | done | `12-create-service-request.md` |
| 13 | Request read models | done | `13-request-read-models.md` |
| 14 | Dispatcher queue | planned | `14-dispatcher-queue.md` |
| 15 | Triage workflow | planned | `15-triage-workflow.md` |
| 16 | Technician profile persistence | planned | `16-technician-profile-persistence.md` |
| 17 | Technician management API | planned | `17-technician-management-api.md` |
| 18 | Technician availability | planned | `18-technician-availability.md` |
| 19 | Eligible technician search | planned | `19-eligible-technician-search.md` |
| 20 | Assignment domain policy | planned | `20-assignment-domain-policy.md` |
| 21 | Assign technician transaction | planned | `21-assign-technician-transaction.md` |
| 22 | Technician assignment reads | planned | `22-technician-assignment-reads.md` |
| 23 | Accept assignment | planned | `23-accept-assignment.md` |
| 24 | Technician on the way | planned | `24-technician-on-the-way.md` |
| 25 | Start service work | planned | `25-start-service-work.md` |
| 26 | Inventory foundation | planned | `26-inventory-foundation.md` |
| 27 | Complete service request | planned | `27-complete-service-request.md` |
| 28 | Cancel service request | planned | `28-cancel-service-request.md` |
| 29 | Outbox foundation | planned | `29-outbox-foundation.md` |
| 30 | Notification processing | planned | `30-notification-processing.md` |
| 31 | SLA deadline calculation hardening | planned | `31-sla-deadline-calculation-hardening.md` |
| 32 | SLA deadline jobs | planned | `32-sla-deadline-jobs.md` |
| 33 | Dispatcher dashboard report | planned | `33-dispatcher-dashboard-report.md` |
| 34 | Technician calendar report | planned | `34-technician-calendar-report.md` |
| 35 | Technician performance report | planned | `35-technician-performance-report.md` |
| 36 | Audit log read API | planned | `36-audit-log-read-api.md` |
| 37 | Error handling and API polish | planned | `37-error-handling-api-polish.md` |

---

## 4. Detailed Feature Breakdown

## 01 - Database Foundation

Status:

```text
done
```

Goal:

```text
Create TypeORM database infrastructure that can support migrations and entities.
```

Why this comes first:

```text
Every stateful feature depends on stable persistence.
```

Inputs:

```text
docs/design/DATABASE_SCHEMA.md
docs/design/ER_DIAGRAM.md
src/db/database.module.ts
```

Outputs:

```text
TypeORM base entity conventions
enum definitions
migration scripts folder
database data source config for CLI
repository integration test setup
```

Tables:

```text
No business table implementation has to be completed here if the spec decides to split migrations.
At minimum, the migration mechanism must be ready.
```

Use cases:

```text
none
```

Endpoints:

```text
none
```

Tests:

```text
database config compiles
migration command can be invoked
test database setup is documented
```

Next spec:

```text
docs/specs/01-database-foundation.md
```

---

## 02 - Role Seed Data

Status:

```text
done
```

Goal:

```text
Create roles and permissions foundation.
```

Dependencies:

```text
01 Database foundation
```

Outputs:

```text
roles table entity/migration if not already created
seed command or idempotent seed migration
role enum/constants
```

Roles:

```text
customer
dispatcher
technician
admin
```

Tests:

```text
roles are seeded once
role codes are unique
seed can run repeatedly without duplicates
```

Next spec:

```text
docs/specs/02-role-seed-data.md
```

---

## 03 - User Persistence

Status:

```text
done
```

Goal:

```text
Implement user persistence without authentication workflow yet.
```

Dependencies:

```text
01 Database foundation
02 Role seed data
```

Outputs:

```text
UserEntity
RoleEntity
UserRoleEntity
UserRepository interface
UserTypeOrmRepository
user mapper
```

Domain concepts:

```text
User
Role
```

Tests:

```text
create user
find user by email
assign role
unique email is enforced
```

Next spec:

```text
docs/specs/03-user-persistence.md
```

---

## 04 - Auth Registration

Status:

```text
done
```

Goal:

```text
Allow public customer registration.
```

Dependencies:

```text
03 User persistence
```

Endpoint:

```text
POST /api/v1/auth/register
```

Use case:

```text
RegisterCustomerUseCase
```

Rules:

```text
email must be unique
password must be hashed
new public registration receives customer role
inactive roles cannot be assigned
```

Tests:

```text
customer can register
duplicate email returns 409
password_hash is not plain password
created user has customer role
```

Next spec:

```text
docs/specs/04-auth-registration.md
```

---

## 05 - Auth Login And Cookies

Status:

```text
done
```

Goal:

```text
Authenticate users and issue httpOnly auth cookies.
```

Dependencies:

```text
04 Auth registration
```

Endpoint:

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
```

Use cases:

```text
LoginUseCase
LogoutUseCase
RefreshSessionUseCase
```

Rules:

```text
invalid credentials return 401
inactive user cannot log in
access token is httpOnly cookie
refresh strategy is explicit in spec
```

Tests:

```text
valid login sets cookie
invalid login returns 401
inactive user returns 403
logout clears cookie
```

Next spec:

```text
docs/specs/05-auth-login-cookies.md
```

---

## 06 - Current User And Guards

Status:

```text
done
```

Goal:

```text
Provide authenticated actor and role authorization for future endpoints.
```

Dependencies:

```text
05 Auth login and cookies
```

Endpoint:

```text
GET /api/v1/auth/me
```

Outputs:

```text
JwtAuthGuard
RolesGuard
CurrentUser decorator
AuthenticatedActor type
```

Tests:

```text
GET /auth/me returns current user
unauthenticated request returns 401
role guard allows matching role
role guard rejects missing role
```

Next spec:

```text
docs/specs/06-current-user-guards.md
```

---

## 07 - Service Catalog Schema And Seeds

Status:

```text
done
```

Goal:

```text
Create service catalog persistence and initial operational metadata.
```

Dependencies:

```text
01 Database foundation
```

Tables:

```text
service_categories
skills
sla_policies
service_types
service_type_required_skills
```

Seeds:

```text
HVAC category
Plumbing category
Other service type per category
initial skills
initial SLA policies
```

Tests:

```text
service type code unique inside category
service type has SLA policy
required skills link correctly
Other service type exists per seeded category
```

Next spec:

```text
docs/specs/07-service-catalog-schema-seeds.md
```

---

## 08 - Service Catalog Read API

Status:

```text
done
```

Goal:

```text
Expose active categories and service types to customers and dispatchers.
```

Dependencies:

```text
07 Service catalog schema and seeds
06 Current user and guards
```

Endpoints:

```text
GET /api/v1/service-catalog/categories
GET /api/v1/service-catalog/categories/:categoryId/service-types
```

Use cases:

```text
ListServiceCategoriesUseCase
ListServiceTypesUseCase
```

Tests:

```text
active categories are returned
inactive categories are hidden
service types are filtered by category
inactive service types are hidden
```

Next spec:

```text
docs/specs/08-service-catalog-read-api.md
```

---

## 09 - Admin Service Catalog Management

Status:

```text
done
```

Goal:

```text
Allow admin to manage service catalog metadata.
```

Dependencies:

```text
08 Service catalog read API
06 Current user and guards
```

Endpoints:

```text
POST /api/v1/admin/service-catalog/categories
PATCH /api/v1/admin/service-catalog/categories/:categoryId
POST /api/v1/admin/service-catalog/service-types
PATCH /api/v1/admin/service-catalog/service-types/:serviceTypeId
```

Rules:

```text
admin only
category code unique
service type code unique inside category
service type must reference active SLA policy
service type required skills must exist
```

Tests:

```text
admin can create category
dispatcher cannot create category
duplicate code returns 409
admin can deactivate service type
```

Next spec:

```text
docs/specs/09-admin-service-catalog-management.md
```

---

## 10 - Service Areas And Customer Addresses

Status:

```text
done
```

Goal:

```text
Represent customer locations and operational service areas.
```

Dependencies:

```text
06 Current user and guards
```

Tables:

```text
service_areas
customer_addresses
```

Endpoints:

```text
GET /api/v1/service-areas
POST /api/v1/customer-addresses
GET /api/v1/customer-addresses
PATCH /api/v1/customer-addresses/:addressId
```

Rules:

```text
customer owns address
address must belong to active service area
customer cannot read or update another customer's address
```

Tests:

```text
customer creates address
inactive service area rejected
cross-customer access returns 403 or 404
```

Next spec:

```text
docs/specs/10-service-areas-customer-addresses.md
```

---

## 11 - Service Request Domain Model

Status:

```text
done
```

Goal:

```text
Define request lifecycle concepts before adding request endpoints.
```

Dependencies:

```text
07 Service catalog schema and seeds
10 Service areas and customer addresses
```

Outputs:

```text
ServiceRequest domain model
ServiceRequestStatus enum
RequestPriority enum
basic lifecycle transition methods
domain exceptions
```

Rules:

```text
completed request cannot be cancelled
cancelled request cannot be assigned
request with Other service type requires triage before assignment
```

Tests:

```text
domain model starts in correct status
invalid cancellation throws domain exception
needs_triage request is not assignable
```

Next spec:

```text
docs/specs/11-service-request-domain-model.md
```

---

## 12 - Create Service Request

Status:

```text
done
```

Goal:

```text
Allow customer to create service requests.
```

Dependencies:

```text
06 Current user and guards
07 Service catalog schema and seeds
10 Service areas and customer addresses
11 Service request domain model
```

Endpoint:

```text
POST /api/v1/service-requests
```

Use case:

```text
CreateServiceRequestUseCase
```

Transaction:

```text
service request row
required skill snapshot
attachment metadata
audit log
outbox event
```

Tests:

```text
customer creates request
Other service type creates needs_triage
normal service type creates created
preferred window must be future
address must belong to customer
SLA deadlines are calculated
```

Next spec:

```text
docs/specs/12-create-service-request.md
```

---

## 13 - Request Read Models

Status:

```text
done
```

Goal:

```text
Read service requests with actor-specific visibility.
```

Dependencies:

```text
12 Create service request
```

Endpoints:

```text
GET /api/v1/service-requests
GET /api/v1/service-requests/:requestId
```

Rules:

```text
customer sees own requests
dispatcher/admin can see all requests
assigned technician visibility is added after assignment exists
```

Tests:

```text
customer cannot read another customer's request
dispatcher can read customer request
filters work for status and priority
```

Next spec:

```text
docs/specs/13-request-read-models.md
```

---

## 14 - Dispatcher Queue

Status:

```text
planned
```

Goal:

```text
Expose dispatcher-focused queue for active work.
```

Dependencies:

```text
13 Request read models
```

Endpoint:

```text
GET /api/v1/dispatcher/queue
```

Rules:

```text
dispatcher/admin only
sort urgent and SLA-risk requests first
support status, priority, service area filters
```

Tests:

```text
dispatcher sees active queue
customer cannot access queue
cancelled/completed requests are excluded by default
urgent requests sort before normal
```

Next spec:

```text
docs/specs/14-dispatcher-queue.md
```

---

## 15 - Triage Workflow

Status:

```text
planned
```

Goal:

```text
Allow dispatcher/admin to classify or reclassify service requests.
```

Dependencies:

```text
12 Create service request
14 Dispatcher queue
```

Endpoint:

```text
PATCH /api/v1/service-requests/:requestId/triage
```

Use case:

```text
TriageServiceRequestUseCase
```

Transaction:

```text
request category/type/priority/duration update
required skills replacement
audit log
outbox event
```

Tests:

```text
dispatcher can triage
customer cannot triage
cancelled request cannot be triaged
completed request cannot be triaged
Other type must be replaced before assignment
```

Next spec:

```text
docs/specs/15-triage-workflow.md
```

---

## 16 - Technician Profile Persistence

Status:

```text
planned
```

Goal:

```text
Create technician persistence model.
```

Dependencies:

```text
03 User persistence
07 Service catalog schema and seeds
10 Service areas and customer addresses
```

Tables:

```text
technicians
technician_skills
technician_service_areas
```

Rules:

```text
one user can have zero or one technician profile
technician must have active user
technician status controls assignment eligibility
```

Tests:

```text
create technician profile
duplicate profile rejected
skills link to technician
service areas link to technician
```

Next spec:

```text
docs/specs/16-technician-profile-persistence.md
```

---

## 17 - Technician Management API

Status:

```text
planned
```

Goal:

```text
Allow admin to create and update technician profiles.
```

Dependencies:

```text
16 Technician profile persistence
06 Current user and guards
```

Endpoints:

```text
GET /api/v1/admin/technicians
POST /api/v1/admin/technicians
PATCH /api/v1/admin/technicians/:technicianId
```

Tests:

```text
admin can create technician
non-admin cannot create technician
inactive skill rejected
technician must have service area
```

Next spec:

```text
docs/specs/17-technician-management-api.md
```

---

## 18 - Technician Availability

Status:

```text
planned
```

Goal:

```text
Manage technician availability windows.
```

Dependencies:

```text
17 Technician management API
```

Tables:

```text
technician_availability_windows
```

Rules:

```text
starts_at must be before ends_at
availability belongs to technician
blocked windows can be represented with is_available=false
```

Tests:

```text
admin creates availability
invalid time range rejected
technician calendar includes availability
```

Next spec:

```text
docs/specs/18-technician-availability.md
```

---

## 19 - Eligible Technician Search

Status:

```text
planned
```

Goal:

```text
Return advisory technician candidates for a request and time window.
```

Dependencies:

```text
15 Triage workflow
18 Technician availability
```

Endpoint:

```text
GET /api/v1/service-requests/:requestId/eligible-technicians
```

Rules:

```text
technician must be active
technician must have required skills
technician must serve request area
technician must be available
technician must not have overlapping active assignment
```

Tests:

```text
wrong skill excluded
wrong area excluded
inactive technician excluded
overlapping assignment excluded
```

Next spec:

```text
docs/specs/19-eligible-technician-search.md
```

---

## 20 - Assignment Domain Policy

Status:

```text
planned
```

Goal:

```text
Define assignment business rules before assignment writes are implemented.
```

Dependencies:

```text
11 Service request domain model
19 Eligible technician search
```

Outputs:

```text
AssignmentPolicy
TechnicianEligibilityPolicy
ScheduleOverlapChecker contract
domain exceptions
```

Tests:

```text
request needing triage rejected
cancelled request rejected
inactive technician rejected
missing skill rejected
outside service area rejected
```

Next spec:

```text
docs/specs/20-assignment-domain-policy.md
```

---

## 21 - Assign Technician Transaction

Status:

```text
planned
```

Goal:

```text
Create assignment transaction and prevent double booking.
```

Dependencies:

```text
20 Assignment domain policy
```

Endpoint:

```text
POST /api/v1/service-requests/:requestId/assignments
```

Transaction:

```text
lock/check technician assignments
create assignment
update request status
write audit log
write outbox event
```

Tests:

```text
dispatcher can assign
customer cannot assign
double booking is prevented
request status becomes assigned
outbox event written
```

Next spec:

```text
docs/specs/21-assign-technician-transaction.md
```

---

## 22 - Technician Assignment Reads

Status:

```text
planned
```

Goal:

```text
Allow technicians to read their assigned jobs.
```

Dependencies:

```text
21 Assign technician transaction
```

Endpoint:

```text
GET /api/v1/technician/assignments
```

Rules:

```text
technician sees only own assignments
dispatcher/admin read assignment through dispatcher views
```

Tests:

```text
technician sees own assignment
technician cannot see another technician assignment
status/date filters work
```

Next spec:

```text
docs/specs/22-technician-assignment-reads.md
```

---

## 23 - Accept Assignment

Status:

```text
planned
```

Goal:

```text
Allow assigned technician to accept assignment.
```

Dependencies:

```text
22 Technician assignment reads
```

Endpoint:

```text
POST /api/v1/assignments/:assignmentId/accept
```

Rules:

```text
only assigned technician can accept
assignment must be assigned
request must be assigned
cancelled request cannot be accepted
```

Tests:

```text
assigned technician can accept
other technician cannot accept
cancelled request cannot be accepted
status becomes accepted_by_technician
```

Next spec:

```text
docs/specs/23-accept-assignment.md
```

---

## 24 - Technician On The Way

Status:

```text
planned
```

Goal:

```text
Allow accepted technician to mark job as on the way.
```

Dependencies:

```text
23 Accept assignment
```

Endpoint:

```text
POST /api/v1/assignments/:assignmentId/on-the-way
```

Rules:

```text
only assigned technician can mark on the way
assignment must be accepted
request must be accepted_by_technician
```

Tests:

```text
accepted assignment can move on the way
assigned but not accepted assignment cannot move on the way
other technician cannot update
```

Next spec:

```text
docs/specs/24-technician-on-the-way.md
```

---

## 25 - Start Service Work

Status:

```text
planned
```

Goal:

```text
Allow technician to start work after being on the way.
```

Dependencies:

```text
24 Technician on the way
```

Endpoint:

```text
POST /api/v1/assignments/:assignmentId/start
```

Rules:

```text
only assigned technician can start
request must be technician_on_the_way
assignment must be on_the_way
```

Tests:

```text
on_the_way assignment can start
accepted assignment cannot skip to in_progress
started timestamp is recorded
```

Next spec:

```text
docs/specs/25-start-service-work.md
```

---

## 26 - Inventory Foundation

Status:

```text
planned
```

Goal:

```text
Create inventory item persistence and admin management.
```

Dependencies:

```text
06 Current user and guards
```

Tables:

```text
inventory_items
```

Endpoints:

```text
GET /api/v1/admin/inventory/items
POST /api/v1/admin/inventory/items
PATCH /api/v1/admin/inventory/items/:itemId
```

Rules:

```text
admin can manage inventory
quantity_on_hand cannot be negative
sku must be unique
```

Tests:

```text
admin creates inventory item
non-admin rejected
negative quantity rejected
duplicate sku rejected
```

Next spec:

```text
docs/specs/26-inventory-foundation.md
```

---

## 27 - Complete Service Request

Status:

```text
planned
```

Goal:

```text
Complete an in-progress assignment with work report and material usage.
```

Dependencies:

```text
25 Start service work
26 Inventory foundation
```

Endpoint:

```text
POST /api/v1/assignments/:assignmentId/complete
```

Transaction:

```text
create work report
create material usages
decrement inventory
update assignment status
update request status
write audit log
write outbox event
```

Tests:

```text
in_progress request can be completed
work report required
inventory cannot go below zero
completed request cannot be cancelled later
```

Next spec:

```text
docs/specs/27-complete-service-request.md
```

---

## 28 - Cancel Service Request

Status:

```text
planned
```

Goal:

```text
Cancel requests according to actor role and lifecycle state.
```

Dependencies:

```text
12 Create service request
21 Assign technician transaction
25 Start service work
27 Complete service request
```

Endpoint:

```text
POST /api/v1/service-requests/:requestId/cancel
```

Rules:

```text
customer can cancel own request before technician_on_the_way
dispatcher can cancel before in_progress
admin can cancel with special reason
completed request cannot be cancelled
cancelled request does not trigger SLA breach
```

Tests:

```text
customer cancels own early request
customer cannot cancel after on_the_way
dispatcher cannot cancel in_progress request
completed request cannot be cancelled
active assignment slot is released
```

Next spec:

```text
docs/specs/28-cancel-service-request.md
```

---

## 29 - Outbox Foundation

Status:

```text
planned
```

Goal:

```text
Make domain side effects reliable through outbox processing.
```

Dependencies:

```text
12 Create service request
21 Assign technician transaction
```

Outputs:

```text
OutboxRepository
ProcessOutboxEventUseCase
OutboxWorker processor
event handler registry
idempotency rules
```

Tests:

```text
pending event can be claimed
processed event is not reprocessed
failed event can retry
worker marks event processed
```

Next spec:

```text
docs/specs/29-outbox-foundation.md
```

---

## 30 - Notification Processing

Status:

```text
planned
```

Goal:

```text
Create mocked notifications from domain events.
```

Dependencies:

```text
29 Outbox foundation
```

Outputs:

```text
NotificationRequested event handler
notifications repository
mock notification gateway
notification read endpoint
mark-read endpoint
```

Endpoints:

```text
GET /api/v1/notifications
POST /api/v1/notifications/:notificationId/read
```

Tests:

```text
notification created for recipient
recipient can read own notifications
recipient can mark own notification read
user cannot read another user's notification
```

Next spec:

```text
docs/specs/30-notification-processing.md
```

---

## 31 - SLA Deadline Calculation Hardening

Status:

```text
planned
```

Goal:

```text
Ensure SLA deadlines are consistently calculated and stored.
```

Dependencies:

```text
12 Create service request
15 Triage workflow
```

Outputs:

```text
SlaDeadlineCalculator tests
recalculation behavior on triage if needed
priority-to-policy validation
```

Tests:

```text
urgent uses shortest deadlines
assignment deadline calculated from creation
completion deadline calculated from creation or scheduled time per spec decision
triage behavior is explicit
```

Next spec:

```text
docs/specs/31-sla-deadline-calculation-hardening.md
```

---

## 32 - SLA Deadline Jobs

Status:

```text
planned
```

Goal:

```text
Detect approaching and breached SLA deadlines asynchronously.
```

Dependencies:

```text
29 Outbox foundation
31 SLA deadline calculation hardening
```

Outputs:

```text
CheckSlaDeadlinesUseCase
SLA BullMQ processor
sla_deadline_events repository
SlaDeadlineApproaching event
SlaDeadlineBreached event
```

Tests:

```text
completed requests ignored
cancelled requests ignored
approaching event recorded once
breach event recorded once
breached request marked escalated
```

Next spec:

```text
docs/specs/32-sla-deadline-jobs.md
```

---

## 33 - Dispatcher Dashboard Report

Status:

```text
planned
```

Goal:

```text
Expose operational dispatcher metrics.
```

Dependencies:

```text
14 Dispatcher queue
21 Assign technician transaction
27 Complete service request
32 SLA deadline jobs
```

Endpoint:

```text
GET /api/v1/reports/dispatcher-dashboard
```

Metrics:

```text
active requests
waiting triage
waiting assignment
in progress
completed today
cancelled today
SLA breaches today
```

Tests:

```text
counts statuses correctly
admin/dispatcher allowed
customer rejected
date filters work
```

Next spec:

```text
docs/specs/33-dispatcher-dashboard-report.md
```

---

## 34 - Technician Calendar Report

Status:

```text
planned
```

Goal:

```text
Expose technician schedule/calendar read model.
```

Dependencies:

```text
18 Technician availability
21 Assign technician transaction
```

Endpoint:

```text
GET /api/v1/technicians/:technicianId/calendar
```

Rules:

```text
dispatcher/admin can view any technician calendar
technician can view own calendar
customer cannot view technician calendar
```

Tests:

```text
calendar includes availability
calendar includes active assignments
technician cannot view another technician calendar
```

Next spec:

```text
docs/specs/34-technician-calendar-report.md
```

---

## 35 - Technician Performance Report

Status:

```text
planned
```

Goal:

```text
Expose admin performance metrics for technicians.
```

Dependencies:

```text
27 Complete service request
32 SLA deadline jobs
```

Endpoint:

```text
GET /api/v1/reports/technician-performance
```

Metrics:

```text
completed jobs
average completion duration
SLA breach count
material usage count
```

Tests:

```text
admin can read report
non-admin rejected
metrics calculate from completed work
```

Next spec:

```text
docs/specs/35-technician-performance-report.md
```

---

## 36 - Audit Log Read API

Status:

```text
planned
```

Goal:

```text
Allow admins to inspect audit logs.
```

Dependencies:

```text
all state-changing workflows that write audit logs
```

Endpoint:

```text
GET /api/v1/admin/audit-logs
```

Filters:

```text
actorUserId
entityType
entityId
action
createdFrom
createdTo
```

Tests:

```text
admin can query audit logs
non-admin rejected
filters work
state-changing workflows write expected audit actions
```

Next spec:

```text
docs/specs/36-audit-log-read-api.md
```

---

## 37 - Error Handling And API Polish

Status:

```text
planned
```

Goal:

```text
Standardize API errors, validation responses, and final cross-cutting behavior.
```

Dependencies:

```text
core workflow endpoints
```

Outputs:

```text
global exception filter
domain exception to HTTP mapping
standard error response
request correlation id
basic OpenAPI setup if desired
```

Tests:

```text
validation error response shape
domain conflict maps to 409
unauthenticated maps to 401
forbidden maps to 403
unexpected errors do not leak internals
```

Next spec:

```text
docs/specs/37-error-handling-api-polish.md
```

---

## 5. Dependency Chains

## Core Request Chain

```text
01 Database foundation
02 Role seed data
03 User persistence
04 Auth registration
05 Auth login and cookies
06 Current user and guards
07 Service catalog schema and seeds
08 Service catalog read API
10 Service areas and customer addresses
11 Service request domain model
12 Create service request
13 Request read models
14 Dispatcher queue
15 Triage workflow
```

## Assignment Chain

```text
16 Technician profile persistence
17 Technician management API
18 Technician availability
19 Eligible technician search
20 Assignment domain policy
21 Assign technician transaction
22 Technician assignment reads
23 Accept assignment
24 Technician on the way
25 Start service work
```

## Completion Chain

```text
26 Inventory foundation
27 Complete service request
28 Cancel service request
```

## Async And Operations Chain

```text
29 Outbox foundation
30 Notification processing
31 SLA deadline calculation hardening
32 SLA deadline jobs
33 Dispatcher dashboard report
34 Technician calendar report
35 Technician performance report
36 Audit log read API
37 Error handling and API polish
```

---

## 6. Spec Generation Rules

When generating a feature spec from this roadmap:

```text
copy the selected roadmap item
expand all dependencies
link relevant design documents
define exact files/modules to create
define DTOs and response shapes
define TypeORM entities or migrations if needed
define use cases and policies
define tests before implementation
list verification commands
capture open questions explicitly
```

Every feature spec should reference:

```text
docs/REQUIREMENTS.md
docs/ARCHITECTURE.md
docs/design/DATABASE_SCHEMA.md
docs/design/API_ENDPOINTS.md
docs/design/SERVICE_INTERACTIONS.md
```

Use `docs/IMPLEMENTATION_PLAN.md` as the higher-level roadmap and this file as the detailed feature source.
