import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { readFile } from 'node:fs/promises'

test('pipeline provider model catalog includes current official model ids', async () => {
  const modulePath = path.join(process.cwd(), 'lib/pipeline/providerModels.ts')
  const { PROVIDER_MODELS, PROVIDER_CATALOG, getProviderModelDetails, getProviderModelTokenLimits } = await import(modulePath)

  const anthropicIds = PROVIDER_MODELS.anthropic.map((model: { id: string }) => model.id)
  assert.ok(anthropicIds.includes('claude-opus-4-1-20250805'))
  assert.ok(anthropicIds.includes('claude-opus-4-20250514'))
  assert.ok(anthropicIds.includes('claude-sonnet-4-20250514'))
  assert.ok(anthropicIds.includes('claude-3-7-sonnet-20250219'))
  assert.ok(anthropicIds.includes('claude-3-5-haiku-20241022'))

  const groqIds = PROVIDER_MODELS.groq.map((model: { id: string }) => model.id)
  assert.ok(groqIds.includes('groq/compound'))
  assert.ok(groqIds.includes('groq/compound-mini'))
  assert.ok(groqIds.includes('openai/gpt-oss-120b'))
  assert.ok(groqIds.includes('openai/gpt-oss-20b'))
  assert.ok(groqIds.includes('qwen/qwen3-32b'))
  assert.ok(groqIds.includes('meta-llama/llama-4-scout-17b-16e-instruct'))

  const geminiIds = PROVIDER_MODELS.gemini.map((model: { id: string }) => model.id)
  assert.ok(geminiIds.includes('gemini-2.5-pro'))
  assert.ok(geminiIds.includes('gemini-2.5-flash'))
  assert.ok(geminiIds.includes('gemini-2.5-flash-lite'))
  assert.ok(geminiIds.includes('gemini-2.0-flash'))
  assert.ok(geminiIds.includes('gemini-2.0-flash-lite'))

  const vertexIds = PROVIDER_MODELS.vertex.map((model: { id: string }) => model.id)
  assert.ok(vertexIds.includes('gemini-2.5-pro'))
  assert.ok(vertexIds.includes('gemini-2.5-flash'))
  assert.ok(vertexIds.includes('gemini-2.5-flash-lite'))
  assert.ok(vertexIds.includes('gemini-2.0-flash'))
  assert.ok(vertexIds.includes('gemini-2.0-flash-lite'))

  const openaiIds = PROVIDER_MODELS.openai.map((model: { id: string }) => model.id)
  assert.ok(openaiIds.includes('gpt-5.4'))
  assert.ok(openaiIds.includes('gpt-5.4-mini'))
  assert.ok(openaiIds.includes('gpt-5.4-nano'))
  assert.ok(openaiIds.includes('gpt-4.1'))
  assert.ok(openaiIds.includes('gpt-4.1-mini'))
  assert.ok(openaiIds.includes('gpt-4.1-nano'))
  assert.ok(openaiIds.includes('o3'))
  assert.ok(openaiIds.includes('o4-mini'))

  const ollamaIds = PROVIDER_MODELS.ollama.map((model: { id: string }) => model.id)
  assert.ok(ollamaIds.includes('qwen3:32b'))
  assert.ok(ollamaIds.includes('qwen2.5-coder:32b'))
  assert.ok(ollamaIds.includes('deepseek-r1:32b'))
  assert.ok(ollamaIds.includes('llama3.1:70b'))
  assert.ok(ollamaIds.includes('gemma3:27b'))
  assert.ok(ollamaIds.includes('mistral:7b'))

  for (const provider of Object.values(PROVIDER_CATALOG) as Array<{
    label: string
    docsUrl?: string
    models: Array<{
      inputPrice: string
      outputPrice: string
      contextWindow: string
      maxOutputTokens: string
      notes: string
    }>
  }>) {
    assert.ok(provider.label.length > 0, 'Expected every provider entry to have a display label')
    assert.ok(provider.models.length > 0, 'Expected every provider entry to include models')

    for (const model of provider.models) {
      assert.ok(model.inputPrice.length > 0, 'Expected every model to expose input pricing')
      assert.ok(model.outputPrice.length > 0, 'Expected every model to expose output pricing')
      assert.ok(model.contextWindow.length > 0, 'Expected every model to expose context window metadata')
      assert.ok(model.maxOutputTokens.length > 0, 'Expected every model to expose max output metadata')
      assert.ok(model.notes.length > 0, 'Expected every model to expose usage notes')
    }
  }

  assert.equal(
    getProviderModelDetails('vertex', 'gemini-2.5-pro')?.maxOutputTokens,
    '65,535',
    'Expected Vertex Gemini 2.5 Pro output limit to match the current Vertex model docs',
  )

  assert.deepEqual(
    getProviderModelTokenLimits('vertex', 'gemini-2.0-flash-lite'),
    {
      contextWindow: '1,048,576',
      maxOutputTokens: '8,192',
      maxOutputTokensValue: 8192,
    },
    'Expected model token helper to expose formatted and numeric limits for Vertex models',
  )
})

