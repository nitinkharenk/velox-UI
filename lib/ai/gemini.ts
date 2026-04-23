import { buildEnrichPrompt, buildGenPrompt, CODE_GEN_SYSTEM_PROMPT, buildValidationPrompt, buildFixPrompt } from '@/lib/pipeline/prompts'
import type { PipelineConfig, ValidationIssue, ValidationReport } from '@/types/pipeline'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function getGeminiModel(config?: PipelineConfig) {
  const model = config?.model?.toLowerCase() || ''
  
  // If the user explicitly provided a gemini model string, use it directly
  if (model.startsWith('gemini-') || model.startsWith('models/gemini-')) {
    return model
  }

  // Legacy mappings/fallbacks for generic inputs
  if (model.includes('flash')) {
    if (model.includes('2') || model.includes('2.0')) return 'gemini-2.0-flash-exp'
    return 'gemini-1.5-flash'
  }
  
  if (model.includes('pro')) return 'gemini-1.5-pro'
  
  return config?.model || 'gemini-1.5-flash'
}

async function callGemini(
  prompt: string,
  config?: PipelineConfig,
  isJson = false,
  maxOutputTokens = 40000,
): Promise<{ content: string; usage: { input: number; output: number } }> {
  const model = getGeminiModel(config)
  const systemPrompt = config?.system_prompt || null

  const res = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(systemPrompt ? {
          system_instruction: {
            parts: [{ text: systemPrompt }]
          }
        } : {}),
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens,
          temperature: 0.3,
          ...(isJson ? { responseMimeType: 'application/json' } : {})
        }
      })
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API Error (${res.status}): ${errText}`)
  }

  const data = await res.json()
  
  const candidate = data.candidates?.[0]
  
  if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'BLOCKLIST') {
    throw new Error(`Gemini Safety Trigger: Generation blocked by safety filters. Reason: ${candidate.finishReason}`)
  }

  const content = candidate?.content?.parts?.[0]?.text

  if (!content) {
    throw new Error(`Gemini returned an empty or malformed payload. (FinishReason: ${candidate?.finishReason})`)
  }

  const usage = {
    input: data.usageMetadata?.promptTokenCount ?? 0,
    output: data.usageMetadata?.candidatesTokenCount ?? 0,
  }

  return { content, usage }
}

export const enrichWithGemini = async (ideaJson: string, config?: PipelineConfig) =>
  callGemini(buildEnrichPrompt(ideaJson), config, false, 12000)

export const generateWithGemini = async (specJson: string, config?: PipelineConfig, previousCode?: string) => {
  const sys = config?.system_prompt ? `${CODE_GEN_SYSTEM_PROMPT}\n\n[USER INSTRUCTIONS]\n${config.system_prompt}` : CODE_GEN_SYSTEM_PROMPT
  
  // Update config to include combined system prompt for callGemini's system_instruction param
  const updatedConfig: PipelineConfig | undefined = config ? { ...config, system_prompt: sys } : undefined
  
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

  // Use 40,000 for generation stages to prevent truncation as requested.
  return callGemini(prompt, updatedConfig, false, 40000)
}

export const fixWithGemini = async (
  specJson: string | null,
  code: string,
  error: string,
  config?: PipelineConfig,
  attempt = 1,
) => {
  const prompt = specJson
    ? buildFixPrompt(specJson, code, error, attempt)
    : `Fix this React component. Error:\n${error}\n\nCode:\n${code}\n\nReturn ONLY the fixed code string. No markdown.`
  return callGemini(prompt, config, false, 40000)
}

export const validateWithGemini = async (
  specJson: string,
  code: string,
  config?: PipelineConfig,
  previousIssues?: ValidationIssue[],
): Promise<{ content: ValidationReport; usage: { input: number; output: number } }> => {
  const systemPrompt = config?.system_prompt || null
  const prompt = systemPrompt || buildValidationPrompt(specJson, code, previousIssues)
  
  const { content: raw, usage } = await callGemini(prompt, config, false, 40000)
  try {
    return { content: JSON.parse(raw), usage }
  } catch {
    return { 
      content: { status: 'FAIL', score: 0, issues: [{ severity: 'critical', type: 'system', message: 'Failed to parse validation report' }] },
      usage
    }
  }
}

