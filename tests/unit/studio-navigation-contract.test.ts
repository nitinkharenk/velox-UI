import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function readSource(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), 'utf8')
}

test('studio navigation keeps review queue in its own sidebar section', async () => {
  const source = await readSource('components/layout/studioConfig.ts')

  assert.match(source, /label: 'REVIEW'/)
  assert.match(source, /label: 'Review Queue'/)
  assert.match(source, /href: '\/pipeline\/review'/)
})

test('velox ai page removes the workspace eyebrow and intro blurb', async () => {
  const source = await readSource('components/velox-ai/VeloxAIPage.tsx')

  assert.doesNotMatch(source, /eyebrow="Workspace"/)
  assert.doesNotMatch(source, /Launch autonomous prompt-to-review runs from a dashboard workspace/)
  assert.match(source, /hideHeader/)
})

test('review queue items open review pages in a new tab', async () => {
  const source = await readSource('components/velox-ai/VeloxAIPage.tsx')

  assert.match(source, /href=\{`\/pipeline\/review\?ideaId=\$\{idea\.id\}`\}/)
  assert.match(source, /target="_blank"/)
  assert.match(source, /rel="noreferrer"/)
})
