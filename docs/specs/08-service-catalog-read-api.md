# 08 - Service Catalog Read API

## Goal

Expose active service catalog metadata so customers and operations users can choose valid service categories and service types before creating or triaging service requests.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
08 - Service Catalog Read API
```

## Scope

In scope:

```text
GET /api/v1/service-catalog/categories
GET /api/v1/service-catalog/categories/:categoryId/service-types
query use cases for active catalog reads
infra read query over TypeORM catalog entities
response DTO mapping
role-based API access
focused unit and e2e tests
engineering note
```

## Out Of Scope

```text
admin catalog management
creating or updating catalog rows
returning inactive catalog rows
service request creation
customer addresses
pagination and search
SLA calculation
required skill management
```

## Roles

```text
customer
dispatcher
technician
admin
```

## API Endpoints

### GET /api/v1/service-catalog/categories

Role access:

```text
customer
dispatcher
technician
admin
```

Request DTO:

```text
none
```

Response DTO:

```json
{
  "data": [
    {
      "id": "uuid",
      "code": "HVAC",
      "name": "HVAC",
      "description": "Heating, ventilation, and air conditioning services."
    }
  ]
}
```

Status codes:

```text
200 success
401 unauthenticated
403 authenticated actor lacks an allowed role
```

### GET /api/v1/service-catalog/categories/:categoryId/service-types

Role access:

```text
customer
dispatcher
admin
```

Technicians do not need this endpoint for the MVP because they receive already-classified assignments later.

Request DTO:

```text
categoryId path param, UUID
```

Response DTO:

```json
{
  "data": [
    {
      "id": "uuid",
      "categoryId": "uuid",
      "code": "AC_NOT_COOLING",
      "name": "Air conditioner does not cool",
      "description": "The air conditioner runs but does not reduce room temperature.",
      "defaultPriority": "normal",
      "estimatedDurationMinutes": 90,
      "isOther": false,
      "slaPolicy": {
        "id": "uuid",
        "code": "STANDARD_24H",
        "name": "Standard 24 Hour Response"
      },
      "requiredSkills": [
        {
          "id": "uuid",
          "code": "HVAC_REPAIR",
          "name": "HVAC Repair"
        }
      ]
    }
  ]
}
```

Status codes:

```text
200 success
400 categoryId is not a UUID
401 unauthenticated
403 authenticated actor lacks an allowed role
404 category does not exist or is inactive
```

## Data Model Changes

```text
none
```

Reads use existing tables from `07-service-catalog-schema-seeds.md`:

```text
service_categories
service_types
service_type_required_skills
skills
sla_policies
```

## Domain Rules

```text
only active categories are listed
only active service types for an active category are listed
inactive skills are not returned as required skills
service types are ordered by name
categories are ordered by name
Other service types are returned because customers need them when they cannot classify a problem
```

## Application Use Cases

```text
ListServiceCategoriesUseCase
ListServiceTypesUseCase
```

`ListServiceCategoriesUseCase`:

```text
input: none
output: active category summaries
loaded data: active service_categories
domain policies: none
repositories/queries: ServiceCatalogReadQuery
```

`ListServiceTypesUseCase`:

```text
input: categoryId
output: active service type summaries with SLA policy and required skills
loaded data: active service category, active service_types, SLA policies, active skills
domain policies: none
repositories/queries: ServiceCatalogReadQuery
```

## Repository Interfaces

This read-only slice uses an infra query rather than a domain repository:

```text
ServiceCatalogReadQuery
```

Methods:

```text
listActiveCategories()
activeCategoryExists(categoryId)
listActiveServiceTypes(categoryId)
```

## Transaction Boundaries

```text
none
```

No state changes occur.

## Events And Background Jobs

```text
none
```

## Authorization Rules

```text
both endpoints require an authenticated actor
category list allows customer, dispatcher, technician, and admin
service type list allows customer, dispatcher, and admin
technician receives 403 for service type list
```

## Validation Rules

```text
categoryId must be a UUID
unknown category returns 404
inactive category returns 404
```

## Test Plan

Unit:

```text
ListServiceCategoriesUseCase returns query results
ListServiceTypesUseCase returns query results for active category
ListServiceTypesUseCase throws not found when category is absent or inactive
ServiceCatalogController maps use case results to response DTOs
```

Integration/API:

```text
unauthenticated catalog reads return 401
allowed roles can list active categories
technician can list categories
technician cannot list service types
inactive categories are hidden
service types are filtered by category
inactive service types are hidden
inactive skills are hidden from requiredSkills
unknown category returns 404
invalid categoryId returns 400
```

## Manual Verification

```bash
npm run typecheck
npm test -- --runTestsByPath src/application/use-cases/queries/list-service-categories/list-service-categories.use-case.spec.ts src/application/use-cases/queries/list-service-types/list-service-types.use-case.spec.ts src/api/http/service-catalog.controller.spec.ts
npm run test:e2e -- --runTestsByPath test/service-catalog.e2e-spec.ts
```

## Rollout Notes

```text
Requires migration 1781160003000-ServiceCatalogSchemaSeeds to be applied.
No backward compatibility risk because these are new endpoints.
```

## Open Questions

```text
none
```
