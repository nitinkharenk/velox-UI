import { buildEnrichPrompt, buildGenPrompt, CODE_GEN_SYSTEM_PROMPT, buildValidationPrompt, buildFixPrompt, buildRepairAcceptancePrompt } from '@/lib/pipeline/prompts'
import type { PipelineConfig, ValidationIssue, ValidationReport } from '@/types/pipeline'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

function toGroqErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (
    /Request too large/i.test(message) ||
    /tokens per minute/i.test(message) ||
    /rate_limit_exceeded/i.test(message)
  ) {
    return 'Groq rejected this pipeline step because the request exceeded the model token budget. Reduce the prompt size, lower the requested output length, or switch this stage to Anthropic/Gemini for larger generations.'
  }

  return message
}

export async function generateWithGroq(specJson: string, config?: PipelineConfig): Promise<{ content: string; usage: { input: number; output: number } }> {
  const sys = config?.system_prompt ? `${CODE_GEN_SYSTEM_PROMPT}\n\n[USER INSTRUCTIONS]\n${config.system_prompt}` : CODE_GEN_SYSTEM_PROMPT
  try {
    const res = await groq.chat.completions.create({
      model: config?.model || 'llama-3.3-70b-versatile',
      max_tokens: 3500,
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: buildGenPrompt(specJson) }
      ]
    })
    const usage = {
      input: res.usage?.prompt_tokens ?? 0,
      output: res.usage?.completion_tokens ?? 0,
    }
    return { content: res.choices[0].message.content ?? '', usage }
  } catch (error) {
    throw new Error(toGroqErrorMessage(error))
  }
}

export async function enrichWithGroq(ideaJson: string, config?: PipelineConfig): Promise<{ content: string; usage: { input: number; output: number } }> {
  try {
    const res = await groq.chat.completions.create({
      model: config?.model || 'llama-3.3-70b-versatile',
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a senior frontend animation engineer specializing in premium UI component libraries. You write precise, buildable implementation specifications. Output exclusively valid JSON — no markdown, no prose, no backticks.',
        },
        { role: 'user', content: buildEnrichPrompt(ideaJson) }
      ]
    })

    const usage = {
      input: res.usage?.prompt_tokens ?? 0,
      output: res.usage?.completion_tokens ?? 0,
    }

    const content = res.choices[0]?.message?.content
    if (!content) throw new Error('Groq returned malformed or empty response')

    return { content, usage }
  } catch (error) {
    throw new Error(toGroqErrorMessage(error))
  }
}

export async function fixWithGroq(
  specJson: string | null,
  code: string,
  error: string,
  config?: PipelineConfig,
  attempt = 1,
): Promise<{ content: string; usage: { input: number; output: number } }> {
  const prompt = specJson
    ? buildFixPrompt(specJson, code, error, attempt)
    : `Fix this React component. Error:\n${error}\n\nCode:\n${code}\n\nReturn ONLY the fixed code string. No markdown.`

  try {
    const res = await groq.chat.completions.create({
      model: config?.model || 'llama-3.3-70b-versatile',
      max_tokens: 3000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })
    const usage = {
      input: res.usage?.prompt_tokens ?? 0,
      output: res.usage?.completion_tokens ?? 0,
    }
    return { content: res.choices[0].message.content ?? '', usage }
  } catch (error) {
    throw new Error(toGroqErrorMessage(error))
  }
}

export async function validateWithGroq(
  specJson: string,
  code: string,
  config?: PipelineConfig,
  previousIssues?: ValidationIssue[],
): Promise<{ content: ValidationReport; usage: { input: number; output: number } }> {
  try {
    const res = await groq.chat.completions.create({
      model: config?.model || 'llama-3.3-70b-versatile',
      // Extra budget for resolution_report when previousIssues are present
      max_tokens: previousIssues && previousIssues.length > 0 ? 1800 : 1200,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a strict code validator for a premium UI component pipeline. Output exclusively valid JSON.',
        },
        { role: 'user', content: buildValidationPrompt(specJson, code, previousIssues) }
      ]
    })
    const usage = {
      input: res.usage?.prompt_tokens ?? 0,
      output: res.usage?.completion_tokens ?? 0,
    }
    const content = res.choices[0]?.message?.content
    if (!content) throw new Error('Groq returned malformed or empty response')
    try { 
      return { content: JSON.parse(content), usage } 
    } catch { 
      return { 
        content: { status: 'FAIL', score: 0, issues: [{ severity: 'critical', type: 'system', message: 'Failed to parse validation report' }] },
        usage
      } 
    }
  } catch (error) {
    throw new Error(toGroqErrorMessage(error))
  }
}

export async function checkRepairAcceptanceWithGroq(
  originalCode: string,
  repairedCode: string,
  issuesJson: string,
  config?: PipelineConfig,
): Promise<{ accepted: boolean; usage: { input: number; output: number }; reason?: string }> {
  try {
    const res = await groq.chat.completions.create({
      model: config?.model || 'llama-3.3-70b-versatile',
      max_tokens: 200,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a pipeline quality guard. Output exclusively valid JSON.',
        },
        {
          role: 'user',
          content: buildRepairAcceptancePrompt(originalCode, repairedCode, issuesJson),
        },
      ],
    })
    const usage = {
      input: res.usage?.prompt_tokens ?? 0,
      output: res.usage?.completion_tokens ?? 0,
    }
    const content = res.choices[0]?.message?.content
    if (!content) return { accepted: true, usage } // fail open — don't block on empty response
    try {
      const parsed = JSON.parse(content) as { accepted: boolean; reason?: string }
      return { accepted: !!parsed.accepted, reason: parsed.reason, usage }
    } catch {
      return { accepted: true, usage } // fail open — don't block on malformed JSON
    }
  } catch (error) {
    // Acceptance check is best-effort — never block the pipeline on its failure
    console.warn('Repair acceptance check failed, failing open:', toGroqErrorMessage(error))
    return { accepted: true, usage: { input: 0, output: 0 } }
  }
}
