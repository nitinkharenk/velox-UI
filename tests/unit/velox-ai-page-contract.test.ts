import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('velox-ai page wires prompt submission, review sidebar, and review deep links', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'components/velox-ai/VeloxAIPage.tsx'),
    'utf8',
  )

  assert.match(source, /\/api\/pipeline\/run-auto/)
  assert.match(source, /\/api\/pipeline\/workflows/)
  assert.match(source, /\/api\/pipeline\/ideas\?status=reviewing,ready,ready_with_warnings/)
  assert.match(source, /\/pipeline\/review\?ideaId=/)
  assert.match(source, /LogTerminal/)
  assert.match(source, /DashboardPageFrame/)
  assert.match(source, /Review rail/i)
  assert.match(source, /Generation workspace/i)
  assert.match(source, /Prompt ideas/i)
  assert.match(source, /Describe the interaction, layout, and visual tone/i)
  assert.match(source, /Context window/i)
  assert.match(source, /Max output/i)
})

test('velox-ai studio layout uses the shared dashboard shell infrastructure', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'app/(velox-ai-studio)/layout.tsx'),
    'utf8',
  )

  assert.match(source, /DashboardShell/)
  assert.match(source, /ThemeProvider/)
  assert.match(source, /ToastProvider/)
})
