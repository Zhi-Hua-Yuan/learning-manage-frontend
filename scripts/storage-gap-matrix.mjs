import { storageAssetPolicy } from './storage-asset-policy.mjs'

export const GAP_STATUSES = Object.freeze(['OPEN', 'MONITORED', 'BASELINE_CLOSED'])
export const GAP_TARGETS = Object.freeze(['KEEP', 'E1-2', 'E1-3', 'E2', 'E3'])
export const GAP_SEVERITIES = Object.freeze(['P0', 'P1', 'P2'])

/**
 * E1-1.5 routing matrix. The asset policy remains the source of truth for
 * asset classification; this matrix only records implementation ownership,
 * dependencies and verification required to close each remaining gap.
 */
export const storageGapMatrix = Object.freeze([
  {
    gapId: 'S7-GAP-001',
    assetIds: ['S7-CACHE-002', 'S7-CACHE-003', 'S7-CACHE-004'],
    currentState: 'REGISTERED_GLOBAL_PREFERENCE',
    targetInvariant: 'GLOBAL_PREFERENCE_IS_NOT_ACTOR_SCOPED_OR_SESSION_CLEARED',
    severity: 'P2',
    status: 'MONITORED',
    primaryTarget: 'KEEP',
    secondaryTargets: [],
    dependencies: [],
    verification: ['preference keys remain available after resource cache cleanup'],
  },
  {
    gapId: 'S7-GAP-002',
    assetIds: ['S7-CACHE-014'],
    currentState: 'REGISTERED_INFRASTRUCTURE_METADATA',
    targetInvariant: 'RELOAD_LOCK_REMAINS_SESSION_SCOPED_INFRASTRUCTURE_STATE',
    severity: 'P2',
    status: 'MONITORED',
    primaryTarget: 'KEEP',
    secondaryTargets: [],
    dependencies: [],
    verification: ['reload lock is not treated as actor resource'],
  },
  {
    gapId: 'S7-GAP-003',
    assetIds: ['S7-CACHE-005', 'S7-CACHE-006', 'S7-CACHE-007', 'S7-CACHE-008', 'S7-CACHE-009'],
    currentState: 'UNSCOPED_ACTOR_RESOURCE_KEYS',
    targetInvariant: 'ACTOR_SCOPED_KEYS_AND_FAIL_CLOSED_WITHOUT_ACTOR',
    severity: 'P0',
    status: 'OPEN',
    primaryTarget: 'E1-2',
    secondaryTargets: ['E1-3', 'E2'],
    dependencies: [],
    verification: ['actor A resource cache is unreadable by actor B', 'unknown actor cannot read or write protected resources'],
  },
  {
    gapId: 'S7-GAP-004',
    assetIds: ['S7-CACHE-010', 'S7-CACHE-011', 'S7-CACHE-012'],
    currentState: 'UNSCOPED_ACTOR_DRAFT_KEYS',
    targetInvariant: 'ACTOR_SCOPED_DRAFTS_AND_FAIL_CLOSED_WITHOUT_ACTOR',
    severity: 'P0',
    status: 'OPEN',
    primaryTarget: 'E1-2',
    secondaryTargets: ['E1-3', 'E2'],
    dependencies: [],
    verification: ['actor B cannot restore actor A draft or task context'],
  },
  {
    gapId: 'S7-GAP-005',
    assetIds: ['S7-CACHE-005', 'S7-CACHE-006', 'S7-CACHE-007', 'S7-CACHE-008', 'S7-CACHE-009', 'S7-CACHE-010', 'S7-CACHE-011', 'S7-CACHE-012'],
    currentState: 'LEGACY_UNSCOPED_KEYS_REMAIN',
    targetInvariant: 'LEGACY_UNSCOPED_BUSINESS_KEYS_ARE_DROPPED_WITHOUT_TOUCHING_PREFERENCES',
    severity: 'P0',
    status: 'OPEN',
    primaryTarget: 'E1-3',
    secondaryTargets: ['E1-2'],
    dependencies: ['S7-GAP-003', 'S7-GAP-004'],
    verification: ['known legacy business keys are removed', 'global preference keys survive migration'],
  },
  {
    gapId: 'S7-GAP-006',
    assetIds: ['S7-CACHE-013'],
    currentState: 'BROAD_TICK_PREFIX_VERSION_CLEAR',
    targetInvariant: 'BACKEND_VERSION_CLEAR_TARGETS_RESOURCE_CACHES_ONLY',
    severity: 'P1',
    status: 'OPEN',
    primaryTarget: 'E1-3',
    secondaryTargets: [],
    dependencies: ['S7-GAP-003', 'S7-GAP-004'],
    verification: ['version change clears resource caches', 'version change preserves preferences and infrastructure metadata'],
  },
  {
    gapId: 'S7-GAP-007',
    assetIds: ['S7-CACHE-001', 'S7-CACHE-015'],
    currentState: 'CREDENTIAL_AND_SESSION_OPERATION_NOT_UNIFIED',
    targetInvariant: 'SESSION_END_CLEARS_CREDENTIAL_AND_BUSINESS_OPERATION_STATE',
    severity: 'P0',
    status: 'OPEN',
    primaryTarget: 'E2',
    secondaryTargets: [],
    dependencies: [],
    verification: ['logout and authentication failure clear token and confirm operation state'],
  },
  {
    gapId: 'S7-GAP-008',
    assetIds: ['S7-CACHE-005', 'S7-CACHE-006', 'S7-CACHE-007', 'S7-CACHE-008', 'S7-CACHE-009', 'S7-CACHE-010', 'S7-CACHE-011', 'S7-CACHE-012'],
    currentState: 'ACTOR_RESOURCE_SESSION_RESET_NOT_INTEGRATED',
    targetInvariant: 'SESSION_END_REMOVES_ALL_PROTECTED_ACTOR_RESOURCES_AND_DRAFTS',
    severity: 'P0',
    status: 'OPEN',
    primaryTarget: 'E2',
    secondaryTargets: ['E1-2', 'E1-3'],
    dependencies: ['S7-GAP-003', 'S7-GAP-004', 'S7-GAP-005'],
    verification: ['logout and 401 remove all protected actor cache keys'],
  },
  {
    gapId: 'S7-GAP-009',
    assetIds: ['S7-MEM-001', 'S7-MEM-002', 'S7-MEM-003', 'S7-MEM-004', 'S7-MEM-005', 'S7-MEM-006', 'S7-MEM-007', 'S7-MEM-008', 'S7-MEM-009', 'S7-MEM-010', 'S7-MEM-011'],
    currentState: 'MEMORY_RESET_INTEGRATION_MISSING',
    targetInvariant: 'SESSION_END_AND_ACTOR_CHANGE_RESET_ALL_SENSITIVE_MEMORY',
    severity: 'P0',
    status: 'OPEN',
    primaryTarget: 'E2',
    secondaryTargets: ['E3'],
    dependencies: ['S7-GAP-007'],
    verification: ['session end resets collaboration, review, history, assignment and AI pending state'],
  },
  {
    gapId: 'S7-GAP-010',
    assetIds: ['S7-MEM-003'],
    currentState: 'TEAM_CONTEXT_REQUIRES_CROSS_PAGE_INVALIDATION',
    targetInvariant: 'TEAM_PROJECT_BUCKETS_PRUNE_ON_ACCESS_OR_CONTEXT_CHANGE',
    severity: 'P1',
    status: 'OPEN',
    primaryTarget: 'E3',
    secondaryTargets: ['E2'],
    dependencies: ['S7-GAP-009'],
    verification: ['team loss or context change removes stale team project data'],
  },
  {
    gapId: 'S7-GAP-011',
    assetIds: ['S7-MEM-005'],
    currentState: 'CAPABILITY_RESET_AND_STALE_GUARD_PARTIAL',
    targetInvariant: 'LATEST_TASK_FACTS_REPLACE_OPEN_TASK_AND_CAPABILITY',
    severity: 'P0',
    status: 'OPEN',
    primaryTarget: 'E3',
    secondaryTargets: ['E2'],
    dependencies: ['S7-GAP-003', 'S7-GAP-009'],
    verification: ['focus and permission refresh cannot restore stale capability'],
  },
  {
    gapId: 'S7-GAP-012',
    assetIds: ['S7-MEM-008'],
    currentState: 'PRIVATE_REVIEW_RESET_AND_STALE_GUARD_PARTIAL',
    targetInvariant: 'SESSION_RESET_CLEARS_PRIVATE_FORM_BUT_NETWORK_ERRORS_PRESERVE_IT',
    severity: 'P0',
    status: 'OPEN',
    primaryTarget: 'E2',
    secondaryTargets: ['E3'],
    dependencies: ['S7-GAP-009'],
    verification: ['actor change clears private form state', 'network failure preserves unsaved form'],
  },
  {
    gapId: 'S7-GAP-013',
    assetIds: ['S7-MEM-001', 'S7-MEM-002', 'S7-MEM-003', 'S7-MEM-004', 'S7-MEM-005', 'S7-MEM-006', 'S7-MEM-007', 'S7-MEM-008', 'S7-MEM-009', 'S7-MEM-010', 'S7-MEM-011'],
    currentState: 'MEMORY_ONLY_STORAGE_POLICY_COVERED',
    targetInvariant: 'SENSITIVE_MEMORY_ASSETS_REMAIN_NON_PERSISTED',
    severity: 'P1',
    status: 'BASELINE_CLOSED',
    primaryTarget: 'KEEP',
    secondaryTargets: [],
    dependencies: [],
    verification: ['storage policy scanner covers all production storage access', 'sensitive memory assets have no persistence access'],
  },
])

