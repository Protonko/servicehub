# ServiceHub

## 1. Product Overview

**ServiceHub** is a backend-heavy application for companies that manage on-site service requests.

The platform helps service companies receive customer requests, classify service problems, schedule technicians, track work progress, enforce SLA rules, manage technician availability, and build operational reports.

Example businesses:

* home repair services
* internet provider technician visits
* HVAC maintenance
* plumbing/electrical services
* office maintenance
* cleaning services
* property maintenance companies

The system is not a simple task tracker. It models real operational workflows where requests have lifecycle rules, technicians have schedules and skills, dispatchers assign work, and the business must avoid scheduling conflicts, SLA breaches, and inconsistent state.

The product is conceptually similar to dispatching systems used in taxi or delivery products, but with more complex business rules. Instead of matching only by location and availability, the system also considers service type, required skills, estimated duration, service area, technician workload, SLA deadlines, and manual dispatcher decisions.

---

## 2. Business Problem

Service companies usually face several operational problems:

1. Customers create service requests through different channels.
2. Customers often describe problems in an unstructured way.
3. The business still needs structured data to assign the right technician.
4. Dispatchers need to classify, triage, and assign work.
5. Technicians have different skills, locations, availability, and workloads.
6. One technician must not be assigned to overlapping jobs.
7. Urgent requests must be processed faster than normal requests.
8. Customers need status updates.
9. Managers need reports about delays, completed jobs, SLA breaches, and technician performance.
10. Every important change must be auditable.

This platform solves these problems by providing a centralized workflow for request creation, classification, scheduling, assignment, execution, SLA tracking, notifications, and reporting.

---

## 3. Core Product Idea

A customer creates a service request by selecting a service category and service type from a catalog, then describing the problem in free text.

Example:

```text
Category: HVAC / Air Conditioning
Service type: Air conditioner does not cool
Description: "The air conditioner turns on, but the room stays warm."
Preferred time window: Tomorrow, 10:00-14:00
Attachments: photo_1.jpg
```

The system uses the selected category and service type to determine:

* required technician skills
* default priority
* estimated job duration
* applicable SLA policy
* possible materials or preparation requirements

The free-text description gives the technician and dispatcher additional context.

After request creation, the system calculates SLA deadlines and makes the request visible to dispatchers.

A dispatcher reviews the request, confirms or adjusts the classification, and assigns a technician based on:

* service category
* service type
* required skills
* service area
* technician availability
* current workload
* request priority
* requested time slot

The technician receives the assignment and moves the job through the lifecycle:

```text
assigned -> accepted -> on_the_way -> in_progress -> completed
```

The customer can track the request status.

The system records all important changes, publishes domain events, updates read models, and creates notifications.

---

## 4. Request Creation Model

The platform uses a hybrid request model.

A service request is not fully unstructured, and it is not limited to a rigid form either.

The customer must select:

```text
Service category
Service type
Address
Preferred time window
```

The customer must also provide:

```text
Problem description
```

The customer may optionally provide:

```text
Photos
Documents
Additional contact instructions
```

This gives the system enough structured data for backend logic, while still allowing the customer to explain the real-world issue.

---

## 5. Service Catalog

The service catalog defines what types of work the company provides.

### 5.1 Service Category

A service category is a broad area of work.

Examples:

```text
HVAC
Plumbing
Electrical
Internet / Network
Cleaning
Appliance Repair
Locksmith
Property Maintenance
```

### 5.2 Service Type

A service type is a specific problem or service inside a category.

Examples for HVAC:

```text
Air conditioner does not cool
Air conditioner is leaking
Strange noise from air conditioner
Air conditioner maintenance
Air conditioner installation
Other
```

Examples for Plumbing:

```text
Water leak
Blocked drain
No hot water
Pipe replacement
Toilet repair
Other
```

A service type should contain operational metadata:

```text
id
categoryId
code
name
description
defaultPriority
estimatedDurationMinutes
requiredSkills
slaPolicyId
isActive
```

Example:

```json
{
  "code": "AC_NOT_COOLING",
  "name": "Air conditioner does not cool",
  "category": "HVAC",
  "defaultPriority": "normal",
  "estimatedDurationMinutes": 90,
  "requiredSkills": ["HVAC_REPAIR"],
  "slaPolicy": "HVAC_NORMAL",
  "isActive": true
}
```

