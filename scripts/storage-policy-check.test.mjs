import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { evaluateStoragePolicy, STORAGE_ACCESS_RULES } from './check-storage-policy.mjs'
import { scanStorageSources } from './storage-source-scanner.mjs'

const withFixture = (source, callback) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wp7-storage-policy-'))
  fs.mkdirSync(path.join(directory, 'src'), { recursive: true })
  fs.writeFileSync(path.join(directory, 'src', 'fixture.ts'), source)
  try { return callback(directory) } finally { fs.rmSync(directory, { recursive: true, force: true }) }
}

test('accepts a registered direct storage access', () => {
  withFixture("window.localStorage.getItem('tick_sidebarWidth')", (rootDir) => {
    const assets = scanStorageSources({ rootDir })
    const violations = evaluateStoragePolicy(assets, { rules: [{ file: 'src/fixture.ts', storage: 'localStorage', operations: ['getItem'], argument: /tick_sidebarWidth/ }], policy: [], enforceCoverage: false })
    assert.deepEqual(violations, [])
  })
})

test('rejects an unregistered key', () => {
  withFixture("window.localStorage.setItem('tick_unknown_business_cache', 'x')", (rootDir) => {
    const violations = evaluateStoragePolicy(scanStorageSources({ rootDir }), { rules: STORAGE_ACCESS_RULES, policy: [], enforceCoverage: false })
    assert.equal(violations[0]?.code, 'UNREGISTERED_ACCESS')
  })
})

test('rejects an unregistered session storage key', () => {
  withFixture("window.sessionStorage.setItem('unknown-operation', 'x')", (rootDir) => {
    const violations = evaluateStoragePolicy(scanStorageSources({ rootDir }), { rules: STORAGE_ACCESS_RULES, policy: [], enforceCoverage: false })
    assert.equal(violations[0]?.code, 'UNREGISTERED_ACCESS')
  })
})

test('rejects a storage alias outside a gateway', () => {
  withFixture("const storage = window.localStorage; storage.setItem('tick_sidebarWidth', '1')", (rootDir) => {
    const assets = scanStorageSources({ rootDir })
    assert.equal(assets[0]?.storage, 'storageAlias')
    const violations = evaluateStoragePolicy(assets, { rules: STORAGE_ACCESS_RULES, policy: [], enforceCoverage: false })
    assert.equal(violations[0]?.code, 'STORAGE_ALIAS_FORBIDDEN')
  })
})

test('scans storage length and key operations', () => {
  withFixture('window.localStorage.length; window.localStorage.key(0)', (rootDir) => {
    const assets = scanStorageSources({ rootDir })
    assert.deepEqual(assets.map((asset) => asset.operation).sort(), ['key', 'length'])
  })
})
