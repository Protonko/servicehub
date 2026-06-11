---
name: servicehub-requirements-review
description: Review ServiceHub requirements, feature roadmap items, feature specs, API contracts, database design, and scope before implementation. Use when validating whether a proposed feature spec is complete, consistent with product requirements, correctly scoped, and ready for engineering.
---

# ServiceHub Requirements Review

## Inputs To Read

Read only what is relevant, but start from:

```text
docs/REQUIREMENTS.md
docs/specs/00-feature-roadmap.md
current docs/specs/NN-feature-name.md
docs/design/API_ENDPOINTS.md
docs/design/DATABASE_SCHEMA.md
docs/design/SERVICE_INTERACTIONS.md
```

For output format and depth, read `references/golden-requirements-review.md`.

## Review Goal

Act as a requirements reviewer before implementation.

Check whether the feature spec answers:

```text
what problem is solved
who uses it
which workflow it belongs to
what is explicitly out of scope
which business rules apply
which data must exist before it works
which downstream features depend on it
how success will be verified
```

## Review Checklist

Scope:

```text
feature is small enough for one implementation step
dependencies are listed
out of scope is explicit
no unrelated future behavior is included
```

Business rules:

```text
actor permissions are explicit
ownership rules are explicit
state transitions are explicit
error cases are explicit
edge cases from REQUIREMENTS.md are covered
```

API contract:

```text
endpoints match docs/design/API_ENDPOINTS.md or intentional differences are explained
request/response DTOs are defined
status codes are defined
pagination/filtering are defined when applicable
```

Data:

```text
tables/entities affected are listed
constraints and indexes are considered
transaction boundaries are defined for writes
seed data requirements are listed
```

Testing:

```text
positive tests exist
authorization tests exist
invalid state tests exist
transaction/concurrency tests exist when needed
manual verification is possible
```

## Output Format

Return:

```text
Decision: ready | needs changes | blocked

Findings:
- [severity] file/section: issue and why it matters

Required changes:
- concrete change

Open questions:
- concise question
```

Severity:

```text
blocking: implementation should not start
major: likely behavior or design issue
minor: clarity or completeness issue
```

Do not rewrite the entire spec unless asked. Prefer targeted findings.