This metadata drives backend decisions.

For example:

```text
AC_NOT_COOLING -> requires HVAC_REPAIR skill
AC_LEAKING -> high priority
AC_INSTALLATION -> estimated duration 180 minutes
ELECTRICAL_SHORT_CIRCUIT -> urgent priority
```

---

## 6. Other / Unknown Service Type

Every category can have an `Other` service type.

This is used when the customer cannot classify the problem precisely.

Example:

```text
Category: HVAC
Service type: Other
Description: "I do not know what happened. It just stopped working."
```

Requests with `Other` service type require dispatcher triage before scheduling.

The dispatcher can update:

```text
category
serviceType
priority
estimatedDuration
requiredSkills
```

Important rule:

```text
A request with serviceType = Other cannot be assigned until it is triaged.
```

---

## 7. Main Actors

### 7.1 Customer

A customer is the person or organization requesting service.

Customers can:

* create service requests
* select service category and service type
* describe the problem in free text
* select preferred time windows
* attach photos or documents
* view request status
* cancel requests before work starts
* leave feedback after completion

Customers can only access their own requests.

---

### 7.2 Dispatcher

A dispatcher manages operational work.

Dispatchers can:

* view all active service requests
* triage new requests
* reclassify requests
* assign technicians
* reschedule assignments
* change request priority
* handle urgent or escalated requests
* monitor SLA deadlines
* resolve scheduling conflicts

Dispatchers are responsible for making sure requests are handled on time.

The MVP uses dispatcher-controlled assignment.

The system may suggest eligible technicians, but the dispatcher makes the final assignment decision.

---

### 7.3 Technician

A technician performs the actual field work.

Technicians can:

* view assigned jobs
* accept or reject assignments
* change job status
* mark themselves as on the way
* start work
* submit work reports
* attach completion photos
* record used materials
* complete jobs

Technicians can only manage their own assignments.

---

### 7.4 Admin

An admin manages the platform configuration.

Admins can:

* manage users
* manage roles and permissions
* manage service categories
* manage service types
* manage technician skills
* manage service areas
* configure SLA policies
* view audit logs
* manage system-level settings

---

## 8. Assignment Model

The platform supports dispatcher-controlled field service assignment.

The flow is similar to taxi or delivery dispatching, but with more business constraints.

Basic analogy:

```text
Taxi:
customer creates ride request
system finds drivers
driver accepts
driver arrives
ride is completed

ServiceHub:
customer creates service request
dispatcher/system finds eligible technicians
dispatcher assigns technician
technician accepts
technician arrives / starts work
request is completed
```

Main difference:

```text
Taxi dispatching mostly depends on location and availability.

Field service dispatching depends on service type, required skill, estimated duration, service area, time slot, SLA, technician workload, and dispatcher decision.
```

The MVP should use this assignment model:

```text
Customer creates request.
System classifies request using category and service type.
System calculates SLA deadline.
Dispatcher sees request in queue.
System shows eligible technicians.
Dispatcher chooses technician and time slot.
Backend validates assignment in transaction.
Technician accepts and performs work.
```

Advanced versions may support automatic assignment, but auto-dispatch is out of scope for MVP.

---

## 9. Core Business Domains

### 9.1 Identity and Access

Responsible for authentication, users, roles, and permissions.

The system must support role-based access control.

Initial roles:

```text
customer
dispatcher
technician
admin
```

Examples of permissions:

```text
request.create
request.read.own
request.read.all
request.triage
request.assign
request.cancel
request.complete
technician.schedule.read
technician.schedule.write
admin.users.manage
admin.service_catalog.manage
admin.sla.manage
audit.read
```

Important rule:

```text
Frontend visibility is not security. Every protected operation must be checked on the backend.
```

---

### 9.2 Service Requests

This is the core workflow domain.

A service request represents a customer problem that requires field work.

A request has:

```text
customer
category
serviceType
priority
description
address
preferred time window
status
SLA deadline
assigned technician, if any
attachments
comments
history
```

Possible request statuses:

```text
created
needs_triage
triaged
scheduled
assigned
accepted_by_technician
technician_on_the_way
in_progress
completed
cancelled
failed
```

Core invariants:

