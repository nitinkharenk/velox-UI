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

test('dashboard overview uses compact stat cards instead of the large hero widget', async () => {
  const source = await readSource('app/(dashboard)/dashboard/page.tsx')

  assert.doesNotMatch(source, /HeroWidget/)
  assert.match(source, /StatCard/)
  assert.match(source, /lg:grid-cols-4/)
})

test('dashboard shell keeps the large top hover navbar removed', async () => {
  const source = await readSource('components/layout/DashboardShell.tsx')

  assert.doesNotMatch(source, /h-\[5px\]/)
  assert.doesNotMatch(source, /translate-y-\[-100%\]/)
  assert.doesNotMatch(source, /setHeaderVisible/)
})
