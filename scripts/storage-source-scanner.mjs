import fs from 'node:fs'
import path from 'node:path'

export const DEFAULT_SOURCE_ROOTS = Object.freeze(['src', 'scripts'])
export const DEFAULT_SOURCE_EXTENSIONS = Object.freeze(['.ts', '.vue', '.mjs', '.js'])

const directStoragePattern = /(?:window\.)?(localStorage|sessionStorage)\s*\.\s*(getItem|setItem|removeItem|clear|key)\s*\(([^)]*)\)/g
const storagePropertyPattern = /(?:window\.)?(localStorage|sessionStorage)\s*\.\s*(length)\b/g
const cacheHelperPattern = /\b(readCache|writeCache|removeCache|readRawStorage|writeRawStorage|removeRawStorage|listStorageKeys)\s*\(([^)]*)\)/g
const storageAliasPattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:window\.)?(localStorage|sessionStorage)\b(?!\s*\.)/g

const walk = (directory, extensions) => {
  const files = []
  if (!fs.existsSync(directory)) return files
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(target, extensions))
    else if (entry.isFile() && extensions.has(path.extname(entry.name))) files.push(target)
  }
  return files
}

const findLine = (content, offset) => content.slice(0, offset).split(/\r?\n/).length

const shouldScanDefault = (relativePath) => {
  if (relativePath === 'scripts/storage-source-scanner.mjs') return false
  if (relativePath === 'scripts/scan-storage-assets.mjs') return false
  if (relativePath === 'scripts/check-storage-policy.mjs') return false
  if (relativePath.startsWith('src/test/')) return false
  if (relativePath.endsWith('.test.ts') || relativePath.endsWith('.spec.ts')) return false
  if (relativePath.endsWith('.test.mjs') || relativePath.endsWith('.spec.mjs')) return false
  return true
}

const pushMatches = (assets, content, file, pattern, kind, operationIndex, argumentIndex) => {
  pattern.lastIndex = 0
  let match
  while ((match = pattern.exec(content)) !== null) {
    assets.push({
      storage: kind || match[1],
      operation: match[operationIndex] || null,
      argument: match[argumentIndex] ? match[argumentIndex].trim() : null,
      expression: match[0].replace(/\s+/g, ' '),
      file,
      line: findLine(content, match.index),
    })
  }
}

export const scanStorageSources = ({
  rootDir = process.cwd(),
  sourceRoots = DEFAULT_SOURCE_ROOTS,
  sourceExtensions = DEFAULT_SOURCE_EXTENSIONS,
  shouldScan = shouldScanDefault,
} = {}) => {
  const extensions = new Set(sourceExtensions)
  const assets = []
  for (const sourceRoot of sourceRoots) {
    for (const filePath of walk(path.join(rootDir, sourceRoot), extensions)) {
      const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/')
      if (!shouldScan(relativePath)) continue
      const content = fs.readFileSync(filePath, 'utf8')
      pushMatches(assets, content, relativePath, directStoragePattern, null, 2, 3)
      pushMatches(assets, content, relativePath, storagePropertyPattern, null, 2, null)
      pushMatches(assets, content, relativePath, cacheHelperPattern, 'cacheHelper', 1, 2)
      storageAliasPattern.lastIndex = 0
      let aliasMatch
      while ((aliasMatch = storageAliasPattern.exec(content)) !== null) {
        assets.push({
          storage: 'storageAlias',
          operation: 'alias',
          argument: aliasMatch[1],
          expression: aliasMatch[0].replace(/\s+/g, ' '),
          file: relativePath,
          line: findLine(content, aliasMatch.index),
        })
      }
    }
  }
  return assets.sort((left, right) =>
    left.file.localeCompare(right.file) || left.line - right.line || left.storage.localeCompare(right.storage),
  )
}
