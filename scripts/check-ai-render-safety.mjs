import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const files = [
  'src/views/ai/AiPlanner.vue',
  'src/views/ai/AiDraftDetail.vue',
  'src/views/review/WeeklyReview.vue',
  'src/views/task/TaskList.vue',
  'src/components/AiErrorNotice.vue',
  'src/components/SafeAiText.vue',
  'src/composables/useAiPendingRequest.ts',
]

const forbiddenPatterns = [
  { label: 'v-html', pattern: /\bv-html\s*=/ },
  { label: 'innerHTML', pattern: /\.innerHTML\b/ },
  { label: 'insertAdjacentHTML', pattern: /\binsertAdjacentHTML\s*\(/ },
]

const violations = []
for (const file of files) {
  const content = readFileSync(resolve(file), 'utf8')
  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(content)) violations.push(`${file}: ${rule.label}`)
  }
}

if (violations.length > 0) {
  console.error(`AI rendering safety violations:\n${violations.join('\n')}`)
  process.exit(1)
}

console.log(`AI rendering safety check passed (${files.length} files)`)
