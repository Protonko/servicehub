# Backend Design Specifications

This folder contains SDD documents that define the backend before implementation.

Read these files together:

```text
DATABASE_SCHEMA.md
ER_DIAGRAM.md
API_ENDPOINTS.md
SERVICE_INTERACTIONS.md
```

Purpose:

```text
DATABASE_SCHEMA.md defines the PostgreSQL/TypeORM persistence model.
ER_DIAGRAM.md shows the database relationships as a graphical Mermaid ER diagram.
API_ENDPOINTS.md defines the REST API surface and permissions.
SERVICE_INTERACTIONS.md defines how modules, use cases, events, and workers cooperate.
```

These files are implementation guidance. They can change when requirements change, but code should not drift away from them silently.
