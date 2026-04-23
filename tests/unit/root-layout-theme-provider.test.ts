import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('root layout mounts ThemeProvider for theme consumers', async () => {
  const layoutPath = path.join(process.cwd(), 'app/layout.tsx')
  const source = await readFile(layoutPath, 'utf8')

  assert.match(source, /ThemeProvider/, 'Expected app/layout.tsx to reference ThemeProvider')
  assert.match(
    source,
    /<ThemeProvider>[\s\S]*\{children\}[\s\S]*<\/ThemeProvider>/,
    'Expected app/layout.tsx to wrap route content with ThemeProvider'
  )
})
