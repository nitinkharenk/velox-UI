import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { AI_TIMEOUTS_MS } from '@/lib/pipeline/validationRuntime'

test('pipeline repair and validation budgets allow slower providers more time', async () => {
  assert.equal(AI_TIMEOUTS_MS.semantic_validation.default, 45_000)
  assert.equal(AI_TIMEOUTS_MS.semantic_validation.ollama, 120_000)
  assert.equal(AI_TIMEOUTS_MS.repair.default, 90_000)
  assert.equal(AI_TIMEOUTS_MS.repair.gemini, 120_000)
  assert.equal(AI_TIMEOUTS_MS.repair.ollama, 180_000)
})

test('repair failures propagate so callers can mark the idea failed explicitly', async () => {
  const source = await readFile(path.join(process.cwd(), 'lib/pipeline/generate.ts'), 'utf8')

  assert.match(source, /code = await runFixAttempt\(/)
  assert.doesNotMatch(source, /validation_notes:\s*`Repair failed: \$\{detail\}`/)
  assert.doesNotMatch(source, /buildSyntheticValidationReport\('Repair failed', detail\)/)
})
