# 09 - Admin Service Catalog Management

## Goal

Allow admins to create and update service catalog categories and service types so operational metadata can change without a database migration.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
09 - Admin Service Catalog Management
```

## Scope

In scope:

```text
admin-only category creation
admin-only category updates
admin-only service type creation
admin-only service type updates
category and service type uniqueness checks
active SLA policy and active skill reference validation
required skill replacement for service types
focused unit and API e2e tests
```

## Out Of Scope

```text
admin CRUD for skills
admin CRUD for SLA policies
audit log rows
outbox events
customer-visible catalog changes beyond existing read API behavior
bulk import/export
deleting catalog rows
```

Audit and outbox writes are intentionally out of scope because audit log and outbox foundations are planned later in the roadmap.

## Roles

```text
admin
dispatcher
customer
technician
```

Only admins can mutate the catalog. Other authenticated roles are included for forbidden-path tests.

## API Endpoints

```text
POST /api/v1/admin/service-catalog/categories
PATCH /api/v1/admin/service-catalog/categories/:categoryId
POST /api/v1/admin/service-catalog/service-types
PATCH /api/v1/admin/service-catalog/service-types/:serviceTypeId
```

### POST /api/v1/admin/service-catalog/categories

Role access:

```text
admin
```

Request DTO:

```json
{
  "code": "ELECTRICAL",
  "name": "Electrical",
  "description": "Electrical repair and maintenance services.",
  "isActive": true
}
```

Response DTO:

```json
{
  "data": {
    "id": "uuid",
    "code": "ELECTRICAL",
    "name": "Electrical",
    "description": "Electrical repair and maintenance services.",
    "isActive": true
  }
}
```

Status codes:

```text
201 created
400 validation error
401 unauthenticated
403 non-admin role
409 duplicate category code
```

### PATCH /api/v1/admin/service-catalog/categories/:categoryId

Role access:

```text
admin
```

Request DTO:

```json
{
  "name": "Electrical Services",
  "description": "Updated description.",
  "isActive": false
}
```

Response DTO:

```json
{
  "data": {
    "id": "uuid",
    "code": "ELECTRICAL",
    "name": "Electrical Services",
    "description": "Updated description.",
    "isActive": false
  }
}
```

Status codes:

```text
200 updated
400 validation error
401 unauthenticated
403 non-admin role
404 category not found
```

Category code is immutable after creation.

### POST /api/v1/admin/service-catalog/service-types

Role access:

```text
admin
```

Request DTO:

```json
{
  "categoryId": "uuid",
  "slaPolicyId": "uuid",
  "code": "OUTLET_REPAIR",
  "name": "Outlet repair",
  "description": "Repair or replace a faulty electrical outlet.",
  "defaultPriority": "normal",
  "estimatedDurationMinutes": 60,
  "isOther": false,
  "isActive": true,
  "requiredSkillIds": ["uuid"]
}
```

Response DTO:

```json
{
  "data": {
    "id": "uuid",
    "categoryId": "uuid",
    "slaPolicyId": "uuid",
    "code": "OUTLET_REPAIR",
    "name": "Outlet repair",
    "description": "Repair or replace a faulty electrical outlet.",
    "defaultPriority": "normal",
    "estimatedDurationMinutes": 60,
    "isOther": false,
    "isActive": true,
    "requiredSkillIds": ["uuid"]
  }
}
```

Status codes:

```text
201 created
400 validation error
401 unauthenticated
403 non-admin role
404 active category, active SLA policy, or active skill not found
409 duplicate service type code inside category
409 second Other service type inside category
```

### PATCH /api/v1/admin/service-catalog/service-types/:serviceTypeId

Role access:

```text
admin
```

Request DTO:

```json
{
  "slaPolicyId": "uuid",
  "name": "Outlet and switch repair",
  "description": null,
  "defaultPriority": "high",
  "estimatedDurationMinutes": 75,
  "isOther": false,
  "isActive": false,
  "requiredSkillIds": ["uuid"]
}
```

Response DTO:

```json
{
  "data": {
    "id": "uuid",
    "categoryId": "uuid",
    "slaPolicyId": "uuid",
    "code": "OUTLET_REPAIR",
    "name": "Outlet and switch repair",
    "description": null,
    "defaultPriority": "high",
    "estimatedDurationMinutes": 75,
    "isOther": false,
    "isActive": false,
    "requiredSkillIds": ["uuid"]
  }
}
```

Status codes:

```text
200 updated
400 validation error
401 unauthenticated
403 non-admin role
404 service type, active SLA policy, or active skill not found
409 second Other service type inside category
```

Service type category and code are immutable after creation.

## Data Model Changes

Tables/entities:

```text
none
```

Existing tables used:

```text
service_categories
service_types
service_type_required_skills
skills
sla_policies
```

Existing constraints relied on:

```text
unique service_categories.code
unique service_types(category_id, code)
unique service_types(category_id) where is_other = true
service_type_required_skills primary key(service_type_id, skill_id)
service_types estimated_duration_minutes > 0
service_types default_priority check
```

## Domain Rules

```text
only admins can mutate service catalog metadata
category code is normalized to uppercase and must be unique
category code cannot be changed after creation
service type code is normalized to uppercase and must be unique inside its category
service type code and category cannot be changed after creation
service type must reference an active category when created
service type must reference an active SLA policy
service type required skills must reference active skills
required skill ids are treated as a set and duplicate ids are ignored
only one Other service type can exist per category
estimated duration must be positive
default priority must be one of low, normal, high, urgent
deactivation is soft; rows are not deleted
```

## Domain Models

```text
ServiceCategory
ServiceType
```

`ServiceCategory` owns category metadata used by write-side admin workflows:

```text
id
code
name
description
isActive
```

`ServiceType` owns service type metadata used by write-side admin workflows:

```text
id
categoryId
slaPolicyId
code
name
description
defaultPriority
estimatedDurationMinutes
isOther
isActive
requiredSkillIds
```

The admin repository returns domain models, not TypeORM entities, API DTOs, or
anonymous persistence records. TypeORM mapping stays in infra.

## Application Use Cases

```text
CreateServiceCategoryUseCase
UpdateServiceCategoryUseCase
CreateServiceTypeUseCase
UpdateServiceTypeUseCase
```

### CreateServiceCategoryUseCase

Input:

```text
code
name
description
isActive
```

Output:

```text
ServiceCategoryAdminSummary
```

Loaded data:

```text
category by normalized code
```

Repositories used:

```text
ServiceCatalogAdminRepository
```

Repository result:

```text
ServiceCategory
```

### UpdateServiceCategoryUseCase

Input:

```text
categoryId
name
description
isActive
```

Output:

```text
ServiceCategoryAdminSummary
```

Loaded data:

```text
category by id
```

Repositories used:

```text
ServiceCatalogAdminRepository
```

Repository result:

```text
ServiceCategory
```

### CreateServiceTypeUseCase

Input:

```text
categoryId
slaPolicyId
code
name
description
defaultPriority
estimatedDurationMinutes
isOther
isActive
requiredSkillIds
```

Output:

```text
ServiceTypeAdminSummary
```

Loaded data:

```text
active category
active SLA policy
active skills
existing service type code inside category
existing Other service type inside category when isOther is true
```

Repositories used:

```text
ServiceCatalogAdminRepository
```

Repository result:

```text
ServiceType
```

### UpdateServiceTypeUseCase

Input:

```text
serviceTypeId
slaPolicyId
name
description
defaultPriority
estimatedDurationMinutes
isOther
isActive
requiredSkillIds
```

Output:

```text
ServiceTypeAdminSummary
```

Loaded data:

```text
service type by id
active SLA policy when changing SLA
active skills when replacing required skills
existing Other service type inside category when setting isOther true
```

Repositories used:

```text
ServiceCatalogAdminRepository
```

Repository result:

```text
ServiceType
```

## Transaction Boundaries

Category creation and update:

```text
service_categories row
```

Service type creation:

```text
service_types row
service_type_required_skills rows
```

Service type update:

```text
service_types row
service_type_required_skills rows when requiredSkillIds is provided
```

Service type writes must execute in one database transaction so a service type cannot be saved with a partial required-skill set.

## Events And Background Jobs

```text
none
```

Audit and outbox events are deferred until their roadmap foundations exist.

## Authorization Rules

```text
JwtAuthGuard requires authentication
RolesGuard requires admin role
repository does not decide actor permissions
```

## Validation Rules

```text
uuid path parameters must be valid UUIDs
code is required on create, trimmed, uppercased, and limited to letters, numbers, and underscores
name is required on create and must not be blank
description is optional and may be null
isActive defaults to true on create
category update must include at least one mutable field
service type create requires categoryId, slaPolicyId, code, name, defaultPriority, estimatedDurationMinutes, isOther, and requiredSkillIds
service type update must include at least one mutable field
estimatedDurationMinutes must be a positive integer
requiredSkillIds must be an array of UUIDs
```

## Test Plan

Unit:

```text
CreateServiceCategoryUseCase rejects duplicate category code
UpdateServiceCategoryUseCase rejects missing category
CreateServiceTypeUseCase rejects inactive/missing references
CreateServiceTypeUseCase replaces duplicate skill ids with a set
UpdateServiceTypeUseCase replaces required skills in one command
```

Integration/API:

```text
admin can create category
dispatcher cannot create category
duplicate category code returns 409
admin can create service type with required skills
admin can deactivate service type
service type creation rejects inactive skill or SLA policy
invalid UUID path parameter returns 400
```

## Manual Verification

```bash
npm run typecheck
npm test -- service-catalog-admin
npm run test:e2e -- service-catalog-admin
```

## Rollout Notes

```text
no migration required
existing seeded SLA policies and skills are used by service type admin endpoints
deactivated categories and service types are hidden by the existing customer/dispatcher read API
```

## Open Questions

```text
none
```
