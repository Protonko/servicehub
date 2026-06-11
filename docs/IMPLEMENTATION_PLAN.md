# ServiceHub Implementation Plan

## 1. Purpose

This document defines the top-level implementation roadmap for ServiceHub.

Each roadmap item is expanded into smaller feature slices in:

```text
docs/specs/00-feature-roadmap.md
```

Each feature slice should later produce a dedicated feature specification before code is written.

Feature specifications should live in:

```text
docs/specs/
```

Engineering notes should live in:

```text
docs/engineering-notes/
```

Recommended feature spec naming:

```text
docs/specs/NN-feature-name.md
```

Recommended engineering note naming:

```text
docs/engineering-notes/NN-feature-name.md
```

The implementation process for every feature is:

```text
1. Write feature spec.
2. Review scope and assumptions.
3. Implement code.
4. Add focused tests.
5. Update engineering note.
6. Run verification commands.
```

---

## 2. Current Baseline

Already completed:

```text
project documentation
database design
ER diagram
API endpoint design
service interaction design
NestJS project setup
API entrypoint
worker entrypoint
TypeORM module
BullMQ module
Docker Compose for PostgreSQL and Redis
health controller
basic tests
```

Current verification baseline:

```text
npm run typecheck
npm run build
npm test
npm run test:e2e
docker compose config
```

---

## 3. Roadmap Overview

| Phase | Feature | Main Outcome |
|---:|---|---|
| 01 | Database foundation | TypeORM entities, migrations, seed structure |
| 02 | Identity and access | Users, roles, login, JWT cookies, guards |
| 03 | Service catalog | Categories, service types, skills, SLA policies |
| 04 | Customer addresses | Customer service locations and service areas |
| 05 | Service request creation | Customer creates request with SLA deadlines |
| 06 | Request reads and dispatcher queue | Customer/admin/dispatcher request visibility |
| 07 | Triage workflow | Dispatcher reclassifies `Other` requests |
| 08 | Technician management | Technician profiles, skills, areas, availability |
| 09 | Eligible technician search | Advisory matching for dispatcher |
| 10 | Assignment transaction | Transaction-safe technician assignment |
| 11 | Technician lifecycle | Accept, on the way, start work |
| 12 | Completion and inventory | Work report, material usage, inventory decrement |
| 13 | Cancellation workflow | Customer/dispatcher/admin cancellation rules |
| 14 | Outbox and notifications | Reliable async side effects |
| 15 | SLA jobs | Deadline approaching/breach detection |
| 16 | Reports and read models | Dispatcher dashboard and technician calendar |
| 17 | Audit hardening | Admin audit views and consistency cleanup |

---

## 4. Phase Details

## Phase 01 - Database Foundation

Feature spec:

```text
docs/specs/01-database-foundation.md
```

Goal:

```text
Create TypeORM persistence foundation for the MVP schema.
```

Scope:

```text
TypeORM entities
initial migrations
database naming conventions
base entity columns
enum definitions
seed structure for roles and initial catalog data
repository testing infrastructure
```

Depends on:

```text
project setup
docs/design/DATABASE_SCHEMA.md
docs/design/ER_DIAGRAM.md
```

Main tables:

```text
users
roles
user_roles
service_categories
skills
sla_policies
service_types
service_type_required_skills
service_areas
customer_addresses
technicians
technician_skills
technician_service_areas
technician_availability_windows
service_requests
service_request_required_skills
service_request_attachments
assignments
work_reports
inventory_items
material_usages
sla_deadline_events
notifications
audit_logs
outbox_events
```

Tests:

```text
migration runs on empty database
core constraints exist
seed roles are inserted once
```

Definition of done:

```text
docker compose starts PostgreSQL
migrations run successfully
entities compile
no synchronize usage
```

---

## Phase 02 - Identity And Access

Feature spec:

```text
docs/specs/02-identity-access.md
```

Goal:

```text
Implement users, roles, authentication, and basic authorization.
```

Scope:

```text
register customer
login
logout
refresh token placeholder or initial implementation
current user endpoint
password hashing
JWT access token in httpOnly cookie
role guard
current user decorator
ownership policy foundation
```

Endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET /api/v1/auth/me
```

Depends on:

```text
Phase 01
```

Tests:

```text
register creates customer role user
login with invalid credentials returns 401
login with valid credentials sets cookie
GET /auth/me requires authentication
role guard blocks unauthorized role
```

Definition of done:

```text
authenticated actor is available to controllers/use cases
role-based guard exists
passwords are never stored in plain text
```

---

## Phase 03 - Service Catalog

Feature spec:

```text
docs/specs/03-service-catalog.md
```

Goal:

```text
Implement service categories, service types, skills, and SLA policy metadata.
```

Scope:

```text
catalog read endpoints
admin catalog management endpoints
required skills per service type
SLA policy linking
initial seed data
```

Endpoints:

```text
GET /api/v1/service-catalog/categories
GET /api/v1/service-catalog/categories/:categoryId/service-types
POST /api/v1/admin/service-catalog/categories
PATCH /api/v1/admin/service-catalog/categories/:categoryId
POST /api/v1/admin/service-catalog/service-types
PATCH /api/v1/admin/service-catalog/service-types/:serviceTypeId
```

Depends on:

```text
Phase 01
Phase 02
```

Tests:

```text
public catalog read returns active records
admin can create category
non-admin cannot manage catalog
service type code is unique inside category
service type requires active SLA policy
```

Definition of done:

```text
catalog metadata can drive request creation
Other service type is represented explicitly
```

---

## Phase 04 - Customer Addresses And Service Areas

Feature spec:

```text
docs/specs/04-customer-addresses.md
```

Goal:

```text
Implement customer addresses and service areas.
```

Scope:

```text
service area seed/admin management
customer address create/list/update
ownership checks for addresses
```

Endpoints:

```text
GET /api/v1/service-areas
POST /api/v1/customer-addresses
GET /api/v1/customer-addresses
PATCH /api/v1/customer-addresses/:addressId
```

Depends on:

```text
Phase 02
```

Tests:

```text
customer can create own address
customer cannot update another customer's address
address must belong to active service area
```

Definition of done:

```text
service requests can use customer-owned addresses
```

---

## Phase 05 - Service Request Creation

Feature spec:

```text
docs/specs/05-service-request-creation.md
```

Goal:

```text
Allow customers to create service requests.
```

Scope:

```text
CreateServiceRequestUseCase
request entity/domain model
SlaDeadlineCalculator
required skills snapshot
attachment metadata
audit log write
outbox event write
transaction boundary
```

Endpoint:

```text
POST /api/v1/service-requests
```

Depends on:

```text
Phase 02
Phase 03
Phase 04
```

Tests:

```text
customer can create request
inactive category/service type rejected
service type must belong to category
preferred window must be future
Other service type creates needs_triage status
normal service type creates created status
required skills are copied to request
outbox event is written in same transaction
```

Definition of done:

```text
request creation is transactional
SLA deadlines are calculated
dispatcher-visible request exists
```

---

## Phase 06 - Request Reads And Dispatcher Queue

Feature spec:

```text
docs/specs/06-request-reads-dispatcher-queue.md
```

Goal:

```text
Implement request visibility and dispatcher queue read models.
```

Scope:

```text
GetServiceRequestUseCase
SearchServiceRequestsUseCase
GetDispatcherQueueUseCase
customer ownership visibility
dispatcher/admin all-request visibility
assigned technician visibility placeholder
pagination and filters
```

Endpoints:

```text
GET /api/v1/service-requests
GET /api/v1/service-requests/:requestId
GET /api/v1/dispatcher/queue
```

Depends on:

```text
Phase 05
```

Tests:

```text
customer sees own requests
customer cannot read another customer's request
dispatcher sees all active requests
filters work for status and priority
```

Definition of done:

```text
request read side is available for next workflows
```

---

## Phase 07 - Triage Workflow

Feature spec:

```text
docs/specs/07-triage-workflow.md
```

Goal:

```text
Allow dispatcher/admin to triage and reclassify requests.
```

Scope:

```text
TriageServiceRequestUseCase
RequestTriagePolicy
category/service type update
priority update
estimated duration update
required skills update
audit log
outbox event
transaction boundary
```

Endpoint:

```text
PATCH /api/v1/service-requests/:requestId/triage
```

Depends on:

```text
Phase 03
Phase 05
Phase 06
```

Tests:

```text
dispatcher can triage request
customer cannot triage request
cancelled request cannot be triaged
completed request cannot be triaged
Other service type must be replaced before assignment
```

Definition of done:

```text
requests with Other type can become assignable
triage changes are auditable
```

---

## Phase 08 - Technician Management

Feature spec:

```text
docs/specs/08-technician-management.md
```

Goal:

```text
Implement technician profiles, skills, service areas, and availability.
```

Scope:

```text
technician profile create/update
skills assignment
service areas assignment
availability windows
technician calendar base query
```

Endpoints:

```text
GET /api/v1/admin/technicians
POST /api/v1/admin/technicians
PATCH /api/v1/admin/technicians/:technicianId
GET /api/v1/technicians/:technicianId/calendar
```

Depends on:

```text
Phase 02
Phase 03
Phase 04
```

Tests:

```text
admin can create technician profile
technician user can have one profile
inactive technician cannot be eligible later
technician must have at least one service area
```

Definition of done:

```text
technician data is ready for matching and assignment
```

---

## Phase 09 - Eligible Technician Search

Feature spec:

```text
docs/specs/09-eligible-technician-search.md
```

Goal:

```text
Return advisory technician candidates for dispatcher assignment.
```

Scope:

```text
GetEligibleTechniciansUseCase
TechnicianEligibilityQuery
TechnicianEligibilityPolicy
skill filtering
service area filtering
availability filtering
overlap exclusion
basic ranking
```

Endpoint:

```text
GET /api/v1/service-requests/:requestId/eligible-technicians
```

Depends on:

```text
Phase 07
Phase 08
```

Tests:

```text
inactive technicians are excluded
missing skill technicians are excluded
wrong service area technicians are excluded
overlapping assignment technicians are excluded
result is advisory only
```

Definition of done:

```text
dispatcher can see eligible candidates before assignment
assignment still revalidates everything transactionally
```

---

## Phase 10 - Assignment Transaction

Feature spec:

```text
docs/specs/10-assignment-transaction.md
```

Goal:

```text
Assign technicians transactionally and prevent double booking.
```

Scope:

```text
AssignTechnicianUseCase
AssignmentPolicy
ScheduleOverlapChecker
assignment creation
request status update
transactional overlap check
audit log
outbox event
```

Endpoint:

```text
POST /api/v1/service-requests/:requestId/assignments
```

Depends on:

```text
Phase 07
Phase 08
Phase 09
```

Tests:

```text
dispatcher can assign technician
customer cannot assign technician
request needing triage cannot be assigned
cancelled/completed request cannot be assigned
technician must be active
technician must have required skills
technician must serve request area
technician cannot be double-booked
```

Definition of done:

```text
assignment is safe under realistic dispatcher workflow
request status becomes assigned
TechnicianAssigned event exists in outbox
```

---

## Phase 11 - Technician Lifecycle

Feature spec:

```text
docs/specs/11-technician-lifecycle.md
```

Goal:

```text
Allow assigned technician to progress the job lifecycle.
```

Scope:

```text
AcceptAssignmentUseCase
MarkTechnicianOnTheWayUseCase
StartServiceWorkUseCase
status transition policy
assignment/request timestamp updates
audit log
outbox events
```

Endpoints:

```text
GET /api/v1/technician/assignments
POST /api/v1/assignments/:assignmentId/accept
POST /api/v1/assignments/:assignmentId/on-the-way
POST /api/v1/assignments/:assignmentId/start
```

Depends on:

```text
Phase 10
```

Tests:

```text
only assigned technician can accept
only assigned technician can mark on the way
only assigned technician can start work
invalid status transitions return 409
cancelled request cannot progress
```

Definition of done:

```text
request can move assigned -> accepted_by_technician -> technician_on_the_way -> in_progress
```

---

## Phase 12 - Completion And Inventory

Feature spec:

```text
docs/specs/12-completion-inventory.md
```

Goal:

```text
Complete requests with work reports and optional material usage.
```

Scope:

```text
CompleteServiceRequestUseCase
RecordMaterialUsage behavior inside completion
InventoryPolicy
work report creation
material usage creation
inventory decrement
completion attachments
transaction boundary
audit log
outbox event
```

Endpoint:

```text
POST /api/v1/assignments/:assignmentId/complete
```

Depends on:

```text
Phase 11
```

Tests:

```text
assigned technician can complete in_progress request
work report summary is required
inventory cannot go below zero
completion creates work report
completion updates assignment and request statuses
completed request cannot be modified by normal workflow
```

Definition of done:

```text
request can be completed with consistent inventory changes
```

---

## Phase 13 - Cancellation Workflow

Feature spec:

```text
docs/specs/13-cancellation-workflow.md
```

Goal:

```text
Implement customer, dispatcher, and admin cancellation rules.
```

Scope:

```text
CancelServiceRequestUseCase
CancellationPolicy
assignment cancellation
request cancellation
SLA exclusion behavior
audit log
outbox event
```

Endpoint:

```text
POST /api/v1/service-requests/:requestId/cancel
```

Depends on:

```text
Phase 05
Phase 10
Phase 11
```

Tests:

```text
customer can cancel own request before technician_on_the_way
customer cannot cancel another customer's request
dispatcher can cancel before in_progress
completed request cannot be cancelled
cancelled request does not block technician slot
```

Definition of done:

```text
cancellation is permission-aware and releases active assignment slot
```

---

## Phase 14 - Outbox And Notifications

Feature spec:

```text
docs/specs/14-outbox-notifications.md
```

Goal:

```text
Process outbox events and create mocked notifications reliably.
```

Scope:

```text
OutboxWorker
ProcessOutboxEventUseCase
notification event routing
notifications table writes
mock notification gateway
retry and idempotency handling
```

Depends on:

```text
Phase 05
Phase 10
Phase 11
Phase 12
Phase 13
```

Tests:

```text
outbox event is processed once
failed event can retry
notification is created for target user
processed event is not processed again
```

Definition of done:

```text
business workflows no longer rely on direct side effects
worker can process pending outbox events
```

---

## Phase 15 - SLA Jobs

Feature spec:

```text
docs/specs/15-sla-jobs.md
```

Goal:

```text
Detect approaching and breached SLA deadlines.
```

Scope:

```text
CheckSlaDeadlinesUseCase
SlaPolicy
BullMQ scheduled job
sla_deadline_events writes
request escalation marker
notification outbox events
```

Depends on:

```text
Phase 05
Phase 14
```

Tests:

```text
completed requests are ignored
cancelled requests are ignored
breach event is recorded once
approaching event is recorded once
breached request is escalated
```

Definition of done:

```text
SLA deadlines produce observable events and dispatcher notifications
```

---

## Phase 16 - Reports And Read Models

Feature spec:

```text
docs/specs/16-reports-read-models.md
```

Goal:

```text
Implement operational read models for dispatcher and admin visibility.
```

Scope:

```text
dispatcher dashboard metrics
technician calendar
SLA breaches list
technician performance report
query classes in infra/queries
pagination/filtering
```

Endpoints:

```text
GET /api/v1/reports/dispatcher-dashboard
GET /api/v1/reports/technician-performance
GET /api/v1/sla/breaches
GET /api/v1/technicians/:technicianId/calendar
```

Depends on:

```text
Phase 10
Phase 12
Phase 15
```

Tests:

```text
dashboard counts active statuses correctly
technician calendar includes active assignments
SLA breaches list only breached records
admin-only reports reject non-admin users
```

Definition of done:

```text
core workflows have useful read-side visibility
```

---

## Phase 17 - Audit Hardening

Feature spec:

```text
docs/specs/17-audit-hardening.md
```

Goal:

```text
Make business changes traceable and admin-readable.
```

Scope:

```text
audit log query endpoint
consistent audit metadata
correlation id support
request id support
admin audit filtering
final consistency review
```

Endpoint:

```text
GET /api/v1/admin/audit-logs
```

Depends on:

```text
all previous state-changing phases
```

Tests:

```text
admin can read audit logs
non-admin cannot read audit logs
important business actions write audit records
audit filters work by entity and actor
```

Definition of done:

```text
main business workflows are auditable
```

---

## 5. Feature Spec Template

Each feature spec should use this structure:

```text
# NN - Feature Name

## Goal
## Scope
## Out Of Scope
## User Roles
## API Endpoints
## Data Model Changes
## Domain Rules
## Application Use Cases
## Transaction Boundaries
## Events And Background Jobs
## Authorization Rules
## Validation Rules
## Test Plan
## Manual Verification
## Rollout Notes
## Open Questions
```

Feature specs should be specific enough that implementation can proceed without guessing.

---

## 6. Delivery Rules

Implement one phase at a time.

Do not start coding a phase until its feature spec exists.

Do not combine unrelated phases in one implementation step.

Every phase should update or create:

```text
feature spec
code
tests
engineering note
```

Every phase should run at least:

```text
npm run typecheck
npm run build
npm test
```

Run `npm run test:e2e` when the phase touches HTTP controllers, auth, or request lifecycle behavior.

Run Docker/PostgreSQL-backed tests when the phase touches migrations, repositories, transactions, or scheduling.
