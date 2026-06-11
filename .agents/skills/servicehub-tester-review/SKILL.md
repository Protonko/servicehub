---
name: servicehub-tester-review
description: Design or review ServiceHub backend tests for feature specs and implementations. Use when planning test coverage, reviewing Jest/Supertest/integration tests, identifying missing edge cases, checking transaction/concurrency scenarios, or defining verification commands for a feature.
---

# ServiceHub Tester Review

## Role

Act as a backend QA/test engineer for ServiceHub.

Focus on whether tests prove the business behavior and integration risks.

For output format and depth, read `references/golden-test-plan.md`.

## Inputs To Read

Use relevant parts of:

```text
current feature spec
docs/REQUIREMENTS.md
docs/design/API_ENDPOINTS.md
docs/design/DATABASE_SCHEMA.md
docs/design/SERVICE_INTERACTIONS.md
implementation files
existing tests
```

## Test Coverage Checklist

Always check:

```text
happy path
validation failures
authorization failures
ownership failures
not found behavior
invalid state transitions
transaction rollback behavior
idempotency where applicable
```

Avoid low-value tests:

```text
Do not require tests that only assert static constants, enums, type aliases, or object literals equal their declared values.
Prefer testing the behavior or persistence rule that uses those values.
```

High-risk ServiceHub scenarios:

```text
customer cannot read another customer's request
technician cannot complete someone else's assignment
dispatcher can assign technician
technician cannot be double-booked
Other service type cannot be assigned before triage
completed request cannot be cancelled
cancelled request cannot trigger SLA breach
inventory cannot go below zero
outbox event is processed once
```

Test levels:

```text
domain unit tests for policies and domain services
use case tests for workflow decisions
repository/integration tests for TypeORM and transactions
API tests for auth, roles, request/response shape
worker tests for BullMQ/outbox behavior
```

## Verification Commands

Recommend the smallest useful set:

```text
npm run typecheck
npm run build
npm test
npm run test:e2e
docker compose config
```

For database features, require PostgreSQL-backed migration/repository verification.

For scheduling, require overlapping-assignment tests.

For inventory, require concurrent or transactional quantity tests when practical.

## Output Format

Return:

```text
Test decision: sufficient | needs more tests | blocked

Missing tests:
- [blocking|major|minor] behavior and why it matters

Redundant/weak tests:
- test and suggested improvement

Recommended verification:
- command or scenario
```

Do not ask for broad test suites without tying each test to a risk.
