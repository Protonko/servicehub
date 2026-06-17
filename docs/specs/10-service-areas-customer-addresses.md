# 10 - Service Areas And Customer Addresses

## Goal

Represent operational service areas and customer-owned service addresses so later service requests can be created against a valid customer location.

This feature establishes the address ownership and service-area validation rules that `11-service-request-domain-model.md` and `12-create-service-request.md` will depend on.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
10 - Service Areas And Customer Addresses
```

## Scope

In scope:

```text
service_areas table
customer_addresses table
initial active service area seed data
GET /api/v1/service-areas
POST /api/v1/customer-addresses
GET /api/v1/customer-addresses
PATCH /api/v1/customer-addresses/:addressId
customer address ownership checks
active service area validation for address creation and service-area changes
domain model and repository interface for customer addresses
read query for active service areas
focused unit, migration, repository, and API e2e tests
```

## Out Of Scope

```text
admin service area create/update/delete endpoints
dispatcher/admin customer address management
default address selection
address deletion or archiving
geocoding, coordinates, map search, route optimization, or distance calculation
address verification with external providers
service request creation
technician service area assignment
audit log rows
outbox events
```

Conservative assumption:

```text
`docs/IMPLEMENTATION_PLAN.md` mentions service area admin management, but the current roadmap and API endpoint design only define `GET /api/v1/service-areas` for this slice. This spec seeds initial service areas and defers admin service-area CRUD to a later admin/settings feature.
```

Audit and outbox writes are intentionally out of scope because their foundations are planned later in the roadmap.

## Roles

```text
customer
dispatcher
technician
admin
```

All authenticated roles can read active service areas. Only customers can manage their own customer addresses in this slice.

## API Endpoints

```text
GET /api/v1/service-areas
POST /api/v1/customer-addresses
GET /api/v1/customer-addresses
PATCH /api/v1/customer-addresses/:addressId
```

### GET /api/v1/service-areas

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
      "code": "US_CA_SF_BAY",
      "name": "San Francisco Bay Area",
      "description": "San Francisco Bay Area operating zone."
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

### POST /api/v1/customer-addresses

Role access:

```text
customer
```

Request DTO:

```json
{
  "serviceAreaId": "uuid",
  "line1": "12 Rustaveli Avenue",
  "line2": "Apartment 14",
  "city": "Tbilisi",
  "postalCode": "0108",
  "notes": "Use the rear entrance."
}
```

Response DTO:

```json
{
  "data": {
    "id": "uuid",
    "customerId": "uuid",
    "serviceArea": {
      "id": "uuid",
      "code": "US_CA_SF_BAY",
      "name": "San Francisco Bay Area",
      "isActive": true
    },
    "line1": "12 Rustaveli Avenue",
    "line2": "Apartment 14",
    "city": "Tbilisi",
    "postalCode": "0108",
    "notes": "Use the rear entrance.",
    "createdAt": "2026-06-14T10:00:00.000Z",
    "updatedAt": "2026-06-14T10:00:00.000Z"
  }
}
```

Status codes:

```text
201 created
400 validation error
401 unauthenticated
403 non-customer role
404 active service area not found
```

### GET /api/v1/customer-addresses

Role access:

```text
customer
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
      "customerId": "uuid",
      "serviceArea": {
        "id": "uuid",
        "code": "US_CA_SF_BAY",
        "name": "San Francisco Bay Area",
        "isActive": true
      },
      "line1": "12 Rustaveli Avenue",
      "line2": "Apartment 14",
      "city": "Tbilisi",
      "postalCode": "0108",
      "notes": "Use the rear entrance.",
      "createdAt": "2026-06-14T10:00:00.000Z",
      "updatedAt": "2026-06-14T10:00:00.000Z"
    }
  ]
}
```

Status codes:

```text
200 success
401 unauthenticated
403 non-customer role
```

Response ordering:

```text
newest updatedAt first, then createdAt first
```

### PATCH /api/v1/customer-addresses/:addressId

Role access:

```text
customer owner
```

Request DTO:

```json
{
  "serviceAreaId": "uuid",
  "line1": "14 Rustaveli Avenue",
  "line2": null,
  "city": "Tbilisi",
  "postalCode": "0108",
  "notes": "Call on arrival."
}
```

All request fields are optional, but at least one field must be present.

Response DTO:

```json
{
  "data": {
    "id": "uuid",
    "customerId": "uuid",
    "serviceArea": {
      "id": "uuid",
      "code": "US_CA_SF_BAY",
      "name": "San Francisco Bay Area",
      "isActive": true
    },
    "line1": "14 Rustaveli Avenue",
    "line2": null,
    "city": "Tbilisi",
    "postalCode": "0108",
    "notes": "Call on arrival.",
    "createdAt": "2026-06-14T10:00:00.000Z",
    "updatedAt": "2026-06-14T10:05:00.000Z"
  }
}
```

Status codes:

```text
200 updated
400 validation error
401 unauthenticated
403 non-customer role
404 address not found or not owned by current customer
404 active service area not found
```

Cross-customer address access returns `404` rather than `403` so the API does not reveal whether another customer's address exists.

## Data Model Changes

Tables/entities:

```text
service_areas
customer_addresses
```

### service_areas

Columns:

```text
id uuid primary key default gen_random_uuid()
code varchar(80) not null
name varchar(160) not null
description text null
is_active boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

