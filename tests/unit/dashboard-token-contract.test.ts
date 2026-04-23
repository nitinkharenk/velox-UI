import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('dashboard tones are backed by semantic dashboard tokens instead of raw palette classes', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'components/dashboard/dashboardTones.ts'),
    'utf8',
  )

  assert.doesNotMatch(
    source,
    /emerald-|indigo-|orange-|amber-|red-/,
    'Expected dashboard tone helpers to stop using raw Tailwind palette utilities',
  )

  assert.match(
    source,
    /text-\[--dashboard-(?:info|enrich|warning|accent|success|danger)\]/,
    'Expected dashboard tone helpers to expose semantic dashboard token classes',
  )
})

test('high-risk dashboard and pipeline files avoid hardcoded color shortcuts', async () => {
  const files = [
    'components/layout/Sidebar.tsx',
    'components/pipeline/IdeaEditor.tsx',
    'components/pipeline/PipelineConfigsEditor.tsx',
    'app/(dashboard)/pipeline/ideas/page.tsx',
    'app/(dashboard)/pipeline/generate/page.tsx',
    'app/(dashboard)/pipeline/review/page.tsx',
    'app/(dashboard)/settings/page.tsx',
  ]

  const forbiddenPatterns = [
    /#ffffff/i,
    /bg-emerald/i,
    /text-emerald/i,
    /bg-red-50/i,
    /text-red-700/i,
    /bg-white\/10/i,
    /border-white\/10/i,
    /bg-white\b/i,
    /text-white\b/i,
    /text-black\b/i,
    /bg-gray-100/i,
    /text-gray-700/i,
    /var\(--velox-rose\)/,
    /var\(--legacy-accent-hover\)/,
    /color-mix\(in srgb, white/i,
  ]

  for (const relativePath of files) {
    const source = await readFile(path.join(process.cwd(), relativePath), 'utf8')

    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(
        source,
        pattern,
        `Expected ${relativePath} to avoid hardcoded dashboard/pipeline color shortcuts matching ${pattern}`,
      )
    }
  }
})

test('dashboard log and code surfaces use dedicated code-surface tokens', async () => {
  const files = [
    'app/(dashboard)/pipeline/generate/page.tsx',
    'app/(dashboard)/pipeline/review/page.tsx',
    'app/(dashboard)/pipeline/ideas/page.tsx',
    'components/pipeline/LogTerminal.tsx',
  ]

  for (const relativePath of files) {
    const source = await readFile(path.join(process.cwd(), relativePath), 'utf8')

    assert.match(
      source,
      /dashboard-code-bg|dashboard-code-text|dashboard-code-muted/,
      `Expected ${relativePath} to use dashboard code-surface tokens for dark log panels`,
    )
  }
})
