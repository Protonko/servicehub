# 17 - Technician Management API

## Goal

Allow administrators to create and maintain technician profiles and allow
administrators and dispatchers to list the profiles used in operations.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
17 - Technician Management API
```

This step follows the active feature roadmap and the handoff in step 16. The
legacy `docs/IMPLEMENTATION_PLAN.md` phase 17 uses an older numbering scheme and
does not define this slice.

## Scope

In scope:

```text
GET /api/v1/admin/technicians
POST /api/v1/admin/technicians
PATCH /api/v1/admin/technicians/:technicianId
create, update, and list application use cases
active user, skill, and service-area validation
admin/dispatcher authorization
technician management read model and TypeORM query
focused use-case and PostgreSQL-backed API tests
```

## Out Of Scope

```text
creating or updating user accounts
granting or removing the technician role
technician availability and calendars
eligibility, assignment, and overlap checks
rating updates or performance calculation
pagination and filtering
audit-log and outbox writes, whose application foundations remain deferred
```

## Roles

```text
admin creates, updates, and lists technician profiles
dispatcher lists technician profiles
```

## API Endpoints

### GET /api/v1/admin/technicians

Roles: `admin`, `dispatcher`.

Response: `200 OK` with an array ordered by technician user full name and then
technician ID. Each item contains:

```text
id
user: id, email, fullName
status
dailyAssignmentLimit
rating
skills: id, code, name
serviceAreas: id, code, name
createdAt
updatedAt
```

Errors:

```text
401 unauthenticated
403 role is neither admin nor dispatcher
```

### POST /api/v1/admin/technicians

Role: `admin`.

Request DTO:

```text
userId uuid, required
status active | inactive | on_leave | suspended, optional, defaults to active
dailyAssignmentLimit positive integer, required
skillIds uuid[], required, may be empty
serviceAreaIds uuid[], required, must contain at least one item
```

Response: `201 Created` with the persisted technician profile in the same shape
as the write response: profile scalar fields plus `skillIds` and
`serviceAreaIds`.

Errors:

```text
400 invalid DTO or empty service areas
401 unauthenticated
403 non-admin
404 user does not exist or is inactive
404 any requested skill does not exist or is inactive
404 any requested service area does not exist or is inactive
409 user already has a technician profile
```

### PATCH /api/v1/admin/technicians/:technicianId

Role: `admin`.

Request DTO: at least one of:

```text
status active | inactive | on_leave | suspended
dailyAssignmentLimit positive integer
skillIds uuid[]
serviceAreaIds uuid[], when supplied must contain at least one item
```

Response: `200 OK` with the persisted write response.

Errors:

```text
400 invalid technician UUID, empty update, or empty service areas
401 unauthenticated
403 non-admin
404 technician does not exist
404 any newly supplied skill does not exist or is inactive
404 any newly supplied service area does not exist or is inactive
```

## Data Model Changes

None. Step 16 created `technicians`, `technician_skills`, and
`technician_service_areas`.

## Domain Rules

```text
one user can have at most one technician profile
new profile user must exist and be active
technician must have at least one service area
daily assignment limit must be a positive integer
skill and service-area IDs are unique within a profile
only active skills and active service areas can be selected by management commands
existing links remain valid if a skill or service area is deactivated later
status active is assignment-eligible; all other statuses are not
```

Creating a profile does not change the user's roles. User-role administration
is a separate identity concern and is not specified by this endpoint.

## Application Use Cases

### CreateTechnicianUseCase

Loads the user and checks `TechnicianProfilePolicy`, checks for an existing
profile, validates all selected skills and service areas are active, creates the
domain model, and saves it through `TechnicianRepository`.

### UpdateTechnicianUseCase

Loads the profile, rejects an empty update, validates supplied skill and
service-area replacements, updates the domain model, and saves it.

### ListTechniciansUseCase

Returns the technician management read model through
`TechnicianManagementReadQuery`. Coarse endpoint role authorization remains in
guards; the query exposes no customer-owned data.

## Repository And Query Interfaces

Extend the existing boundaries with:

```text
ServiceCatalogAdminRepository.findActiveSkillIds(skillIds)
ServiceAreaReadQuery.findActiveServiceAreaIds(serviceAreaIds)
TechnicianManagementReadQuery.listTechnicians()
```

The existing `TechnicianRepository` remains the write boundary.

## Transaction Boundaries

`TechnicianTypeOrmRepository.save` keeps the step-16 transaction:

```text
insert or update technician row
replace technician skill links
replace technician service-area links
reload complete profile
```

Validation reads occur before that transaction. PostgreSQL foreign keys and the
unique `technicians.user_id` constraint remain the final consistency boundary.
No audit or outbox row is written in this slice because their application
services and event contracts are not yet defined by the active roadmap.

## Events And Background Jobs

```text
none
```

## Authorization Rules

```text
all endpoints require authentication
list permits admin and dispatcher
create and update permit admin only
technicians cannot manage their own profile through these admin endpoints
```

## Validation Rules

```text
path and body IDs are UUIDs
unknown request fields are rejected by the global validation pipe
dailyAssignmentLimit is an integer of at least 1
status is a TechnicianStatus value
skillIds and serviceAreaIds contain UUIDs and are normalized by the domain model
create requires serviceAreaIds with at least one item
patch requires at least one mutable field
patch serviceAreaIds cannot be empty
```

## Test Plan

Unit:

```text
create succeeds for an active user with active links
create rejects missing/inactive user and duplicate profile
create rejects inactive skill and inactive service area
update rejects missing profile and empty command
update validates only supplied links and preserves omitted fields
list delegates to the read query
```

API and PostgreSQL integration:

```text
admin can create a technician and links persist
unauthenticated and non-admin creation are rejected
duplicate profile returns 409
concurrent duplicate creation returns one 201 and one 409
inactive skill and inactive service area return 404
empty service areas return 400
admin can update status, limit, skills, and service areas atomically
admin and dispatcher can list; other roles cannot
invalid path and request DTOs return 400
```

The step-16 repository test continues to prove rollback when link replacement
fails.

## Manual Verification

```bash
npm run typecheck
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

