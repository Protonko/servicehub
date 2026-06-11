# 06 - Backend Layers Guide

## Purpose

This note explains the ServiceHub backend layers in practical terms.

The project uses a modular monolith with DDD-style boundaries. The goal is not
to create ceremony for its own sake, but to keep business rules, HTTP concerns,
database concerns, and infrastructure details from leaking into each other.

## Layer Map

The main source layers are:

```text
api
application
domain
infra
db
contract
config
worker
```

The dependency direction should stay inward:

```text
api -> application -> domain
application -> domain
infra -> domain
db -> infra
```

Some technical modules such as `config` can be used by bootstrapping and
infrastructure code, but business logic should not depend on environment or
framework details directly.

## API Layer

Location:

```text
src/api/
```

The API layer owns HTTP.

It contains:

```text
controllers
request DTOs
response DTOs
authentication guards
role guards
current user decorators
HTTP status mapping
validation pipes
```

Controllers should:

```text
validate request DTOs
resolve the authenticated actor
call one application use case
map the use case result to an HTTP response
```

Controllers should not:

```text
contain business rules
open database transactions
call TypeORM repositories directly
return TypeORM entities
send notifications directly
decide resource ownership rules
```

Example:

```text
POST /api/v1/service-requests
  -> ServiceRequestsController.create()
  -> CreateServiceRequestUseCase.execute()
  -> response DTO
```

## Application Layer

Location:

```text
src/application/
```

The application layer owns use cases and workflow orchestration.

It contains:

```text
command use cases
query use cases
application-level result types
repository interfaces when useful
transaction orchestration
job use cases called by workers
```

Use cases should:

```text
coordinate one workflow
load required data through repositories or read queries
check actor-level resource authorization when needed
call domain models, policies, or services for business decisions
control transaction boundaries for writes
write audit and outbox records when the feature requires them
return application results, not HTTP responses
```

Use cases should not:

```text
import controllers or DTOs
return Express/NestJS response objects
contain SQL or TypeORM query builder code
hide domain errors by swallowing them
duplicate business rules already owned by domain policies
```

Example command flow:

```text
AssignTechnicianUseCase
  -> load request and technician
  -> call TechnicianEligibilityPolicy
  -> open transaction
  -> persist assignment, request status, audit log, outbox event
  -> return assignment result
```

## Domain Layer

Location:

```text
src/domain/
```

The domain layer owns business meaning and business rules.

It is framework-free TypeScript. It must not import NestJS, TypeORM decorators,
TypeORM entities, BullMQ, Redis, HTTP DTOs, or database config.

It contains:

```text
model
policies
services
events
exceptions
```

### Domain Model

Location:

```text
src/domain/model/
```

`domain/model` is for business objects and shared business vocabulary.

Good candidates:

```text
ServiceRequest
Assignment
Technician
InventoryItem
TimeWindow
RequestPriority
ServiceRequestStatus
AssignmentStatus
RoleCode
```

These are not database models. They represent business concepts.

For example, `RoleCode` is not a `roles` table row. It is the canonical business
vocabulary for actor roles used by registration, guards, authorization, and
persistence.

Do not use `domain/model` as a generic constants folder.

Keep out:

```text
TypeORM entity classes
API request or response DTOs
presentation-only labels
technical configuration constants
database column-only shapes
```

### Domain Policies

Location:

```text
src/domain/policies/
```

Policies hold business decisions that depend on multiple inputs.

Examples:

```text
TechnicianEligibilityPolicy
CancellationPolicy
RequestTriagePolicy
AssignmentPolicy
```

Policy examples:

```text
request with service type Other cannot be assigned
completed request cannot be cancelled
technician must have the required skill
technician cannot be assigned outside availability
```

### Domain Services

Location:

```text
src/domain/services/
```

Domain services hold domain calculations that do not naturally belong to one
entity.

Examples:

```text
SlaDeadlineCalculator
ScheduleOverlapChecker
```

### Domain Events

Location:

```text
src/domain/events/
```

Domain events name important business facts:

```text
ServiceRequestCreated
TechnicianAssigned
RequestCompleted
```

They should describe what happened in business language. Publishing and
processing them belongs outside the domain layer.

### Domain Exceptions

Location:

```text
src/domain/exceptions/
```

Domain exceptions describe business failures:

