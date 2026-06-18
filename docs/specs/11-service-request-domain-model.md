# 11 - Service Request Domain Model

## Goal

Define the ServiceRequest domain model and lifecycle rules before adding service request persistence or HTTP endpoints.

This slice creates the domain vocabulary that later request creation, triage, assignment, technician lifecycle, completion, cancellation, SLA jobs, and reports will reuse.

## Source Roadmap Item

From `docs/specs/00-feature-roadmap.md`:

```text
11 - Service Request Domain Model
```

## Scope

In scope:

```text
ServiceRequest domain model
ServiceRequestStatus enum
ServiceRequest state machine table for lifecycle actions and status transitions
ServiceRequest lifecycle transition methods
domain exceptions for invalid lifecycle actions
domain unit tests for initial status and invalid transitions
domain exports
roadmap status update to done
```

## Out Of Scope

```text
service_requests table
TypeORM entity
migration
repository interface or implementation
create service request use case
request read models
HTTP endpoints
SLA deadline calculation service
outbox events
audit logs
attachments
assignment entity
technician lifecycle use cases
actor-specific cancellation policy
```

## Roles

No actor directly uses this slice. Later slices will call this model from customer, dispatcher, technician, admin, and system workflows.

## API Endpoints

None.

The endpoint `POST /api/v1/service-requests` is planned for `12-create-service-request.md`.

## Data Model Changes

None.

The database shape from `docs/design/DATABASE_SCHEMA.md` will be implemented in a later persistence slice. This slice keeps the domain model framework-free and independent from TypeORM.

## Domain Rules

```text
normal service type requests start in created status
Other service type requests start in needs_triage status
created request can be triaged
needs_triage request can be triaged
cancelled request cannot be triaged
completed request cannot be triaged
created request can be assigned
triaged request can be assigned
needs_triage request cannot be assigned
cancelled request cannot be assigned
completed request cannot be assigned
assigned request can be accepted by technician
accepted_by_technician request can move to technician_on_the_way
technician_on_the_way request can move to in_progress
in_progress request can be completed
completed request cannot be cancelled
cancelled request cannot be cancelled again
cancelled request should not be considered for SLA breach jobs
completed request should not be considered for SLA breach jobs
```

Lifecycle transition rules are stored in a domain-only state machine module next to
the ServiceRequest model:

```text
src/domain/model/service-request/service-request-state-machine.ts
```

The state machine defines `current status + lifecycle action -> next status`
rules and terminal statuses. The ServiceRequest model remains the public domain
API for lifecycle actions, because action methods own business-specific
timestamps and exception types.

Conservative assumption:

```text
The assignment rule allows both created and triaged requests to be assigned, because non-Other requests start in created and API design says requests must be triaged or created without Other service type. needs_triage remains non-assignable.
```

The domain model does not enforce actor-specific cancellation rules yet:

```text
customer can cancel before technician_on_the_way
dispatcher can cancel before in_progress
admin cancellation with special reason
```

Those belong to `28-cancel-service-request.md` as a cancellation policy because they depend on actor role and assignment state.

## Application Use Cases

None.

Future use cases:

```text
CreateServiceRequestUseCase
TriageServiceRequestUseCase
AssignTechnicianUseCase
AcceptAssignmentUseCase
MarkTechnicianOnTheWayUseCase
StartServiceWorkUseCase
CompleteServiceRequestUseCase
CancelServiceRequestUseCase
```

## Repository Interfaces

None.

`ServiceRequestRepository` is deferred until persistence/use-case slices need it.

## Transaction Boundaries

None.

This slice only mutates in-memory domain objects in unit tests. Later write use cases must define explicit transaction boundaries around request rows, assignments, audit rows, and outbox events where applicable.

## Events And Background Jobs

None.

Future lifecycle use cases will emit:

```text
ServiceRequestCreated
ServiceRequestTriaged
TechnicianAssigned
ServiceRequestCompleted
ServiceRequestCancelled
```

Outbox and workers remain out of scope.

## Authorization Rules

None in this slice.

Actor and ownership checks remain in use cases or policies:

```text
customer owns address/request
dispatcher/admin can triage
dispatcher/admin can assign
assigned technician can progress work
customer/dispatcher/admin cancellation rules
```

## Validation Rules

Domain construction validates:

```text
description must not be blank
additionalContactInstructions trims empty strings to null
preferredStartAt must be before preferredEndAt
estimatedDurationMinutes must be a positive integer
assignmentDeadlineAt must be a valid Date
completionDeadlineAt must be a valid Date
```

Domain lifecycle methods validate allowed status transitions and throw domain exceptions for invalid actions.

## Test Plan

Unit:

```text
normal service type request starts in created status
Other service type request starts in needs_triage status
blank description is rejected
invalid preferred time window is rejected
needs_triage request cannot be assigned
created request can be assigned
triaged request can be assigned
completed request cannot be cancelled
cancelled request cannot be assigned
cancelled/completed requests are not SLA breach candidates
allowed technician lifecycle path reaches completed
state machine resolves expected lifecycle actions and rejects invalid shortcuts
```

Integration:

```text
none
```

API:

```text
none
```

## Manual Verification

```bash
npm run typecheck
npm run lint
npm test
```

No database verification is required for this domain-only slice.

## Rollout Notes

No migration is included.

When `12-create-service-request.md` adds persistence, it should map `service_requests.status` to `ServiceRequestStatus` and avoid duplicating transition rules in controllers or repositories.

## Open Questions

```text
none
```
