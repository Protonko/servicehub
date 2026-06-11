# Entity Relationship Diagram

## 1. Purpose

This document shows the main database relationships as an ER diagram.

Use it together with:

```text
docs/design/DATABASE_SCHEMA.md
```

The diagram is intentionally focused on MVP backend relationships. It does not show every column, only the fields needed to understand ownership, foreign keys, and cardinality.

## 2. Relationship Legend

Mermaid cardinality notation:

```text
||--|| one-to-one
||--o{ one-to-many
}o--o{ many-to-many
```

In SQL, many-to-many relationships are implemented through explicit join tables.

Examples:

```text
users ||--o{ service_requests
one user can create many service requests

technicians ||--o{ technician_skills
one technician can have many skill links

skills ||--o{ technician_skills
one skill can be linked to many technicians
```

## 3. MVP ER Diagram

```mermaid
erDiagram
  USERS {
    uuid id PK
    varchar email UK
    varchar password_hash
    varchar full_name
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }

  ROLES {
    uuid id PK
    varchar code UK
    varchar name
  }

  USER_ROLES {
    uuid user_id FK
    uuid role_id FK
    timestamptz created_at
  }

  SERVICE_CATEGORIES {
    uuid id PK
    varchar code UK
    varchar name
    boolean is_active
  }

  SERVICE_TYPES {
    uuid id PK
    uuid category_id FK
    uuid sla_policy_id FK
    varchar code
    varchar name
    request_priority default_priority
    int estimated_duration_minutes
    boolean is_other
    boolean is_active
  }

  SKILLS {
    uuid id PK
    varchar code UK
    varchar name
    boolean is_active
  }

  SERVICE_TYPE_REQUIRED_SKILLS {
    uuid service_type_id FK
    uuid skill_id FK
  }

  SLA_POLICIES {
    uuid id PK
    varchar code UK
    request_priority priority
    int assignment_deadline_minutes
    int completion_deadline_minutes
    boolean is_active
  }

  SERVICE_AREAS {
    uuid id PK
    varchar code UK
    varchar name
    boolean is_active
  }

  CUSTOMER_ADDRESSES {
    uuid id PK
    uuid customer_id FK
    uuid service_area_id FK
    varchar line1
    varchar city
  }

  TECHNICIANS {
    uuid id PK
    uuid user_id FK
    technician_status status
    int daily_assignment_limit
    numeric rating
  }

  TECHNICIAN_SKILLS {
    uuid technician_id FK
    uuid skill_id FK
  }

  TECHNICIAN_SERVICE_AREAS {
    uuid technician_id FK
    uuid service_area_id FK
  }

  TECHNICIAN_AVAILABILITY_WINDOWS {
    uuid id PK
    uuid technician_id FK
    timestamptz starts_at
    timestamptz ends_at
    boolean is_available
  }

  SERVICE_REQUESTS {
    uuid id PK
    uuid customer_id FK
    uuid category_id FK
    uuid service_type_id FK
    uuid address_id FK
    uuid sla_policy_id FK
    service_request_status status
    request_priority priority
    text description
    timestamptz preferred_start_at
    timestamptz preferred_end_at
    int estimated_duration_minutes
    timestamptz assignment_deadline_at
    timestamptz completion_deadline_at
  }

  SERVICE_REQUEST_REQUIRED_SKILLS {
    uuid service_request_id FK
    uuid skill_id FK
  }

  SERVICE_REQUEST_ATTACHMENTS {
    uuid id PK
    uuid service_request_id FK
    uuid uploaded_by_user_id FK
    varchar file_name
    varchar storage_key
    varchar kind
  }

  ASSIGNMENTS {
    uuid id PK
    uuid service_request_id FK
    uuid technician_id FK
    uuid assigned_by_user_id FK
    assignment_status status
    timestamptz starts_at
    timestamptz ends_at
  }

  WORK_REPORTS {
    uuid id PK
    uuid service_request_id FK
    uuid assignment_id FK
    uuid technician_id FK
    text summary
    timestamptz completed_at
  }

  INVENTORY_ITEMS {
    uuid id PK
    varchar sku UK
    varchar name
    int quantity_on_hand
    varchar unit
    boolean is_active
  }

  MATERIAL_USAGES {
    uuid id PK
    uuid work_report_id FK
    uuid inventory_item_id FK
    int quantity
  }

  SLA_DEADLINE_EVENTS {
    uuid id PK
    uuid service_request_id FK
    sla_deadline_type deadline_type
    varchar event_type
    timestamptz deadline_at
    timestamptz occurred_at
  }

  NOTIFICATIONS {
    uuid id PK
    uuid recipient_user_id FK
    varchar type
    varchar channel
    notification_status status
    jsonb payload
  }

  AUDIT_LOGS {
    uuid id PK
    uuid actor_user_id FK
    varchar action
    varchar entity_type
    uuid entity_id
    jsonb old_value
    jsonb new_value
  }

  OUTBOX_EVENTS {
    uuid id PK
    varchar event_type
    varchar aggregate_type
    uuid aggregate_id
    jsonb payload
    outbox_status status
    int attempts
  }

  USERS ||--o{ USER_ROLES : has
  ROLES ||--o{ USER_ROLES : assigned_to

  SERVICE_CATEGORIES ||--o{ SERVICE_TYPES : contains
  SLA_POLICIES ||--o{ SERVICE_TYPES : applies_to
  SERVICE_TYPES ||--o{ SERVICE_TYPE_REQUIRED_SKILLS : requires
  SKILLS ||--o{ SERVICE_TYPE_REQUIRED_SKILLS : required_by

  USERS ||--o{ CUSTOMER_ADDRESSES : owns
  SERVICE_AREAS ||--o{ CUSTOMER_ADDRESSES : contains

  USERS ||--o| TECHNICIANS : has_profile
  TECHNICIANS ||--o{ TECHNICIAN_SKILLS : has
  SKILLS ||--o{ TECHNICIAN_SKILLS : assigned_to
  TECHNICIANS ||--o{ TECHNICIAN_SERVICE_AREAS : serves
  SERVICE_AREAS ||--o{ TECHNICIAN_SERVICE_AREAS : served_by
  TECHNICIANS ||--o{ TECHNICIAN_AVAILABILITY_WINDOWS : has

  USERS ||--o{ SERVICE_REQUESTS : creates
  SERVICE_CATEGORIES ||--o{ SERVICE_REQUESTS : classifies
  SERVICE_TYPES ||--o{ SERVICE_REQUESTS : defines_work
  CUSTOMER_ADDRESSES ||--o{ SERVICE_REQUESTS : location_for
  SLA_POLICIES ||--o{ SERVICE_REQUESTS : controls_deadlines

  SERVICE_REQUESTS ||--o{ SERVICE_REQUEST_REQUIRED_SKILLS : needs
  SKILLS ||--o{ SERVICE_REQUEST_REQUIRED_SKILLS : needed_by
  SERVICE_REQUESTS ||--o{ SERVICE_REQUEST_ATTACHMENTS : has
  USERS ||--o{ SERVICE_REQUEST_ATTACHMENTS : uploads

  SERVICE_REQUESTS ||--o{ ASSIGNMENTS : receives
  TECHNICIANS ||--o{ ASSIGNMENTS : assigned_to
  USERS ||--o{ ASSIGNMENTS : assigned_by

  SERVICE_REQUESTS ||--o| WORK_REPORTS : completed_with
  ASSIGNMENTS ||--o| WORK_REPORTS : completed_by
  TECHNICIANS ||--o{ WORK_REPORTS : writes

  WORK_REPORTS ||--o{ MATERIAL_USAGES : records
  INVENTORY_ITEMS ||--o{ MATERIAL_USAGES : consumed_by

  SERVICE_REQUESTS ||--o{ SLA_DEADLINE_EVENTS : produces
  USERS ||--o{ NOTIFICATIONS : receives
  USERS ||--o{ AUDIT_LOGS : performs
```

## 4. Important Modeling Notes

### Users and Technicians

`technicians` is a profile table over `users`.

This means:

```text
one user can have zero or one technician profile
one technician profile belongs to exactly one user
```

Not every user is a technician. Customers, dispatchers, and admins are regular users with roles.

### Skills

Skills are used in two places:

```text
service_types define default required skills
service_requests store copied or triaged required skills
technicians store possessed skills
```

This is deliberate. A request keeps a snapshot of required skills so later catalog edits do not silently change existing requests.

### Service Areas

Customer addresses belong to a service area.

Technicians serve many service areas through `technician_service_areas`.

Assignment checks compare:

```text
request address service_area_id
technician_service_areas.service_area_id
```

### Assignments

A service request can have many assignment rows historically, but only active assignments should block technician time.

Active statuses:

```text
assigned
accepted
on_the_way
in_progress
```

Cancelled or completed assignments should not block future scheduling.

### Work Reports and Materials

Each completed service request should have one work report.

A work report can contain many material usages.

Inventory is decremented in the same transaction as completion.

### Outbox

`outbox_events` is intentionally not linked by foreign key to every aggregate table because it stores events for multiple aggregate types.

It uses:

```text
aggregate_type
aggregate_id
```

This is a common tradeoff for generic event storage.
