import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('generate page treats repair_required SSE events as failed runs', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'app/(dashboard)/pipeline/generate/page.tsx'),
    'utf8',
  )

  assert.match(source, /payload\.event === 'repair_required'/)
  assert.match(source, /totalFailed:\s*prev\.totalFailed \+ 1/)
  assert.match(source, /makeLog\(\s*'REPAIR'/)
})
