import type { PipelineConfig, ValidationReport, ValidationIssue } from '@/types/pipeline'
import { autoFixCode, cleanCodeOutput } from '@/lib/pipeline/validationStatic'
import { supabase } from '@/lib/db/supabase'

export const AI_TIMEOUTS_MS = {
  semantic_validation: {
    default: 45_000,
    vertex: 300_000,
    ollama: 120_000,
  },
  repair: {
    default: 90_000,
    gemini: 120_000,
    vertex: 300_000,
    ollama: 180_000,
  },
} as const

type TimedOperation = keyof typeof AI_TIMEOUTS_MS

export type SemanticValidationOutcome = {
  kind: ValidationReport['status'] | 'ERROR'
  report: ValidationReport
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)

    promise.then(
      (value) => {
        clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        clearTimeout(timeoutId)
        reject(error)
      }
    )
  })
}

function getAiCallTimeoutMs(provider: string, operation: TimedOperation) {
  const budget = AI_TIMEOUTS_MS[operation]
  return budget[provider as keyof typeof budget] ?? budget.default
}

export function buildSyntheticValidationReport(reason: string, detail?: string): ValidationReport {
  const message = detail ? `${reason}: ${detail}` : reason

  return {
    status: 'FAIL',
    score: 0,
    issues: [
      {
        severity: 'critical',
        type: 'system',
        message,
      },
    ],
  }
}

export async function runSemanticValidation(
  code: string,
  config: PipelineConfig,
  specJson: string, // kept for interface compat — no longer sent to AI
  attempt: number,
  maxAttempts: number,
  ideaId?: string,
  previousIssues?: ValidationIssue[]
): Promise<{
  kind: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL' | 'ERROR'
  report: ValidationReport
  usage: { input: number; output: number }
}> {
  console.warn('Pipeline semantic validation starting (lean mode — no spec sent to AI)', {
    provider: config.provider,
    attempt,
    maxAttempts,
    ideaId,
  })

  try {
    // ── Build lean prompt (code only) ────────────────────────────────────────
    const { buildLeanValidationPrompt } = await import('@/lib/pipeline/prompts')
    const leanPrompt = buildLeanValidationPrompt(code)

    // Strip system_prompt so we don't accidentally send spec via that field
    const leanConfig = { ...config, system_prompt: null }

    const { generateWithProvider } = await import('@/lib/pipeline/providerDispatch')
    const { content: rawResponse, usage } = await withTimeout(
      generateWithProvider(leanPrompt, leanConfig),
      getAiCallTimeoutMs(config.provider, 'semantic_validation'),
      `${config.provider} lean validation`,
    )

    // ── Parse AI response as issues array ────────────────────────────────────
    let rawIssues: Array<{
      line_start?: number
      line_end?: number
      issue_type?: string
      severity?: string
      message?: string
      search_str?: string
      replace_str?: string
    }> = []

    try {
      const text = rawResponse.trim()
      const start = text.indexOf('[')
      const end = text.lastIndexOf(']')
      if (start !== -1 && end > start) {
        rawIssues = JSON.parse(text.substring(start, end + 1))
      }
    } catch (parseErr) {
      console.error('[validation] Failed to parse lean validation response:', parseErr)
      return {
        kind: 'ERROR',
        report: buildSyntheticValidationReport('Lean validation returned unparseable response'),
        usage,
      }
    }

    // ── Map to ValidationIssue type ──────────────────────────────────────────
    const issues: ValidationIssue[] = rawIssues.map(i => ({
      severity: (i.severity as ValidationIssue['severity']) ?? 'medium',
      type: i.issue_type ?? 'logic',
      message: i.message ?? `Issue at line ${i.line_start ?? '?'}`,
      line_start: i.line_start,
      line_end: i.line_end,
      search_str: i.search_str ?? '',
      replace_str: i.replace_str ?? '',
    }))

    // ── Compute status + score locally (no AI needed) ────────────────────────
    let score = 100
    let hasCritical = false
    for (const issue of issues) {
      if (issue.severity === 'critical') { score -= 25; hasCritical = true }
      else if (issue.severity === 'high') score -= 10
      else if (issue.severity === 'medium') score -= 3
      else if (issue.severity === 'low') score -= 0.5
    }
    score = Math.round(Math.max(0, Math.min(100, score)))

    let status: ValidationReport['status']
    if (hasCritical || score < 60) status = 'FAIL'
    else if (score < 75) status = 'PASS_WITH_WARNINGS'
    else status = 'PASS'

    const report: ValidationReport = { status, score, issues }

    // ── Persist to Supabase ──────────────────────────────────────────────────
    if (ideaId && issues.length > 0) {
      // Clear stale entries from previous validate run
      await supabase.from('idea_issues').delete().eq('idea_id', ideaId)
      await supabase.from('idea_patches').delete().eq('idea_id', ideaId)

      // Write issues for UI display
      const { error: issueError } = await supabase.from('idea_issues').insert(
        issues.map(issue => ({
          idea_id: ideaId,
          stage: 'validate',
          line_start: issue.line_start ?? 0,
          line_end: issue.line_end ?? 0,
          issue_type: issue.type,
          description: issue.message,
        }))
      )
      if (issueError) console.error('[validation] Failed to persist issues:', issueError.message)

      // Write patches for direct repair application.
      // Include: issues with a non-empty search_str, AND critical issues (even with empty search_str
      // so the repair stage can identify them for the AI fallback path).
      const patchRecords = issues
        .filter(i => (i.search_str && i.search_str.length > 0) || i.severity === 'critical')
        .map(i => ({
          idea_id: ideaId,
          search_str: i.search_str ?? '',
          replace_str: i.replace_str ?? '',
          applied: false,
        }))

      if (patchRecords.length > 0) {
        const { error: patchError } = await supabase.from('idea_patches').insert(patchRecords)
        if (patchError) console.error('[validation] Failed to persist patches:', patchError.message)
      }
    }

    if (status === 'FAIL') {
      console.warn('Pipeline lean validation — FAIL', {
        provider: config.provider,
        attempt,
        maxAttempts,
        issueCount: issues.length,
        score,
        hasCritical,
      })
    }

    return { kind: status, report, usage }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)

    console.error('Pipeline lean validation errored', {
      provider: config.provider,
      attempt,
      maxAttempts,
      detail,
    })

    return {
      kind: 'ERROR',
      report: buildSyntheticValidationReport('Lean validation errored', detail),
      usage: { input: 0, output: 0 },
    }
  }
}

