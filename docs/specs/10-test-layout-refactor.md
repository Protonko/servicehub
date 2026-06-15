# Test Layout Refactor

## Goal

Move existing automated tests out of implementation directories into explicit
`__tests__` directories while keeping each test near the code it verifies.

## Scope

- Move existing `*.spec.ts` files under `src` into the nearest relevant
  `__tests__` directory.
- Move existing e2e `*.e2e-spec.ts` files under `test` into `test/__tests__`.
- Update relative imports affected by the extra directory level.
- Keep the current Jest and e2e Jest matching behavior unless verification shows
  a config change is required.

## Out Of Scope

- Adding new behavior tests.
- Changing test assertions or application behavior.
- Changing production source layout.
- Changing database schema, migrations, or seed data.

## Domain Rules

No domain behavior changes.

## API Endpoints

No API contract changes.

## Data Model Changes

No data model changes.

## Use Cases

No application use case changes.

## Authorization Rules

No authorization behavior changes.

## Validation Rules

No validation behavior changes.

## Transaction Boundaries

No transaction behavior changes.

## Events Or Background Jobs

No event or background job changes.

## Tests To Add

No new tests are required because this is a structural refactor. Existing tests
must continue to run from their new locations.

## Manual Verification Command

```bash
npm test
npm run test:e2e
```

## Rollout Notes

The new convention is:

- Unit, application, controller, mapper, and migration tests live in a local
  `__tests__` directory near the implementation area they verify.
- E2e tests live in `test/__tests__`.
