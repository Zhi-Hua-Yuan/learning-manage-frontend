import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch'])

function unwrapExpression(expression) {
  let current = expression
  while (current && (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current))) {
    current = current.expression
  }
  return current
}

function templateParameter(expression, sourceFile) {
  const current = unwrapExpression(expression)
  if (ts.isIdentifier(current)) return current.text

  if (
    ts.isCallExpression(current) &&
    ts.isIdentifier(current.expression) &&
    current.expression.text === 'encodeURIComponent' &&
    current.arguments.length === 1
  ) {
    const argument = unwrapExpression(current.arguments[0])
    if (ts.isIdentifier(argument)) return argument.text
  }

  throw new Error(`Unsupported dynamic URL expression in ${sourceFile.fileName}: ${current.getText(sourceFile)}`)
}

function extractPath(argument, sourceFile) {
  const current = unwrapExpression(argument)
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text

  if (ts.isTemplateExpression(current)) {
    let result = current.head.text
    for (const span of current.templateSpans) {
      result += `{${templateParameter(span.expression, sourceFile)}}`
      result += span.literal.text
    }
    return result
  }

  throw new Error(`URL must be a string literal or template literal in ${sourceFile.fileName}: ${current.getText(sourceFile)}`)
}

function validatePath(urlPath, sourceFile) {
  if (!urlPath.startsWith('/')) throw new Error(`API path must start with '/': ${urlPath} (${sourceFile.fileName})`)
  if (urlPath === '/api' || urlPath.startsWith('/api/')) {
    throw new Error(`API path must not include the request base path '/api': ${urlPath} (${sourceFile.fileName})`)
  }
  if (urlPath.includes('?') || urlPath.includes('#')) {
    throw new Error(`API path must not contain query or hash fragments: ${urlPath} (${sourceFile.fileName})`)
  }
  if (urlPath.includes('//')) throw new Error(`API path must not contain empty segments: ${urlPath} (${sourceFile.fileName})`)
  return urlPath
}

function collectOperations(sourceText, fileName) {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const operations = []

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiver = node.expression.expression
      const method = node.expression.name.text.toLowerCase()
      if (ts.isIdentifier(receiver) && receiver.text === 'request' && HTTP_METHODS.has(method)) {
        if (node.arguments.length === 0) throw new Error(`Missing URL argument in ${fileName}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`)
        const apiPath = validatePath(extractPath(node.arguments[0], sourceFile), sourceFile)
        operations.push({ method: method.toUpperCase(), path: apiPath })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return operations
}

function sortOperations(operations) {
  const unique = new Map()
  for (const operation of operations) unique.set(`${operation.method} ${operation.path}`, operation)
  return [...unique.values()].sort((left, right) => {
    const leftKey = `${left.path}\u0000${left.method}`
    const rightKey = `${right.path}\u0000${right.method}`
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })
}

export function buildContract({ rootDir = process.cwd(), sourceDir = 'src/api' } = {}) {
  const apiDir = path.resolve(rootDir, sourceDir)
  if (!fs.existsSync(apiDir)) throw new Error(`API source directory does not exist: ${apiDir}`)

  const files = fs.readdirSync(apiDir)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts'))
    .sort()
  const operations = []
  for (const file of files) {
    const fullPath = path.join(apiDir, file)
    operations.push(...collectOperations(fs.readFileSync(fullPath, 'utf8'), fullPath))
  }
  const sorted = sortOperations(operations)
  if (sorted.length === 0) throw new Error(`No supported request operations found in ${apiDir}`)

  return {
    schemaVersion: 1,
    basePath: '/api',
    operations: sorted,
  }
}

export function serializeContract(contract) {
  return `${JSON.stringify(contract, null, 2)}\n`
}
