# ServiceHub - Technical Stack

## 1. Goal

This document defines the technical stack for the ServiceHub backend.

The goal is to build a realistic modular monolith that demonstrates:

```text
REST API design
NestJS module composition
DDD-style domain boundaries
Use-case oriented application services
PostgreSQL transactions and constraints
TypeORM entities, repositories, and migrations
Redis-backed queues and caching
Role-based authorization
CQRS-lite command/query separation
Outbox-based async processing
Dockerized local infrastructure
Testing strategy
AWS-ready deployment model
```

The project should be production-style while staying clear enough to evolve safely.

Kafka, Kubernetes, frontend implementation, and full microservices are intentionally out of scope for the initial version.

---

## 2. Project Architecture Principles

The backend should follow these architecture principles:

```text
clear top-level folders
api/application/domain/infra separation
controllers calling use cases
query and command use cases
domain policies and domain exceptions
database access hidden behind infrastructure code
configuration isolated from business code
tests close to the code they verify
```

Do not use:

```text
internal company packages
Kafka
enterprise-specific auth packages
enterprise-specific logging or metrics packages
```

Use public, well-documented libraries. TypeORM should be used through its public NestJS integration, not through company-specific wrappers.

---

## 3. Default Stack

```text
Language: TypeScript
Runtime: Node.js LTS
Backend Framework: NestJS
Database: PostgreSQL
ORM / Query Layer: TypeORM
Cache / Queue Backend: Redis
Background Jobs: BullMQ
API Style: REST
Authentication: JWT + httpOnly cookies
Authorization: RBAC + resource ownership checks
Validation: class-validator + class-transformer
Testing: Jest + Supertest
Local Infrastructure: Docker Compose
Cloud Target: AWS-ready architecture
```

Final default stack:

```text
TypeScript
Node.js LTS
NestJS
PostgreSQL
TypeORM
Redis
BullMQ
Docker Compose
Jest
Supertest
```

---

## 4. Backend Framework

Use:

```text
NestJS
```

Reason:

```text
NestJS makes module boundaries, dependency injection, guards, pipes, interceptors,
and testing patterns explicit. It is a good framework for structured backend
applications.
```

Recommended NestJS usage:

```text
controllers for HTTP only
guards for authentication and coarse authorization
pipes for DTO validation
providers for use cases, policies, repositories, and integrations
modules for explicit dependency wiring
```

Controllers should not contain business logic. They should validate input, resolve the authenticated actor, call a use case, and map the result to an HTTP response.

---

## 5. API Style

Use:

```text
REST
```

Reason:

```text
REST is simple to test with Supertest and maps well to the platform's resource
model: requests, assignments, technicians, schedules, inventory, notifications,
and reports.
```

Recommended API groups:

```text
/auth
/users
/service-catalog
/service-requests
/assignments
/technicians
/schedules
/sla
/inventory
/notifications
/reports
/admin
```

Use OpenAPI/Swagger only after the first core workflows are stable.

---

## 6. ORM / Query Layer

Use:

```text
TypeORM
```

Reason:

```text
TypeORM integrates naturally with NestJS, supports repositories, transactions,
migrations, query builders, and explicit entity mapping. It is useful for
production-style NestJS backends that need clear persistence, transactions, and
repository implementations.
```

Use TypeORM for:

```text
database entity modeling
migrations
basic queries
relations
transactions
typed database access
query builder queries
```

Use raw SQL when needed for:

```text
complex reporting queries
calendar overlap checks
advanced indexes
performance-sensitive read models
bulk operations
```

Important architectural rule:

```text
TypeORM entities are persistence models, not domain models.
Domain entities and business rules should live in the domain layer.
Repositories should hide TypeORM details from application use cases.
```

Recommended approach:

```text
Domain Entity -> Repository Interface -> TypeORM Repository Implementation -> PostgreSQL
```

Example:

```text
ServiceRequest domain entity should not depend on TypeORM decorators or entity classes.
AssignTechnicianUseCase should depend on repository interfaces.
TypeORM should stay inside db/entities, infra/repositories, or database adapters.
```

Avoid using TypeORM active record style. Prefer data mapper style with repositories so persistence concerns stay outside the domain layer.

---

## 7. Database

Use:

```text
PostgreSQL
```

PostgreSQL should enforce important consistency rules, not just store data.

Use PostgreSQL for:

```text
foreign keys
unique constraints
check constraints
transactional assignment validation
outbox storage
read models
audit records
reporting queries
```

High-value database constraints:

```text
unique user email
unique service category code
unique service type code inside category
assignment belongs to one active service request
inventory quantity cannot be negative
outbox event processing is idempotent
```

For scheduling overlap, prefer a transaction-safe database check. A PostgreSQL exclusion constraint can be introduced later if the project reaches that level.

---

## 8. Redis, Queues, and Cache

Use:

```text
Redis
BullMQ
```

Redis is used for:

```text
BullMQ queue backend
short-lived cache
rate limiting storage
distributed job locks if needed
```

BullMQ is used for background work that should not block HTTP requests.

Use background jobs for:

```text
SLA deadline checks
notification delivery
outbox processing
report generation
CSV import/export
cleanup jobs
retryable async tasks
```

Example queues:

```text
notifications
sla
outbox
reports
imports
```

Job requirements:

```text
Jobs must be idempotent where possible.
Jobs must support retries.
Failed jobs must be observable.
Long-running work must not block HTTP requests.
Workers must run as a separate process from the API.
```

---

## 9. Authentication and Authorization

Use:

```text
JWT access tokens
httpOnly cookies
refresh token rotation
RBAC
resource ownership policies
```

RBAC answers:

```text
Is this role allowed to perform this kind of operation?
```

Ownership and domain policies answer:

```text
Is this specific actor allowed to operate on this specific resource?
```

Examples:

```text
Customer can read only own service requests.
Technician can update only own assignments.
Dispatcher can assign technicians.
Admin can manage catalog and SLA policies.
```

Authorization must be enforced on the backend. Frontend visibility is not security.

---

## 10. Architecture Style

Use:

```text
Modular monolith
DDD-style boundaries
CQRS-lite command/query separation
Outbox-based async processing
Worker-based background jobs
PostgreSQL-first consistency
Redis for queues/cache/rate limiting
```

Recommended top-level backend source structure:

```text
src/
  api/
    http/
  application/
    use-cases/
      commands/
      queries/
    jobs/
  domain/
    model/
    policies/
    services/
    exceptions/
    events/
  infra/
    repositories/
    queries/
    queues/
    cache/
    auth/
    notifications/
  db/
    entities/
    migrations/
    database.module.ts
    database.config.ts
  config/
```

See `docs/ARCHITECTURE.md` for detailed rules.

---

## 11. Testing Stack

Use:

```text
Jest
Supertest
Test database
```

Test types:

```text
unit tests
integration tests
API e2e tests
repository tests
authorization tests
transaction tests
background job tests
```

Required API test examples:

```text
POST /auth/login with invalid credentials returns 401
Customer cannot read another customer's request
Technician cannot complete someone else's assignment
Dispatcher can assign technician
Technician cannot be double-booked
Request with Other service type cannot be assigned before triage
Completed request cannot be cancelled
Cancelled request cannot trigger SLA breach
Inventory cannot go below zero
Outbox event is processed once
```

---

## 12. Repository Structure

Recommended repository structure:

```text
servicehub/
  src/
    main.ts
    worker.ts
    api/
    application/
    domain/
    infra/
    db/
    config/
  docs/
    REQUIREMENTS.md
    STACK.md
    ARCHITECTURE.md
  db/
  docker-compose.yml
  package.json
  README.md
```

Recommended:

```text
Start with a modular monolith.
Keep API and worker as separate entrypoints.
Keep one database.
Do not split into microservices yet.
Do not implement frontend in MVP.
```

Keep the source tree under `src`. Use `src/main.ts` for the API process and `src/worker.ts` for background workers.

---

## 13. Explicit Non-Goals

Do not implement in MVP:

```text
frontend application
Kafka
Kubernetes
full microservices
event sourcing
GraphQL
real SMS provider
real email provider
real geocoding
real route optimization
real-time GPS tracking
complex marketplace mechanics
payment processing
```

The project is backend-first.

---

## 14. Final Stack Summary

Final recommended MVP stack:

```text
TypeScript
Node.js LTS
NestJS
REST API
PostgreSQL
TypeORM
Redis
BullMQ
PostgreSQL outbox
JWT/httpOnly cookie auth
RBAC + ownership policies
DTO validation
Jest
Supertest
Docker Compose
AWS-ready deployment model
```

This stack is strong enough to demonstrate serious backend engineering without turning the project into infrastructure cosplay.