/**
 * Applies patches computed during the validate stage directly to the code.
 * Reads pre-computed patches from `idea_patches` (written by runSemanticValidation).
 * NO AI call unless there are critical issues with an empty search_str (fallback path).
 */
export async function runPatchRepair(
  code: string,
  config: PipelineConfig,
  specJson: string | null, // kept for interface compat — no longer sent to AI
  ideaId: string,
  attempt: number,
  maxAttempts: number,
): Promise<{
  code: string
  usage: { input: number; output: number }
  patchesApplied: number
  patchesFailed: number
  fallbackUsed: boolean
}> {
  console.warn('Pipeline repair attempt (direct-patch — no AI) starting', {
    provider: config.provider,
    attempt,
    maxAttempts,
    ideaId,
  })

  let totalUsage = { input: 0, output: 0 }
  let patchesApplied = 0
  let patchesFailed = 0
  let fallbackUsed = false

  try {
    // 1. Fetch patches written by the lean validate stage
    const { data: patches, error: fetchError } = await supabase
      .from('idea_patches')
      .select('*')
      .eq('idea_id', ideaId)
      .eq('applied', false)

    if (fetchError) {
      console.error('[repair] Failed to fetch patches:', fetchError.message)
      return { code, usage: totalUsage, patchesApplied: 0, patchesFailed: 0, fallbackUsed: false }
    }

    if (!patches || patches.length === 0) {
      console.warn('[repair] No unapplied patches found — returning original code')
      return { code, usage: totalUsage, patchesApplied: 0, patchesFailed: 0, fallbackUsed: false }
    }

    // 2. Separate direct patches (non-empty search_str) from fallback patches (empty = critical no-patch)
    const directPatches = patches.filter((p: any) => p.search_str && p.search_str.length > 0)
    const fallbackPatches = patches.filter((p: any) => !p.search_str || p.search_str.length === 0)

    // 3. Apply direct patches — pure string replacement, zero AI cost
    let fixedCode = code
    const appliedIds: string[] = []

    for (const patch of directPatches) {
      if (fixedCode.includes(patch.search_str)) {
        fixedCode = fixedCode.replace(patch.search_str, patch.replace_str)
        patchesApplied++
        appliedIds.push(patch.id)
      } else {
        console.warn(`[repair] patch not found: "${String(patch.search_str).slice(0, 60)}..."`)
        patchesFailed++
      }
    }

    // Mark successfully applied patches in DB
    if (appliedIds.length > 0) {
      const { error: updateError } = await supabase
        .from('idea_patches')
        .update({ applied: true })
        .in('id', appliedIds)
      if (updateError) console.error('[repair] Failed to update patch applied status:', updateError.message)
    }

    // 4. AI fallback — only for critical issues that had no search_str (cannot be patched directly)
    if (fallbackPatches.length > 0) {
      fallbackUsed = true
      console.warn('[repair] AI fallback triggered for critical issues without search_str', {
        count: fallbackPatches.length,
        ideaId,
      })

      // Fetch the human-readable issue descriptions for context
      const { data: criticalIssues } = await supabase
        .from('idea_issues')
        .select('issue_type, description, line_start, line_end')
        .eq('idea_id', ideaId)

      const { buildCriticalRepairFallbackPrompt } = await import('@/lib/pipeline/prompts')
      const prompt = buildCriticalRepairFallbackPrompt(
        JSON.stringify(criticalIssues ?? [], null, 2),
        fixedCode,
      )

      // Strip system_prompt — spec must not go to the repair AI
      const leanConfig = { ...config, system_prompt: null }
      const { generateWithProvider } = await import('@/lib/pipeline/providerDispatch')
      const { content: rawResponse, usage } = await withTimeout(
        generateWithProvider(prompt, leanConfig),
        getAiCallTimeoutMs(config.provider, 'repair'),
        `${config.provider} critical repair fallback`,
      )
      totalUsage.input += usage.input
      totalUsage.output += usage.output

      fixedCode = cleanCodeOutput(rawResponse)
    }

    console.log(`[repair] Completed: ${patchesApplied} applied, ${patchesFailed} failed, AI fallback: ${fallbackUsed}`)

    return {
      code: autoFixCode(cleanCodeOutput(fixedCode)),
      usage: totalUsage,
      patchesApplied,
      patchesFailed,
      fallbackUsed,
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Pipeline repair attempt failed', {
      provider: config.provider,
      attempt,
      maxAttempts,
      detail,
    })
    throw error
  }
}


