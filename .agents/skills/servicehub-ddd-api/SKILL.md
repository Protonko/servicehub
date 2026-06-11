---
name: servicehub-ddd-api
description: Create or review ServiceHub backend feature specs and implementation for DDD-style NestJS APIs. Use when planning or implementing feature slices that involve controllers, DTOs, use cases, domain models, policies, TypeORM entities/repositories, transactions, outbox events, or REST endpoints.
---

# ServiceHub DDD API

## Core Workflow

1. Read `docs/specs/00-feature-roadmap.md` and the current feature spec.
2. Read relevant sections of `docs/ARCHITECTURE.md`, `docs/design/API_ENDPOINTS.md`, `docs/design/DATABASE_SCHEMA.md`, and `docs/design/SERVICE_INTERACTIONS.md`.
3. For creating a feature spec, read `references/golden-feature-spec.md`.
4. For implementing a feature slice, read `references/golden-ddd-slice.md`.
5. Keep one feature slice per implementation step.
6. Preserve the dependency direction:

```text
api -> application -> domain
application -> domain
infra -> domain
db -> infra
```

7. Add or update an engineering note in `docs/engineering-notes/`.
8. Run focused verification commands.

## Layer Rules

API layer:

```text
controllers
request DTOs
response DTOs
guards
HTTP status mapping
```

Application layer:

```text
use cases
workflow orchestration
transaction boundaries
repository interfaces
outbox/audit coordination
```

Domain layer:

```text
domain models
value objects
policies
domain services
domain exceptions
domain events
```

Infrastructure layer:

```text
TypeORM repositories
read queries
queue producers
cache adapters
notification adapters
```

Database layer:

```text
TypeORM entities
migrations
database config
```

## Hard Constraints

Do not put business logic in controllers.

Do not import NestJS, TypeORM decorators, TypeORM entities, BullMQ, or Redis into domain code.

Do not expose TypeORM entities as API responses.

Do not use TypeORM entities as domain models.

Do not add Kafka, GraphQL, microservices, event sourcing, real SMS/email providers, geocoding, route optimization, or payment processing in MVP features.

## Feature Spec Checklist

Before implementation, the feature spec must define:

```text
goal
scope
out of scope
roles
endpoints
DTOs
data model changes
domain rules
use cases
repository interfaces
transaction boundaries
events/outbox behavior
authorization rules
validation rules
test plan
manual verification
open questions
```

If any item is unknown, document a conservative assumption in the spec before coding.

## Implementation Checklist

For a write feature:

```text
domain rules first
use case next
repository interface next
TypeORM implementation next
controller last
tests around domain/use case/API behavior
```

For a read feature:

```text
visibility rules first
query DTO next
infra query/read model next
query use case next
controller last
tests around actor visibility and filters
```

For transactional workflows:

```text
define all rows changed in one transaction
define lock/overlap strategy if scheduling or inventory is involved
write audit log in the same transaction
write outbox event in the same transaction
test failure/rollback behavior when practical
```

## Naming

Use names like:

```text
CreateServiceRequestUseCase
AssignTechnicianUseCase
TechnicianEligibilityPolicy
ServiceRequestTypeOrmRepository
GetDispatcherQueueQuery
```

Use `*Entity` only for TypeORM persistence classes.

Use `*Dto` only for API input/output DTOs.

Use domain names without persistence suffixes in `src/domain`.
