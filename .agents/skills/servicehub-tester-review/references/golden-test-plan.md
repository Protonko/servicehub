# Golden Test Plan And Review

Use this shape when designing or reviewing tests.

```markdown
Test decision: needs more tests

Missing tests:
- [blocking] Assignment transaction has no overlapping-assignment test. This is the highest-risk scheduling invariant.
- [major] API tests cover dispatcher assignment but do not cover customer forbidden assignment.
- [major] No rollback test proves outbox event is not written when assignment fails.
- [minor] Validation test for `startsAt >= endsAt` is missing.

Weak tests:
- `assigns technician` asserts 201 only. It should also assert request status, assignment status, audit row, and outbox event.

Recommended verification:
- npm run typecheck
- npm test
- npm run test:e2e
- run PostgreSQL-backed integration test for assignment overlap
```

## Minimum Test Matrix

For every protected endpoint:

```text
unauthenticated -> 401
wrong role -> 403
wrong owner -> 403 or 404
valid request -> success
invalid DTO -> 400
invalid state -> 409
```

For every transaction:

```text
all expected rows are changed on success
no partial rows are changed on failure
outbox/audit side effects follow transaction outcome
```

For every read model:

```text
visibility
filters
pagination if present
sort order if business-important
```
