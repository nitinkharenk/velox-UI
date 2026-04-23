export type ProviderModelOption = {
  id: string
  label: string
}

export type ProviderPricingModel = ProviderModelOption & {
  inputPrice: string
  outputPrice: string
  contextWindow: string
  maxOutputTokens: string
  notes: string
  docsUrl?: string
}

export type ProviderCatalogEntry = {
  id: string
  label: string
  docsUrl?: string
  lastVerifiedAt?: string
  runtimeNote?: string
  models: ProviderPricingModel[]
}

const GEMINI_FAMILY_MODELS: ProviderPricingModel[] = [
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    inputPrice: 'See Gemini pricing docs',
    outputPrice: 'See Gemini pricing docs',
    contextWindow: '1,048,576',
    maxOutputTokens: '65,535',
    notes: 'Highest-capability Gemini model for code, reasoning, and large-context stages.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro (Preview)',
    inputPrice: 'See Gemini pricing docs',
    outputPrice: 'See Gemini pricing docs',
    contextWindow: '1,048,576',
    maxOutputTokens: '65,535',
    notes: 'Premium preview model with state-of-the-art coding and reasoning capabilities.',
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    label: 'Gemini 3.1 Flash-Lite (Preview)',
    inputPrice: 'See Gemini pricing docs',
    outputPrice: 'See Gemini pricing docs',
    contextWindow: '1,048,576',
    maxOutputTokens: '65,535',
    notes: 'Ultra-low latency preview model designed for high-throughput lightweight tasks.',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash (Preview)',
    inputPrice: 'See Gemini pricing docs',
    outputPrice: 'See Gemini pricing docs',
    contextWindow: '1,048,576',
    maxOutputTokens: '65,535',
    notes: 'Next-generation lightweight model optimized for speed and high-volume generation.',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    inputPrice: 'See Gemini pricing docs',
    outputPrice: 'See Gemini pricing docs',
    contextWindow: '1,048,576',
    maxOutputTokens: '65,535',
    notes: 'Highest-capability Gemini model for code, reasoning, and large-context stages.',
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    inputPrice: 'See Gemini pricing docs',
    outputPrice: 'See Gemini pricing docs',
    contextWindow: '1,048,576',
    maxOutputTokens: '65,535',
    notes: 'Balanced price/performance Gemini model and current runtime default.',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    inputPrice: 'See Gemini pricing docs',
    outputPrice: 'See Gemini pricing docs',
    contextWindow: '1,048,576',
    maxOutputTokens: '65,535',
    notes: 'Fastest cost-focused Gemini 2.5 variant with strong structured-output support.',
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    inputPrice: '$0.10 / 1M tokens',
    outputPrice: '$0.40 / 1M tokens',
    contextWindow: '1,048,576',
    maxOutputTokens: '8,192',
    notes: 'Second-generation Gemini workhorse with native tool-use and long context.',
  },
  {
    id: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash-Lite',
    inputPrice: 'See Gemini pricing docs',
    outputPrice: 'See Gemini pricing docs',
    contextWindow: '1,048,576',
    maxOutputTokens: '8,192',
    notes: 'Lower-latency Gemini 2.0 option for lightweight text stages.',
  },
]

