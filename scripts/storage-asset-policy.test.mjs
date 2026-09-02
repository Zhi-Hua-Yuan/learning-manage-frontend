import test from 'node:test'
import assert from 'node:assert/strict'

import {
  IMPLEMENTATION_TARGETS,
  LEGACY_ACTIONS,
  STORAGE_SCOPES,
  STORAGE_SENSITIVITY,
  storageAssetPolicy,
} from './storage-asset-policy.mjs'

const expectedCacheIds = Array.from({ length: 15 }, (_, index) => `S7-CACHE-${String(index + 1).padStart(3, '0')}`)
const expectedMemoryIds = Array.from({ length: 11 }, (_, index) => `S7-MEM-${String(index + 1).padStart(3, '0')}`)

test('contains the complete E1-1.1 asset inventory', () => {
  const ids = storageAssetPolicy.map((asset) => asset.id)
  assert.equal(storageAssetPolicy.length, 26)
  assert.deepEqual(ids, [...expectedCacheIds, ...expectedMemoryIds])
  assert.equal(new Set(ids).size, ids.length)
})

test('has a complete, closed classification for every asset', () => {
  for (const asset of storageAssetPolicy) {
    assert.ok(asset.name)
    assert.ok(asset.source)
    assert.ok(STORAGE_SCOPES.includes(asset.targetScope))
    assert.ok(STORAGE_SENSITIVITY.includes(asset.sensitivity))
    assert.ok(LEGACY_ACTIONS.includes(asset.legacyAction))
    assert.ok(IMPLEMENTATION_TARGETS.includes(asset.implementationTarget))
    assert.equal(typeof asset.persistenceAllowed, 'boolean')
    assert.equal(typeof asset.actorRequired, 'boolean')
    assert.equal(typeof asset.clearOnSessionEnd, 'boolean')
    assert.equal(typeof asset.clearOnBackendVersionChange, 'boolean')
    assert.ok(asset.rationale)

    if (asset.targetScope === 'MEMORY_ONLY') {
      assert.equal(asset.persistenceAllowed, false)
      assert.equal(asset.clearOnSessionEnd, true)
      assert.equal(asset.staleGuardRequired, true)
      assert.ok(asset.resetTarget)
      assert.equal(asset.currentStorage, 'memory')
    }
    if (asset.targetScope === 'GLOBAL_PREFERENCE') {
      assert.equal(asset.actorRequired, false)
      assert.equal(asset.clearOnSessionEnd, false)
      assert.equal(asset.clearOnBackendVersionChange, false)
    }
    if (asset.targetScope === 'ACTOR_RESOURCE' || asset.targetScope === 'ACTOR_DRAFT') {
      assert.equal(asset.actorRequired, true)
      assert.equal(asset.clearOnSessionEnd, true)
      assert.equal(asset.legacyAction, 'DROP')
    }
    if (asset.targetScope === 'SESSION_OPERATION') {
      assert.equal(asset.actorRequired, true)
      assert.equal(asset.clearOnSessionEnd, true)
      assert.equal(asset.legacyAction, 'DROP')
    }
    if (asset.sensitivity === 'SECRET') {
      assert.equal(asset.targetScope, 'AUTH_CREDENTIAL')
      assert.equal(asset.clearOnSessionEnd, true)
    }
  }
})

test('keeps infrastructure metadata separate from resource invalidation', () => {
  const infrastructure = storageAssetPolicy.filter((asset) => asset.targetScope === 'INFRASTRUCTURE')
  assert.deepEqual(infrastructure.map((asset) => asset.id), ['S7-CACHE-013', 'S7-CACHE-014'])
  assert.ok(infrastructure.every((asset) => asset.clearOnSessionEnd === false))
  assert.ok(infrastructure.every((asset) => asset.clearOnBackendVersionChange === false))
})

test('does not classify sensitive memory assets as persistent storage', () => {
  const memoryAssets = storageAssetPolicy.filter((asset) => asset.id.startsWith('S7-MEM-'))
  assert.equal(memoryAssets.length, 11)
  assert.ok(memoryAssets.every((asset) => asset.persistenceAllowed === false))
  assert.ok(memoryAssets.every((asset) => asset.targetScope === 'MEMORY_ONLY'))
})
