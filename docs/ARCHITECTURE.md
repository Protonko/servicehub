# ServiceHub - Architecture

## 1. Purpose

This document describes the backend architecture for ServiceHub.

The architecture is based on a modular NestJS backend with clear separation between HTTP API, application use cases, domain rules, and infrastructure.

The code should be grouped into clear technical layers:

```text
api
application
domain
infra
db
contract
config
```

The project should use public dependencies: TypeORM for PostgreSQL persistence, BullMQ for background jobs, and local modules instead of company-specific packages.

---

## 2. Architecture Style

Use:

```text
Modular monolith
Layered architecture
DDD-style domain boundaries
Use-case oriented application layer
CQRS-lite command/query separation
Outbox-based asynchronous processing
Separate API and worker processes
```

This means:

```text
The system is deployed as one backend product.
Business domains are separated inside the codebase.
HTTP controllers do not contain business logic.
Use cases coordinate workflows.
Domain code owns business decisions.
Infrastructure code talks to databases, queues, caches, and external services.
```

Do not split into microservices in the MVP.

---

## 3. Dependency Rule

Dependencies must point inward.

```text
api -> application -> domain
api -> contract
application -> domain
application -> contract
infra -> domain
infra -> contract
db -> infra
```

Allowed:

```text
Controller calls a use case.
Use case calls a domain policy.
Use case depends on a repository interface.
TypeORM repository implementation implements that repository interface.
Worker processor calls a use case.
```

Not allowed:

```text
Domain imports NestJS.
Domain imports TypeORM decorators or entity classes.
Domain imports BullMQ.
Controller imports TypeORM repositories or database connections.
Use case writes raw HTTP responses.
Repository decides whether a customer may cancel a request.
```

The domain layer should be the easiest layer to unit test.

---

## 4. Recommended Source Structure

```text
src/
  app.module.ts

  api/
    api.module.ts
    http/
      api-http.module.ts
      auth.controller.ts
      service-requests.controller.ts
      assignments.controller.ts
      technicians.controller.ts
      service-catalog.controller.ts
      inventory.controller.ts
      reports.controller.ts
      factories/
        api-error-response.factory.ts

  application/
    application.module.ts
    use-cases.module.ts
    use-cases/
      commands/
        create-service-request/
        triage-service-request/
        assign-technician/
        accept-assignment/
        start-work/
        complete-request/
        cancel-request/
      queries/
        get-service-request/
        search-service-requests/
        get-dispatcher-queue/
        get-technician-schedule/
        get-eligible-technicians/
    jobs/
      process-outbox/
      check-sla-deadlines/
      send-notification/

  domain/
    domain.module.ts
    model/
      service-request.ts
      assignment.ts
      technician.ts
      service-type.ts
      sla-policy.ts
      inventory-item.ts
    policies/
      assignment.policy.ts
      cancellation.policy.ts
      request-triage.policy.ts
      technician-eligibility.policy.ts
      sla.policy.ts
    services/
      sla-deadline-calculator.ts
      schedule-overlap-checker.ts
    events/
      service-request-created.event.ts
      technician-assigned.event.ts
      request-completed.event.ts
    exceptions/
      domain.exception.ts
      request-cannot-be-assigned.exception.ts
      technician-not-eligible.exception.ts

  infra/
    infra.module.ts
    repositories/
      service-request.typeorm-repository.ts
      assignment.typeorm-repository.ts
      technician.typeorm-repository.ts
      inventory.typeorm-repository.ts
    queries/
      get-dispatcher-queue.query.ts
      get-technician-schedule.query.ts
      get-eligible-technicians.query.ts
      get-request-report.query.ts
    queues/
      bullmq.module.ts
      queue-names.ts
    cache/
      redis-cache.service.ts
    auth/
      password-hasher.ts
      jwt-token.service.ts
    notifications/
      notification-gateway.ts

  db/
    database.module.ts
    database.config.ts
    entities/
      service-request.entity.ts
      assignment.entity.ts
      technician.entity.ts
      inventory-item.entity.ts
    migrations/

  contract/
    common/
    api/
    use-case/

  config/
    config.ts

  common/
    utils/
      trim-string.ts
```

This structure can start smaller. Add folders only when there is real code for them.

---

## 5. Layer Responsibilities

### 5.1 API Layer

The API layer owns HTTP concerns.

Responsibilities:

```text
routes
controllers
request DTOs
response DTOs
authentication guards
authorization guards for role-level checks
validation pipes
HTTP status mapping
OpenAPI decorators when needed
```

Controllers should:

