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

test('vertex ai helper initializes the VertexAI SDK and can flatten candidate text', async () => {
  const source = await readSource('lib/ai/vertex.ts')

  assert.match(source, /import\s+\{\s*VertexAI\s*\}\s+from\s+['"]@google-cloud\/vertexai['"]/)
  assert.match(source, /new VertexAI\(/)
  assert.match(source, /getGenerativeModel\(/)
  assert.match(source, /contents:\s*\[\s*\{\s*role:\s*['"]user['"]/)
  assert.match(source, /candidates\?\.\[0\]\?\.content\?\.parts/)
})

test('vertex ai route validates project config and prompt and returns raw response details', async () => {
  const source = await readSource('app/api/vertex-ai/route.ts')

  assert.match(source, /const \{ project, location, prompt, model \}/)
  assert.match(source, /Missing project ID/)
  assert.match(source, /Missing location/)
  assert.match(source, /Missing prompt/)
  assert.match(source, /buildVertexGenerateContentRequest\(prompt,\s*selectedModel\)/)
  assert.match(source, /generateContent\(/)
  assert.match(source, /rawResponse/)
  assert.match(source, /outputText/)
})
