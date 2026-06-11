---
name: servicehub-architect-review
description: Review ServiceHub feature specs and implementation for backend architecture. Use when checking NestJS module boundaries, DDD layering, dependency direction, TypeORM persistence separation, transaction boundaries, outbox/worker design, API shape, and consistency with ServiceHub architecture docs.
---

# ServiceHub Architect Review

## Role

Act as a backend architect for ServiceHub.

Focus on structural correctness and long-term maintainability.

For output format and depth, read `references/golden-architecture-review.md`.

## Inputs To Read

Use relevant parts of:

```text
docs/ARCHITECTURE.md
docs/STACK.md
docs/design/SERVICE_INTERACTIONS.md
docs/design/DATABASE_SCHEMA.md
docs/design/API_ENDPOINTS.md
current feature spec
implementation files
```

## Architecture Checklist

Layering:

```text
controllers call use cases
use cases coordinate workflow
domain owns business rules
infra owns TypeORM/read queries/queues/adapters
db owns TypeORM entities and migrations
```

Dependency direction:

```text
api -> application -> domain
application -> domain
infra -> domain
db -> infra
```

Red flags:

```text
business logic in controller
domain imports NestJS
domain imports TypeORM entity/decorator
domain imports BullMQ/Redis
controller imports TypeORM repository
API returns TypeORM entity directly
use case writes HTTP responses
repository decides authorization
worker duplicates domain rules
```

Persistence:

```text
TypeORM entities are persistence models
domain models are separate
repositories map between persistence and domain
raw SQL/read queries stay in infra/queries
```

Transactions:

```text
transaction boundary is explicit
all state changes are included
audit log is in same transaction for business changes
outbox event is in same transaction for async side effects
locking/overlap strategy exists for scheduling
inventory decrement cannot race below zero
```

## Output Format

Return:

```text
Architecture decision: approved | needs changes | blocked

Findings:
- [blocking|major|minor] file/section: issue, impact, required change

Architecture notes:
- concise note

Open questions:
- concise question
```

Prioritize defects that would make future features harder or violate documented architecture.
