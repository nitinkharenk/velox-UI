import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

function findMaxTokens(source: string, functionName: string) {
  const section = source.match(
    new RegExp(`export async function ${functionName}[\\s\\S]*?max_tokens:\\s*(\\d+)`)
  )

  assert.ok(section, `Expected to find a max_tokens setting in ${functionName}`)

  return Number(section[1])
}

test('Groq requests stay within a safer token budget for on-demand tier limits', async () => {
  const source = await readFile(path.join(process.cwd(), 'lib/ai/groq.ts'), 'utf8')

  assert.ok(
    findMaxTokens(source, 'generateWithGroq') <= 4096,
    'Expected Groq code generation to cap output tokens at 4096 or less to avoid 413 token budget failures',
  )

  assert.ok(
    findMaxTokens(source, 'enrichWithGroq') <= 2000,
    'Expected Groq enrichment to cap output tokens at 2000 or less to stay within provider limits',
  )

  assert.ok(
    findMaxTokens(source, 'fixWithGroq') <= 4096,
    'Expected Groq repair requests to cap output tokens at 4096 or less to stay within provider limits',
  )

  assert.ok(
    findMaxTokens(source, 'validateWithGroq') <= 2000,
    'Expected Groq validation to keep a conservative token ceiling',
  )
})
