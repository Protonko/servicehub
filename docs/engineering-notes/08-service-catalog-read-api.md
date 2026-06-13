# 08 - Service Catalog Read API

## What Was Built

This step adds authenticated read endpoints for the active service catalog:

```text
GET /api/v1/service-catalog/categories
GET /api/v1/service-catalog/categories/:categoryId/service-types
```

The endpoints return active categories and active service types with SLA policy and required skill summaries.

## Why It Was Needed

Customers need catalog metadata before creating a service request. Dispatchers and admins also need the same metadata for later triage and management workflows.

This slice keeps catalog reads separate from catalog management. It exposes stable lookup endpoints without adding create/update behavior.

## Files Added Or Changed

```text
docs/specs/08-service-catalog-read-api.md
docs/specs/00-feature-roadmap.md
docs/engineering-notes/08-service-catalog-read-api.md
src/api/http/service-catalog.controller.ts
src/api/http/service-catalog.controller.spec.ts
src/api/http/dto/service-catalog.dto.ts
src/api/http/api-http.module.ts
src/application/queries/service-catalog-read.query.ts
src/application/read-models/service-catalog.ts
src/application/read-models/index.ts
src/application/errors/service-catalog.errors.ts
src/application/errors/index.ts
src/application/use-cases/queries/list-service-categories/list-service-categories.use-case.ts
src/application/use-cases/queries/list-service-categories/list-service-categories.use-case.spec.ts
src/application/use-cases/queries/list-service-types/list-service-types.use-case.ts
src/application/use-cases/queries/list-service-types/list-service-types.use-case.spec.ts
src/application/use-cases/index.ts
src/application/use-cases.module.ts
src/infra/queries/service-catalog.typeorm-read-query.ts
src/infra/infra.module.ts
test/service-catalog.e2e-spec.ts
```

## Data Flow Through The Layers

Category list flow:

```text
ServiceCatalogController
  -> ListServiceCategoriesUseCase
  -> ServiceCatalogReadQuery
  -> TypeORM query over service_categories
  -> response DTO
```

Service type list flow:

```text
ServiceCatalogController
  -> ListServiceTypesUseCase
  -> ServiceCatalogReadQuery.activeCategoryExists
  -> ServiceCatalogReadQuery.listActiveServiceTypes
  -> TypeORM query over service_types, sla_policies, required skills, skills
  -> response DTO
```

Controllers own HTTP concerns and role guards. Use cases coordinate the read workflow and not-found behavior. Infrastructure owns TypeORM joins and row mapping. TypeORM entities are not returned from the API.

## Why This Uses A Read Query Instead Of A Repository

This feature intentionally uses:

```text
ListServiceTypesUseCase
  -> ServiceCatalogReadQuery
  -> ServiceCatalogTypeOrmReadQuery
```

instead of:

```text
ListServiceTypesUseCase
  -> ServiceCatalogRepository
```

The important distinction is not simply:

```text
read = query
write = repository
```

That rule is too rough.

The better distinction is:

```text
Repository = use case needs a business object for business decisions
Read query = use case needs a ready-made read model for display/API response
```

For example, `UserRepository.findById()` may only read from the database, but it still belongs in a repository because the caller wants a user as a system object:

```text
check whether the user is active
inspect roles
verify login state
assign or check permissions later
```

The fact that the method is a read method is not the deciding factor. The deciding factor is that the use case is working with `User` as a business/application object.

The service catalog read API is different. The API needs a shape that is convenient for clients:

```text
service type
  + SLA policy summary
  + required skill summaries
```

That shape is assembled from several tables:

```text
service_types
sla_policies
service_type_required_skills
skills
```

The use case is not asking for a catalog object that will make business decisions. It is asking for a ready-made view of active catalog data. The infra query owns the SQL join and maps rows into that read model.

This differs from user persistence. User workflows use a repository because they involve business operations and state changes:

```text
RegisterCustomerUseCase
  -> UserRepository
  -> UserTypeOrmRepository
```

Registration needs to create a user, assign a role, enforce unique email, hash a password, and persist state. That is business persistence, so hiding TypeORM behind a repository interface is useful.

The flow shape can look almost identical:

```text
UseCase -> Repository -> DB
UseCase -> ReadQuery -> DB
```

The difference is the meaning of the dependency:

```text
Repository says: give me or save a business object.
ReadQuery says: give me a prepared read model.
```

Service catalog is still a real business concept. It just does not need a domain model for this endpoint yet. When admin catalog management arrives, it may add a repository for operations like:

```text
create service type
change SLA policy
deactivate category
replace required skills
```

That repository can exist next to the current read query:

```text
Admin write workflow -> ServiceCatalogRepository
Customer/dispatcher lookup -> ServiceCatalogReadQuery
```

So adding a future catalog domain model does not mean this read query must be deleted. They serve different use cases.

## Backend Concepts Demonstrated

This step demonstrates:

```text
CQRS-lite read query for lookup data
role-protected catalog endpoints
active-only read filtering
path UUID validation
application error mapped to HTTP 404
DTO mapping separate from persistence entities
PostgreSQL-backed e2e coverage for read behavior
```

## How To Run Or Test The Step

Focused unit tests:

```bash
npm test -- --runTestsByPath src/application/use-cases/queries/list-service-categories/list-service-categories.use-case.spec.ts src/application/use-cases/queries/list-service-types/list-service-types.use-case.spec.ts src/api/http/service-catalog.controller.spec.ts
```

Focused e2e test:

```bash
npm run test:e2e -- --runTestsByPath test/service-catalog.e2e-spec.ts
```

General verification:

```bash
npm run typecheck
npm run lint
npm test
```

## Tradeoffs

This slice uses an infra read query instead of a domain repository. The endpoints are read-only lookup views, and no domain invariant is changed by returning active catalog metadata.

The list endpoints do not paginate. The MVP catalog is expected to be small enough for complete active lookup lists, and pagination can be added later if admin-managed catalog size grows.

Inactive categories are treated as not found for service type reads. This avoids exposing inactive operational metadata to customers or technicians.

## Improvements Later

Future steps should add:

```text
admin catalog management endpoints
service request creation using active catalog validation
triage workflow that reclassifies Other requests
optional catalog search/pagination if catalog size grows
```
