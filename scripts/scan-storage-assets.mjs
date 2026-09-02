import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const sourceRoots = ['src', 'scripts']
const sourceExtensions = new Set(['.ts', '.vue', '.mjs', '.js'])
const patterns = [
  { kind: 'localStorage', regex: /(?:window\.)?localStorage\.(getItem|setItem|removeItem)\s*\(/g },
  { kind: 'sessionStorage', regex: /(?:window\.)?sessionStorage\.(getItem|setItem|removeItem)\s*\(/g },
  { kind: 'cacheHelper', regex: /\b(readCache|writeCache|removeCache|readRawStorage|writeRawStorage|removeRawStorage|listStorageKeys)\s*\(/g },
]

const walk = (directory) => {
  const files = []
  if (!fs.existsSync(directory)) return files

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(target))
      continue
    }
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(target)
  }
  return files
}

const shouldScan = (relativePath) => {
  if (relativePath === 'scripts/scan-storage-assets.mjs') return false
  if (relativePath.startsWith('src/test/')) return false
  if (relativePath.endsWith('.test.ts') || relativePath.endsWith('.spec.ts')) return false
  return true
}

const findLine = (content, offset) => content.slice(0, offset).split(/\r?\n/).length

const assets = []
for (const sourceRoot of sourceRoots) {
  for (const filePath of walk(path.join(rootDir, sourceRoot))) {
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/')
    if (!shouldScan(relativePath)) continue
    const content = fs.readFileSync(filePath, 'utf8')
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0
      let match
      while ((match = pattern.regex.exec(content)) !== null) {
        assets.push({
          storage: pattern.kind,
          expression: match[0].replace(/\s+/g, ' '),
          file: relativePath,
          line: findLine(content, match.index),
        })
      }
    }
  }
}

assets.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.storage.localeCompare(right.storage))

const result = {
  generatedAt: new Date().toISOString(),
  root: rootDir,
  sourceRoots,
  counts: {
    total: assets.length,
    localStorage: assets.filter((asset) => asset.storage === 'localStorage').length,
    sessionStorage: assets.filter((asset) => asset.storage === 'sessionStorage').length,
    cacheHelper: assets.filter((asset) => asset.storage === 'cacheHelper').length,
  },
  assets,
}

const outputDirectoryArgument = process.argv.indexOf('--output-dir')
if (outputDirectoryArgument >= 0 && !process.argv[outputDirectoryArgument + 1]) {
  throw new Error('--output-dir requires a directory path')
}
const outputDirectory = outputDirectoryArgument >= 0
  ? path.resolve(process.argv[outputDirectoryArgument + 1])
  : path.join(rootDir, 'ci-artifacts')
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
