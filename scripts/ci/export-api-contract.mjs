#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { buildContract, serializeContract } from './lib/api-contract.mjs'

function argumentValue(args, name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function usage() {
  console.error('Usage: node scripts/ci/export-api-contract.mjs [--check] [--stdout] [--root DIR] [--output FILE]')
}

const args = process.argv.slice(2)
if (args.includes('--help')) {
  usage()
  process.exit(0)
}

try {
  const rootDir = path.resolve(argumentValue(args, '--root') ?? process.cwd())
  const contractText = serializeContract(buildContract({ rootDir }))
  const digest = crypto.createHash('sha256').update(contractText).digest('hex')

  if (args.includes('--check')) {
    const second = serializeContract(buildContract({ rootDir }))
    if (contractText !== second) throw new Error('Contract export is not deterministic')
    const contract = JSON.parse(contractText)
    if (contract.schemaVersion !== 1 || contract.basePath !== '/api' || contract.operations.length === 0) {
      throw new Error('Contract does not satisfy the required schema invariants')
    }
    console.log(`API contract valid: ${contract.operations.length} operations; sha256=${digest}`)
    process.exit(0)
  }

  if (args.includes('--stdout')) {
    process.stdout.write(contractText)
    process.exit(0)
  }

  const outputPath = path.resolve(rootDir, argumentValue(args, '--output') ?? 'ci-artifacts/frontend-api-contract.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, contractText, 'utf8')
  const hashPath = path.join(path.dirname(outputPath), `${path.basename(outputPath, path.extname(outputPath))}.sha256`)
  fs.writeFileSync(hashPath, `${digest}  ${path.basename(outputPath)}\n`, 'utf8')
  const contract = JSON.parse(contractText)
  console.log(`API contract exported: ${path.relative(rootDir, outputPath)}; operations=${contract.operations.length}; sha256=${digest}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
