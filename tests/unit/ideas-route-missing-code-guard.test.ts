import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('ideas route repairs review-facing rows that have no generated code', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'app/api/pipeline/ideas/route.ts'),
    'utf8',
  )

  assert.match(source, /reviewFacingStatuses = new Set\(\['reviewing', 'ready', 'ready_with_warnings', 'validated', 'generated'\]\)/)
  assert.match(source, /Missing generated_code while in a review-facing status\./)
  assert.match(source, /status:\s*'repair_required'/)
})
