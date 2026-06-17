# Shared Helper And API Factory Conventions

## Goal

Define where framework-neutral shared utilities and API-layer response factories live, remove duplicated string trimming helpers from HTTP DTOs, and standardize the manual API error response envelope while the global error handling feature remains planned.

## Scope

- Add a `src/common` source layer for dependency-neutral helpers.
- Add TypeScript and Jest aliases for `@common/*`.
- Move shared trim behavior into one-file-per-utility modules.
- Keep `class-transformer` callback shapes local to DTO decorators.
- Add an API-layer error response factory for the documented HTTP error envelope.
- Replace duplicated controller-local `createErrorResponse` methods with the factory.

## Out Of Scope

- No business rules or domain model changes.
- No API contract changes.
- No database changes.
- No global exception filter or centralized application error mapping.

## Domain Rules

None. These helpers must remain business-agnostic.

## API Endpoints

None.

## Data Model Changes

None.

## Use Cases

None.

## Authorization Rules

None.

## Validation Rules

Existing DTO validation stays unchanged. Input string normalization keeps the current behavior:

- `trimString` trims string values and returns non-string values unchanged.
- `trimStringToNull` trims string values, converts empty trimmed strings to `null`, and returns `null` or `undefined` unchanged.

Manual business error responses keep the documented API shape:

```json
{
  "error": {
    "code": "REQUEST_CANNOT_BE_ASSIGNED",
    "message": "Request cannot be assigned before triage.",
    "details": {}
  }
}
```

## Transaction Boundaries

None.

## Events Or Background Jobs

None.

## Tests To Add

No dedicated tests are required for this refactor because the behavior is covered through existing DTO/API tests and the helpers have no behavior beyond existing normalization and response-shape rules.

## Manual Verification Command

```text
npm run typecheck
```

## Conventions

- Shared framework-neutral helpers live under `src/common`.
- Use one file per utility, named in kebab-case after the exported helper.
- Avoid broad bucket files such as `string.utils.ts`.
- Utility functions should accept ordinary values. Framework callback shapes, such as `class-transformer` transform arguments, stay in the owning layer.
- API response envelope factories live under `src/api/http/factories`.
- Use a named factory object when the helper represents an API contract, for example `ApiErrorResponseFactory.create(...)`.
- Do not use base controller inheritance for stateless response factories.
