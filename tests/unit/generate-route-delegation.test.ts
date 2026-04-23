import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('pipeline generate route delegates stage orchestration to runPipeline', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'app/api/pipeline/generate/route.ts'),
    'utf8',
  )

  assert.match(source, /from ['"]@\/lib\/pipeline\/runPipeline['"]/)
  assert.match(source, /runPipeline\(/)
  assert.doesNotMatch(source, /enrichIdea\(/)
  assert.doesNotMatch(source, /generateCode\(/)
  assert.doesNotMatch(source, /validateAndFix\(/)
})
