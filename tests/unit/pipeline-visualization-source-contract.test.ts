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

test('dashboard navigation exposes the pipeline visualization route', async () => {
  const source = await readSource('components/layout/dashboardConfig.ts')

  assert.match(source, /href:\s*['"]\/pipeline-visualization['"]/)
  assert.match(source, /label:\s*['"]Pipeline Visualization['"]/)
})

test('pipeline types export visualization stage contracts', async () => {
  const source = await readSource('types/pipeline.ts')

  assert.match(source, /export type VisualizationStageKey = 'enrich' \| 'generate' \| 'validate' \| 'repair'/)
  assert.match(source, /export type VisualizationStageState = 'not_started' \| 'running' \| 'completed' \| 'failed'/)
  assert.match(source, /export interface VisualizationStageTrace/)
  assert.match(source, /export interface RunVisualizationStageResponse/)
})

test('pipeline visualization stage route normalizes input and output payloads', async () => {
  const source = await readSource('app/api/pipeline/visualization/run-stage/route.ts')

  assert.match(source, /const \{ ideaId, stage \}/)
  assert.match(source, /input:\s*\{/)
  assert.match(source, /output:\s*\{/)
  assert.match(source, /state:\s*'completed'/)
  assert.match(source, /state:\s*'failed'/)
})

test('pipeline visualization page uses dashboard framing, stage selection, and scrollable io cards', async () => {
  const pageSource = await readSource('app/(dashboard)/pipeline-visualization/page.tsx')
  const componentSource = await readSource('components/pipeline/PipelineVisualizationPage.tsx')

  assert.match(pageSource, /PipelineVisualizationPage/)
  assert.match(componentSource, /DashboardPageFrame/)
  assert.match(componentSource, /Run Stage/)
  assert.match(componentSource, /selectedStage/)
  assert.match(componentSource, /overflow-auto/)
})
