# 13a - Infra Read Query Structure

## Goal

Standardize existing TypeORM read-query implementations around the structure established by the service-request read model: query execution, raw row types, and read-model mapping live in separate files inside a feature-specific directory.

## Scope

In scope:

```text
move service catalog read-query files under src/infra/queries/service-catalog
move service area read-query files under src/infra/queries/service-area
extract raw TypeORM row interfaces into *-read.types.ts files
extract raw-row to application read-model conversion into *-read.mapper.ts files
update InfraModule imports
preserve existing query interfaces and observable behavior
```

## Out Of Scope

```text
API contract changes
application read-model changes
new filters or pagination
SQL behavior or ordering changes
database schema or migration changes
authorization changes
transactions, events, or background jobs
```

## Roles And Authorization

No authorization behavior changes. Existing controller and use-case rules from:

```text
docs/specs/08-service-catalog-read-api.md
docs/specs/10-service-areas-customer-addresses.md
```

remain authoritative.

## API Endpoints And DTOs

No endpoint or DTO changes. The affected reads continue to support:

```text
GET /api/v1/service-catalog/categories
GET /api/v1/service-catalog/categories/:categoryId/service-types
GET /api/v1/service-areas
```

## Data Model Changes

```text
none
```

## Domain Rules

Existing behavior must remain unchanged:

```text
only active categories, service types, skills, and service areas are returned
categories, service types, skills, and service areas retain their existing ordering
service type join rows are aggregated into one item with requiredSkills
database numeric values are converted to JavaScript numbers by the mapper
```

## Use Cases And Query Interfaces

No changes to application use cases or these interfaces:

```text
ServiceCatalogReadQuery
ServiceAreaReadQuery
```

TypeORM implementations continue to execute the queries. Raw database row interfaces describe selected aliases without leaking into the application layer. Feature mappers convert rows into application read models and perform join-row aggregation.

## Validation Rules

No validation changes.

## Transaction Boundaries

```text
none
```

All affected operations are reads.

## Events And Background Jobs

```text
none
```

## Tests To Add Or Preserve

No new business behavior is introduced. Existing tests must continue to prove:

```text
catalog active-row filtering and required-skill aggregation
catalog role and not-found behavior
active service-area listing
application use-case contracts
```

Static row interfaces are not tested directly.

## Manual Verification

```bash
npm run typecheck
npm test -- --runInBand
npm run test:e2e -- --runInBand test/__tests__/service-catalog.e2e-spec.ts test/__tests__/customer-addresses.e2e-spec.ts
```

## Open Questions

```text
none
```

## References

```text
docs/REQUIREMENTS.md
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_PLAN.md
docs/design/DATABASE_SCHEMA.md
docs/design/API_ENDPOINTS.md
docs/design/SERVICE_INTERACTIONS.md
docs/specs/08-service-catalog-read-api.md
docs/specs/10-service-areas-customer-addresses.md
docs/specs/13-request-read-models.md
```