```text
Completed request cannot be cancelled.
Cancelled request cannot be assigned.
Request cannot be completed without a work report.
Urgent request must have an SLA deadline.
Customer can cancel request only before technician_on_the_way.
Only dispatcher or admin can manually assign technician.
Only assigned technician can start or complete work.
Request with serviceType = Other must be triaged before assignment.
Dispatcher can reclassify request during triage.
```

---

### 9.3 Scheduling

Scheduling controls technician availability and assignments.

This is one of the most important backend-heavy parts of the system.

The system must prevent double booking.

A technician cannot have overlapping assignments.

Scheduling must consider:

* technician availability
* technician skills
* service area
* existing assignments
* requested time window
* estimated job duration
* request priority

Core invariants:

```text
Technician cannot have overlapping assignments.
Technician can only be assigned inside availability window.
Technician must have required skill for the service type.
Technician must serve the customer's area.
Assignment must belong to an active service request.
Cancelled request must release its assignment slot.
```

This domain requires proper transaction handling because multiple dispatchers may try to assign the same technician or time slot at the same time.

---

### 9.4 Technician Management

This domain manages technician profiles, skills, service areas, and work status.

A technician has:

```text
user account
skills
service areas
working hours
current status
daily assignment limit
```

Technician statuses:

```text
active
inactive
on_leave
suspended
```

Core invariants:

```text
Inactive technician cannot receive assignments.
Technician must have at least one service area.
Technician must have required skill to receive category-specific work.
Technician workload must not exceed daily limit.
```

---

### 9.5 SLA Management

SLA means Service Level Agreement.

The platform must track deadlines for service requests.

Example SLA rules:

```text
Urgent request must be assigned within 15 minutes.
High priority request must be assigned within 1 hour.
Normal request must be scheduled within 24 hours.
Request must be completed within configured category deadline.
```

The system should detect SLA breaches and notify dispatchers.

SLA-related behavior:

* calculate SLA deadline when request is created
* use service type and priority to select SLA policy
* track assignment deadline
* track completion deadline
* escalate overdue requests
* notify dispatcher when deadline is close
* store SLA breach events for reporting

Core invariants:

```text
Every active request must have an SLA policy.
Urgent request must have the shortest assignment deadline.
Completed or cancelled request should not trigger new SLA breach events.
SLA breach must be recorded only once per deadline type.
```

---

### 9.6 Inventory and Materials

This domain tracks materials used during service work.

Examples:

* filters
* cables
* pipes
* cleaning chemicals
* replacement parts
* tools or consumables

A technician can record used materials when completing a job.

Core invariants:

```text
Material usage must be linked to a work report.
Inventory quantity cannot go below zero.
Technician cannot use materials that are not available.
Material usage can only be submitted for in_progress request.
```

This domain can be implemented after the core request and scheduling workflow.

---

### 9.7 Notifications

The platform sends notifications when important events happen.

Notification types:

* request created
* request triaged
* technician assigned
* assignment accepted
* technician on the way
* work started
* request completed
* request cancelled
* SLA deadline is close
* SLA breached

Notification channels can be mocked:

```text
email
sms
push
internal notification
```

Notifications should be processed asynchronously.

---

### 9.8 Audit Log

Every important business change must be auditable.

Audit log should record:

* who performed the action
* what entity was changed
* old value
* new value
* timestamp
* request id
* correlation id

Examples of audited actions:

```text
ServiceRequestCreated
ServiceRequestTriaged
ServiceRequestReclassified
ServiceRequestCancelled
TechnicianAssigned
AssignmentRescheduled
TechnicianStartedWork
ServiceRequestCompleted
SlaPolicyChanged
ServiceCatalogChanged
UserRoleChanged
```

Audit log is important for debugging, compliance-style workflows, and admin visibility.

---

### 9.9 Reporting and Read Models

Managers and dispatchers need operational visibility.

The system should support read models for:

* request search
* dispatcher dashboard
* technician calendar
* SLA dashboard
* technician performance
* daily completed jobs
* overdue requests

Example dashboard metrics:

```text
total active requests
requests waiting for triage
requests waiting for assignment
requests in progress
completed requests today
cancelled requests today
SLA breaches today
average completion time
technician utilization
```

Read models should be optimized for queries and dashboards, not for enforcing business invariants.

---

## 10. Main Business Flows

### 10.1 Create Service Request

