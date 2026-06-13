# 07 - Service Catalog Schema And Seeds

## Goal

Create service catalog persistence and initial operational metadata so future request creation can copy priority, duration, skills, and SLA policy from an active service type.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
07 - Service Catalog Schema And Seeds
```

## Scope

In scope:

```text
service catalog database tables
TypeORM persistence entities
seed data for HVAC and Plumbing
seed data for initial skills
seed data for initial SLA policies
Other service type for each seeded category
migration tests for constraints and seed behavior
```

## Out Of Scope

```text
service catalog read API
admin catalog management API
service request creation
customer addresses and service areas
technician skill profiles
real SLA job processing
```

## Roles

```text
system
```

This phase has no HTTP actor. It prepares database metadata used by later customer and dispatcher workflows.

## API Endpoints

```text
none
```

The read endpoints are intentionally deferred to `08-service-catalog-read-api.md`.

## Data Model Changes

Tables/entities:

```text
service_categories
skills
sla_policies
service_types
service_type_required_skills
```

`service_categories`:

```text
id uuid primary key default gen_random_uuid()
code varchar(80) unique, not blank
name varchar(160) not blank
description text nullable
is_active boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

`skills`:

```text
id uuid primary key default gen_random_uuid()
code varchar(80) unique, not blank
name varchar(160) not blank
description text nullable
is_active boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

`sla_policies`:

```text
id uuid primary key default gen_random_uuid()
code varchar(80) unique, not blank
name varchar(160) not blank
priority request_priority value
assignment_deadline_minutes positive int
completion_deadline_minutes positive int
is_active boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

`service_types`:

```text
id uuid primary key default gen_random_uuid()
category_id uuid references service_categories(id)
sla_policy_id uuid references sla_policies(id)
code varchar(100) unique inside category, not blank
name varchar(200) not blank
description text nullable
default_priority request_priority value
estimated_duration_minutes positive int
is_other boolean default false
is_active boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

`service_type_required_skills`:

```text
service_type_id uuid references service_types(id)
skill_id uuid references skills(id)
primary key(service_type_id, skill_id)
```

Request priority values are enforced with database check constraints:

```text
low
normal
high
urgent
```

Migration notes:

```text
create parent tables before service_types
create service_types before service_type_required_skills
drop link table before parent tables on revert
generate UUIDs in PostgreSQL with gen_random_uuid()
seed without explicit UUID values
connect seed rows by stable business codes
use idempotent upserts
```

## Domain Rules

```text
service category code is unique and non-blank
skill code is unique and non-blank
SLA policy code is unique and non-blank
SLA deadlines must be positive
service type code is unique inside a category
service type must reference one category and one SLA policy
service type estimated duration must be positive
service type priority must be one of low, normal, high, urgent
each seeded category has an active Other service type
seeded non-Other service types link to required skills
```

## Application Use Cases

```text
none
```

This feature is schema and seed data only. Future use cases will read this metadata through catalog repositories or queries.

## Transaction Boundaries

The TypeORM migration runs as the schema-change boundary:

```text
create catalog tables
create indexes and constraints
insert seed rows
insert required skill links
```

No business workflow, audit log, or outbox event is created in this phase because no customer or dispatcher action occurs.

## Events And Background Jobs

```text
none
```

## Authorization Rules

```text
none
```

No endpoint is exposed in this phase.

## Validation Rules

```text
codes and names cannot be blank
priority is low, normal, high, or urgent
assignment deadline minutes must be greater than zero
completion deadline minutes must be greater than zero
estimated duration minutes must be greater than zero
foreign keys must reference existing catalog rows
```

## Test Plan

Unit:

```text
none
```

Integration/migration:

```text
catalog tables are created with expected constraints and indexes
service type code is unique inside category
service type has SLA policy foreign key
required skill link table has composite primary key and foreign keys
seed data includes HVAC and Plumbing categories
seed data includes Other service type per seeded category
seed data links concrete service types to required skills
down migration drops tables in dependency order
```

API:

```text
none
```

## Manual Verification

```bash
npm run typecheck
npm test -- --runTestsByPath src/db/migration-tests/service-catalog-schema-seeds.spec.ts
```

If PostgreSQL is running:

```bash
npm run db:migration:run
npm run db:migration:show
```

## Rollout Notes

```text
This migration must run after user persistence migrations.
The seeded catalog is intentionally small and can be expanded by the later admin management feature.
Seed IDs are generated by PostgreSQL. Later seed data should reference initial catalog rows by stable `code` values rather than hardcoded UUIDs.
```

## Open Questions

```text
none
```
