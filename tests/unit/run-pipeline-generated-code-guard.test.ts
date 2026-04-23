import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('runPipeline refuses to mark ideas ready when no generated code exists', async () => {
  const source = await readFile(path.join(process.cwd(), 'lib/pipeline/runPipeline.ts'), 'utf8')

  assert.match(source, /Pipeline completed without generated code\./)
  assert.match(source, /const hasGeneratedCode = typeof rawCode === 'string' && rawCode\.trim\(\)\.length > 0/)
  assert.match(source, /const reviewStatus = hasGeneratedCode \? inferPipelineStatus\(finalResult\) : 'repair_required'/)
})
