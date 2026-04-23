import type {
  GeneratedCode,
  Idea,
  IdeaStatus,
  PipelineConfig,
  PipelineEvent,
  PipelineStageAction,
  PipelineStageConfig,
  WorkflowPipeline,
} from '@/types/pipeline'
import { normalizeWorkflow, sortPipelineStages } from '@/lib/pipeline/workflowUtils'
import { isMissingColumnError } from '@/lib/db/schema-utils'
import { checkIdeasSchema } from '@/lib/pipeline/schemaCheck'

// Statuses from which a pipeline run is allowed to start
const RUNNABLE_STATUSES: IdeaStatus[] = ['pending', 'enriched', 'repair_required', 'failed']

type FinalPipelineStatus = Extract<IdeaStatus, 'ready' | 'ready_with_warnings' | 'repair_required'>

export const DEFAULT_PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    step_order: 1,
    name: 'Research',
    action_type: 'enrich_spec',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    system_prompt: null,
  },
  {
    step_order: 2,
    name: 'Code Generation',
    action_type: 'generate_code',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    system_prompt: null,
  },
  {
    step_order: 3,
    name: 'Self Correction',
    action_type: 'validate_code',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    system_prompt: null,
  },
]

interface RunPipelineOptions {
  onEvent?: (event: PipelineEvent) => void | Promise<void>
  workflow?: WorkflowPipeline | null
  stages?: PipelineStageConfig[]
  resumeFromAction?: PipelineStageAction
}

interface RunPipelineResult {
  status: FinalPipelineStatus
  code?: string
}

async function getSupabase() {
  const { supabase } = await import('@/lib/db/supabase')
  return supabase
}

async function updateIdeaOrThrow(
  ideaId: string,
  updates: Record<string, unknown>,
  context: string,
) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('ideas')
    .update(updates)
    .eq('id', ideaId)

  if (error) {
    throw new Error(`Failed to persist ${context}: ${error.message}`)
  }
}

// Atomically transitions idea → 'enriching' using PostgreSQL row-level atomicity.
// Two concurrent requests: exactly one gets rows back (wins), the other gets 0 (bails).
export async function acquirePipelineLock(ideaId: string): Promise<boolean> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('ideas')
    .update({ status: 'enriching' })
    .eq('id', ideaId)
    .in('status', RUNNABLE_STATUSES)
    .select('id')

  if (error) {
    console.error(`[pipeline] Lock error for ${ideaId}:`, error.message)
    return false
  }

  if (!data || data.length === 0) {
    console.warn(`[pipeline] ${ideaId} already running — skipping duplicate`)
    return false
  }

  return true
}

// Called only if an unhandled error escapes before a terminal status is written,
// to avoid leaving the idea stuck in 'enriching' forever.
export async function releasePipelineLock(ideaId: string, errorMessage: string): Promise<void> {
  await updateIdeaOrThrow(ideaId, { status: 'failed', error_log: errorMessage }, 'failed state')
}

function isPipelineEvent(value: PipelineEvent) {
  return value
}

async function emit(
  onEvent: RunPipelineOptions['onEvent'],
  event: PipelineEvent,
) {
  if (!onEvent) return
  await onEvent(isPipelineEvent(event))
}

function buildStageConfig(
  stage: PipelineStageConfig,
  workflow?: WorkflowPipeline | null,
  providerMap: Record<string, { base_url?: string | null, env_key?: string | null }> = {}
): PipelineConfig {
  const providerId = stage.provider ?? workflow?.provider ?? 'anthropic'
  const customInfo = providerMap[providerId]

  return {
    id: stage.id ?? `${workflow?.id ?? 'default'}-${stage.action_type}-${stage.step_order ?? 0}`,
    name: stage.name,
    provider: providerId,
    model: stage.model ?? workflow?.model ?? 'claude-3-5-sonnet-20240620',
    base_url: customInfo?.base_url ?? null,
    system_prompt: stage.system_prompt ?? workflow?.system_prompt ?? null,
    is_default: workflow?.is_default ?? false,
    // Injecting helper for custom providers to find their env key
    ...(customInfo?.env_key ? { envKeyName: customInfo.env_key } as any : {})
  }
}

function getWorkflowStages(
  workflow?: WorkflowPipeline | null,
  stageOverride?: PipelineStageConfig[],
) {
  const stages = stageOverride?.length
    ? stageOverride
    : workflow?.pipeline_stages?.length
      ? workflow.pipeline_stages
      : DEFAULT_PIPELINE_STAGES

  return sortPipelineStages(stages)
}