A customer creates a new service request.

Flow:

```text
1. Customer selects service category.
2. Customer selects service type.
3. Customer enters description.
4. Customer selects address and preferred time window.
5. Backend validates category, service type, address, priority, and preferred time window.
6. System creates ServiceRequest.
7. System calculates SLA deadline.
8. System stores attachments metadata, if provided.
9. System emits ServiceRequestCreated event.
10. Dispatcher dashboard is updated.
11. Customer receives confirmation.
```

Important rules:

```text
Customer must be authenticated.
Category must exist and be active.
Service type must exist and belong to selected category.
Preferred time window must be in the future.
Request must start in created or needs_triage status.
Urgent request must receive urgent SLA policy.
If serviceType = Other, request status must be needs_triage.
```

---

### 10.2 Triage Service Request

Dispatcher reviews a new request.

Flow:

```text
1. Dispatcher opens new requests queue.
2. Dispatcher reviews request details.
3. Dispatcher confirms or changes category.
4. Dispatcher confirms or changes service type.
5. Dispatcher confirms or changes priority.
6. Dispatcher confirms estimated duration and required skills.
7. Request status changes from created or needs_triage to triaged.
8. System emits ServiceRequestTriaged event.
```

Important rules:

```text
Only dispatcher or admin can triage request.
Cancelled request cannot be triaged.
Completed request cannot be triaged.
Request with serviceType = Other must be reclassified before assignment.
```

---

### 10.3 Find Eligible Technicians

Before assignment, the system can suggest eligible technicians.

Flow:

```text
1. Dispatcher opens triaged request.
2. System loads service type requirements.
3. System finds technicians with required skills.
4. System filters technicians by service area.
5. System filters technicians by active status.
6. System checks availability for selected time window.
7. System excludes technicians with overlapping assignments.
8. System returns ranked technician candidates.
```

Ranking criteria may include:

```text
skill match
same service area
available time window
lower workload
closer existing schedule
higher completion rating
```

Important rule:

```text
Suggested technician list is advisory. Backend must validate assignment again when dispatcher submits final decision.
```

---

### 10.4 Assign Technician

Dispatcher assigns a technician to a request.

Flow:

```text
1. Dispatcher selects technician and time slot.
2. Backend checks request status.
3. Backend checks technician status.
4. Backend checks technician skills.
5. Backend checks service area.
6. Backend checks technician availability.
7. Backend prevents overlapping assignments.
8. System creates Assignment.
9. Request status changes to assigned.
10. System emits TechnicianAssigned event.
11. Technician receives notification.
```

Important rules:

```text
Only dispatcher or admin can assign technician.
Request must be triaged before assignment.
Technician must be active.
Technician must have required skill.
Technician must serve request address area.
Technician must be available during selected time slot.
Technician cannot have overlapping assignments.
Request cannot be assigned if it is cancelled or completed.
```

This flow must be transaction-safe.

---

### 10.5 Technician Accepts Assignment

Technician accepts an assigned job.

Flow:

```text
1. Technician opens assigned jobs.
2. Technician accepts assignment.
3. Backend checks that assignment belongs to technician.
4. Request status changes to accepted_by_technician.
5. System emits AssignmentAccepted event.
6. Customer receives notification.
```

Important rules:

```text
Only assigned technician can accept assignment.
Cancelled request cannot be accepted.
Completed request cannot be accepted.
```

---

### 10.6 Technician Starts Work

Technician starts the job.

Flow:

```text
1. Technician marks job as on_the_way.
2. Customer receives notification.
3. Technician arrives and marks job as in_progress.
4. System records timestamps.
```

Important rules:

```text
Only assigned technician can change these statuses.
Request must be accepted before technician can be on_the_way.
Request must be on_the_way before it can become in_progress.
```

---

### 10.7 Complete Service Request

Technician completes the job.

Flow:

```text
1. Technician submits work report.
2. Technician attaches completion photos, if needed.
3. Technician records used materials, if needed.
4. Backend validates request state.
5. Backend validates material availability.
6. Backend updates inventory.
7. Request status changes to completed.
8. System emits ServiceRequestCompleted event.
9. Customer receives completion notification.
10. Reporting read models are updated.
```

Important rules:

```text
Only assigned technician can complete request.
Request must be in_progress.
Work report is required.
Inventory quantity cannot go below zero.
Completed request cannot be modified except by admin correction flow.
```

