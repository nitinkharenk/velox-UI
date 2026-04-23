import { buildEnrichPrompt, buildGenPrompt, CODE_GEN_SYSTEM_PROMPT, buildValidationPrompt, buildFixPrompt } from '@/lib/pipeline/prompts'
import type { PipelineConfig, ValidationIssue, ValidationReport } from '@/types/pipeline'

async function callOllama(prompt: string, model = 'qwen2.5-coder:32b', numPredict?: number): Promise<{ content: string; usage: { input: number; output: number } }> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        ...(numPredict !== undefined ? { options: { num_predict: numPredict } } : {})
      })
    })
    const data = await res.json()
    const usage = {
      input: data.prompt_eval_count ?? 0,
      output: data.eval_count ?? 0,
    }
    return { content: data.response ?? '', usage }
  } catch (error) {
    console.warn('Ollama call failed:', error)
    return { content: '', usage: { input: 0, output: 0 } }
  }
}

export const generateWithOllama = async (specJson: string, config?: PipelineConfig) => {
  const sys = config?.system_prompt ? `${CODE_GEN_SYSTEM_PROMPT}\n\n[USER INSTRUCTIONS]\n${config.system_prompt}` : CODE_GEN_SYSTEM_PROMPT
  return callOllama(`${sys}\n\n${buildGenPrompt(specJson)}`, config?.model, 3500)
}

export const enrichWithOllama = async (ideaJson: string, config?: PipelineConfig) => {
  return callOllama(
    `${buildEnrichPrompt(ideaJson)}\n\nIMPORTANT: YOU MUST RETURN EXCLUSIVELY RAW JSON. DO NOT WRAP IN MARKDOWN.`,
    config?.model,
    1200,
  )
}

export const fixWithOllama = async (
  specJson: string | null,
  code: string,
  error: string,
  config?: PipelineConfig,
  attempt = 1,
) => {
  const prompt = specJson
    ? buildFixPrompt(specJson, code, error, attempt)
    : `Fix this React component. Error:\n${error}\n\nCode:\n${code}\n\nReturn ONLY the fixed code string. No markdown.`
  return callOllama(prompt, config?.model, 2500)
}

export const validateWithOllama = async (
  specJson: string,
  code: string,
  config?: PipelineConfig,
  previousIssues?: ValidationIssue[],
): Promise<{ content: ValidationReport; usage: { input: number; output: number } }> => {
  const tokenBudget = previousIssues && previousIssues.length > 0 ? 1400 : 800
  const { content: raw, usage } = await callOllama(
    `${buildValidationPrompt(specJson, code, previousIssues)}\n\nIMPORTANT: YOU MUST RETURN EXCLUSIVELY RAW JSON. DO NOT WRAP IN MARKDOWN.`,
    config?.model,
    tokenBudget,
  )
  try {
    const s = raw.indexOf('{')
    const e = raw.lastIndexOf('}')
    if (s !== -1 && e > s) return { content: JSON.parse(raw.substring(s, e + 1)), usage }
    return { content: JSON.parse(raw), usage }
  } catch {
    return { 
      content: { status: 'FAIL', score: 0, issues: [{ severity: 'critical', type: 'system', message: 'Failed to parse validation report' }] },
      usage
    }
  }
}
