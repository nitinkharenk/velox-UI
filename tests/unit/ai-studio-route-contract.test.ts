import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function readSource(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), 'utf8')
}

test('legacy velox ai and vertex chat routes redirect into velox ai studio', async () => {
  const [veloxRoute, vertexChatRoute] = await Promise.all([
    readSource('app/(velox-ai)/velox-ai/page.tsx'),
    readSource('app/(dashboard)/vertex-chat/page.tsx'),
  ])

  assert.match(veloxRoute, /redirect\(['"]\/velox-ai-studio['"]\)/)
  assert.match(vertexChatRoute, /redirect\(['"]\/velox-ai-studio\/chat['"]\)/)
})

test('velox ai studio settings route exists and reuses the shared settings experience', async () => {
  const source = await readSource('app/(velox-ai-studio)/velox-ai-studio/settings/page.tsx')

  assert.match(source, /SettingsPage/)
})