## Rollout Notes

No migration or seed data is required. Step 16's migration must already be
applied.

## Open Questions

```text
none
```

## Requirements Review

Decision: ready

Findings:

- [minor] The active roadmap and legacy implementation plan assign different
  meanings to number 17. This spec follows the roadmap and step-16 handoff.
- [minor] The roadmap describes admin management while the API contract also
  grants dispatcher list access. This spec preserves the explicit endpoint
  role contract without granting dispatchers write access.

Required changes:

```text
none
```

Open questions:

```text
none
```

## Architecture Review

Architecture decision: approved

Findings:

```text
none
```

Architecture notes:

```text
write workflows use the existing domain model and repository boundary
the list endpoint uses a dedicated infra read query rather than persistence entities
controllers remain limited to authorization, DTO handling, use-case calls, and HTTP errors
the existing repository transaction owns profile and link synchronization
the repository translates the user-profile uniqueness race to a domain conflict
```

Open questions:

```text
none
```

## Implementation Checklist

- [x] Add create and update technician use cases.
- [x] Add technician management list read model and TypeORM query.
- [x] Add admin/dispatcher HTTP endpoints, DTOs, and error mapping.
- [x] Validate active users, skills, and service areas.
- [x] Translate the database uniqueness race to a stable conflict error.
- [x] Add focused unit and PostgreSQL-backed API tests.
- [x] Update the relevant ignored engineering note.
- [x] Run typecheck, build, lint, unit, and e2e verification.
- [x] Complete tester and stakeholder reviews.

## Test Review

Test decision: sufficient

Missing tests:

```text
none
```

Redundant or weak tests:

```text
none
```

Recommended verification:

```text
npm run typecheck
npm run build
npm run lint -- --quiet
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

## Stakeholder Review

Stakeholder decision: accepted

Business fit:

```text
Admins can create and maintain the profile data required for future scheduling.
Dispatchers can inspect the same operational profile list without receiving write access.
Inactive users and inactive catalog references cannot be selected for new management commands.
```

Findings:

```text
none
```

Missing acceptance criteria:

```text
none
```

Open questions:

```text
none
```
