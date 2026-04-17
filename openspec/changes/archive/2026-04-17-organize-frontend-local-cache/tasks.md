## 1. Cache Governance Foundation

- [x] 1.1 Create a centralized cache registry module defining key, TTL, version, and owner for managed entries
- [x] 1.2 Implement a unified cache client wrapper (read/write/remove) with envelope validation and version checks
- [x] 1.3 Add development-only cache observability outputs for hit, miss, expiry, and invalid-schema outcomes

## 2. Task Cache Consistency

- [x] 2.1 Refactor task cache helpers to centralize upsert/remove/sync operations for project and aggregate cache shapes
- [x] 2.2 Ensure project task update and delete flows always propagate to both project-scoped and aggregate cache
- [x] 2.3 Ensure successful project task reload overwrites aggregate cache slice for the same project
- [x] 2.4 Add regression tests for due-date/status updates reflected consistently in list, Today, and Week boards

## 3. Gradual Migration of Direct localStorage Access

- [x] 3.1 Migrate selected project persistence (`tick_selectedProjectId`) to the unified cache client
- [x] 3.2 Migrate AI planner draft persistence to the unified cache client
- [x] 3.3 Migrate theme mode persistence to the unified cache client
- [x] 3.4 Keep token handling in auth module but register token policy in cache governance docs

## 4. Safeguards and Verification

- [x] 4.1 Add lint/scan rule or CI check to flag new direct `localStorage` access in view components (allowlist existing exceptions)
- [x] 4.2 Run type-check and targeted UI regression verification for task board cache consistency
- [x] 4.3 Document migration notes and rollback path for cache governance rollout
