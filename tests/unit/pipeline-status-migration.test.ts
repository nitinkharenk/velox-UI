import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('pipeline status migration aligns the ideas constraint with runtime statuses and downgrades broken review rows', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'supabase/migrations/007_pipeline_status_alignment.sql'),
    'utf8',
  )

  assert.match(source, /drop constraint if exists ideas_status_check/i)
  assert.match(source, /'ready'/)
  assert.match(source, /'ready_with_warnings'/)
  assert.match(source, /'repair_required'/)
  assert.match(source, /status in \('reviewing', 'ready', 'ready_with_warnings', 'validated', 'generated'\)/)
  assert.match(source, /Missing generated_code while in a review-facing status\./)
})
