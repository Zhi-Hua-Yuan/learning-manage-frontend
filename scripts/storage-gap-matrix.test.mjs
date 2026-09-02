import test from 'node:test'
import assert from 'node:assert/strict'
import { storageAssetPolicy } from './storage-asset-policy.mjs'
import {
  getStorageGap,
  getStorageGapsForAsset,
  storageGapMatrix,
  validateStorageGapMatrix,
} from './storage-gap-matrix.mjs'

test('routes every frozen persistent asset and preserves primary implementation ownership', () => {
  assert.deepEqual(validateStorageGapMatrix(), [])
  assert.equal(storageAssetPolicy.filter((asset) => asset.id.startsWith('S7-CACHE-')).length, 15)
  for (const asset of storageAssetPolicy.filter((item) => item.id.startsWith('S7-CACHE-'))) {
    assert.ok(getStorageGapsForAsset(asset.id).length > 0, `${asset.id} has no gap route`)
  }
})

test('represents cross-package responsibilities without duplicating primary ownership', () => {
  const routes = getStorageGapsForAsset('S7-CACHE-005').map((gap) => gap.primaryTarget)
  assert.deepEqual(routes.sort(), ['E1-2', 'E1-3', 'E2'])
  assert.equal(getStorageGap('S7-GAP-003')?.primaryTarget, 'E1-2')
  assert.equal(getStorageGap('S7-GAP-005')?.primaryTarget, 'E1-3')
  assert.equal(getStorageGap('S7-GAP-008')?.primaryTarget, 'E2')
})

test('rejects unknown assets, invalid targets and unowned implementation targets', () => {
  const invalid = storageGapMatrix.map((gap) => ({ ...gap, assetIds: [...gap.assetIds] }))
  invalid[0] = { ...invalid[0], assetIds: ['S7-CACHE-UNKNOWN'] }
  invalid[1] = { ...invalid[1], primaryTarget: 'E9' }
  invalid[2] = { ...invalid[2], assetIds: ['S7-CACHE-002'] }

  const violations = validateStorageGapMatrix({ gaps: invalid })
  assert.ok(violations.some((item) => item.includes('unknown asset')))
  assert.ok(violations.some((item) => item.includes('invalid primaryTarget')))
  assert.ok(violations.some((item) => item.includes('implementationTarget KEEP')))
})

test('rejects unknown dependencies and duplicate gap identifiers', () => {
  const invalid = [
    { ...storageGapMatrix[0], gapId: 'S7-GAP-DUPLICATE', dependencies: ['S7-GAP-NOT-FOUND'] },
    { ...storageGapMatrix[1], gapId: 'S7-GAP-DUPLICATE' },
  ]
  const violations = validateStorageGapMatrix({ assets: [], gaps: invalid })
  assert.ok(violations.some((item) => item.includes('unknown dependency')))
  assert.ok(violations.some((item) => item.includes('duplicate gapId')))
})
