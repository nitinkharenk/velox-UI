import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('repair route persists terminal states strictly before emitting success', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'app/api/pipeline/repair/route.ts'),
    'utf8',
  )

  assert.match(source, /async function updateIdeaOrThrow/)
  assert.match(source, /'repair final result'/)
  assert.match(source, /inferPipelineStatus\(finalResult\)/)
  assert.match(source, /send\('ready'/)
})