/** Legacy support for full-file rewrites (if needed, but patch-based is preferred) */
export async function runFixAttempt(
  code: string,
  config: PipelineConfig,
  specJson: string | null,
  errorContext: string,
  attempt: number,
  maxAttempts: number,
): Promise<{ code: string; usage: { input: number; output: number } }> {
  console.warn('Pipeline repair attempt (legacy full-rewrite) starting', {
    provider: config.provider,
    attempt,
    maxAttempts,
  })

  try {
    let outcome: { content: string; usage: { input: number; output: number } }

    if (config.provider === 'anthropic') {
      const { fixWithClaude } = await import('@/lib/ai/anthropic')
      outcome = await withTimeout(
        fixWithClaude(specJson, code, errorContext, config, attempt),
        getAiCallTimeoutMs(config.provider, 'repair'),
        `${config.provider} repair`,
      )
    } else if (config.provider === 'gemini') {
      const { fixWithGemini } = await import('@/lib/ai/gemini')
      outcome = await withTimeout(
        fixWithGemini(specJson, code, errorContext, config, attempt),
        getAiCallTimeoutMs(config.provider, 'repair'),
        `${config.provider} repair`,
      )
    } else if (config.provider === 'vertex') {
      const { fixWithVertex } = await import('@/lib/ai/vertexPipeline')
      outcome = await withTimeout(
        fixWithVertex(specJson, code, errorContext, config, attempt),
        getAiCallTimeoutMs(config.provider, 'repair'),
        `${config.provider} repair`,
      )
    } else if (config.provider === 'groq') {
      const { fixWithGroq } = await import('@/lib/ai/groq')
      outcome = await withTimeout(
        fixWithGroq(specJson, code, errorContext, config, attempt),
        getAiCallTimeoutMs(config.provider, 'repair'),
        `${config.provider} repair`,
      )
    } else if (config.provider === 'ollama') {
      const { fixWithOllama } = await import('@/lib/ai/ollama')
      outcome = await withTimeout(
        fixWithOllama(specJson, code, errorContext, config, attempt),
        getAiCallTimeoutMs(config.provider, 'repair'),
        `${config.provider} repair`,
      )
    } else {
      const { fixWithCustom } = await import('@/lib/ai/custom')
      outcome = await withTimeout(
        fixWithCustom(specJson, code, errorContext, config, attempt),
        getAiCallTimeoutMs(config.provider, 'repair'),
        `${config.provider} repair`,
      )
    }

    return {
      code: autoFixCode(cleanCodeOutput(outcome.content)),
      usage: outcome.usage
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)

    console.error('Pipeline repair attempt failed', {
      provider: config.provider,
      attempt,
      maxAttempts,
      detail,
    })

    throw error
  }
}

/**
 * Surgical completion of truncated code.
 * Sends the truncated code to AI and asks for the missing tail only.
 */
export async function runCompletionAttempt(
  code: string,
  config: PipelineConfig,
  specJson: string | null,
  attempt: number,
  maxAttempts: number,
): Promise<{ code: string; usage: { input: number; output: number } }> {
  console.warn('Pipeline completion attempt starting (surgical fix for truncation)', {
    provider: config.provider,
    attempt,
    maxAttempts,
  })

  try {
    const { buildCompletionPrompt } = await import('@/lib/pipeline/prompts')
    const prompt = buildCompletionPrompt(code, specJson ?? undefined)

    // Strip system_prompt to prevent accidental full regeneration
    const leanConfig = { ...config, system_prompt: null }
    const { generateWithProvider } = await import('@/lib/pipeline/providerDispatch')

    const { content: tail, usage } = await withTimeout(
      generateWithProvider(prompt, leanConfig),
      getAiCallTimeoutMs(config.provider, 'repair'),
      `${config.provider} completion`,
    )

    // Replace the code with the fix result instead of appending
    // AI models frequently output the full code even when asked for just the tail
    const cleanTail = cleanCodeOutput(tail)
    const combinedCode = cleanTail

    return {
      code: autoFixCode(combinedCode),
      usage
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Pipeline completion attempt failed', {
      provider: config.provider,
      attempt,
      maxAttempts,
      detail,
    })
    throw error
  }
}
