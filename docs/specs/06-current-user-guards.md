# 06 - Current User And Guards

## Goal

Provide authenticated actor resolution and role authorization for future
endpoints.

## Scope

In scope:

```text
GET /api/v1/auth/me
AuthenticatedActor type
CurrentUser decorator
JwtAuthGuard
Roles decorator
RolesGuard
current user use case
```

## Out Of Scope

```text
resource ownership policies
permission table
admin user management
request/service-catalog endpoints
token revocation
```

## Roles

```text
customer
dispatcher
technician
admin
```

## API Endpoints

`GET /api/v1/auth/me`

Role:

```text
authenticated
```

Response:

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
401 missing/invalid/expired access cookie
401 user no longer exists
403 role guard rejects missing role
```

## Data Model Changes

None.

## Domain Rules

```text
authenticated actor comes from a verified access token
current user is loaded from persistence, not trusted only from JWT claims
inactive user cannot be used as authenticated actor
role guard permits users with at least one required role
role guard rejects users without required role
```

## Application Use Cases

`GetCurrentUserUseCase`

Input:

```text
authenticated user id
```

Output:

```text
current user summary
```

## Transaction Boundaries

None. This is read-only.

## Events And Background Jobs

None.

## Authorization Rules

```text
JwtAuthGuard requires valid access_token cookie
RolesGuard checks CurrentUser roles against metadata from @Roles()
```

Resource ownership policies are deferred to request/resource features.

## Validation Rules

```text
access token must verify with access token purpose
access token subject must be present
user must exist and be active
roles from database must be valid RoleCode values
```

## Test Plan

Unit:

```text
JwtAuthGuard accepts valid active user
JwtAuthGuard rejects missing token
RolesGuard allows matching role
RolesGuard rejects missing role
```

API:

```text
GET /auth/me returns current user
GET /auth/me without cookie returns 401
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

Architecture: approved. Guards own coarse auth, use case owns current-user read,
resource ownership remains deferred.

Test review: sufficient for guard foundation.

Stakeholder review: accepted. This enables protected workflows in later phases.
