# Golden Requirements Review

Use this output shape when reviewing a ServiceHub feature spec.

```markdown
Decision: needs changes

Findings:
- [blocking] docs/specs/12-create-service-request.md / Transaction Boundaries:
  The spec writes `service_requests` but does not include required skill snapshot, audit log, or outbox event. This violates the request creation workflow and would make downstream assignment and async processing incomplete.

- [major] docs/specs/12-create-service-request.md / Authorization Rules:
  Address ownership is not specified. A customer could create a request for another customer's address unless the use case checks ownership.

- [minor] docs/specs/12-create-service-request.md / Validation Rules:
  Preferred time window says "future" but does not define whether both start and end must be future or only start.

Required changes:
- Add `service_request_required_skills`, `audit_logs`, and `outbox_events` to the transaction.
- Add explicit address ownership rule.
- Define preferred window validation exactly.

Open questions:
- Should completion deadline be calculated from request creation or scheduled assignment time?
```

## Quality Bar

A requirements review should be:

```text
specific
grounded in docs
actionable
ordered by severity
not a rewrite of the spec
```

## Common Blocking Findings

```text
missing actor/role
missing ownership rule
missing transaction boundary
missing state transition rule
feature includes unrelated scope
endpoint contradicts API design without explanation
data model contradicts ERD without explanation
```
