import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const viewsDir = path.join(rootDir, 'src', 'views')

const allowlist = {
  'src/views/task/TaskList.vue': [/tick_detailWidth/],
}

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(target))
      continue
    }

    if (entry.isFile() && target.endsWith('.vue')) {
      files.push(target)
    }
  }

  return files
}

const violations = []

for (const filePath of walk(viewsDir)) {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/')
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  const fileAllowPatterns = allowlist[relativePath] || []

  lines.forEach((line, index) => {
    if (!line.includes('localStorage')) return
    const isAllowed = fileAllowPatterns.some((pattern) => pattern.test(line))
    if (isAllowed) return
    violations.push(`${relativePath}:${index + 1}: ${line.trim()}`)
  })
}

if (violations.length > 0) {
  console.error('Detected disallowed localStorage usage in view components:')
  violations.forEach((item) => console.error(`- ${item}`))
  process.exit(1)
}

console.log('View localStorage guard passed.')
