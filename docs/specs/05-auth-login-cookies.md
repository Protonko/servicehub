# 05 - Auth Login And Cookies

## Goal

Authenticate users and issue httpOnly auth cookies.

## Scope

In scope:

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
LoginUseCase
RefreshSessionUseCase
JWT token service
httpOnly access and refresh cookies
cookie clearing
```

## Out Of Scope

```text
refresh token database storage
token rotation/revocation
GET /auth/me
role guards
password reset
MFA
audit/outbox
```

## Roles

```text
public for login
authenticated refresh cookie for refresh/logout
```

## API Endpoints

`POST /api/v1/auth/login`

Request:

```json
{
  "email": "customer@example.com",
  "password": "strong-password"
}
```

Response `200 OK`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "fullName": "Jane Customer",
      "roles": ["customer"]
    }
  }
}
```

Sets:

```text
access_token httpOnly cookie
refresh_token httpOnly cookie
```

`POST /api/v1/auth/refresh`

Uses valid refresh cookie and sets a new access cookie.

`POST /api/v1/auth/logout`

Clears auth cookies.

Errors:

```text
400 invalid DTO
401 invalid credentials or invalid refresh token
403 inactive user login
```

## Data Model Changes

None.

## Domain Rules

```text
invalid credentials return 401 without revealing which field failed
inactive user cannot log in
tokens include user id and role codes
access token is short-lived
refresh token is longer-lived
cookies are httpOnly and sameSite=lax
```

## Application Use Cases

```text
LoginUseCase
RefreshSessionUseCase
```

`Logout` is HTTP cookie clearing only in this stateless MVP slice.

## Transaction Boundaries

None. No state changes are persisted in this slice.

## Events And Background Jobs

None.

## Authorization Rules

Refresh requires a valid refresh cookie.

Logout is idempotent and clears cookies whether or not a valid session exists.

## Validation Rules

```text
login email must be valid
login password must be non-empty
refresh cookie must verify with refresh token purpose
```

## Test Plan

Unit:

```text
login succeeds with valid credentials and active user
login rejects invalid password with 401
login rejects inactive user with 403
refresh rejects invalid token
```

API:

```text
login sets httpOnly cookies
logout clears cookies
refresh sets new access cookie
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

Architecture: approved. Stateless refresh is explicit for MVP; persistent
session rotation can be added later without changing user persistence.

Test review: sufficient for this slice.

Stakeholder review: accepted. This enables account access while preserving
backend-only security checks.
