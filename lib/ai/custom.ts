import { 
  buildEnrichPrompt, 
  buildGenPrompt, 
  CODE_GEN_SYSTEM_PROMPT, 
  buildValidationPrompt, 
  buildFixPrompt 
} from '@/lib/pipeline/prompts'
import type { PipelineConfig, ValidationIssue, ValidationReport } from '@/types/pipeline'

async function callCustomAI(
  prompt: string, 
  systemPrompt: string | null,
  config: PipelineConfig,
  maxTokens?: number
): Promise<{ content: string; usage: { input: number; output: number } }> {
  const { base_url, model, provider } = config
  
  // Resolve API Key dynamically from environment
  const envKeyName = (config as any).envKeyName || `${provider.toUpperCase()}_API_KEY`
  const apiKey = process.env[envKeyName]

  if (!base_url) {
    throw new Error(`Custom provider ${provider} has no Base URL configured.`)
  }

  if (!apiKey) {
    throw new Error(`Missing API Key for Custom provider ${provider}. Expected: ${envKeyName}`)
  }

  // Most custom providers follow OpenAI Chat Completion format
  const endpoint = base_url.endsWith('/') ? `${base_url}chat/completions` : `${base_url}/chat/completions`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        ...(maxTokens ? { max_tokens: maxTokens } : {})
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Custom AI Error (${res.status}): ${errText}`)
    }

    const data = await res.json()
    const usage = {
      input: data.usage?.prompt_tokens ?? 0,
      output: data.usage?.completion_tokens ?? 0,
    }
    return { content: data.choices?.[0]?.message?.content ?? '', usage }
  } catch (err) {
    console.error(`[CustomAI] Fetch failed for ${endpoint}:`, err)
    throw err
  }
}

export const generateWithCustom = async (specJson: string, config: PipelineConfig, previousCode?: string) => {
  const sys = config.system_prompt 
    ? `${CODE_GEN_SYSTEM_PROMPT}\n\n[USER INSTRUCTIONS]\n${config.system_prompt}` 
    : CODE_GEN_SYSTEM_PROMPT
    
  let prompt = buildGenPrompt(specJson)
  if (previousCode) {
    prompt = `Continue or refine the following React code based on this spec:\n\nSPEC:\n${specJson}\n\nPREVIOUS CODE:\n${previousCode}`
  }

  return callCustomAI(prompt, sys, config, 4000)
}

export const enrichWithCustom = async (ideaJson: string, config: PipelineConfig) => {
  return callCustomAI(
    `${buildEnrichPrompt(ideaJson)}\n\nIMPORTANT: YOU MUST RETURN EXCLUSIVELY RAW JSON. DO NOT WRAP IN MARKDOWN.`,
    "You are a technical specification expert. Always respond in valid JSON.",
    config,
    2000
  )
}

export const fixWithCustom = async (
  specJson: string | null,
  code: string,
  error: string,
  config: PipelineConfig,
  attempt = 1,
) => {
  const prompt = specJson
    ? buildFixPrompt(specJson, code, error, attempt)
    : `Fix this React component. Error:\n${error}\n\nCode:\n${code}\n\nReturn ONLY the fixed code string. No markdown.`
    
  return callCustomAI(prompt, "You are a senior React developer specializing in debugging.", config, 3000)
}

export const validateWithCustom = async (
  specJson: string,
  code: string,
  config: PipelineConfig,
  previousIssues?: ValidationIssue[],
): Promise<{ content: ValidationReport; usage: { input: number; output: number } }> => {
  const { content: raw, usage } = await callCustomAI(
    `${buildValidationPrompt(specJson, code, previousIssues)}\n\nIMPORTANT: YOU MUST RETURN EXCLUSIVELY RAW JSON. DO NOT WRAP IN MARKDOWN.`,
    "You are a code reviewer. Always respond in valid JSON matching the requested schema.",
    config,
    1500
  )
  
  try {
    const s = raw.indexOf('{')
    const e = raw.lastIndexOf('}')
    const parsed = (s !== -1 && e > s) ? JSON.parse(raw.substring(s, e + 1)) : JSON.parse(raw)
    return { content: parsed, usage }
  } catch {
    return { 
      content: { 
        status: 'FAIL', 
        score: 0, 
        issues: [{ 
          severity: 'critical', 
          type: 'system', 
          message: 'Failed to parse custom validation report' 
        }] 
      },
      usage
    }
  }
}
