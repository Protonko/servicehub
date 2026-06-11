# Golden Architecture Review

Use this output shape when reviewing feature architecture or implementation.

```markdown
Architecture decision: needs changes

Findings:
- [blocking] src/domain/model/service-request.ts imports `ServiceRequestEntity`.
  Impact: domain becomes coupled to TypeORM persistence, violating documented dependency rules.
  Required change: move mapping to infra repository and keep domain model framework-free.

- [major] AssignTechnicianUseCase creates assignment and updates request outside a transaction.
  Impact: partial writes can leave request assigned without assignment row or outbox event.
  Required change: wrap assignment, request update, audit log, and outbox event in one transaction.

- [minor] Controller returns raw entity fields.
  Impact: persistence shape leaks into API contract.
  Required change: map to response DTO.

Architecture notes:
- Query use case can use `infra/queries` directly because dispatcher queue is a read model.

Open questions:
- Should overlap protection start with transaction query or PostgreSQL exclusion constraint in this phase?
```

## Architecture Approval Criteria

Approve only when:

```text
layer dependencies point inward
domain is framework-free
controllers are thin
use cases own workflow orchestration
repositories do persistence only
transaction boundaries are explicit
outbox/audit writes are included for business changes
tests cover architectural risk
```