test('workflow creation and settings editor share a current anthropic default model', async () => {
  const routeSource = await readFile(
    path.join(process.cwd(), 'app/api/pipeline/workflows/route.ts'),
    'utf8',
  )
  const editorSource = await readFile(
    path.join(process.cwd(), 'components/pipeline/PipelineConfigsEditor.tsx'),
    'utf8',
  )

  assert.doesNotMatch(
    routeSource,
    /claude-3-5-sonnet-20240620/,
    'Expected workflow creation to stop seeding stages with the stale Claude 3.5 Sonnet 20240620 snapshot',
  )

  assert.doesNotMatch(
    editorSource,
    /claude-3-5-sonnet-20240620/,
    'Expected the settings editor to stop defaulting new stages to the stale Claude 3.5 Sonnet 20240620 snapshot',
  )
})

test('settings workflow editor exposes a pricing catalog entry point and provider pricing reference', async () => {
  const editorSource = await readFile(
    path.join(process.cwd(), 'components/pipeline/PipelineConfigsEditor.tsx'),
    'utf8',
  )
  const providerSource = await readFile(
    path.join(process.cwd(), 'lib/pipeline/providerModels.ts'),
    'utf8',
  )
  const globalsSource = await readFile(
    path.join(process.cwd(), 'app/globals.css'),
    'utf8',
  )

  assert.match(
    editorSource,
    /Model pricing/,
    'Expected the workflow editor to expose a pricing/details button',
  )

  assert.match(
    editorSource,
    /provider\.runtimeNote/,
    'Expected the pricing panel to render provider runtime notes when present',
  )

  assert.match(
    editorSource,
    /Input price/i,
    'Expected the pricing panel to render an input pricing column or label',
  )

  assert.match(
    editorSource,
    /Output price/i,
    'Expected the pricing panel to render an output pricing column or label',
  )

  assert.match(
    editorSource,
    /Context window/i,
    'Expected the pricing panel to render a context window column or label',
  )

  assert.match(
    editorSource,
    /Max output/i,
    'Expected the pricing panel to render a max output column or label',
  )

  assert.match(
    editorSource,
    /dashboard-modal-overlay/,
    'Expected the pricing catalog to render inside a full-screen modal overlay',
  )

  assert.match(
    editorSource,
    /All providers/i,
    'Expected the pricing catalog to expose an all-providers filter option',
  )

  assert.match(
    editorSource,
    /selectedProviderFilter/,
    'Expected the pricing catalog to support provider-level filtering state',
  )

  assert.match(
    editorSource,
    /dashboard-modal-frame/,
    'Expected the pricing modal to use the shared dashboard modal frame class for a solid elevated surface',
  )

  assert.match(
    editorSource,
    /dashboard-modal-provider-card/,
    'Expected the pricing modal provider sections to use the shared dashboard modal provider card class',
  )

  assert.match(
    editorSource,
    /dashboard-modal-copy/,
    'Expected the pricing modal body copy to use the shared readable dashboard modal copy class',
  )

  assert.match(
    editorSource,
    /dashboard-modal-filter-chip/,
    'Expected the pricing modal provider filter to use the shared dashboard modal filter chip class',
  )

  assert.match(
    globalsSource + '\n' + editorSource,
    /dashboard-modal-overlay|dashboard-modal-frame|dashboard-modal-provider-card/,
    'Expected the pricing modal experience to be backed by shared app-level dashboard modal classes',
  )

  assert.match(
    providerSource,
    /OpenAI workflow execution is not yet wired in the current runtime/i,
    'Expected shared provider metadata to clarify the OpenAI runtime limitation',
  )

  for (const providerLabel of ['Anthropic', 'Groq', 'Gemini', 'Vertex AI', 'OpenAI', 'Ollama']) {
    assert.match(
      providerSource,
      new RegExp(providerLabel),
      `Expected shared provider metadata to reference ${providerLabel}`,
    )
  }
})