// Static, manually curated provider metadata for the workflow editor.
// This intentionally covers text/code-capable models only.
export const PROVIDER_CATALOG: Record<string, ProviderCatalogEntry> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    docsUrl: 'https://docs.anthropic.com/en/docs/models-overview',
    lastVerifiedAt: '2026-04-15',
    models: [
      {
        id: 'claude-opus-4-1-20250805',
        label: 'Claude Opus 4.1',
        inputPrice: '$15 / 1M tokens',
        outputPrice: '$75 / 1M tokens',
        contextWindow: '200K',
        maxOutputTokens: '—',
        notes: 'Highest-capability Claude model for advanced coding and reasoning.',
      },
      {
        id: 'claude-opus-4-20250514',
        label: 'Claude Opus 4',
        inputPrice: '$15 / 1M tokens',
        outputPrice: '$75 / 1M tokens',
        contextWindow: '200K',
        maxOutputTokens: '—',
        notes: 'Flagship Claude generation with strong reasoning and long-context behavior.',
      },
      {
        id: 'claude-sonnet-4-20250514',
        label: 'Claude Sonnet 4',
        inputPrice: '$3 / 1M tokens',
        outputPrice: '$15 / 1M tokens',
        contextWindow: '200K',
        maxOutputTokens: '—',
        notes: 'Best general default for code generation; 1M context is available in beta.',
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        label: 'Claude Sonnet 3.7',
        inputPrice: '$3 / 1M tokens',
        outputPrice: '$15 / 1M tokens',
        contextWindow: '200K',
        maxOutputTokens: '—',
        notes: 'Strong prior-generation coding model with stable snapshot behavior.',
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        label: 'Claude Sonnet 3.5 v2',
        inputPrice: '$3 / 1M tokens',
        outputPrice: '$15 / 1M tokens',
        contextWindow: '200K',
        maxOutputTokens: '—',
        notes: 'Balanced Claude fallback when newer Sonnet snapshots are unavailable.',
      },
      {
        id: 'claude-3-5-sonnet-20240620',
        label: 'Claude Sonnet 3.5',
        inputPrice: '$3 / 1M tokens',
        outputPrice: '$15 / 1M tokens',
        contextWindow: '200K',
        maxOutputTokens: '—',
        notes: 'Legacy Sonnet snapshot kept for backward compatibility with older workflows.',
      },
      {
        id: 'claude-3-5-haiku-20241022',
        label: 'Claude Haiku 3.5',
        inputPrice: '$0.80 / 1M tokens',
        outputPrice: '$4 / 1M tokens',
        contextWindow: '200K',
        maxOutputTokens: '—',
        notes: 'Fast lower-cost Claude option for lighter enrichment and validation stages.',
      },
      {
        id: 'claude-3-haiku-20240307',
        label: 'Claude Haiku 3',
        inputPrice: '$0.25 / 1M tokens',
        outputPrice: '$1.25 / 1M tokens',
        contextWindow: '200K',
        maxOutputTokens: '—',
        notes: 'Legacy low-cost Claude model retained for compatibility.',
      },
    ],
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    docsUrl: 'https://console.groq.com/docs/tool-use/overview',
    lastVerifiedAt: '2026-04-15',
    models: [
      {
        id: 'groq/compound',
        label: 'Groq Compound',
        inputPrice: 'Underlying mix / see docs',
        outputPrice: 'Underlying mix / see docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Agentic Groq system with built-in tools; pricing depends on underlying model mix.',
      },
      {
        id: 'groq/compound-mini',
        label: 'Groq Compound Mini',
        inputPrice: 'Underlying mix / see docs',
        outputPrice: 'Underlying mix / see docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Lower-cost Compound variant for agentic orchestration and built-in tools.',
      },
      {
        id: 'openai/gpt-oss-120b',
        label: 'GPT-OSS 120B',
        inputPrice: '$0.15 / 1M tokens',
        outputPrice: '$0.75 / 1M tokens',
        contextWindow: '131,072',
        maxOutputTokens: '65,536',
        notes: 'Strong open-weight Groq-hosted model for complex coding and reasoning.',
        docsUrl: 'https://console.groq.com/docs/model/openai/gpt-oss-120b',
      },
      {
        id: 'openai/gpt-oss-20b',
        label: 'GPT-OSS 20B',
        inputPrice: '$0.075 / 1M tokens',
        outputPrice: '$0.30 / 1M tokens',
        contextWindow: '131,072',
        maxOutputTokens: '65,536',
        notes: 'Fast lower-cost Groq-hosted open-weight model with strong tool and JSON support.',
        docsUrl: 'https://console.groq.com/docs/model/openai/gpt-oss-20b',
      },
      {
        id: 'qwen/qwen3-32b',
        label: 'Qwen 3 32B',
        inputPrice: '$0.29 / 1M tokens',
        outputPrice: '$0.59 / 1M tokens',
        contextWindow: '131,072',
        maxOutputTokens: '40,960',
        notes: 'Reasoning-capable Groq-hosted model with strong multilingual and coding performance.',
        docsUrl: 'https://console.groq.com/docs/model/qwen3-32b',
      },
      {
        id: 'meta-llama/llama-4-scout-17b-16e-instruct',
        label: 'Llama 4 Scout 17B',
        inputPrice: 'See Groq docs',
        outputPrice: 'See Groq docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Modern Llama-family instruct model exposed by Groq for text generation and tool use.',
      },
      {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B Versatile',
        inputPrice: 'See Groq docs',
        outputPrice: 'See Groq docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Reliable Groq text generation model already used in the current pipeline.',
      },
      {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B Instant',
        inputPrice: 'See Groq docs',
        outputPrice: 'See Groq docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Fastest lightweight Groq option for lower-cost text stages.',
      },
    ],
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini',
    lastVerifiedAt: '2026-04-18',
    models: GEMINI_FAMILY_MODELS,
  },
  vertex: {
    id: 'vertex',
    label: 'Vertex AI',
    docsUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/models',
    lastVerifiedAt: '2026-04-18',
    runtimeNote: 'Vertex workflow execution is wired through @google-cloud/vertexai and requires GCP_PROJECT_ID, GCP_LOCATION, and GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials on the server.',
    models: GEMINI_FAMILY_MODELS,
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    docsUrl: 'https://developers.openai.com/api/docs/models',
    lastVerifiedAt: '2026-04-15',
    runtimeNote: 'OpenAI workflow execution is not yet wired in the current runtime. These entries are catalog/pricing metadata only.',
    models: [
      {
        id: 'gpt-5.4',
        label: 'GPT-5.4',
        inputPrice: '$2.50 / 1M tokens',
        outputPrice: '$15 / 1M tokens',
        contextWindow: '1M',
        maxOutputTokens: '128K',
        notes: 'Flagship OpenAI reasoning/coding model in the current docs.',
      },
      {
        id: 'gpt-5.4-mini',
        label: 'GPT-5.4 Mini',
        inputPrice: '$0.75 / 1M tokens',
        outputPrice: '$4.50 / 1M tokens',
        contextWindow: '400K',
        maxOutputTokens: '128K',
        notes: 'Smaller GPT-5.4 variant tuned for speed and cost efficiency.',
      },
      {
        id: 'gpt-5.4-nano',
        label: 'GPT-5.4 Nano',
        inputPrice: '$0.20 / 1M tokens',
        outputPrice: '$1.25 / 1M tokens',
        contextWindow: '400K',
        maxOutputTokens: '128K',
        notes: 'Highest-throughput GPT-5.4-class option for simple high-volume stages.',
      },
      {
        id: 'gpt-5',
        label: 'GPT-5',
        inputPrice: '$1.25 / 1M tokens',
        outputPrice: '$10 / 1M tokens',
        contextWindow: '400K',
        maxOutputTokens: '128K',
        notes: 'Previous OpenAI reasoning/coding model retained as a known fallback.',
      },
      {
        id: 'gpt-5-mini',
        label: 'GPT-5 Mini',
        inputPrice: '$0.25 / 1M tokens',
        outputPrice: 'See OpenAI docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Smaller GPT-5 family variant listed in current OpenAI model comparisons.',
      },
      {
        id: 'gpt-5-nano',
        label: 'GPT-5 Nano',
        inputPrice: '$0.05 / 1M tokens',
        outputPrice: 'See OpenAI docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Lowest-cost GPT-5 family option listed in current OpenAI comparisons.',
      },
      {
        id: 'gpt-5-pro',
        label: 'GPT-5 Pro',
        inputPrice: 'See OpenAI docs',
        outputPrice: 'See OpenAI docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Higher-precision GPT-5-class variant listed in the frontier model catalog.',
      },
      {
        id: 'gpt-4.1',
        label: 'GPT-4.1',
        inputPrice: 'See OpenAI docs',
        outputPrice: 'See OpenAI docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Current non-reasoning OpenAI flagship for strong instruction following.',
      },
      {
        id: 'gpt-4.1-mini',
        label: 'GPT-4.1 Mini',
        inputPrice: 'See OpenAI docs',
        outputPrice: 'See OpenAI docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Lower-latency GPT-4.1 family model for lightweight structured generation.',
      },
      {
        id: 'gpt-4.1-nano',
        label: 'GPT-4.1 Nano',
        inputPrice: '$0.10 / 1M tokens',
        outputPrice: '$0.40 / 1M tokens',
        contextWindow: '1,047,576',
        maxOutputTokens: '32,768',
        notes: 'Fastest GPT-4.1 variant with strong tool calling and low-latency output.',
      },
      {
        id: 'o3',
        label: 'o3',
        inputPrice: 'See OpenAI docs',
        outputPrice: 'See OpenAI docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'OpenAI reasoning model family entry kept for workflow catalog completeness.',
      },
      {
        id: 'o4-mini',
        label: 'o4-mini',
        inputPrice: 'See OpenAI docs',
        outputPrice: 'See OpenAI docs',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Smaller OpenAI reasoning model option listed in current model docs.',
      },
    ],
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama',
    docsUrl: 'https://ollama.com/library',
    lastVerifiedAt: '2026-04-15',
    models: [
      {
        id: 'qwen3:32b',
        label: 'Qwen 3 32B',
        inputPrice: 'Self-hosted / infra-dependent',
        outputPrice: 'Self-hosted / infra-dependent',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Strong local reasoning and coding option if your machine can support it.',
      },
      {
        id: 'qwen2.5-coder:32b',
        label: 'Qwen 2.5 Coder 32B',
        inputPrice: 'Self-hosted / infra-dependent',
        outputPrice: 'Self-hosted / infra-dependent',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Current local default in the repo for code generation and repair.',
      },
      {
        id: 'deepseek-r1:32b',
        label: 'DeepSeek R1 32B',
        inputPrice: 'Self-hosted / infra-dependent',
        outputPrice: 'Self-hosted / infra-dependent',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Local reasoning-focused model suited to slower but deeper validation passes.',
      },
      {
        id: 'llama3.1:70b',
        label: 'Llama 3.1 70B',
        inputPrice: 'Self-hosted / infra-dependent',
        outputPrice: 'Self-hosted / infra-dependent',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Large local general-purpose model with heavy hardware requirements.',
      },
      {
        id: 'llama3.1:8b',
        label: 'Llama 3.1 8B',
        inputPrice: 'Self-hosted / infra-dependent',
        outputPrice: 'Self-hosted / infra-dependent',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Smaller local fallback for lower-resource environments.',
      },
      {
        id: 'gemma3:27b',
        label: 'Gemma 3 27B',
        inputPrice: 'Self-hosted / infra-dependent',
        outputPrice: 'Self-hosted / infra-dependent',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Local single-GPU-capable model with strong general text generation.',
      },
      {
        id: 'mistral:7b',
        label: 'Mistral 7B',
        inputPrice: 'Self-hosted / infra-dependent',
        outputPrice: 'Self-hosted / infra-dependent',
        contextWindow: '—',
        maxOutputTokens: '—',
        notes: 'Lightweight local fallback for constrained machines.',
      },
    ],
  },
}

