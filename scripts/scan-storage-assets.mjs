import fs from 'node:fs'
import path from 'node:path'
import { scanStorageSources } from './storage-source-scanner.mjs'

const rootDir = process.cwd()
const outputDirectoryArgument = process.argv.indexOf('--output-dir')
if (outputDirectoryArgument >= 0 && !process.argv[outputDirectoryArgument + 1]) {
  throw new Error('--output-dir requires a directory path')
}
const outputDirectory = outputDirectoryArgument >= 0
  ? path.resolve(process.argv[outputDirectoryArgument + 1])
  : path.join(rootDir, 'ci-artifacts')

const assets = scanStorageSources({ rootDir })
const result = {
  generatedAt: new Date().toISOString(),
  root: rootDir,
  sourceRoots: ['src', 'scripts'],
  counts: {
    total: assets.length,
    localStorage: assets.filter((asset) => asset.storage === 'localStorage').length,
    sessionStorage: assets.filter((asset) => asset.storage === 'sessionStorage').length,
    cacheHelper: assets.filter((asset) => asset.storage === 'cacheHelper').length,
  },
  assets,
}

fs.mkdirSync(outputDirectory, { recursive: true })
fs.writeFileSync(
  path.join(outputDirectory, 'wp7-e1-1-storage-scan.json'),
  `${JSON.stringify(result, null, 2)}\n`,
)

const textLines = [
  'WP7-E1-1 storage asset scan',
  `generatedAt: ${result.generatedAt}`,
  `total: ${result.counts.total}`,
  `localStorage: ${result.counts.localStorage}`,
  `sessionStorage: ${result.counts.sessionStorage}`,
  `cacheHelper: ${result.counts.cacheHelper}`,
  '',
  ...assets.map((asset) => `${asset.storage}\t${asset.file}:${asset.line}\t${asset.expression}`),
  '',
]
fs.writeFileSync(path.join(outputDirectory, 'wp7-e1-1-storage-scan.txt'), textLines.join('\n'))

console.log(JSON.stringify({ ...result.counts, outputDirectory }, null, 2))
