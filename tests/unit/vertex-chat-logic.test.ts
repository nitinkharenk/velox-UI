import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

async function loadVertexChatModule() {
  const modulePath = pathToFileURL(
    path.join(process.cwd(), 'lib/ai/vertexChat.ts'),
  ).href

  try {
    return await import(modulePath)
  } catch (error) {
    assert.fail(`Expected vertex chat helper module to exist: ${String(error)}`)
  }
}

test('vertex chat model options come from the Gemini provider catalog', async () => {
  const { getVertexChatModelDetails, getVertexChatModelOptions } = await loadVertexChatModule()
  const modelOptions = getVertexChatModelOptions()

  assert.ok(modelOptions.length >= 3)
  assert.deepEqual(
    modelOptions.slice(0, 3).map((option: { id: string }) => option.id),
    ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  )

  assert.deepEqual(getVertexChatModelDetails('gemini-2.5-flash'), {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    inputPrice: 'See Gemini pricing docs',
    outputPrice: 'See Gemini pricing docs',
    contextWindow: '1,048,576',
    maxOutputTokens: '65,535',
    notes: 'Balanced price/performance Gemini model and current runtime default.',
    maxOutputTokensValue: 65535,
  })
})

test('vertex chat transcript helpers append tokens and mark completion', async () => {
  const {
    createPendingAssistantMessage,
    appendAssistantToken,
    finalizeAssistantMessage,
  } = await loadVertexChatModule()

  const pending = createPendingAssistantMessage()
  assert.equal(pending.role, 'assistant')
  assert.equal(pending.status, 'streaming')

  const partial = appendAssistantToken(pending, 'Hello')
  assert.equal(partial.content, 'Hello')
  assert.equal(partial.status, 'streaming')

  const completed = finalizeAssistantMessage(partial)
  assert.equal(completed.content, 'Hello')
  assert.equal(completed.status, 'done')
})

test('vertex chat usage helpers accumulate input and output tokens across turns', async () => {
  const {
    accumulateVertexTokenUsage,
    createEmptyVertexTokenUsage,
  } = await loadVertexChatModule()

  const initial = createEmptyVertexTokenUsage()
  assert.deepEqual(initial, {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  })

  const next = accumulateVertexTokenUsage(initial, {
    inputTokens: 24,
    outputTokens: 61,
    totalTokens: 85,
  })

  assert.deepEqual(next, {
    inputTokens: 24,
    outputTokens: 61,
    totalTokens: 85,
  })

  const accumulated = accumulateVertexTokenUsage(next, {
    inputTokens: 12,
    outputTokens: 18,
    totalTokens: 30,
  })

  assert.deepEqual(accumulated, {
    inputTokens: 36,
    outputTokens: 79,
    totalTokens: 115,
  })
})
