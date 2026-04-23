import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function readSource(relativePath: string) {
  try {
    return await readFile(path.join(process.cwd(), relativePath), 'utf8')
  } catch (error) {
    assert.fail(`Expected ${relativePath} to exist: ${String(error)}`)
  }
}

test('vertex chat route validates messages and model then streams vertex chat events', async () => {
  const source = await readSource('app/api/vertex-chat/route.ts')

  assert.match(source, /const \{ messages, model \}/)
  assert.match(source, /Missing messages/)
  assert.match(source, /Missing model/)
  assert.match(source, /Missing project ID/)
  assert.match(source, /startChat\(/)
  assert.match(source, /sendMessageStream\(/)
  assert.match(source, /extractVertexUsage/)
  assert.match(source, /usage:/)
  assert.match(source, /"event":"token"/)
  assert.match(source, /"event":"done"/)
  assert.match(source, /"event":"error"/)
  assert.match(source, /text\/event-stream/)
})
