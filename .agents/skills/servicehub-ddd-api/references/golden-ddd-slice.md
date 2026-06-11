# Golden DDD Implementation Slice

Use this as the target shape for one ServiceHub feature implementation.

## Expected File Shape

```text
src/
  api/
    http/
      feature.controller.ts
      dto/
        request.dto.ts
        response.dto.ts
  application/
    use-cases/
      commands/
        feature/
          feature.use-case.ts
          feature.use-case.spec.ts
      queries/
        feature/
          feature-query.use-case.ts
  domain/
    model/
      aggregate.ts
    policies/
      feature.policy.ts
      feature.policy.spec.ts
    exceptions/
      feature.exception.ts
    events/
      feature.event.ts
  infra/
    repositories/
      aggregate.typeorm-repository.ts
    queries/
      feature.query.ts
  db/
    entities/
      aggregate.entity.ts
    migrations/
      timestamp-feature.ts
```

Use only the folders needed by the feature.

## Golden Command Flow

```text
Controller
  validates DTO
  resolves authenticated actor
  calls UseCase.execute()

UseCase
  loads aggregate through repository interface
  checks authorization/ownership if resource-specific
  calls domain policy
  opens transaction when changing state
  persists through repository
  writes audit/outbox if business state changed
  returns application result

Repository implementation
  uses TypeORM
  maps Entity <-> Domain model
  does not make business decisions
```

## Golden Query Flow

```text
Controller
  validates query DTO
  resolves actor
  calls QueryUseCase.execute()

QueryUseCase
  checks actor visibility
  calls infra query
  returns read model

Infra query
  uses TypeORM query builder or raw SQL
  returns DTO/read model
```

## Required Tests

For write features:

```text
domain policy unit tests
use case tests
API authorization tests
transaction/integration tests if multiple rows change
```

For read features:

```text
visibility tests
filter tests
pagination tests when applicable
```

For risky features:

```text
double booking
inventory below zero
outbox idempotency
SLA breach recorded once
```

## Red Flags

```text
controller contains business branching
domain imports NestJS or TypeORM
repository checks current user role
TypeORM entity returned as response
use case catches and hides domain errors
transaction missing audit/outbox side effects
```
