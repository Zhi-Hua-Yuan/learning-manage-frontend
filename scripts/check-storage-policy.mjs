import { storageAssetPolicy } from './storage-asset-policy.mjs'
import { scanStorageSources } from './storage-source-scanner.mjs'

const direct = (id, file, storage, operations, argument) => ({ id, file, storage, operations, argument })
const indirect = (ids, file, operations) => ({ ids, file, storage: 'cacheHelper', operations })

export const STORAGE_ACCESS_RULES = Object.freeze([
  direct('S7-CACHE-001', 'src/utils/authToken.ts', 'localStorage', ['getItem', 'setItem', 'removeItem'], /AUTH_TOKEN_KEY/),
  direct('S7-CACHE-003', 'src/layout/BasicLayout.vue', 'localStorage', ['getItem', 'setItem'], /tick_sidebarWidth/),
  direct('S7-CACHE-004', 'src/views/task/TaskList.vue', 'localStorage', ['getItem', 'setItem'], /tick_detailWidth/),
  direct('S7-CACHE-013', 'src/utils/cacheVersion.ts', 'localStorage', ['getItem', 'setItem'], /BACKEND_CACHE_VERSION_KEY/),
  direct('S7-CACHE-014', 'src/utils/cacheVersion.ts', 'sessionStorage', ['getItem', 'setItem'], /BACKEND_CACHE_RELOAD_LOCK_KEY/),
  direct('S7-CACHE-015', 'src/views/ai/AiDraftDetail.vue', 'sessionStorage', ['getItem', 'setItem'], /getOperationStorageKey/),
  indirect(['S7-CACHE-002', 'S7-CACHE-005', 'S7-CACHE-010', 'S7-CACHE-011', 'S7-CACHE-012'], 'src/utils/appCache.ts', ['readCache', 'writeCache', 'removeCache', 'readRawStorage']),
  indirect(['S7-CACHE-006', 'S7-CACHE-007'], 'src/utils/projectCache.ts', ['readCache', 'writeCache', 'removeCache']),
  indirect(['S7-CACHE-008', 'S7-CACHE-009'], 'src/utils/taskCache.ts', ['readCache', 'writeCache', 'removeCache', 'listStorageKeys', 'removeRawStorage']),
  { id: 'GATEWAY-CACHE-CLIENT', file: 'src/utils/cacheClient.ts', storage: 'localStorage', operations: ['getItem', 'setItem', 'removeItem', 'key', 'length'], gateway: true },
  { id: 'GATEWAY-CACHE-HELPERS', file: 'src/utils/cacheClient.ts', storage: 'cacheHelper', operations: ['readCache', 'writeCache', 'removeCache', 'readRawStorage', 'writeRawStorage', 'removeRawStorage', 'listStorageKeys'], gateway: true },
  { id: 'GATEWAY-CACHE-VERSION-LIST', file: 'src/utils/cacheVersion.ts', storage: 'cacheHelper', operations: ['listStorageKeys'], gateway: true },
  { id: 'GATEWAY-CACHE-MIGRATION', file: 'src/utils/cacheMigration.ts', storage: 'cacheHelper', operations: ['listStorageKeys', 'removeRawStorage'], gateway: true },
  { id: 'GATEWAY-CACHE-VERSION-CLEAR', file: 'src/utils/cacheVersion.ts', storage: 'localStorage', operations: ['removeItem', 'key', 'length'], gateway: true },
])

const policyById = new Map(storageAssetPolicy.map((asset) => [asset.id, asset]))
const ruleMatches = (asset, rule) => {
  if (asset.file !== rule.file || asset.storage !== rule.storage || !rule.operations.includes(asset.operation)) return false
  return !rule.argument || rule.argument.test(asset.argument || '')
}

export const evaluateStoragePolicy = (assets, { rules = STORAGE_ACCESS_RULES, policy = storageAssetPolicy, enforceCoverage = true } = {}) => {
  const violations = []
  const matchedIds = new Set()
  for (const asset of assets) {
    if (asset.storage === 'storageAlias') {
      violations.push({ code: 'STORAGE_ALIAS_FORBIDDEN', file: asset.file, line: asset.line, expression: asset.expression, message: 'storage objects must not be aliased outside a registered gateway' })
      continue
    }
    const matches = rules.filter((rule) => ruleMatches(asset, rule))
    if (matches.length === 0) {
      violations.push({ code: 'UNREGISTERED_ACCESS', file: asset.file, line: asset.line, expression: asset.expression, message: 'storage access is not covered by a registered policy rule' })
      continue
    }
    if (matches.length > 1 && !matches.every((rule) => rule.gateway)) {
      violations.push({ code: 'AMBIGUOUS_POLICY', file: asset.file, line: asset.line, expression: asset.expression, message: 'storage access matches more than one policy rule' })
      continue
    }
    for (const rule of matches) for (const id of rule.ids || (rule.id && !rule.gateway ? [rule.id] : [])) matchedIds.add(id)
  }
  if (enforceCoverage) {
    for (const asset of policy.filter((item) => item.id.startsWith('S7-CACHE-'))) {
      if (!matchedIds.has(asset.id)) violations.push({ code: 'STALE_POLICY_ENTRY', file: asset.source, line: null, expression: asset.currentKey, message: `${asset.id} has no scanned access evidence` })
    }
  }
  for (const rule of rules) {
    for (const id of rule.ids || (rule.id && !rule.gateway ? [rule.id] : [])) {
      const policyAsset = policyById.get(id)
      if (!policyAsset) violations.push({ code: 'UNKNOWN_POLICY_ASSET', file: rule.file, line: null, expression: id, message: 'access rule references an unknown storage asset' })
      else if (policyAsset.source !== rule.file) violations.push({ code: 'POLICY_SOURCE_MISMATCH', file: rule.file, line: null, expression: id, message: `${id} policy source is ${policyAsset.source}` })
    }
  }
  return violations
}

export const formatStoragePolicyViolations = (violations) => [
  `Storage policy check failed: ${violations.length} violation(s)`,
  ...violations.map((violation) => `${violation.code}\n${violation.file}${violation.line ? `:${violation.line}` : ''}\n${violation.expression || ''}\n${violation.message}`),
].join('\n\n')

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const assets = scanStorageSources({ sourceRoots: ['src'] })
  const violations = evaluateStoragePolicy(assets)
  if (violations.length > 0) {
    console.error(formatStoragePolicyViolations(violations))
    process.exitCode = 1
  } else {
    console.log(`Storage policy check passed: ${assets.length} production access(es) covered.`)
  }
}