```text
RequestCannotBeAssigned
TechnicianNotEligible
CompletedRequestCannotBeCancelled
```

The API layer later maps these to HTTP status codes.

## Infrastructure Layer

Location:

```text
src/infra/
```

The infrastructure layer owns technical adapters.

It contains:

```text
TypeORM repository implementations
read queries
queue producers
Redis adapters
password hashing adapters
JWT token services
notification gateway adapters
external integration clients
```

Infrastructure code can know about technical libraries. It translates between
technical data and domain/application needs.

Repositories should:

```text
use TypeORM EntityManager or repositories
map TypeORM entities to domain models
map domain models to persistence changes
hide database details from application use cases
```

Repositories should not:

```text
decide whether an actor is allowed to do something
own business lifecycle rules
return TypeORM entities directly to controllers
send HTTP responses
```

Read queries are allowed to return read models directly when the use case is a
screen, report, or search result. That is the CQRS-lite part of the architecture.

## Database Layer

Location:

```text
src/db/
```

The database layer owns persistence schema and TypeORM database configuration.

It contains:

```text
database module
data source config
TypeORM entities
migrations
database-specific test helpers when needed
```

TypeORM entities are persistence models, not domain models.

They should describe:

```text
table names
columns
indexes
foreign keys
relations
database constraints
```

They should not contain business workflow methods such as:

```text
assignTechnician()
cancelRequest()
completeWork()
```

Migrations are historical database changes. They should be self-contained and
should not import current domain constants if that would make old migrations
change behavior when current code evolves.

For seed data, stable business identity should usually be a code column, while
`id` stays a surrogate primary key.

## Contract Layer

Location:

```text
src/contract/
```

The contract layer is for shared shapes that are intentionally used across
layers or process boundaries.

Possible contents:

```text
public API response contracts
shared command/query result contracts
common pagination shapes
event payload contracts when needed
```

Use this layer carefully. Do not make it a dumping ground for every interface.

If a type is only used by one controller, keep it in the API layer. If a type is
only used by one use case, keep it close to that use case.

## Config Layer

Location:

```text
src/config/
```

The config layer owns environment parsing and application configuration.

It contains:

```text
environment validation
app config factories
module-level config wiring
```

Business code should not read `process.env` directly. It should receive already
parsed configuration through infrastructure or module wiring.

## Worker Layer

Location:

```text
src/worker.ts
src/worker.module.ts
src/application/jobs/
src/infra/queues/
```

Workers execute background work.

Worker processors should:

```text
claim jobs from queues
call application use cases
delegate business decisions to domain/application code
mark processing results
```

Workers should not:

```text
duplicate domain policies
directly mutate workflow tables without use cases
send notifications from command use cases without outbox coordination
```

## Typical Write Flow

Example:

```text
HTTP request
  -> api controller
  -> application command use case
  -> domain model or policy
  -> infra repository
  -> db entity and migration-backed table
  -> audit/outbox rows in the same transaction when required
  -> application result
  -> api response DTO
```

## Typical Read Flow

Example:

```text
HTTP request
  -> api controller
  -> application query use case
  -> authorization or visibility check
  -> infra read query
  -> read model DTO
  -> api response
```

Read flows can bypass rich domain models when they are only returning lists,
search results, reports, or dashboards. They still must enforce visibility and
authorization rules.

## Practical Placement Rules

Use this checklist when adding a file:

```text
HTTP route, DTO, guard, decorator -> api
workflow step or command/query orchestration -> application
business entity, value object, policy, domain exception -> domain
TypeORM repository, raw SQL read query, queue adapter -> infra
TypeORM entity, migration, data source -> db
shared external contract used across boundaries -> contract
environment parsing and module config -> config
background job processor bootstrap -> worker
```

When unsure, start close to the behavior that uses the code. Promote a type to a
shared layer only when more than one layer genuinely needs the same business
concept.

## Testing Implications

Tests should follow risk and behavior:

```text
domain policies and services: unit tests
application use cases: unit tests with mocked repositories
repositories and migrations: PostgreSQL-backed or SQL-focused integration tests
API controllers/workflows: Supertest e2e tests
workers/outbox: worker and idempotency tests
```

Do not add tests that only assert constants, enums, type aliases, or object
literals equal their declared values. Test the behavior, validation,
persistence constraint, or workflow that uses them.
