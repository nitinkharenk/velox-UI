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

test('dashboard navigation keeps settings but excludes velox ai studio tools', async () => {
  const source = await readSource('components/layout/dashboardConfig.ts')

  assert.match(source, /href:\s*['"]\/settings['"]/)
  assert.doesNotMatch(source, /href:\s*['"]\/velox-ai['"]/)
  assert.doesNotMatch(source, /href:\s*['"]\/vertex-chat['"]/)
})

test('velox ai studio navigation exposes chat, ai, and settings routes', async () => {
  const source = await readSource('components/layout/studioConfig.ts')

  assert.match(source, /href:\s*['"]\/velox-ai-studio['"]/)
  assert.match(source, /href:\s*['"]\/velox-ai-studio\/chat['"]/)
  assert.match(source, /href:\s*['"]\/velox-ai-studio\/settings['"]/)
})

test('vertex chat page uses chat route, model dropdown, and reset controls', async () => {
  const source = await readSource('components/chat/VertexChatPage.tsx')

  assert.match(source, /\/api\/vertex-chat/)
  assert.match(source, /Select/)
  assert.match(source, /getVertexChatModelOptions/)
  assert.match(source, /Context window/i)
  assert.match(source, /Max output/i)
  assert.match(source, /clear chat/i)
  assert.match(source, /streaming/i)
  assert.match(source, /assistant/i)
  assert.match(source, /user/i)
  assert.match(source, /```/)
  assert.match(source, /Input Tokens/)
  assert.match(source, /Output Tokens/)
})

test('vertex chat transcript panel uses a capped flex layout so only the transcript body scrolls', async () => {
  const source = await readSource('components/chat/VertexChatPage.tsx')

  assert.match(source, /flex flex-col/)
  assert.match(source, /min-h-0 flex-1 overflow-y-auto/)
  assert.match(source, /h-\[min\(78vh,56rem\)\]/)
})