export const PROVIDER_MODELS: Record<string, ProviderModelOption[]> = Object.fromEntries(
  Object.entries(PROVIDER_CATALOG).map(([provider, entry]) => [
    provider,
    entry.models.map(({ id, label }) => ({ id, label })),
  ]),
) as Record<string, ProviderModelOption[]>

export const DEFAULT_PIPELINE_PROVIDER = 'anthropic'

export function getDefaultProviderModel(provider: string): string {
  return PROVIDER_CATALOG[provider]?.models[0]?.id ?? ''
}

export function getProviderModelDetails(provider: string, modelId: string) {
  return PROVIDER_CATALOG[provider]?.models.find((model) => model.id === modelId)
}

function parseTokenLimitValue(raw: string) {
  const normalized = raw.trim()
  if (!normalized || normalized === '—') return null

  const compact = normalized.replace(/,/g, '').toUpperCase()
  if (/^\d+$/.test(compact)) return Number(compact)

  const match = compact.match(/^(\d+(?:\.\d+)?)([KM])$/)
  if (!match) return null

  const numeric = Number(match[1])
  const multiplier = match[2] === 'M' ? 1_000_000 : 1_000

  return Math.round(numeric * multiplier)
}

export function getProviderModelTokenLimits(provider: string, modelId: string) {
  const details = getProviderModelDetails(provider, modelId)

  return {
    contextWindow: details?.contextWindow ?? '—',
    maxOutputTokens: details?.maxOutputTokens ?? '—',
    maxOutputTokensValue: parseTokenLimitValue(details?.maxOutputTokens ?? ''),
  }
}

export const DEFAULT_PIPELINE_MODEL = getDefaultProviderModel(DEFAULT_PIPELINE_PROVIDER)
