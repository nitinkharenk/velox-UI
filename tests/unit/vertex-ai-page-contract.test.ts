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

test('dashboard navigation exposes the vertex ai tester route', async () => {
  const source = await readSource('components/layout/dashboardConfig.ts')

  assert.match(source, /href:\s*['"]\/vertex-ai['"]/)
  assert.match(source, /label:\s*['"]Vertex AI['"]/)
})

test('vertex ai page wires prompt submission and response panes', async () => {
  const source = await readSource('app/(dashboard)/vertex-ai/page.tsx')

  assert.match(source, /\/api\/vertex-ai/)
  assert.match(source, /Project ID/i)
  assert.match(source, /Location/i)
  assert.match(source, /PROVIDER_CATALOG\.vertex\.models|PROVIDER_CATALOG\.gemini\.models/)
  assert.match(source, /Context window/i)
  assert.match(source, /Max output/i)
  assert.match(source, /GOOGLE_APPLICATION_CREDENTIALS/i)
  assert.match(source, /Prompt/i)
  assert.match(source, /Response/i)
  assert.match(source, /Error/i)
})
