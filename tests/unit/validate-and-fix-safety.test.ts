import test from 'node:test'
import assert from 'node:assert/strict'

import type { PipelineConfig } from '@/types/pipeline'

const GEMINI_CONFIG: PipelineConfig = {
  id: 'test-gemini',
  name: 'Test Gemini',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  system_prompt: null,
  is_default: false,
}

const VALID_CODE = `
export default function DemoCard() {
  const { motion } = window.Motion

  return (
    <motion.div
      className="relative rounded-3xl bg-neutral-950 p-8 text-white"
      style={{ minHeight: '360px' }}
    >
      Demo
    </motion.div>
  )
}
`

const INVALID_CODE = `
function BrokenCard() {
  return <div className="min-h-screen">Broken</div>
}
`

function createGeminiResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text }],
          },
        },
      ],
    }),
    text: async () => text,
  } as Response
}

function installFetchStub(
  t: Parameters<typeof test>[1] extends (ctx: infer T) => unknown ? T : never,
  implementation: typeof fetch,
) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = implementation
  t.after(() => {
    globalThis.fetch = originalFetch
  })
}

async function loadValidateAndFix() {
  process.env.GEMINI_API_KEY = 'test-key'
  process.env.GROQ_API_KEY = 'test-key'
  process.env.ANTHROPIC_API_KEY = 'test-key'

  const pipelineModule = await import('@/lib/pipeline/generate')
  return pipelineModule.validateAndFix
}

function installFastPipelineTimeout(
  t: Parameters<typeof test>[1] extends (ctx: infer T) => unknown ? T : never,
) {
  const originalSetTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout

  globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const nextTimeout = timeout === 20_000 ? 0 : timeout

    return originalSetTimeout(handler, nextTimeout, ...args)
  }) as typeof setTimeout

  globalThis.clearTimeout = ((timeoutId: Parameters<typeof clearTimeout>[0]) =>
    originalClearTimeout(timeoutId)) as typeof clearTimeout

  t.after(() => {
    globalThis.setTimeout = originalSetTimeout
    globalThis.clearTimeout = originalClearTimeout
  })
}

test('semantic validation exceptions fail closed after max attempts', async (t) => {
  const validateAndFix = await loadValidateAndFix()

  let callCount = 0
  installFetchStub(t, (async () => {
    callCount += 1

    if (callCount === 1 || callCount === 3 || callCount === 5) {
      throw new Error(`validation network failure ${callCount}`)
    }

    return createGeminiResponse(VALID_CODE)
  }) as typeof fetch)

  const result = await validateAndFix(VALID_CODE, GEMINI_CONFIG, '{"name":"DemoCard"}')

  assert.equal(result.has_errors, true)
  assert.equal(result.validation_report?.status, 'FAIL')
  assert.match(
    result.validation_report?.issues[0]?.message ?? '',
    /validation/i,
  )
})

test('semantic validation timeouts are treated as failures, not success', async (t) => {
  const validateAndFix = await loadValidateAndFix()

  installFetchStub(t, (() => new Promise(() => {})) as typeof fetch)
  installFastPipelineTimeout(t)

  const result = await validateAndFix(VALID_CODE, GEMINI_CONFIG, '{"name":"DemoCard"}', 1)

  assert.equal(result.has_errors, true)
  assert.equal(result.validation_report?.status, 'FAIL')
})

test('malformed semantic validation payloads become synthetic FAIL reports', async (t) => {
  const validateAndFix = await loadValidateAndFix()

  installFetchStub(t, (async () => createGeminiResponse('{"foo":"bar"}')) as typeof fetch)

  const result = await validateAndFix(VALID_CODE, GEMINI_CONFIG, '{"name":"DemoCard"}', 1)

  assert.equal(result.has_errors, true)
  assert.equal(result.validation_report?.status, 'FAIL')
  assert.match(
    result.validation_report?.issues[0]?.message ?? '',
    /invalid|unexpected/i,
  )
})

test('semantic PASS returns success and preserves the validation report', async (t) => {
  const validateAndFix = await loadValidateAndFix()

  installFetchStub(
    t,
    (async () => createGeminiResponse('{"status":"PASS","score":100,"issues":[]}')) as typeof fetch,
  )

  const result = await validateAndFix(VALID_CODE, GEMINI_CONFIG, '{"name":"DemoCard"}', 1)

  assert.equal(result.has_errors, false)
  assert.equal(result.validation_report?.status, 'PASS')
  assert.equal(result.validation_report?.score, 100)
})

test('semantic PASS_WITH_WARNINGS returns success and preserves warnings', async (t) => {
  const validateAndFix = await loadValidateAndFix()

  installFetchStub(
    t,
    (async () =>
      createGeminiResponse(
        '{"status":"PASS_WITH_WARNINGS","score":82,"issues":[{"severity":"minor","type":"accessibility","message":"Add aria-label"}]}'
      )) as typeof fetch,
  )

  const result = await validateAndFix(VALID_CODE, GEMINI_CONFIG, '{"name":"DemoCard"}', 1)

  assert.equal(result.has_errors, false)
  assert.equal(result.validation_report?.status, 'PASS_WITH_WARNINGS')
  assert.equal(result.validation_report?.issues.length, 1)
})

test('static validation still stops after three failed repair attempts', async (t) => {
  const validateAndFix = await loadValidateAndFix()

  let fixCalls = 0
  installFetchStub(t, (async () => {
    fixCalls += 1
    return createGeminiResponse(INVALID_CODE)
  }) as typeof fetch)

  const result = await validateAndFix(INVALID_CODE, GEMINI_CONFIG, null, 3)

  assert.equal(fixCalls, 2)
  assert.equal(result.has_errors, true)
  assert.match(result.validation_notes ?? '', /Missing: export default function/)
})

test('fix call failures reject so the pipeline can mark the idea failed', async (t) => {
  const validateAndFix = await loadValidateAndFix()

  installFetchStub(t, (async () => {
    throw new Error('fix network failure')
  }) as typeof fetch)

  await assert.rejects(
    () => validateAndFix(INVALID_CODE, GEMINI_CONFIG, null, 3),
    /fix network failure/,
  )
})

test('specJson null succeeds only after static validation passes without uncertain validation steps', async (t) => {
  const validateAndFix = await loadValidateAndFix()

  let fetchCalls = 0
  installFetchStub(t, (async () => {
    fetchCalls += 1
    return createGeminiResponse(VALID_CODE)
  }) as typeof fetch)

  const result = await validateAndFix(VALID_CODE, GEMINI_CONFIG, null, 3)

  assert.equal(result.has_errors, false)
  assert.equal(fetchCalls, 0)
})
