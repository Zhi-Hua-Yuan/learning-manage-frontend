import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const exporter = path.resolve('scripts/ci/export-api-contract.mjs')

function createFixture(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-manage-api-contract-'))
  fs.mkdirSync(path.join(root, 'src', 'api'), { recursive: true })
  fs.writeFileSync(path.join(root, 'src', 'api', 'fixture.ts'), source, 'utf8')
  return root
}

function runFixture(source) {
  const root = createFixture(source)
  try {
    const output = execFileSync(process.execPath, [exporter, '--root', root, '--stdout'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return JSON.parse(output)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test('extracts literal and encoded template paths and removes duplicates', () => {
  const contract = runFixture(`
    const first = () => request.get('/project/list')
    const second = (id: string) => request.post(\`/project/delete/\${id}\`)
    const third = (draftId: string) => request.get(\`/ai/draft/\${encodeURIComponent(draftId)}\`)
    const duplicate = () => request.get('/project/list')
  `)

  assert.deepEqual(contract.operations, [
    { method: 'GET', path: '/ai/draft/{draftId}' },
    { method: 'POST', path: '/project/delete/{id}' },
    { method: 'GET', path: '/project/list' },
  ])
})

test('rejects dynamic URLs and paths with a base prefix', () => {
  assert.throws(() => runFixture("const path = '/user/me'; request.get(path)"))
  assert.throws(() => runFixture("request.get('/api/user/me')"))
  assert.throws(() => runFixture("request.get('/user/me?from=home')"))
})

test('exports the current API source deterministically', () => {
  const first = execFileSync(process.execPath, [exporter, '--check'], { encoding: 'utf8' })
  const second = execFileSync(process.execPath, [exporter, '--check'], { encoding: 'utf8' })
  assert.equal(first, second)
  assert.match(first, /API contract valid: 44 operations; sha256=[0-9a-f]{64}/)

  const current = JSON.parse(execFileSync(process.execPath, [exporter, '--stdout'], { encoding: 'utf8' }))
  const stage0 = JSON.parse(
    fs.readFileSync(path.resolve('contracts/frontend-api-contract.stage0.json'), 'utf8'),
  )
  const key = (operation) => `${operation.method} ${operation.path}`
  const currentKeys = new Set(current.operations.map(key))
  const stage0Keys = new Set(stage0.operations.map(key))

  assert.equal(stage0.operations.length, 37)
  for (const operation of stage0.operations) assert.ok(currentKeys.has(key(operation)), key(operation))

  const added = current.operations
    .filter((operation) => !stage0Keys.has(key(operation)))
    .map(key)
    .sort()
  assert.deepEqual(added, [
    'GET /project/team/list',
    'GET /review/team',
    'GET /task/{taskId}/assignment-history',
    'GET /team/my',
    'GET /team/{teamId}/members',
    'POST /task/assign',
    'POST /task/status/change',
  ].sort())
  assert.equal(current.operations.length, 44)
  assert.equal(currentKeys.has('POST /team/leave'), false)
  assert.equal(currentKeys.has('POST /team/member/remove'), false)
})