export function inferPipelineStatus(result: Pick<GeneratedCode, 'has_errors' | 'validation_report'> | null): FinalPipelineStatus {
  if (!result) return 'ready'
  if (result.has_errors === true) return 'repair_required'
  if (result.validation_report?.status === 'FAIL') return 'repair_required'
  if (result.validation_report?.status === 'PASS_WITH_WARNINGS') return 'ready_with_warnings'
  return 'ready'
}

export async function resolveWorkflowPipeline(pipelineId?: string | null): Promise<WorkflowPipeline | null> {
  const supabase = await getSupabase()

  if (pipelineId) {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*, pipeline_stages(*)')
      .eq('id', pipelineId)
      .single()

    if (error) {
      throw new Error('Selected pipeline could not be loaded.')
    }

    if (!data) {
      throw new Error('Selected pipeline was not found.')
    }

    return normalizeWorkflow(data as WorkflowPipeline | null)
  }

  const { data } = await supabase
    .from('pipelines')
    .select('*, pipeline_stages(*)')
    .eq('is_default', true)
    .maybeSingle()

  return normalizeWorkflow(data as WorkflowPipeline | null)
}

export async function runPipeline(
  ideaId: string,
  options: RunPipelineOptions = {},
): Promise<RunPipelineResult> {
  const { enrichIdea, generateCode, validateAndFix } = await import('@/lib/pipeline/generate')
  const supabase = await getSupabase()
  let { data: idea, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', ideaId)
    .single()

  if (error && isMissingColumnError(error.message)) {
    // Fallback if prompt column is missing from schema
    const fallback = await supabase
      .from('ideas')
      .select('id, name, type, category, format, tech, complexity, feel, status, enriched_spec, generated_code, error_log, created_at, updated_at')
      .eq('id', ideaId)
      .single()
    idea = fallback.data
    error = fallback.error
  }

  if (error || !idea) {
    throw new Error('Idea not found')
  }

  const typedIdea = idea as Idea & { generated_code?: string | null }
  const workflow = options.workflow ?? await resolveWorkflowPipeline()
  const stages = getWorkflowStages(workflow, options.stages)

  // Fetch custom provider metadata for lookup
  let providerMap: Record<string, { base_url?: string | null, env_key?: string | null }> = {}
  
  try {
    const { data: customProviders, error: cpError } = await supabase
      .from('ai_providers')
      .select('provider_id, base_url, env_key')
    
    if (cpError) {
      // Gracefully handle missing table (PGRST205) or other schema desyncs
      if (cpError.code === 'PGRST205') {
        process.env.NODE_ENV !== 'production' && console.warn('[pipeline] ai_providers table not found, skipping custom provider lookup')
      } else {
        console.error('[pipeline] Error fetching custom providers:', cpError.message)
      }
    } else {
      customProviders?.forEach(cp => {
        providerMap[cp.provider_id] = { base_url: cp.base_url, env_key: cp.env_key }
      })
    }
  } catch (err) {
    console.warn('[pipeline] Failed to query custom providers, falling back to defaults:', err)
  }

  let spec = typedIdea.enriched_spec
  let rawCode = typedIdea.generated_code ?? undefined
  let finalResult: GeneratedCode | null = null

  // Concurrency lock
  const locked = await acquirePipelineLock(ideaId)
  if (!locked && !options.resumeFromAction) {
    await emit(options.onEvent, {
      event: 'error',
      message: `Idea ${ideaId} is already running or not in a runnable state`,
      ideaId,
      ideaName: typedIdea.name,
    })
    return { status: 'repair_required' }
  }

  let skipStages = !!options.resumeFromAction

  // ── DB schema check ──────────────────────────────────────────────────────
  // Run before any stage so schema drift is visible in the execution report
  // rather than surfacing as a cryptic downstream error.
  const schemaCheck = await checkIdeasSchema()
  if (!schemaCheck.ok && schemaCheck.missing.length > 0) {
    console.warn('[Pipeline] Missing DB columns:', schemaCheck.missing)
    await emit(options.onEvent, {
      event: 'status',
      stage: 'enriching',
      message: `⚠ DB schema incomplete. Missing columns: ${schemaCheck.missing.join(', ')}. Pipeline may produce degraded results.`,
      ideaId,
      ideaName: typedIdea.name,
    })
  }

  try {
    for (const stage of stages) {
      if (skipStages) {
        if (stage.action_type === options.resumeFromAction) {
          skipStages = false
        } else {
          continue
        }
      }
      
      const config = buildStageConfig(stage, workflow, providerMap)

      if (stage.action_type === 'enrich_spec') {
        // Status is already 'enriching' (set by acquirePipelineLock above) — skip redundant write
        await emit(options.onEvent, {
          event: 'status',
          stage: 'enriching',
          message: `Executing Stage: ${stage.name}...`,
          ideaId,
          ideaName: typedIdea.name,
        })

        const enrichInput = JSON.stringify({ idea: typedIdea, config })
        const enrichment = await enrichIdea(typedIdea, config)
        spec = enrichment.spec
        const enrichOutput = JSON.stringify(spec)

        await updateIdeaOrThrow(
          ideaId,
          { status: 'enriched', enriched_spec: spec },
          'enriched spec',
        )

        await emit(options.onEvent, {
          event: 'enriched',
          spec,
          input: enrichInput,
          output: enrichOutput,
          ideaId,
          ideaName: typedIdea.name,
          usage: enrichment.usage,
        })
      } else if (stage.action_type === 'generate_code') {
        if (!spec) {
          throw new Error('Idea must be enriched before code generation.')
        }

        await updateIdeaOrThrow(ideaId, { status: 'generating' }, 'generating status')
        await emit(options.onEvent, {
          event: 'status',
          stage: 'generating',
          message: `Executing Stage: ${stage.name}...`,
          ideaId,
          ideaName: typedIdea.name,
        })

        const generateInput = JSON.stringify({ spec, config, previousCode: rawCode })
        const genResult = await generateCode(spec, config, rawCode)
        rawCode = genResult.code
        const generateOutput = rawCode

        await updateIdeaOrThrow(
          ideaId,
          { status: 'generated', generated_code: rawCode },
          'generated code',
        )
        await emit(options.onEvent, {
          event: 'generated',
          code: rawCode,
          input: generateInput,
          output: generateOutput,
          ideaId,
          ideaName: typedIdea.name,
          usage: genResult.usage,
        })
        await emit(options.onEvent, {
          event: 'status',
          stage: 'generating',
          message: 'React code generated (production format)',
          ideaId,
          ideaName: typedIdea.name,
        })
      } else if (stage.action_type === 'validate_code') {
        if (!rawCode) {
          throw new Error('Code must be generated before validation.')
        }

        await updateIdeaOrThrow(ideaId, { status: 'validating' }, 'validating status')
        await emit(options.onEvent, {
          event: 'status',
          stage: 'validating',
          message: `Executing Stage: ${stage.name}...`,
          ideaId,
          ideaName: typedIdea.name,
        })

        const validateInput = JSON.stringify({ code: rawCode, spec, config })
        const validationResultObj = await validateAndFix(
          rawCode,
          config,
          spec ? JSON.stringify(spec) : null,
          2,
          options.onEvent,
          { ideaId, ideaName: typedIdea.name }
        )
        finalResult = validationResultObj.result
        rawCode = finalResult.code
        const validateOutput = JSON.stringify(finalResult)

        await updateIdeaOrThrow(
          ideaId,
          { status: 'validated', generated_code: rawCode },
          'validated code',
        )
        await emit(options.onEvent, {
          event: 'validated',
          code: finalResult.code,
          has_errors: finalResult.has_errors,
          validation_notes: finalResult.validation_notes,
          validation_report: finalResult.validation_report,
          input: validateInput,
          output: validateOutput,
          ideaId,
          ideaName: typedIdea.name,
          usage: validationResultObj.usage,
        })
      }
    }

    const hasGeneratedCode = typeof rawCode === 'string' && rawCode.trim().length > 0
    const reviewStatus = hasGeneratedCode ? inferPipelineStatus(finalResult) : 'repair_required'
    const blockingIssues = !hasGeneratedCode
      ? [
          {
            severity: 'critical' as const,
            type: 'system',
            message: 'Pipeline completed without generated code.',
          },
        ]
      : finalResult?.validation_report?.issues ?? []

    await updateIdeaOrThrow(
      ideaId,
      {
        status: reviewStatus,
        generated_code: rawCode ?? null,
      },
      'final pipeline result',
    )

    if (reviewStatus === 'repair_required') {
      await emit(options.onEvent, {
        event: 'repair_required',
        message: 'Validation found blocking issues',
        status: reviewStatus,
        ideaId,
        ideaName: typedIdea.name,
        has_errors: true,
        issues: blockingIssues,
      })
    } else {
      await emit(options.onEvent, {
        event: 'ready',
        message: 'Ready for manual review',
        status: reviewStatus,
        ideaId,
        ideaName: typedIdea.name,
        code: rawCode ?? '',
      })
    }

    return {
      status: reviewStatus,
      code: rawCode,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await releasePipelineLock(ideaId, message)

    await emit(options.onEvent, {
      event: 'error',
      message,
      ideaId,
      ideaName: typedIdea.name,
    })

    throw error
  }
}