```text
unique(code)
code must not be blank after trim
name must not be blank after trim
```

Indexes:

```text
idx_service_areas_code unique
idx_service_areas_is_active
```

Migration notes:

```text
create table after users exist
seed at least two active service areas with stable codes
test fixtures may insert an inactive service area for rejection paths
```

Initial seed rows:

```text
US_CA_SF_BAY - San Francisco Bay Area
US_NY_NYC - New York City Metro
```

### customer_addresses

Columns:

```text
id uuid primary key default gen_random_uuid()
customer_id uuid not null references users(id)
service_area_id uuid not null references service_areas(id)
line1 varchar(240) not null
line2 varchar(240) null
city varchar(120) not null
postal_code varchar(40) null
notes text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

```text
line1 must not be blank after trim
city must not be blank after trim
```

Indexes:

```text
idx_customer_addresses_customer_id
idx_customer_addresses_service_area_id
```

Relations:

```text
customer_addresses.customer_id -> users.id
customer_addresses.service_area_id -> service_areas.id
```

Deletion behavior:

```text
restrict user deletion while customer addresses exist
restrict service area deletion while customer addresses exist
```

No uniqueness constraint is added for address text because duplicate-looking real-world addresses can still require different notes, units, or contact instructions.

## Domain Rules

```text
only active service areas are returned from GET /api/v1/service-areas
only an authenticated customer can create a customer address
a customer address always belongs to exactly one customer
a customer address always references exactly one service area
a new customer address must reference an active service area
updating a customer address serviceAreaId must reference an active service area
a customer can list only their own addresses
a customer can update only their own addresses
cross-customer address update returns not found
existing addresses remain stored if their service area is deactivated later
later service request creation must reject addresses whose service area is inactive at request creation time
```

## Application Use Cases

```text
ListServiceAreasUseCase
CreateCustomerAddressUseCase
ListCustomerAddressesUseCase
UpdateCustomerAddressUseCase
```

`ListServiceAreasUseCase`:

```text
input: none
output: active service area summaries
loaded data: active service_areas
domain policies: none
repositories/queries: ServiceAreaReadQuery
```

`CreateCustomerAddressUseCase`:

```text
input: actor user id, serviceAreaId, line1, line2, city, postalCode, notes
output: created CustomerAddressWithServiceArea domain composite
loaded data: active service area
domain policies: CustomerAddress ownership is assigned from authenticated customer actor
repositories/queries: ServiceAreaReadQuery, CustomerAddressRepository
```

`ListCustomerAddressesUseCase`:

```text
input: actor user id
output: customer-owned CustomerAddressWithServiceArea domain composites
loaded data: customer_addresses joined to service_areas
domain policies: address visibility is scoped by customer id
repositories/queries: CustomerAddressRepository
```

`UpdateCustomerAddressUseCase`:

```text
input: actor user id, addressId, optional serviceAreaId, optional address fields
output: updated CustomerAddressWithServiceArea domain composite
loaded data: address scoped to customer id, active service area if serviceAreaId changes
domain policies: customer owns address
repositories/queries: ServiceAreaReadQuery, CustomerAddressRepository
```

## Repository Interfaces

Read query:

```text
ServiceAreaReadQuery
```

Methods:

```text
listActiveServiceAreas()
activeServiceAreaExists(serviceAreaId)
```

Domain repository:

```text
CustomerAddressRepository
```

Methods:

```text
create(address)
findByIdForCustomer(addressId, customerId)
listForCustomer(customerId)
save(address)
```

The TypeORM implementation maps persistence entities to application/domain models. API controllers must not return TypeORM entities directly.

## Transaction Boundaries

`GET /api/v1/service-areas`:

```text
none
```

`GET /api/v1/customer-addresses`:

```text
none
```

`POST /api/v1/customer-addresses`:

```text
validate active service area
insert one customer_addresses row
```

No explicit multi-row transaction is required because only one business row changes and audit/outbox are not available yet.

`PATCH /api/v1/customer-addresses/:addressId`:

```text
load customer-owned address
validate active service area if serviceAreaId changes
update one customer_addresses row
```

No explicit multi-row transaction is required for this slice. If admin service-area mutation is added later, that feature should revisit active-area race handling.

## Events And Background Jobs

```text
none
```

Customer address changes do not create outbox events in this slice because outbox foundation is planned later.

## Authorization Rules

```text
all endpoints require an authenticated actor
GET /api/v1/service-areas allows customer, dispatcher, technician, and admin
customer address endpoints allow only customer role
POST /api/v1/customer-addresses uses the authenticated actor id as customerId
GET /api/v1/customer-addresses filters by authenticated customer id
PATCH /api/v1/customer-addresses/:addressId loads by addressId and authenticated customer id
non-customer roles receive 403 on customer address endpoints
unknown or unowned address receives 404 on PATCH
```

## Validation Rules

```text
addressId path param must be a UUID
serviceAreaId must be a UUID
serviceAreaId must reference an active service area when creating an address
serviceAreaId must reference an active service area when changing an address service area
line1 is required on create
line1 must be nonblank after trim and at most 240 characters
line2 is optional, nullable, and at most 240 characters
city is required on create
city must be nonblank after trim and at most 120 characters
postalCode is optional, nullable, and at most 40 characters
notes is optional, nullable, and at most 1000 characters at the DTO boundary
PATCH must include at least one editable field
string fields are trimmed before persistence
empty strings for nullable optional fields are normalized to null
```

Error codes:

```text
SERVICE_AREA_NOT_FOUND
CUSTOMER_ADDRESS_NOT_FOUND
CUSTOMER_ADDRESS_VALIDATION_FAILED
```

Use existing Nest validation for DTO shape errors where possible. Business invariant errors should map to the API error shape from `docs/design/API_ENDPOINTS.md`.

## Test Plan

Unit:

```text
ListServiceAreasUseCase returns query results
CreateCustomerAddressUseCase creates an address for the authenticated customer
CreateCustomerAddressUseCase rejects inactive or unknown service area
ListCustomerAddressesUseCase delegates with authenticated customer id
UpdateCustomerAddressUseCase updates only a customer-owned address
UpdateCustomerAddressUseCase returns not found for unknown or unowned address
UpdateCustomerAddressUseCase rejects inactive or unknown replacement service area
CustomerAddress domain model trims and normalizes editable fields
```

Integration:

```text
migration creates service_areas and customer_addresses
service_areas code uniqueness is enforced
service_areas code and name cannot be blank
customer_addresses line1 and city cannot be blank
customer_addresses references users and service_areas
CustomerAddressTypeOrmRepository creates, lists, finds, and updates addresses scoped by customer
ServiceAreaTypeOrmReadQuery returns only active service areas ordered by name
```

API e2e:

```text
authenticated customer can list active service areas
dispatcher, technician, and admin can list active service areas
unauthenticated service area request returns 401
customer can create an address with an active service area
customer address creation rejects inactive service area
dispatcher/admin/technician cannot create customer addresses
customer can list only their own addresses
customer can update their own address fields
customer cannot update another customer's address and receives 404
PATCH rejects empty body
PATCH rejects invalid UUID path param
```

Do not add tests that only assert static constants or object literals.

## Manual Verification

```bash
npm run typecheck
npm test -- service-area customer-address
npm run test:e2e -- customer-address service-area
```

If the focused Jest patterns do not match after implementation, run:

```bash
npm test
npm run test:e2e
```

Database verification:

```bash
npm run db:migration:run
npm run db:migration:show
```

## Rollout Notes

```text
run this migration after identity tables exist
seed service areas before customers create addresses
no backfill is required
existing future service requests should reference customer_addresses.id rather than storing address text directly
service request creation must verify the selected address belongs to the customer and its service area is active
```

## Open Questions

```text
none
```
