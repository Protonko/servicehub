# Project Agent Instructions

## Project Context

This is a backend project for building a production-style field service operations platform.

The goal is to produce working code with clear architecture, explicit design decisions, and traceable implementation notes.

Primary stack:

```text
TypeScript
Node.js LTS
NestJS
TypeORM
PostgreSQL
Redis
BullMQ
Jest
Supertest
Docker Compose
```

Primary documentation:

```text
docs/REQUIREMENTS.md
docs/STACK.md
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_PLAN.md
docs/design/DATABASE_SCHEMA.md
docs/design/API_ENDPOINTS.md
docs/design/SERVICE_INTERACTIONS.md
```

Before implementing backend code, read these documents and keep changes aligned with them.

## Project Skills And Agents

Project-local skills live in:

```text
.agents/skills/
```

Project agent role prompts live in:

```text
.agents/agents/
```

Before planning, specifying, implementing, or reviewing a feature, check this routing table and read the matching `SKILL.md`.

| Task | Skill | Agent Role |
|---|---|---|
| Generate or implement DDD/NestJS API slice | `.agents/skills/servicehub-ddd-api/SKILL.md` | `.agents/agents/feature-implementer.md` |
| Review requirements or feature spec before implementation | `.agents/skills/servicehub-requirements-review/SKILL.md` | `.agents/agents/business-analyst.md` |
| Review business behavior against stakeholder expectations | `.agents/skills/servicehub-stakeholder-review/SKILL.md` | `.agents/agents/stakeholder.md` |
| Review or design tests | `.agents/skills/servicehub-tester-review/SKILL.md` | `.agents/agents/tester.md` |
| Review architecture, layering, transactions, module boundaries | `.agents/skills/servicehub-architect-review/SKILL.md` | `.agents/agents/architect.md` |

For feature work, default sequence:

```text
requirements review
architecture review
implementation
tester review
stakeholder review
```

Do not treat these roles as optional when the task matches their scope.

## Development Method

Use SDD: Spec-Driven Development.

For every meaningful implementation step, write the specification before writing code.

The specification can be a separate document or a dedicated section in the engineering note for that step.

Preferred location:

```text
docs/engineering-notes/NN-topic-name.md
```

Each step specification should define:

```text
goal
scope
out of scope
domain rules
API endpoints, if any
data model changes, if any
use cases
authorization rules
validation rules
transaction boundaries
events or background jobs, if any
tests to add
manual verification command
```

Do not start implementation until the step specification is clear enough to guide the code.

If a requirement is ambiguous, make a conservative assumption and document it in the specification.

## Architecture Rules

Use a modular monolith.

Keep the main backend layers separate:

```text
api
application
domain
infra
db
contract
config
```

Follow these dependency rules:

```text
api -> application -> domain
application -> domain
infra -> domain
db -> infra
```

Do not put business logic in controllers.

Controllers should:

```text
validate request DTOs
resolve the authenticated actor
call one application use case
map the use case result to an HTTP response
```

Use cases should:

```text
coordinate workflows
load required data
call domain policies/services
control transactions when needed
persist changes through repository interfaces
create outbox events when needed
return application-level results
```

Domain code should:

```text
contain business rules
be framework-agnostic TypeScript
not import NestJS
not import TypeORM decorators or entity classes
not import BullMQ
```

Domain models should:

```text
represent business objects, value objects, or shared business vocabulary
not be used as a generic constants folder
avoid presentation-only labels or technical configuration values
```

Infrastructure code should:

```text
implement repositories
translate TypeORM entities to domain models
contain database queries
contain Redis/BullMQ adapters
contain notification and external integration adapters
```

TypeORM entities are persistence models, not domain models.

## Implementation Rules

Implement in small, reviewable steps.

Prefer this order unless the user asks otherwise:

```text
1. Project setup
2. Identity and authentication
3. Service catalog
4. Service requests
5. Triage workflow
6. Technicians
7. Scheduling and assignment
8. Technician job lifecycle
9. Inventory and materials
10. Outbox and notifications
11. SLA jobs
12. Reports and read models
13. Audit logs and hardening
```

For each step:

```text
read the relevant docs first
write or update the step specification before editing code
explain the intended implementation briefly before editing
keep code scoped to the current step
add focused tests when behavior is implemented
update or create an engineering note for the step
verify the change with the smallest useful command
```

Do not add frontend code unless explicitly requested.

Do not add Kafka, Kubernetes, GraphQL, microservices, event sourcing, real SMS/email providers, real geocoding, or payment processing in the MVP.

## Engineering Notes Rule

Every meaningful implementation step must create or update a separate engineering note.

Engineering notes live in:

```text
docs/engineering-notes/
```

Use this naming pattern:

```text
docs/engineering-notes/NN-topic-name.md
```

Examples:

```text
docs/engineering-notes/01-project-setup.md
docs/engineering-notes/02-identity-auth.md
docs/engineering-notes/03-service-catalog.md
docs/engineering-notes/04-service-requests.md
```

Each engineering note should explain:

```text
what was built
why it was needed
which files were added or changed
how data flows through the layers
which backend concepts are demonstrated
how to run or test the step
what tradeoffs were made
what should be improved later
```

Keep the explanation practical. The document should explain the backend concept and implementation decisions, not just list changed files.

## Testing Rules

Use tests according to risk.

Do not add tests that only assert static constants, enums, type aliases, or
object literals equal their declared values. Test behavior, business rules,
validation, persistence constraints, transaction outcomes, or integration risks
instead.

Prefer:

```text
unit tests for domain policies and services
unit tests for use cases with mocked repositories
integration tests for TypeORM repositories and transactions
API e2e tests for protected workflows
```

High-priority behavior to test:

```text
customer cannot read another customer's request
technician cannot complete someone else's assignment
dispatcher can assign technician
technician cannot be double-booked
Other service type cannot be assigned before triage
completed request cannot be cancelled
inventory cannot go below zero
outbox event is processed once
```

## Code Style Rules

Prefer explicit, readable code over clever abstractions.

Use clear names:

```text
CreateServiceRequestUseCase
AssignTechnicianUseCase
TechnicianEligibilityPolicy
ServiceRequestTypeOrmRepository
```

Keep DTOs, domain models, and database entities separate.

Avoid generic helper abstractions until duplication is real and obvious.

Add comments only when they explain non-obvious business or transactional behavior.

## Skills Guidance

Do not create a custom Codex skill at the start of the project.

A skill is useful only after a repeated workflow becomes stable.

Possible future skills:

```text
create-ddd-use-case
create-nest-resource
create-typeorm-entity-and-migration
create-engineering-note
create-api-e2e-test
```

For now, keep the workflow in this `AGENTS.md` file. If the project starts repeating the same scaffolding patterns, extract them into a dedicated skill later.
