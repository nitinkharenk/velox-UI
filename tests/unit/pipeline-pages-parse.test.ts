import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const filesToParse = [
  'app/(dashboard)/pipeline/ideas/page.tsx',
  'app/(dashboard)/pipeline/generate/page.tsx',
  'app/(dashboard)/pipeline/review/page.tsx',
]

test('pipeline dashboard pages parse without TSX syntax errors', async () => {
  for (const relativePath of filesToParse) {
    const absolutePath = path.join(process.cwd(), relativePath)
    const source = await readFile(absolutePath, 'utf8')
    const parsed = ts.createSourceFile(
      relativePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )

    const diagnostics = parsed.parseDiagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    )

    assert.deepEqual(
      diagnostics,
      [],
      `Expected ${relativePath} to parse without syntax errors, got:\n${diagnostics.join('\n')}`
    )
  }
})
