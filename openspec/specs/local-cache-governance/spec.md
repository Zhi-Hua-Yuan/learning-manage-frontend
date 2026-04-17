# local-cache-governance Specification

## Purpose
TBD - created by archiving change organize-frontend-local-cache. Update Purpose after archive.
## Requirements
### Requirement: Centralized cache registry
The frontend MUST define all managed local cache entries in a centralized registry, including cache key, TTL, schema version, and owner module.

#### Scenario: Registry lookup for managed key
- **WHEN** any module reads or writes a managed cache entry
- **THEN** the operation SHALL resolve metadata from the centralized registry instead of hardcoding key or TTL inline

### Requirement: Unified cache access boundary
Managed local cache operations MUST go through a unified cache access layer instead of direct `localStorage` calls in view components.

#### Scenario: Component reads managed preference
- **WHEN** a view component needs a managed cache value (for example selected project or AI draft)
- **THEN** it SHALL call the unified cache access layer and SHALL NOT directly call `localStorage.getItem`

### Requirement: Version-aware cache decode
The cache layer MUST validate schema version and payload shape before returning data to callers.

#### Scenario: Version mismatch found
- **WHEN** cached data schema version differs from the registry version
- **THEN** the cache layer SHALL treat the cache as invalid and return a cache miss result

### Requirement: Cache observability hooks
The cache layer MUST provide lightweight observability signals for hit, miss, expiry, and invalid-schema outcomes.

#### Scenario: Cache entry expired
- **WHEN** a caller reads a managed cache entry past TTL
- **THEN** the cache layer SHALL return a miss and emit an expiry outcome for diagnostics

