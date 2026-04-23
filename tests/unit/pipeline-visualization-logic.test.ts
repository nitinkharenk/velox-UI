import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

async function loadVisualizationModule() {
  const modulePath = pathToFileURL(
    path.join(process.cwd(), 'lib/pipeline/visualization.ts'),
  ).href

  try {
    return await import(modulePath)
  } catch (error) {
    assert.fail(`Expected visualization helper module to exist: ${String(error)}`)
  }
}

const structuredIdea = {
  id: 'idea-1',
  name: 'Magnetic Orb',
  type: 'hover',
  category: 'animation',
  tech: ['Tailwind', 'Framer Motion'],
  complexity: 'medium',
  feel: 'elastic and premium',
  status: 'pending',
}

test('code generation stays blocked until enrichment has produced a spec', async () => {
  const { canRunVisualizationStage } = await loadVisualizationModule()

  assert.deepEqual(
    canRunVisualizationStage('generate', structuredIdea),
    {
      ok: false,
      reason: 'Run Enrichment first to create a structured spec.',
    },
  )
})

test('validation stays blocked until generated code exists', async () => {
  const { canRunVisualizationStage } = await loadVisualizationModule()

  assert.deepEqual(
    canRunVisualizationStage('validate', {
      ...structuredIdea,
      status: 'enriched',
      enriched_spec: { name: 'Magnetic Orb' },
    }),
    {
      ok: false,
      reason: 'Run Code Generation first to create component code.',
    },
  )
})

test('repair becomes runnable once a spec and generated code are both present', async () => {
  const { canRunVisualizationStage } = await loadVisualizationModule()

  assert.deepEqual(
    canRunVisualizationStage('repair', {
      ...structuredIdea,
      status: 'repair_required',
      enriched_spec: { name: 'Magnetic Orb' },
      generated_code: 'export default function MagneticOrb() { return null }',
    }),
    { ok: true },
  )
})