export const validateStorageGapMatrix = ({ assets = storageAssetPolicy, gaps = storageGapMatrix } = {}) => {
  const violations = []
  const knownAssetIds = new Set(assets.map((asset) => asset.id))
  const referenced = new Set()
  const primaryTargetsByAsset = new Map()

  for (const gap of gaps) {
    if (!gap.gapId || !GAP_STATUSES.includes(gap.status)) violations.push(`${gap.gapId || '<missing>'}: invalid status`)
    if (!GAP_TARGETS.includes(gap.primaryTarget)) violations.push(`${gap.gapId || '<missing>'}: invalid primaryTarget`)
    if (!GAP_SEVERITIES.includes(gap.severity)) violations.push(`${gap.gapId || '<missing>'}: invalid severity`)
    if (typeof gap.currentState !== 'string' || !gap.currentState.trim()) violations.push(`${gap.gapId || '<missing>'}: currentState is required`)
    if (typeof gap.targetInvariant !== 'string' || !gap.targetInvariant.trim()) violations.push(`${gap.gapId || '<missing>'}: targetInvariant is required`)
    if (!Array.isArray(gap.verification) || gap.verification.length === 0 || gap.verification.some((item) => typeof item !== 'string' || !item.trim())) {
      violations.push(`${gap.gapId || '<missing>'}: verification must contain non-empty strings`)
    }
    if (!Array.isArray(gap.assetIds) || gap.assetIds.length === 0) violations.push(`${gap.gapId || '<missing>'}: assetIds must be non-empty`)
    for (const id of gap.assetIds || []) {
      if (!knownAssetIds.has(id)) violations.push(`${gap.gapId}: unknown asset ${id}`)
      referenced.add(id)
      if (!primaryTargetsByAsset.has(id)) primaryTargetsByAsset.set(id, new Set())
      primaryTargetsByAsset.get(id).add(gap.primaryTarget)
    }
    for (const target of gap.secondaryTargets || []) {
      if (!GAP_TARGETS.includes(target)) violations.push(`${gap.gapId}: invalid secondaryTarget ${target}`)
    }
    for (const dependency of gap.dependencies || []) {
      if (!gaps.some((candidate) => candidate.gapId === dependency)) violations.push(`${gap.gapId}: unknown dependency ${dependency}`)
    }
  }

  for (const asset of assets.filter((item) => item.id.startsWith('S7-CACHE-'))) {
    if (!referenced.has(asset.id)) violations.push(`unrouted persistent asset ${asset.id}`)
  }

  for (const asset of assets) {
    const targets = primaryTargetsByAsset.get(asset.id) || new Set()
    if (!targets.has(asset.implementationTarget)) {
      violations.push(`${asset.id}: no gap owned by implementationTarget ${asset.implementationTarget}`)
    }
  }

  const duplicateGapIds = gaps.map((gap) => gap.gapId).filter((id, index, all) => all.indexOf(id) !== index)
  for (const gapId of duplicateGapIds) violations.push(`duplicate gapId ${gapId}`)

  return violations
}

export const getStorageGap = (gapId) => storageGapMatrix.find((gap) => gap.gapId === gapId) || null

export const getStorageGapsForAsset = (assetId) => storageGapMatrix.filter((gap) => gap.assetIds.includes(assetId))

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const violations = validateStorageGapMatrix()
  if (violations.length > 0) {
    console.error(`Storage gap matrix check failed: ${violations.length} violation(s)`)
    violations.forEach((violation) => console.error(`- ${violation}`))
    process.exitCode = 1
  } else {
    console.log(`Storage gap matrix check passed: ${storageAssetPolicy.length} assets routed across ${storageGapMatrix.length} gaps.`)
  }
}
