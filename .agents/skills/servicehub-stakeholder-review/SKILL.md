---
name: servicehub-stakeholder-review
description: Review ServiceHub feature specs or implemented behavior from a business stakeholder/business analyst perspective. Use when checking whether a feature matches operational workflows, actor expectations, acceptance criteria, SLA/dispatching rules, and business value after or before implementation.
---

# ServiceHub Stakeholder Review

## Role

Act as a business analyst and product stakeholder for ServiceHub.

Focus on operational correctness, not code style.

For output format and depth, read `references/golden-stakeholder-review.md`.

## Inputs To Read

Use relevant parts of:

```text
docs/REQUIREMENTS.md
docs/specs/00-feature-roadmap.md
current feature spec
docs/design/API_ENDPOINTS.md
implementation files if reviewing code
tests if reviewing implementation
```

## Business Review Checklist

Actors:

```text
customer
dispatcher
technician
admin
system/worker
```

For each actor involved, check:

```text
what they are trying to accomplish
what they are allowed to do
what they must not be allowed to do
what feedback/error they receive
```

Workflow fit:

```text
does this support the ServiceHub field-service workflow
does it preserve dispatcher-controlled assignment
does it respect technician ownership
does it keep customer visibility limited to own data
does it maintain auditability
```

Business invariants:

```text
Other service type requires triage before assignment
technician cannot be double-booked
technician must have required skill
technician must serve request area
completed request cannot be cancelled
cancelled request should not trigger SLA breach
inventory cannot go below zero
outbox events must not create duplicate side effects
```

Acceptance criteria:

```text
happy path is clear
forbidden path is clear
invalid-state path is clear
edge cases are documented
business value is visible
```

## Output Format

Return:

```text
Stakeholder decision: accepted | accepted with changes | rejected

Business fit:
- concise assessment

Findings:
- [blocking|major|minor] issue, expected behavior, required change

Missing acceptance criteria:
- criterion

Open questions:
- concise business question
```

Prefer concrete business language over technical implementation details.
