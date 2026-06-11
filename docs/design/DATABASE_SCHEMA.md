# Database Schema Design

## 1. Purpose

This document defines the initial PostgreSQL schema for ServiceHub.

The schema is designed for:

```text
TypeORM entities and migrations
transaction-safe scheduling
role-based authorization
service request lifecycle tracking
SLA tracking
outbox-based async processing
auditability
read-model friendly queries
```

TypeORM entities are persistence models. Domain models must stay separate.

---

## 2. Naming Conventions

Use:

```text
snake_case table names
snake_case column names
uuid primary keys
timestamptz for timestamps
jsonb for structured payloads that are not queried often
explicit foreign keys
created_at and updated_at on mutable business tables
```

Use enums in TypeScript and PostgreSQL check constraints or enum columns where useful.

Default primary key:

```text
id uuid primary key
```

Default timestamps:

```text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

---

## 3. Core Enums

### user_role

```text
customer
dispatcher
technician
admin
```

### technician_status

```text
active
inactive
on_leave
suspended
```

### request_priority

```text
low
normal
high
urgent
```

### service_request_status

```text
created
needs_triage
triaged
assigned
accepted_by_technician
technician_on_the_way
in_progress
completed
cancelled
failed
```

### assignment_status

```text
assigned
accepted
on_the_way
in_progress
completed
cancelled
rejected
```

### notification_status

```text
pending
sent
failed
cancelled
```

### outbox_status

```text
pending
processing
processed
failed
```

### sla_deadline_type

```text
assignment
completion
```

---

## 4. Identity and Access

## users

Stores all platform users.

| Column        |         Type | Required | Notes                   |
|---------------|-------------:|---------:|-------------------------|
| id            |         uuid |      yes | Primary key             |
| email         | varchar(320) |      yes | Unique, lowercase       |
| password_hash |      varchar |      yes | Hashed password         |
| full_name     | varchar(200) |      yes | Display name            |
| phone         |  varchar(40) |       no | Optional contact number |
| is_active     |      boolean |      yes | Defaults to true        |
| created_at    |  timestamptz |      yes |                         |
| updated_at    |  timestamptz |      yes |                         |

Constraints:

```text
unique(email)
```

Indexes:

```text
idx_users_email
idx_users_is_active
```

## roles

Stores roles.

| Column     |         Type | Required | Notes                                   |
|------------|-------------:|---------:|-----------------------------------------|
| id         |         uuid |      yes | Primary key                             |
| code       |  varchar(50) |      yes | customer, dispatcher, technician, admin |
| name       | varchar(100) |      yes |                                         |
| created_at |  timestamptz |      yes |                                         |

Constraints:

```text
unique(code)
```

## user_roles

Many-to-many relation between users and roles.

| Column     |        Type | Required | Notes       |
|------------|------------:|---------:|-------------|
| user_id    |        uuid |      yes | FK users.id |
| role_id    |        uuid |      yes | FK roles.id |
| created_at | timestamptz |      yes |             |

Constraints:

```text
primary key(user_id, role_id)
```

---

## 5. Service Catalog

## service_categories

| Column      |         Type | Required | Notes                |
|-------------|-------------:|---------:|----------------------|
| id          |         uuid |      yes | Primary key          |
| code        |  varchar(80) |      yes | Stable business code |
| name        | varchar(160) |      yes |                      |
| description |         text |       no |                      |
| is_active   |      boolean |      yes | Defaults to true     |
| created_at  |  timestamptz |      yes |                      |
| updated_at  |  timestamptz |      yes |                      |

Constraints:

```text
unique(code)
```

## skills

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| code | varchar(80) | yes | Stable business code |
| name | varchar(160) | yes |  |
| description | text | no |  |
| is_active | boolean | yes | Defaults to true |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Constraints:

```text
unique(code)
```

## sla_policies

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| code | varchar(80) | yes | Stable business code |
| name | varchar(160) | yes |  |
| priority | request_priority | yes |  |
| assignment_deadline_minutes | int | yes | Must be positive |
| completion_deadline_minutes | int | yes | Must be positive |
| is_active | boolean | yes | Defaults to true |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Constraints:

```text
unique(code)
assignment_deadline_minutes > 0
completion_deadline_minutes > 0
```

## service_types

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| category_id | uuid | yes | FK service_categories.id |
| sla_policy_id | uuid | yes | FK sla_policies.id |
| code | varchar(100) | yes | Unique inside category |
| name | varchar(200) | yes |  |
| description | text | no |  |
| default_priority | request_priority | yes |  |
| estimated_duration_minutes | int | yes | Must be positive |
| is_other | boolean | yes | True for category fallback type |
| is_active | boolean | yes | Defaults to true |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Constraints:

```text
unique(category_id, code)
estimated_duration_minutes > 0
```

Indexes:

```text
idx_service_types_category_id
idx_service_types_sla_policy_id
idx_service_types_is_active
```

## service_type_required_skills

| Column | Type | Required | Notes |
|---|---:|---:|---|
| service_type_id | uuid | yes | FK service_types.id |
| skill_id | uuid | yes | FK skills.id |

Constraints:

```text
primary key(service_type_id, skill_id)
```

---

## 6. Service Areas and Technicians

## service_areas

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| code | varchar(80) | yes | Stable business code |
| name | varchar(160) | yes |  |
| description | text | no |  |
| is_active | boolean | yes | Defaults to true |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Constraints:

```text
unique(code)
```

## customer_addresses

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| customer_id | uuid | yes | FK users.id |
| service_area_id | uuid | yes | FK service_areas.id |
| line1 | varchar(240) | yes |  |
| line2 | varchar(240) | no |  |
| city | varchar(120) | yes |  |
| postal_code | varchar(40) | no |  |
| notes | text | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Indexes:

```text
idx_customer_addresses_customer_id
idx_customer_addresses_service_area_id
```

## technicians

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| user_id | uuid | yes | FK users.id |
| status | technician_status | yes |  |
| daily_assignment_limit | int | yes | Must be positive |
| rating | numeric(3,2) | no | Optional future ranking input |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Constraints:

```text
unique(user_id)
daily_assignment_limit > 0
```

## technician_skills

| Column | Type | Required | Notes |
|---|---:|---:|---|
| technician_id | uuid | yes | FK technicians.id |
| skill_id | uuid | yes | FK skills.id |

Constraints:

```text
primary key(technician_id, skill_id)
```

## technician_service_areas

| Column | Type | Required | Notes |
|---|---:|---:|---|
| technician_id | uuid | yes | FK technicians.id |
| service_area_id | uuid | yes | FK service_areas.id |

Constraints:

```text
primary key(technician_id, service_area_id)
```

## technician_availability_windows

Stores regular or manually entered availability windows.

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| technician_id | uuid | yes | FK technicians.id |
| starts_at | timestamptz | yes |  |
| ends_at | timestamptz | yes |  |
| is_available | boolean | yes | false can represent blocked time |
| reason | varchar(160) | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Constraints:

```text
starts_at < ends_at
```

Indexes:

```text
idx_technician_availability_technician_time
```

---

## 7. Service Requests and Scheduling

## service_requests

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| customer_id | uuid | yes | FK users.id |
| category_id | uuid | yes | FK service_categories.id |
| service_type_id | uuid | yes | FK service_types.id |
| address_id | uuid | yes | FK customer_addresses.id |
| sla_policy_id | uuid | yes | FK sla_policies.id |
| status | service_request_status | yes |  |
| priority | request_priority | yes | Derived from service type, can be adjusted |
| description | text | yes | Customer problem text |
| additional_contact_instructions | text | no |  |
| preferred_start_at | timestamptz | yes |  |
| preferred_end_at | timestamptz | yes |  |
| estimated_duration_minutes | int | yes | Copied from service type or triage |
| assignment_deadline_at | timestamptz | yes | Calculated from SLA policy |
| completion_deadline_at | timestamptz | yes | Calculated from SLA policy |
| triaged_at | timestamptz | no |  |
| assigned_at | timestamptz | no |  |
| completed_at | timestamptz | no |  |
| cancelled_at | timestamptz | no |  |
| cancellation_reason | text | no |  |
| escalated_at | timestamptz | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Constraints:

```text
preferred_start_at < preferred_end_at
estimated_duration_minutes > 0
```

Indexes:

```text
idx_service_requests_customer_id
idx_service_requests_status_priority
idx_service_requests_service_type_id
idx_service_requests_assignment_deadline_at
idx_service_requests_completion_deadline_at
idx_service_requests_created_at
```

## service_request_required_skills

Stores skills copied from the service type at creation or adjusted during triage.

| Column | Type | Required | Notes |
|---|---:|---:|---|
| service_request_id | uuid | yes | FK service_requests.id |
| skill_id | uuid | yes | FK skills.id |

Constraints:

```text
primary key(service_request_id, skill_id)
```

## service_request_attachments

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| service_request_id | uuid | yes | FK service_requests.id |
| uploaded_by_user_id | uuid | yes | FK users.id |
| file_name | varchar(240) | yes |  |
| mime_type | varchar(120) | yes |  |
| storage_key | varchar(500) | yes | Local or object storage key |
| kind | varchar(60) | yes | request_photo, completion_photo, document |
| created_at | timestamptz | yes |  |

Indexes:

```text
idx_service_request_attachments_request_id
```

## assignments

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| service_request_id | uuid | yes | FK service_requests.id |
| technician_id | uuid | yes | FK technicians.id |
| assigned_by_user_id | uuid | yes | FK users.id |
| status | assignment_status | yes |  |
| starts_at | timestamptz | yes |  |
| ends_at | timestamptz | yes |  |
| accepted_at | timestamptz | no |  |
| on_the_way_at | timestamptz | no |  |
| started_at | timestamptz | no |  |
| completed_at | timestamptz | no |  |
| cancelled_at | timestamptz | no |  |
| cancellation_reason | text | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Constraints:

```text
starts_at < ends_at
```

Indexes:

```text
idx_assignments_request_id
idx_assignments_technician_time
idx_assignments_status
```

Important scheduling rule:

```text
Only active assignments should block a technician time slot.
Active assignment statuses: assigned, accepted, on_the_way, in_progress.
```

Recommended advanced PostgreSQL constraint for later:

```text
exclusion constraint on technician_id + tstzrange(starts_at, ends_at)
where status in ('assigned', 'accepted', 'on_the_way', 'in_progress')
```

For the first implementation, enforce overlap inside a transaction and add a focused integration test.

## work_reports

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| service_request_id | uuid | yes | FK service_requests.id |
| assignment_id | uuid | yes | FK assignments.id |
| technician_id | uuid | yes | FK technicians.id |
| summary | text | yes | Required completion report |
| internal_notes | text | no |  |
| completed_at | timestamptz | yes |  |
| created_at | timestamptz | yes |  |

Constraints:

```text
unique(service_request_id)
unique(assignment_id)
```

---

## 8. Inventory

## inventory_items

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| sku | varchar(80) | yes | Unique |
| name | varchar(160) | yes |  |
| description | text | no |  |
| quantity_on_hand | int | yes | Cannot be negative |
| unit | varchar(40) | yes | pcs, m, kg, etc. |
| is_active | boolean | yes | Defaults to true |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Constraints:

```text
unique(sku)
quantity_on_hand >= 0
```

## material_usages

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| work_report_id | uuid | yes | FK work_reports.id |
| inventory_item_id | uuid | yes | FK inventory_items.id |
| quantity | int | yes | Must be positive |
| created_at | timestamptz | yes |  |

Constraints:

```text
quantity > 0
```

---

## 9. SLA, Notifications, Audit, Outbox

## sla_deadline_events

Records approaching and breached deadlines once per request/deadline/event type.

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| service_request_id | uuid | yes | FK service_requests.id |
| deadline_type | sla_deadline_type | yes | assignment or completion |
| event_type | varchar(80) | yes | approaching or breached |
| deadline_at | timestamptz | yes |  |
| occurred_at | timestamptz | yes |  |
| created_at | timestamptz | yes |  |

Constraints:

```text
unique(service_request_id, deadline_type, event_type)
```

## notifications

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| recipient_user_id | uuid | yes | FK users.id |
| type | varchar(100) | yes | Business notification type |
| channel | varchar(40) | yes | internal, email, sms, push |
| status | notification_status | yes |  |
| payload | jsonb | yes |  |
| sent_at | timestamptz | no |  |
| failed_at | timestamptz | no |  |
| failure_reason | text | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Indexes:

```text
idx_notifications_recipient_status
```

## audit_logs

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| actor_user_id | uuid | no | FK users.id, null for system |
| action | varchar(120) | yes | Business action |
| entity_type | varchar(120) | yes |  |
| entity_id | uuid | yes |  |
| old_value | jsonb | no |  |
| new_value | jsonb | no |  |
| request_id | varchar(120) | no | HTTP request id |
| correlation_id | varchar(120) | no | Cross-process correlation |
| created_at | timestamptz | yes |  |

Indexes:

```text
idx_audit_logs_entity
idx_audit_logs_actor_created_at
idx_audit_logs_correlation_id
```

## outbox_events

| Column | Type | Required | Notes |
|---|---:|---:|---|
| id | uuid | yes | Primary key |
| event_type | varchar(120) | yes | Domain event type |
| aggregate_type | varchar(120) | yes | service_request, assignment, etc. |
| aggregate_id | uuid | yes |  |
| payload | jsonb | yes | Event payload |
| status | outbox_status | yes | Defaults to pending |
| attempts | int | yes | Defaults to 0 |
| next_attempt_at | timestamptz | no | Retry scheduling |
| locked_at | timestamptz | no | Worker claim timestamp |
| locked_by | varchar(120) | no | Worker id |
| processed_at | timestamptz | no |  |
| failed_at | timestamptz | no |  |
| failure_reason | text | no |  |
| created_at | timestamptz | yes |  |
| updated_at | timestamptz | yes |  |

Indexes:

```text
idx_outbox_events_pending
idx_outbox_events_aggregate
idx_outbox_events_created_at
```

---

## 10. Read Models

Read models can start as SQL queries over normalized tables.

Materialized or denormalized tables can be added later for:

```text
dispatcher dashboard
technician calendar
SLA dashboard
technician performance
```

Initial implementation should prefer `infra/queries/*` query classes before creating extra tables.

---

## 11. Transaction Boundaries

Must run in one database transaction:

```text
create service request + required skills + attachments metadata + outbox event + audit log
triage service request + required skills update + outbox event + audit log
assign technician + assignment + request status update + outbox event + audit log
technician status transition + assignment update + request update + outbox event
complete request + work report + material usage + inventory decrement + outbox event + audit log
cancel request + assignment cancellation + request cancellation + outbox event + audit log
record SLA breach once + request escalation + outbox event
process outbox claim/update
```

---

## 12. First Migration Scope

The first database migration should include:

```text
users
roles
user_roles
service_categories
skills
sla_policies
service_types
service_type_required_skills
service_areas
customer_addresses
technicians
technician_skills
technician_service_areas
technician_availability_windows
service_requests
service_request_required_skills
service_request_attachments
assignments
work_reports
inventory_items
material_usages
sla_deadline_events
notifications
audit_logs
outbox_events
```

This is a broad MVP schema. During implementation, it may be split into smaller migrations by feature.
