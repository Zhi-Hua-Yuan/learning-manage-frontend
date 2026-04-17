## ADDED Requirements

### Requirement: Project and aggregate cache synchronization
Task write operations MUST keep project-scoped task cache and aggregate all-project task cache consistent for the affected project.

#### Scenario: Task update from project list
- **WHEN** a task is updated from the project task list
- **THEN** the system SHALL upsert the task in both the project-scoped cache and the aggregate cache slice for that project

### Requirement: Task deletion cache propagation
Task deletion MUST remove the task from both project-scoped and aggregate task caches.

#### Scenario: Delete task from any task view
- **WHEN** a task deletion is confirmed by API success
- **THEN** the system SHALL remove the task from both cache shapes before the next board render cycle

### Requirement: Full project refresh backfills aggregate cache
After successful project task reload, the aggregate cache for that project MUST be overwritten with latest server records.

#### Scenario: Project task list fetched from API
- **WHEN** project tasks are fetched successfully
- **THEN** the system SHALL write project cache and SHALL synchronize aggregate cache using the fetched project dataset

### Requirement: Read-path fallback consistency
Today/Week board reads MUST prefer aggregate cache and MUST degrade gracefully to API results when aggregate cache is unavailable or stale.

#### Scenario: Aggregate cache miss on board open
- **WHEN** Today/Week board opens and aggregate cache is missing or expired
- **THEN** the board SHALL fetch task records from API and SHALL refresh aggregate cache with returned data
