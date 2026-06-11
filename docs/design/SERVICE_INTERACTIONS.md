# Service Interaction Design

## 1. Purpose

This document defines how backend modules, use cases, domain policies, repositories, events, workers, and read queries interact.

The project is a modular monolith. Interactions are in-process method calls plus asynchronous BullMQ jobs backed by Redis.

---

## 2. Main Modules

Functional modules:

```text
IdentityModule
ServiceCatalogModule
ServiceRequestsModule
SchedulingModule
TechniciansModule
SlaModule
InventoryModule
NotificationsModule
ReportsModule
AuditModule
```

Technical modules:

```text
ApiModule
ApplicationModule
DomainModule
InfraModule
DatabaseModule
WorkerModule
ConfigModule
```

Layer ownership:

```text
api: controllers, DTOs, guards, HTTP mapping
application: use cases and transaction orchestration
domain: entities, policies, services, events, exceptions
infra: TypeORM repositories, read queries, queue producers, cache, adapters
db: TypeORM entities, migrations, data source config
worker: BullMQ processors
```

---

## 3. Dependency Direction

Allowed calls:

```text
Controller -> UseCase
WorkerProcessor -> UseCase
UseCase -> DomainPolicy
UseCase -> DomainService
UseCase -> RepositoryInterface
UseCase -> ReadQuery
UseCase -> QueueProducer
TypeOrmRepository -> TypeORM EntityManager / Repository
ReadQuery -> TypeORM QueryBuilder / raw SQL
```

Forbidden calls:

```text
Controller -> TypeORM
Controller -> BullMQ
Domain -> NestJS
Domain -> TypeORM
Domain -> BullMQ
Repository -> authorization decision
WorkerProcessor -> duplicated domain rules
```

---

## 4. Synchronous Request Flow

Generic HTTP command flow:

```text
HTTP request
  -> AuthGuard validates user
  -> RolesGuard checks coarse role
  -> Controller validates DTO
  -> Controller calls UseCase.execute()
  -> UseCase loads data through repository/read query
  -> UseCase checks ownership/resource authorization
  -> UseCase calls domain policies/services
  -> UseCase opens transaction if state changes
  -> Repository persists changes
  -> Outbox event and audit log are written in same transaction
  -> UseCase returns result
  -> Controller maps result to response DTO
```

Generic HTTP query flow:

```text
HTTP request
  -> AuthGuard validates user
  -> Controller validates query DTO
  -> Controller calls QueryUseCase.execute()
  -> QueryUseCase checks actor visibility rules
  -> QueryUseCase calls infra query
  -> Infra query returns read model DTO
  -> Controller returns response
```

---

## 5. Asynchronous Flow

State-changing use cases do not send notifications directly.

They write outbox events:

```text
UseCase transaction
  -> business table changes
  -> audit log row
  -> outbox_events row
```

Worker flow:

```text
OutboxWorker
  -> claims pending outbox event
  -> routes event by event_type
  -> creates BullMQ jobs or executes local side effects
  -> marks event processed
```

Notification flow:

```text
NotificationRequested event
  -> SendNotificationJob
  -> NotificationGateway mock adapter
  -> notifications.status = sent or failed
```

SLA flow:

```text
Scheduled SlaDeadlineCheckJob
  -> CheckSlaDeadlinesUseCase
  -> finds active requests near or past deadline
  -> records sla_deadline_events once
  -> marks request escalated when breached
  -> writes outbox event
```

---

## 6. Core Use Cases

## CreateServiceRequestUseCase

Inputs:

```text
actor user id
category id
service type id
address id
description
preferred time window
attachments metadata
```

Collaborators:

```text
ServiceCatalogRepository
CustomerAddressRepository
ServiceRequestRepository
SlaDeadlineCalculator
UnitOfWork / transaction manager
AuditLogRepository
OutboxRepository
```

Flow:

```text
validate actor is customer
load category and service type
validate service type belongs to category
load customer address and check ownership
copy service type priority, duration, required skills, SLA policy
calculate assignment and completion deadlines
set status to needs_triage when service type is Other, otherwise created
persist request, required skills, attachments, audit log, outbox event in one transaction
```

Events:

```text
ServiceRequestCreated
NotificationRequested
```

## TriageServiceRequestUseCase

Collaborators:

```text
ServiceRequestRepository
ServiceCatalogRepository
RequestTriagePolicy
AuditLogRepository
OutboxRepository
```

Flow:

```text
validate actor is dispatcher or admin
load request
reject cancelled or completed request
load new category/service type
copy adjusted priority, duration, and required skills
set status to triaged
persist changes and outbox event in one transaction
```

Events:

```text
ServiceRequestTriaged
ServiceRequestReclassified
```

## GetEligibleTechniciansUseCase

Collaborators:

```text
ServiceRequestRepository
TechnicianEligibilityQuery
TechnicianEligibilityPolicy
```

Flow:

```text
validate actor is dispatcher or admin
load request and required skills
query active technicians with required skills and service area
filter by availability window
exclude active overlapping assignments
return ranked read model
```

Important:

```text
This result is advisory. AssignTechnicianUseCase must repeat validation transactionally.
```

## AssignTechnicianUseCase

Collaborators:

```text
ServiceRequestRepository
TechnicianRepository
AssignmentRepository
TechnicianEligibilityPolicy
ScheduleOverlapChecker
UnitOfWork / transaction manager
AuditLogRepository
OutboxRepository
```