```text
receive HTTP input
validate DTOs
extract current user
call one application use case
return response DTO
```

Controllers should not:

```text
open database transactions
call TypeORM repositories directly
contain workflow decisions
check scheduling overlap manually
send notifications directly
```

Example flow:

```text
POST /service-requests
  -> ServiceRequestsController.create()
  -> CreateServiceRequestUseCase.execute()
  -> ServiceRequest domain model validates creation rules
  -> TypeORM repository persists request and outbox event
  -> controller returns 201
```

---

### 5.2 Application Layer

The application layer owns user-facing workflows.

Use cases coordinate:

```text
loading data
starting transactions
calling domain policies
persisting changes
creating outbox events
enqueueing background work when needed
returning application results
```

Use cases should be grouped into:

```text
commands
queries
```

Commands change state:

```text
CreateServiceRequestUseCase
TriageServiceRequestUseCase
AssignTechnicianUseCase
AcceptAssignmentUseCase
CompleteRequestUseCase
CancelRequestUseCase
RecordMaterialUsageUseCase
```

Queries read data:

```text
GetServiceRequestUseCase
SearchServiceRequestsUseCase
GetDispatcherQueueUseCase
GetEligibleTechniciansUseCase
GetTechnicianScheduleUseCase
GetSlaBreachesReportUseCase
```

Command use cases should prefer repositories and domain models.

Query use cases may use optimized read queries from `infra/queries` when returning screens, reports, or search results.

---

### 5.3 Domain Layer

The domain layer owns business rules.

Domain code should be framework-agnostic TypeScript.

It contains:

```text
entities
value objects
domain services
policies
domain events
domain exceptions
```

`domain/model` is for framework-free business objects and domain vocabulary that
carry business meaning:

```text
aggregates and entities such as ServiceRequest, Assignment, Technician
value objects such as time windows, priorities, statuses, and role codes
small domain enums when application code must share the exact business vocabulary
```

Do not use `domain/model` as a general constants folder.

Keep out of `domain/model`:

```text
TypeORM entities or database column shapes
API DTOs or response shapes
NestJS decorators, guards, or modules
pure presentation labels that are only seed/display data
technical configuration constants
```

If an enum or constant does not affect business rules, validation,
authorization, state transitions, or persistence contracts, keep it closer to
where it is used instead of promoting it to the domain layer.

Examples of domain rules:

```text
Completed request cannot be cancelled.
Cancelled request cannot be assigned.
Request with serviceType = Other cannot be assigned before triage.
Only assigned technician can start or complete work.
Technician must have required skill.
Technician cannot be assigned outside availability window.
Inventory quantity cannot go below zero.
SLA breach must be recorded only once per deadline type.
```

Policies are useful when a rule depends on several objects.

Example:

```text
TechnicianEligibilityPolicy
  input: technician, service request, requested slot
  output: eligible or reason for rejection
```

Domain exceptions should describe business failures. The API layer maps them to HTTP status codes.

---

### 5.4 Infrastructure Layer

The infrastructure layer owns technical integrations.

It contains:

```text
TypeORM repositories
raw SQL queries
Redis cache implementation
BullMQ queue producers
notification adapters
auth token services
password hashing
external API clients
```

Infrastructure code may depend on domain and contract types, but domain code must not depend on infrastructure.

Repository implementations should translate between:

```text
TypeORM entities <-> domain models
```

Query implementations may return read DTOs directly when they are optimized for screens or reports.

---

### 5.5 Database Layer

The database layer owns TypeORM entities, migrations, and database setup.

PostgreSQL should enforce critical consistency with:

```text
foreign keys
unique constraints
check constraints
indexes
transactions
```

The application must not rely only on in-memory validation for consistency.

High-risk workflows must run in transactions:

```text
assign technician
reschedule assignment
complete request with material usage
cancel request and release assignment
record SLA breach once
process outbox event once
```

---

## 6. Main Backend Modules

Recommended functional modules:

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

The code may also keep technical modules:

```text
ApiModule
ApplicationModule
DomainModule
InfraModule
DatabaseModule
ConfigModule
WorkerModule
```

Prefer simple top-level technical folders first. Split into feature packages only when the code grows enough to justify it.

---

## 7. Request Workflow

Primary workflow:

```text
Customer creates service request
System loads service type metadata
System calculates priority and SLA deadline
System stores request and outbox event in one transaction
Outbox worker creates notification job
Dispatcher sees request in queue
Dispatcher triages if service type is Other
Dispatcher asks for eligible technicians
Dispatcher assigns technician and time slot
Backend validates assignment in transaction
Technician accepts assignment
Technician moves through job lifecycle
Technician completes request with work report
System records inventory usage and completion event
Notification and reporting jobs run asynchronously
```

