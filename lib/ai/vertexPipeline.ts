import {
  buildEnrichPrompt,
  buildFixPrompt,
  buildGenPrompt,
  buildValidationPrompt,
  CODE_GEN_SYSTEM_PROMPT,
} from '@/lib/pipeline/prompts'
import {
  createVertexClient,
  extractVertexText,
  extractVertexUsage,
  type VertexGenerateContentResponse,
} from '@/lib/ai/vertex'
import type { PipelineConfig, ValidationIssue, ValidationReport } from '@/types/pipeline'

const DEFAULT_VERTEX_MODEL = 'gemini-2.5-flash'
const DEFAULT_VERTEX_LOCATION = 'us-central1'

function extractJsonLikeText(raw: string) {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function resolveVertexRuntimeConfig(config?: PipelineConfig) {
  const project = process.env.GCP_PROJECT_ID?.trim() || ''
  const location = process.env.GCP_LOCATION?.trim() || DEFAULT_VERTEX_LOCATION
  const model = config?.model?.trim() || DEFAULT_VERTEX_MODEL

  if (!project) {
    throw new Error(
      'Vertex pipeline requires GCP_PROJECT_ID and server credentials via GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials.',
    )
  }

  return {
    project,
    location,
    model,
  }
}

export async function callVertexPrompt(
  prompt: string,
  options?: {
    config?: PipelineConfig
    maxOutputTokens?: number
    temperature?: number
    responseMimeType?: 'application/json'
    systemInstruction?: string
  },
): Promise<{ text: string; usage: { input: number; output: number } }> {
  const runtime = resolveVertexRuntimeConfig(options?.config)
  const client = createVertexClient({
    project: runtime.project,
    location: runtime.location,
  })

  // New SDK uses client.models.generateContent
  const result = await client.models.generateContent({
    model: runtime.model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: options?.maxOutputTokens ?? 64000,
      temperature: options?.temperature ?? 0.3,
      responseMimeType: options?.responseMimeType,
      systemInstruction: options?.systemInstruction,
    },
  })

  const payload = result as unknown as VertexGenerateContentResponse
  const usageData = extractVertexUsage(payload)

  if (usageData.finishReason === 'MAX_TOKENS') {
    console.warn('Pipeline warning: Vertex AI output was truncated due to token limits.', {
      model: runtime.model,
      outputTokens: usageData.outputTokens,
    })
  }

  const text = extractVertexText(payload)

  if (!text) {
    if (usageData.finishReason === 'SAFETY') {
      throw new Error('Vertex AI blocked the response due to safety filters.')
    }
    throw new Error('Vertex returned an empty or malformed payload.')
  }

  const usage = {
    input: usageData.inputTokens,
    output: usageData.outputTokens,
  }

  return { text, usage }
}

export function parseVertexJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(extractJsonLikeText(raw)) as T
  } catch {
    return fallback
  }
}

export async function enrichWithVertex(ideaJson: string, config?: PipelineConfig) {
  const { text, usage } = await callVertexPrompt(buildEnrichPrompt(ideaJson), {
    config,
    maxOutputTokens: 64000,
    responseMimeType: undefined, 
  })
  return { content: text, usage }
}

export async function generateWithVertex(specJson: string, config?: PipelineConfig, previousCode?: string) {
  const systemInstruction = config?.system_prompt
    ? `${CODE_GEN_SYSTEM_PROMPT}\n\n[USER INSTRUCTIONS]\n${config.system_prompt}`
    : CODE_GEN_SYSTEM_PROMPT

  let phase: 'structure' | 'logic' | 'polish' | undefined
  if (config?.name?.toLowerCase().includes('structure')) phase = 'structure'
  if (config?.name?.toLowerCase().includes('logic')) phase = 'logic'
  if (config?.name?.toLowerCase().includes('polish')) phase = 'polish'

  let prompt = buildGenPrompt(specJson, phase)
  if (previousCode) {
    prompt = `I am building this component in stages. 
Here is the current code developed so far:
---
${previousCode}
---

Now, proceed with the next phase as instructed in the system prompt. 
Build upon the existing code, maintaining all existing logic while adding the new requested layers/logic.
Return the FULL updated component code.

SPECIFICATION:
${specJson}`
  }

  const { text, usage } = await callVertexPrompt(prompt, {
    config,
    maxOutputTokens: 64000,
    systemInstruction,
  })
  return { content: text, usage }
}

export async function fixWithVertex(
  specJson: string | null,
  code: string,
  error: string,
  config?: PipelineConfig,
  attempt = 1,
) {
  const prompt = specJson
    ? buildFixPrompt(specJson, code, error, attempt)
    : `Fix this React component. Error:\n${error}\n\nCode:\n${code}\n\nReturn ONLY the fixed code string. No markdown.`

  const { text, usage } = await callVertexPrompt(prompt, {
    config,
    maxOutputTokens: 64000,
  })
  return { content: text, usage }
}

export async function validateWithVertex(
  specJson: string,
  code: string,
  config?: PipelineConfig,
  previousIssues?: ValidationIssue[],
): Promise<{ content: ValidationReport; usage: { input: number; output: number } }> {
  // Use callVertexPrompt's systemInstruction for pure-validation prompts
  const systemInstruction = config?.system_prompt || buildValidationPrompt(specJson, code, previousIssues)
  const { text: raw, usage } = await callVertexPrompt(systemInstruction, {
    config,
    maxOutputTokens: 64000,
    responseMimeType: undefined,
  })

  return { 
    content: parseVertexJson(raw, {
      status: 'FAIL',
      score: 0,
      issues: [{ severity: 'critical', type: 'system', message: 'Failed to parse validation report' }],
    } satisfies ValidationReport),
    usage
  }
}
