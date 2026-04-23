import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('run-auto route supports dual transport and reviewing handoff', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'app/api/pipeline/run-auto/route.ts'),
    'utf8',
  )

  assert.match(source, /text\/event-stream/)
  assert.match(source, /runPipeline\(/)
  assert.match(source, /status:\s*'reviewing'/)
  assert.match(source, /runId/)
  assert.match(source, /ideaIds/)
  assert.match(source, /const isSuccessfulHandoff = handedOffStatus === 'reviewing'/)
  assert.match(source, /else failed \+= 1/)
})
