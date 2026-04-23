import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function readSource(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), 'utf8')
}

test('dashboard shell removes the old hover-reveal top navbar', async () => {
  const source = await readSource('components/layout/DashboardShell.tsx')

  assert.doesNotMatch(source, /headerVisible/)
  assert.doesNotMatch(source, /translate-y-\[-100%\]/)
  assert.doesNotMatch(source, /h-\[5px\]/)
})

test('sidebar owns the theme toggle controls', async () => {
  const source = await readSource('components/layout/Sidebar.tsx')

  assert.match(source, /useTheme/)
  assert.match(source, /aria-label="Toggle theme"/)
  assert.match(source, /Sun/)
  assert.match(source, /Moon/)
})
