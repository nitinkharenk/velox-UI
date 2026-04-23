import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('dashboard shell pins readable background and foreground tokens', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'components/layout/DashboardShell.tsx'),
    'utf8',
  )

  assert.match(
    source,
    /className="dashboard-shell dashboard-theme[^\"]*bg-\[--dashboard-background\][^\"]*text-\[--dashboard-text\]/,
    'Expected dashboard shell root to opt into the route-scoped dashboard theme tokens',
  )

  assert.match(
    source,
    /className="dashboard-main[^\"]*bg-\[--dashboard-surface\]/,
    'Expected dashboard main area to use the route-scoped readable surface background',
  )
})
