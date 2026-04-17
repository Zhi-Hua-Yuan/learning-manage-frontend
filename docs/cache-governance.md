# Frontend Cache Governance

## Scope

This document defines the local cache governance for frontend runtime storage.

## Managed Cache Registry

Managed entries are declared in `src/utils/cacheRegistry.ts` and accessed through `src/utils/cacheClient.ts`.

Current managed keys:
- `tick_selectedProjectId`: selected project persistence for task board navigation.
- `tick_themeMode`: theme mode persistence.
- `tick_aiPlannerDraft_v1`: AI planner draft persistence.
- `tick:cache:task-list:v1:<projectId>`: project-scoped task list cache.
- `tick:cache:task-list:all:v1`: aggregate task cache for Today/Week board.
- `tick:cache:project-list:status-{0|1}:v1`: project list cache.
- `tick:cache:project-progress:v2`: project progress cache map.

Each managed entry is governed by:
- `key`: storage key name.
- `ttlMs`: expiration policy (`null` means no TTL).
- `version`: schema version for envelope decode.
- `owner`: owning module/domain.

## Envelope Contract

Managed cache payload format:

```json
{
  "version": 1,
  "updatedAt": 1710000000000,
  "data": {}
}
```

Read behavior:
- Invalid payload returns cache miss.
- Version mismatch returns cache miss.
- TTL expired returns cache miss.
- Legacy versionless envelopes can be upgraded by compatible readers.

## Token Policy

Auth token remains outside generic cache envelope and is handled only by `src/utils/authToken.ts`.

Policy:
- Key: `token`
- Owner: `auth`
- Storage: `localStorage`
- Format: plain string token (request layer adds `Bearer` prefix when needed)
- Access boundary: router guards, login/logout flows, and request interceptor must call `authToken` utils

## Migration Notes

Completed in this rollout:
- Migrate selected project persistence to unified cache client (`appCache`).
- Migrate AI planner draft persistence to unified cache client (`appCache`).
- Migrate theme mode persistence to unified cache client (`appCache`).
- Keep token handling centralized in `authToken` module.
- Move task cache consistency helpers (`upsert/remove/sync`) into `taskCache` module.

## Rollback Path

If cache governance introduces regressions:
1. Revert callers to previous direct key access in the affected module.
2. Keep existing storage keys unchanged to preserve user data.
3. Disable strict view-storage guard by temporarily removing `lint:cache-views`.
4. Re-run type-check/lint and validate task board cache paths before re-enabling guards.
