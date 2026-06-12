# 04 - Auth Registration

## Goal

Allow public customer registration.

## Scope

In scope:

```text
POST /api/v1/auth/register
RegisterCustomerUseCase
password hashing adapter
customer role assignment
duplicate email handling
API DTOs and response mapping
focused use case and API tests
```

## Out Of Scope

```text
login
logout
refresh
JWT cookies
GET /auth/me
role guards
admin-created users
email verification
real notification provider
audit/outbox
```

## Roles

```text
public
```

## API Endpoints

`POST /api/v1/auth/register`

Request:

```json
{
  "email": "customer@example.com",
  "password": "strong-password",
  "fullName": "Jane Customer",
  "phone": "+995..."
}
```

Response:

```text
201 Created
```

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "fullName": "Jane Customer",
      "phone": "+995...",
      "roles": ["customer"]
    }
  }
}
```

Errors:

```text
400 invalid DTO
409 duplicate email
500 unexpected persistence/hash failure
```

## Data Model Changes

None.

Uses existing:

```text
users
roles
user_roles
```

## Domain Rules

```text
email is normalized to lowercase
email must be unique
password must be hashed before persistence
password_hash must not equal plain password
new public registration receives customer role
customer role must exist
```

## Application Use Cases

`RegisterCustomerUseCase`

Input:

```text
email
password
fullName
phone
```

Collaborators:

```text
UserRepository
PasswordHasher
```

Output:

```text
registered user summary
```

## Transaction Boundaries

The use case delegates persistence to `UserRepository.save`, which stores the
user and role links in one transaction.

No audit/outbox is written in this slice.

## Events And Background Jobs

None.

## Authorization Rules

Public endpoint. No authenticated actor is required.

## Validation Rules

```text
email must be a valid email
password length must be at least 8
fullName must be non-empty
phone is optional
unknown request properties are rejected by global validation pipe
```

## Test Plan

Unit:

```text
register hashes password and assigns customer role
duplicate email returns conflict
```

API:

```text
valid registration returns 201 and user summary
invalid DTO returns 400
duplicate email returns 409
```

## Manual Verification

```text
npm run typecheck
npm run build
npm test
npm run test:e2e
```

## Open Questions

```text
none
```

## Reviews

Requirements: ready.

Architecture: approved. Controller calls one use case; hashing is an infra
adapter; repository owns persistence.

Test review: sufficient for this slice.

Stakeholder review: accepted. This enables customers to create accounts without
exposing incomplete login/session behavior.
