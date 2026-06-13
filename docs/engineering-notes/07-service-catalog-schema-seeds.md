# 07 - Service Catalog Schema And Seeds

## What Was Built

This step adds the first service catalog persistence slice:

```text
service_categories
skills
sla_policies
service_types
service_type_required_skills
```

It also seeds a small operational catalog:

```text
HVAC
Plumbing
initial HVAC and plumbing skills
standard, high-priority, and triage SLA policies
concrete HVAC and plumbing service types
one Other service type per seeded category
```

## Why It Was Needed

Service request creation depends on service catalog metadata. When a customer creates a request later, the use case must validate that the selected category and service type are active, confirm that the service type belongs to the category, and copy operational fields such as priority, estimated duration, required skills, and SLA policy.

This phase creates those persistence guarantees before exposing any catalog API.

## Files Added Or Changed

```text
docs/specs/07-service-catalog-schema-seeds.md
src/db/migrations/1781160003000-ServiceCatalogSchemaSeeds.ts
src/db/entities/service-category.entity.ts
src/db/entities/skill.entity.ts
src/db/entities/sla-policy.entity.ts
src/db/entities/service-type.entity.ts
src/db/entities/service-type-required-skill.entity.ts
src/db/migration-tests/service-catalog-schema-seeds.spec.ts
docs/engineering-notes/07-service-catalog-schema-seeds.md
docs/specs/00-feature-roadmap.md
```

## Data Flow Through The Layers

This is a database-only feature slice.

```text
TypeORM migration
  -> creates catalog tables and constraints
  -> inserts seed categories, skills, SLA policies, and service types
  -> inserts service type required skill links
```

No controller, use case, domain policy, repository, worker, audit log, or outbox event is introduced yet. Those belong to later business workflow slices.

## Backend Concepts Demonstrated

This step demonstrates:

```text
schema-first feature implementation
foreign keys for operational metadata integrity
check constraints for request priority and positive SLA/duration values
composite uniqueness for service type code inside category
partial uniqueness to allow only one Other service type per category
link table for many-to-many required skills
seed data with database-generated UUIDs
seed relationships resolved through stable business codes
focused migration tests
```

## How To Run Or Test The Step

Focused test:

```bash
npm test -- --runTestsByPath src/db/migration-tests/service-catalog-schema-seeds.spec.ts
```

Broader local verification:

```bash
npm run typecheck
npm test
```

With PostgreSQL running:

```bash
npm run db:migration:run
npm run db:migration:show
```

## Tradeoffs

The seed catalog is intentionally small. It gives later workflows enough metadata to prove request creation, triage, assignment, and SLA logic without turning the seed migration into a full production catalog.

The `Other` service types do not receive required skill links in this phase. That matches the business rule that requests classified as `Other` require dispatcher triage before assignment.

PostgreSQL generates seed row UUIDs with `gen_random_uuid()`. The migration resolves relationships through stable business codes such as `HVAC`, `STANDARD_24H`, and `HVAC_REPAIR`, so future seed migrations should also reference rows by code instead of hardcoding technical IDs.

## Improvements Later

Future steps should add:

```text
service catalog read API
admin catalog management
service area and customer address persistence
request creation that copies catalog metadata
triage workflow that reclassifies Other requests
```
