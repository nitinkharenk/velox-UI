import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('ideas route falls back when the optional prompt column is missing', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'app/api/pipeline/ideas/route.ts'),
    'utf8',
  )

  assert.match(source, /IDEA_SELECT_WITHOUT_PROMPT/)
  assert.match(source, /isMissingPromptColumnError/)
  assert.match(source, /typeof row\.prompt === 'string' \? row\.prompt : null/)
})
