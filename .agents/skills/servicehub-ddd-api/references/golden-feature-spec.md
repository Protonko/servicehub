# Golden Feature Spec

Use this as the target format for `docs/specs/NN-feature-name.md`.

```markdown
# NN - Feature Name

## Goal

Implement one clear business or technical capability.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
NN - Feature Name
```

## Scope

In scope:

```text
specific use cases
specific endpoints
specific tables/entities
specific policies
specific tests
```

## Out Of Scope

```text
future adjacent behavior
admin polish not needed now
unrelated refactors
real external providers
```

## Roles

```text
customer
dispatcher
technician
admin
system
```

Only list roles used by this feature.

## API Endpoints

```text
METHOD /api/v1/path
```

For each endpoint:

```text
role access
request DTO
response DTO
status codes
error cases
```

## Data Model Changes

Tables/entities:

```text
table_name
```

For each table:

```text
new columns
relations
constraints
indexes
migration notes
```

## Domain Rules

```text
business invariant
invalid transition
ownership rule
```

Rules must be testable.

## Application Use Cases

```text
FeatureNameUseCase
```

For each use case:

```text
input
output
loaded data
domain policies called
repositories used
```

## Transaction Boundaries

For writes, list all rows changed in one transaction:

```text
business row
audit log row
outbox event row
```

If no transaction is needed, explain why.

## Events And Background Jobs

```text
DomainEventName
QueueName
JobName
```

If none, state `none`.

## Authorization Rules

```text
role rule
ownership rule
resource visibility rule
```

## Validation Rules

```text
required field
format
range
foreign key existence
active/inactive checks
```

## Test Plan

Unit:

```text
domain policy
use case branch
```

Integration:

```text
repository
transaction
migration
```

API:

```text
happy path
401/403
404
409
validation 400
```

## Manual Verification

```bash
npm run typecheck
npm run build
npm test
npm run test:e2e
```

Add Docker/database commands when needed.

## Rollout Notes

```text
seed data required
migration order
compatibility notes
```

## Open Questions

```text
none
```

Use `none` only when there are no unresolved decisions.
```