The most important consistency point is assignment.

Assignment must verify in one transaction:

```text
request is active
request does not require triage
technician is active
technician has required skills
technician serves the area
slot is inside availability
slot does not overlap existing assignments
request is not already assigned to another active slot
```

---

## 8. CQRS-Lite

Use CQRS-lite, not full CQRS/event sourcing.

Commands:

```text
change state
validate domain invariants
run transactions
write outbox events
return IDs or concise results
```

Queries:

```text
read state
join data for screens
support filters and pagination
avoid modifying data
return read models
```

Both commands and queries can use the same PostgreSQL database.

No separate read database is required for MVP.

---

## 9. Outbox Pattern

Use a PostgreSQL outbox table for reliable async side effects.

When a command changes important state, it should store domain changes and outbox events in the same database transaction.

Example:

```text
AssignTechnicianUseCase transaction:
  update service request status
  create assignment
  insert audit log
  insert outbox event TechnicianAssigned
```

Then a BullMQ worker processes outbox events:

```text
read unprocessed outbox events
claim event
publish or execute side effect
mark processed
retry failed events
```

In this project, outbox events may trigger:

```text
notifications
SLA checks
report read model updates
audit enrichment
```

Outbox processing must be idempotent.

---

## 10. Workers

The API process should handle HTTP requests.

The worker process should handle background jobs.

Worker responsibilities:

```text
process outbox events
send notifications
check SLA deadlines
generate reports
run imports or exports
cleanup expired sessions or tokens
```

Workers should call application use cases where business rules are needed.

Do not duplicate business logic inside BullMQ processors.

---

## 11. Error Handling

Use domain exceptions for business errors:

```text
RequestCannotBeAssignedException
TechnicianNotEligibleException
RequestAlreadyCompletedException
InventoryQuantityExceededException
ForbiddenResourceAccessException
```

Map errors at the API boundary:

```text
validation error -> 400
authentication error -> 401
authorization error -> 403
not found -> 404
conflict or invariant violation -> 409
unexpected error -> 500
```

Do not leak database or TypeORM errors directly to API consumers.

---

## 12. Authorization Model

Authorization has two levels.

Role-level authorization:

```text
customer
dispatcher
technician
admin
```

Resource-level authorization:

```text
customer owns this request
technician owns this assignment
dispatcher belongs to this service area
admin can manage this catalog item
```

Use guards for coarse role checks and application/domain policies for resource-specific decisions.

Examples:

```text
Customer can create service requests.
Customer can read only own service requests.
Dispatcher can assign technicians.
Technician can complete only own active assignment.
Admin can manage service catalog and SLA policies.
```

---

## 13. Testing Strategy

Testing should follow risk.

Unit tests:

```text
domain policies
domain services
use cases with mocked repositories
authorization policies
```

Integration tests:

```text
TypeORM repositories
transactional assignment
outbox processing
inventory updates
SLA breach recording
```

API e2e tests:

```text
auth flow
customer request creation
dispatcher triage and assignment
technician lifecycle
forbidden cross-user access
invalid transitions
```

High-priority tests:

```text
Technician cannot be double-booked.
Other service type cannot be assigned before triage.
Customer cannot cancel after technician is on the way.
Completed request cannot be cancelled.
Inventory cannot go below zero.
Outbox event is processed once.
```

---

## 14. Implementation Order

Recommended implementation order:

```text
1. Project setup: NestJS, TypeORM, PostgreSQL, Docker Compose.
2. Identity: users, roles, login, JWT cookies.
3. Service catalog: categories, service types, skills, SLA metadata.
4. Service requests: create, read own, dispatcher list.
5. Triage: handle Other service type.
6. Technicians: profiles, skills, service areas, availability.
7. Scheduling: eligible technicians and assignment transaction.
8. Technician workflow: accept, on the way, in progress, complete.
9. Inventory: record materials on completion.
10. Outbox and notifications.
11. SLA deadline jobs.
12. Reports and read models.
13. Audit logs and admin hardening.
```

This order keeps the first milestone small while still leading toward a serious backend architecture.

---

## 15. Architecture Non-Goals

Do not add these in MVP:

```text
microservices
Kafka
Kubernetes
GraphQL
event sourcing
separate read database
complex service mesh
real SMS/email providers
real geocoding or route optimization
frontend application
```

Add them only if there is a specific product or engineering requirement that needs them.
