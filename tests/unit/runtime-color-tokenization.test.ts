import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

const includedRoots = ['app', 'components']
const excludedFiles = new Set([
  'app/globals.css',
  'app/test/page.tsx',
  'components/landing/fallback-code.ts',
  'components/landing/velox-theme.module.css',
  'components/layout/Navbar.tsx',
  'components/ui/logo.tsx',
])

const excludedDirectories = ['components/sections']

const allowedPatterns = [
  /text-\[var\(--/g,
  /bg-\[var\(--/g,
  /border-\[var\(--/g,
  /shadow-\[var\(--/g,
  /ring-\[var\(--/g,
  /stroke-\[var\(--/g,
  /fill-\[var\(--/g,
  /color:\s*['"`]var\(--/g,
  /background(?:Color)?:\s*['"`]var\(--/g,
  /border(?:Color)?:\s*['"`]var\(--/g,
  /boxShadow:\s*['"`]var\(--/g,
  /stroke:\s*['"`]var\(--/g,
  /fill:\s*['"`]var\(--/g,
]

const rawColorPattern = /#[0-9A-Fa-f]{3,8}|rgba?\([^)]*\)/g

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await import('node:fs/promises').then(({ readdir }) =>
    readdir(dir, { withFileTypes: true })
  )

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(absolutePath)
      continue
    }

    if (!/\.(ts|tsx|css)$/.test(entry.name)) continue
    yield absolutePath
  }
}

test('runtime UI source files do not contain raw color literals outside globals.css', async () => {
  const offenders: string[] = []

  for (const relativeRoot of includedRoots) {
    const absoluteRoot = path.join(root, relativeRoot)

    for await (const absolutePath of walk(absoluteRoot)) {
      const relativePath = path.relative(root, absolutePath)
      if (excludedFiles.has(relativePath)) continue
      if (excludedDirectories.some((directory) => relativePath.startsWith(directory))) continue

      const source = await readFile(absolutePath, 'utf8')
      const sanitized = allowedPatterns.reduce(
        (text, pattern) => text.replace(pattern, ''),
        source
      )

      const matches = Array.from(sanitized.matchAll(rawColorPattern))
      if (matches.length === 0) continue

      const lines = matches.slice(0, 6).map((match) => {
        const index = match.index ?? 0
        const line = sanitized.slice(0, index).split('\n').length
        return `${relativePath}:${line}:${match[0]}`
      })

      offenders.push(...lines)
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Found raw runtime color literals:\n${offenders.join('\n')}`
  )
})
