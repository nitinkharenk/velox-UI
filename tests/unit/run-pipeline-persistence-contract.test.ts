import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('runPipeline fails fast on ideas persistence errors before emitting terminal success events', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'lib/pipeline/runPipeline.ts'),
    'utf8',
  )

  assert.match(source, /async function updateIdeaOrThrow/)
  assert.match(source, /'final pipeline result'/)
  assert.match(source, /await updateIdeaOrThrow\(\s*ideaId,\s*\{\s*status: reviewStatus,\s*generated_code: rawCode \?\? null,/s)
  assert.match(source, /await emit\(options\.onEvent, \{\s*event: 'ready'/s)
})

test('runPipeline persists generated_code immediately after generation', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'lib/pipeline/runPipeline.ts'),
    'utf8',
  )

  assert.match(
    source,
    /await updateIdeaOrThrow\(\s*ideaId,\s*\{\s*status: 'generated',\s*generated_code: rawCode\s*\},\s*'generated code',\s*\)/s,
  )
})