---

### 10.8 Cancel Service Request

Customer, dispatcher, or admin cancels a request.

Flow:

```text
1. User sends cancellation request.
2. Backend checks cancellation permissions.
3. Backend checks current request status.
4. Request status changes to cancelled.
5. Assignment slot is released, if assignment exists.
6. System emits ServiceRequestCancelled event.
7. Customer and technician receive notifications.
```

Important rules:

```text
Customer can cancel only before technician_on_the_way.
Dispatcher can cancel before in_progress.
Admin can cancel with special reason.
Completed request cannot be cancelled.
Cancelled request must not trigger SLA breach.
```

---

### 10.9 SLA Escalation

System detects that request is close to breaching or has breached SLA.

Flow:

```text
1. Background process checks active requests.
2. System finds requests with approaching or breached deadlines.
3. System emits SlaDeadlineApproaching or SlaDeadlineBreached event.
4. Dispatcher receives notification.
5. Request is marked as escalated.
6. SLA dashboard is updated.
```

Important rules:

```text
Completed requests are ignored.
Cancelled requests are ignored.
Each SLA breach type must be recorded only once.
Urgent requests must be prioritized in dispatcher dashboard.
```

---

## 11. Key Domain Events

Initial domain events:

```text
ServiceRequestCreated
ServiceRequestTriaged
ServiceRequestReclassified
ServiceRequestScheduled
TechnicianCandidatesSuggested
TechnicianAssigned
AssignmentAccepted
TechnicianOnTheWay
ServiceWorkStarted
ServiceRequestCompleted
ServiceRequestCancelled
SlaDeadlineApproaching
SlaDeadlineBreached
MaterialUsed
InventoryAdjusted
NotificationRequested
AuditLogCreated
```

These events will later be used for:

* async notifications
* audit logging
* reporting projections
* SLA tracking
* technician performance metrics

---

## 12. What Makes This Project Backend-Heavy

This project is designed to demonstrate real backend engineering skills.

It includes:

* structured service catalog
* hybrid request creation model
* complex domain lifecycle
* role-based authorization
* state transitions
* scheduling conflicts
* transaction-safe technician assignment
* dispatcher-controlled operations
* SLA deadline tracking
* asynchronous domain events
* read models for dashboards
* audit logging
* inventory consistency
* background jobs
* idempotent operations
* Dockerized infrastructure
* production-style architecture

The system should not be implemented as a simple CRUD app.

The main value is in enforcing business rules and keeping data consistent under realistic conditions.

---

## 13. Out of Scope for Initial Version

The first version should not include everything.

Out of scope for MVP:

```text
real SMS/email provider integration
real maps/geocoding
mobile app
payment processing
complex route optimization
fully automatic dispatching
multi-country localization
advanced analytics
real-time WebSocket tracking
marketplace mechanics
public technician profiles
customer bidding
chat between customer and technician
```

---

## 14. MVP Scope

The MVP should include:

```text
Authentication and roles
Service catalog
Customer request creation
Request triage
Dispatcher technician assignment
Eligible technician suggestions
Technician schedule conflict prevention
Technician job status updates
Work report submission
Request cancellation
SLA deadline calculation
Basic SLA breach detection
Audit log
Basic notifications as mocked async events
Dispatcher dashboard read model
Technician calendar read model
Docker local environment
```

This MVP is enough to demonstrate backend architecture, domain modeling, transactions, CQRS-style read models, event-driven processing, and role-based access control.

---

## 15. Product Summary

ServiceHub is a realistic operational system for managing customer service requests and field technician work.

The core challenge is not UI. The core challenge is backend correctness:

```text
Who can do what?
Which service type was selected?
Does this request need triage?
When can request status change?
Can this technician be assigned?
Does the technician have the required skill?
Is the slot available?
Was the SLA breached?
Was the request already cancelled?
Can inventory go below zero?
Was this event already processed?
```

The project should be built around these business rules.

A good implementation should clearly show:

```text
DDD-style domain boundaries
PostgreSQL as source of truth
transaction-safe scheduling
role-based access control
domain events
CQRS-style read models
Redis for locks/cache/rate limiting
BullMQ for async job processing
Docker for local infrastructure
AWS-ready deployment model
```