Transaction flow:

```text
validate actor is dispatcher or admin
load request with required skills
reject cancelled/completed/in_progress request
reject request with Other service type or needs_triage status
load technician with skills, service areas, availability
validate technician active
validate required skills
validate service area
validate selected slot inside availability
lock/check active assignments for technician and selected slot
reject overlap
create assignment
set request status to assigned
write audit log
write TechnicianAssigned outbox event
commit
```

Events:

```text
TechnicianAssigned
NotificationRequested
```

## Technician Status Transition Use Cases

Use cases:

```text
AcceptAssignmentUseCase
MarkTechnicianOnTheWayUseCase
StartServiceWorkUseCase
CompleteServiceRequestUseCase
```

Shared rules:

```text
actor must be assigned technician
request and assignment statuses must follow allowed transition
each transition records timestamp
each transition writes audit log and outbox event
```

Allowed status path:

```text
assigned -> accepted_by_technician -> technician_on_the_way -> in_progress -> completed
```

## CompleteServiceRequestUseCase

Additional collaborators:

```text
InventoryRepository
WorkReportRepository
InventoryPolicy
```

Transaction flow:

```text
validate actor is assigned technician
validate request is in_progress
validate work report summary exists
for each material usage, lock inventory item
reject when quantity would go below zero
decrement inventory
create work report and material usage rows
set assignment completed
set request completed
write audit log
write ServiceRequestCompleted outbox event
commit
```

## CancelServiceRequestUseCase

Rules:

```text
customer can cancel own request before technician_on_the_way
dispatcher can cancel before in_progress
admin can cancel with special reason
completed request cannot be cancelled
cancelled request should not trigger SLA breach
```

Transaction flow:

```text
load request and current assignment
apply cancellation policy
set request cancelled
cancel active assignment if present
write audit log
write ServiceRequestCancelled outbox event
commit
```

---

## 7. Domain Policies

## RequestTriagePolicy

Validates:

```text
cancelled request cannot be triaged
completed request cannot be triaged
Other service type must be replaced before assignment
```

## TechnicianEligibilityPolicy

Validates:

```text
technician is active
technician has required skills
technician serves service area
requested slot is inside availability
daily assignment limit is not exceeded
```

## AssignmentPolicy

Validates:

```text
request status allows assignment
request does not require triage
request is not already actively assigned
assignment slot is valid
```

## CancellationPolicy

Validates:

```text
actor role
request owner for customer cancellation
request status
assignment progress
```

## InventoryPolicy

Validates:

```text
material usage quantity is positive
inventory item is active
quantity_on_hand will not go below zero
```

## SlaPolicy

Validates:

```text
active requests have SLA policy
completed/cancelled requests are ignored by SLA breach jobs
same breach type is recorded once
```

---

## 8. Event Routing

Initial domain events:

```text
ServiceRequestCreated
ServiceRequestTriaged
ServiceRequestReclassified
TechnicianAssigned
AssignmentAccepted
TechnicianOnTheWay
ServiceWorkStarted
ServiceRequestCompleted
ServiceRequestCancelled
SlaDeadlineApproaching
SlaDeadlineBreached
MaterialUsed
InventoryAdjusted
NotificationRequested
AuditLogCreated
```

Event routing:

| Event | Consumers |
|---|---|
| ServiceRequestCreated | notifications, dispatcher dashboard projection |
| ServiceRequestTriaged | notifications, dispatcher dashboard projection |
| TechnicianAssigned | notifications, technician calendar projection |
| AssignmentAccepted | notifications |
| TechnicianOnTheWay | notifications |
| ServiceWorkStarted | dispatcher dashboard projection |
| ServiceRequestCompleted | notifications, reports, technician performance |
| ServiceRequestCancelled | notifications, dispatcher dashboard projection |
| SlaDeadlineApproaching | notifications, SLA dashboard |
| SlaDeadlineBreached | notifications, SLA dashboard, reports |
| MaterialUsed | inventory history, reports |
| InventoryAdjusted | reports |

MVP can process these events with a single outbox worker and simple handler map.

---

## 9. Module Interaction Map

```text
IdentityModule
  provides current user, roles, password hashing, tokens

ServiceCatalogModule
  provides categories, service types, skills, SLA metadata

ServiceRequestsModule
  owns request lifecycle and request policies

SchedulingModule
  owns technician eligibility, assignment, overlap checks

TechniciansModule
  owns technician profiles, skills, service areas, availability

InventoryModule
  owns inventory items and material usage consistency

SlaModule
  owns SLA deadline calculation and breach detection

NotificationsModule
  owns notification creation and mocked delivery

ReportsModule
  owns read queries for dashboards and reports

AuditModule
  owns audit log writes and admin audit reads
```

Cross-module rule:

```text
Use cases coordinate cross-module workflows.
Domain policies decide business rules.
Repositories only persist and load data.
```

---

## 10. Verification Strategy

For each workflow, verify at three levels:

```text
domain unit tests for policies
use case tests for workflow decisions
API e2e tests for authentication, authorization, and response shape
```

High-risk integration tests:

```text
two dispatchers cannot double-book same technician slot
completion cannot decrement inventory below zero
SLA breach event is recorded once
outbox event is processed once
customer cannot access another customer's request
```
