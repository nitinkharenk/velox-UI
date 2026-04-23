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

test('workflow editor exposes vertex as a first-class provider option', async () => {
  const source = await readSource('components/pipeline/PipelineConfigsEditor.tsx')

  assert.match(source, /value="vertex"/)
  assert.match(source, /Vertex AI/)
  assert.match(source, /'vertex':/)
})

test('pipeline runtime dispatch and validation branches support vertex', async () => {
  const dispatchSource = await readSource('lib/pipeline/providerDispatch.ts')
  const validationSource = await readSource('lib/pipeline/validationRuntime.ts')
  const structureSource = await readSource('lib/pipeline/structureIdea.ts')

  assert.match(dispatchSource, /config\.provider === 'vertex'/)
  assert.match(dispatchSource, /enrichWithVertex/)
  assert.match(dispatchSource, /generateWithVertex/)

  assert.match(validationSource, /config\.provider === 'vertex'/)
  assert.match(validationSource, /validateWithVertex/)
  assert.match(validationSource, /fixWithVertex/)

  assert.match(structureSource, /provider === 'vertex'/)
  assert.match(structureSource, /structureViaVertex/)
})
