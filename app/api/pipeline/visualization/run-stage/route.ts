import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { enrichIdea, generateCode, validateAndFix } from '@/lib/pipeline/generate'
import {
  buildEnrichPrompt,
  buildGenPrompt,
  buildValidationPrompt,
  trimIdeaForPrompt,
} from '@/lib/pipeline/prompts'
import { inferPipelineStatus, resolveWorkflowPipeline } from '@/lib/pipeline/runPipeline'
import {
  canRunVisualizationStage,
  toVisualizationIdeaSnapshot,
} from '@/lib/pipeline/visualization'
import type {
  Idea,
  PipelineConfig,
  RunVisualizationStageResponse,
  VisualizationContentBlock,
  VisualizationStageKey,
} from '@/types/pipeline'

const DEFAULT_VISUALIZATION_MODEL = 'claude-3-5-sonnet-20240620'

const STAGE_ACTIONS: Record<VisualizationStageKey, 'enrich_spec' | 'generate_code' | 'validate_code'> = {
  enrich: 'enrich_spec',
  generate: 'generate_code',
  validate: 'validate_code',
  repair: 'validate_code',
}

const STAGE_LABELS: Record<VisualizationStageKey, string> = {
  enrich: 'Enrichment',
  generate: 'Code Generation',
  validate: 'Validation',
  repair: 'Repair',
}

type PersistedIdea = Idea & { generated_code?: string | null }

function makeContentBlock(
  format: VisualizationContentBlock['format'],
  title: string,
  content: string,
): VisualizationContentBlock {
  return { format, title, content }
}

function buildErrorResponse(
  stage: VisualizationStageKey,
  idea: PersistedIdea,
  input: VisualizationContentBlock,
  message: string,
  status: number,
) {
  const payload: RunVisualizationStageResponse = {
    ok: false,
    stage,
    state: 'failed',
    input: {
      ...input,
    },
    output: {
      format: 'text',
      title: `${STAGE_LABELS[stage]} Error`,
      content: message,
    },
    idea: toVisualizationIdeaSnapshot(idea),
    error: message,
  }

  return NextResponse.json(payload, { status })
}

function buildStageConfig(
  stage: VisualizationStageKey,
  workflow: Awaited<ReturnType<typeof resolveWorkflowPipeline>>,
): PipelineConfig {
  const actionType = STAGE_ACTIONS[stage]
  const matchedStage = workflow?.pipeline_stages?.find(
    (candidate) => candidate.action_type === actionType,
  )

  return {
    id: matchedStage?.id ?? `visualization-${stage}`,
    name: matchedStage?.name ?? STAGE_LABELS[stage],
    provider: matchedStage?.provider ?? workflow?.provider ?? 'anthropic',
    model: matchedStage?.model ?? workflow?.model ?? DEFAULT_VISUALIZATION_MODEL,
    system_prompt: matchedStage?.system_prompt ?? workflow?.system_prompt ?? null,
    is_default: workflow?.is_default ?? false,
  }
}

function buildStructuredIdeaJson(idea: PersistedIdea) {
  return JSON.stringify(
    trimIdeaForPrompt({
      name: idea.name,
      type: idea.type,
      category: idea.category,
      tech: idea.tech,
      complexity: idea.complexity,
      feel: idea.feel,
    }),
    null,
    2,
  )
}

function buildStageInput(
  stage: VisualizationStageKey,
  idea: PersistedIdea,
  config: PipelineConfig,
): VisualizationContentBlock {
  const ideaJson = buildStructuredIdeaJson(idea)
  const specJson = JSON.stringify(idea.enriched_spec ?? {}, null, 2)
  const code = idea.generated_code ?? ''

  if (stage === 'enrich') {
    return makeContentBlock('text', 'Enrichment Prompt', buildEnrichPrompt(ideaJson))
  }

  if (stage === 'generate') {
    return makeContentBlock('text', 'Generation Prompt', buildGenPrompt(specJson))
  }

  if (stage === 'validate') {
    return makeContentBlock('text', 'Validation Prompt', buildValidationPrompt(specJson, code))
  }

  return makeContentBlock(
    'json',
    'Repair Payload',
    JSON.stringify(
      {
        stage: 'repair',
        provider: config.provider,
        model: config.model,
        spec: idea.enriched_spec ?? null,
        generated_code: code,
      },
      null,
      2,
    ),
  )
}

async function updateIdeaOrThrow(ideaId: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from('ideas')
    .update(updates)
    .eq('id', ideaId)

  if (error) {
    throw new Error(error.message)
  }
}

async function loadIdea(ideaId: string) {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', ideaId)
    .single()

  if (error || !data) {
    return null
  }

  return data as PersistedIdea
}

function buildSuccessResponse(
  stage: VisualizationStageKey,
  idea: PersistedIdea,
  input: VisualizationContentBlock,
  output: VisualizationContentBlock,
) {
  const payload: RunVisualizationStageResponse = {
    ok: true,
    stage,
    state: 'completed',
    input: {
      ...input,
    },
    output: {
      ...output,
    },
    idea: toVisualizationIdeaSnapshot(idea),
  }

  return NextResponse.json(payload)
}

export async function POST(req: NextRequest) {
  const { ideaId, stage } = await req.json()

  if (!ideaId || typeof ideaId !== 'string') {
    return NextResponse.json({ error: 'ideaId is required' }, { status: 400 })
  }

  if (!stage || !['enrich', 'generate', 'validate', 'repair'].includes(stage)) {
    return NextResponse.json({ error: 'stage must be enrich, generate, validate, or repair' }, { status: 400 })
  }

  const idea = await loadIdea(ideaId)

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }

  const workflow = await resolveWorkflowPipeline()
  const config = buildStageConfig(stage, workflow)
  const input = buildStageInput(stage, idea, config)
  const readiness = canRunVisualizationStage(stage, idea)

  if (!readiness.ok) {
    return buildErrorResponse(stage, idea, input, readiness.reason, 400)
  }

  try {
    if (stage === 'enrich') {
      const { spec } = await enrichIdea(idea, config)
      const nextIdea = {
        ...idea,
        enriched_spec: spec,
        status: 'enriched' as const,
        error_log: undefined,
      }

      await updateIdeaOrThrow(ideaId, {
        enriched_spec: spec,
        status: 'enriched',
        error_log: null,
      })

      return buildSuccessResponse(
        stage,
        nextIdea,
        input,
        makeContentBlock('json', 'Enriched Spec', JSON.stringify(spec, null, 2)),
      )
    }

    if (stage === 'generate') {
      const { code: generatedCode } = await generateCode(idea.enriched_spec!, config)
      const nextIdea = {
        ...idea,
        generated_code: generatedCode,
        status: 'generated' as const,
        error_log: undefined,
      }

      await updateIdeaOrThrow(ideaId, {
        generated_code: generatedCode,
        status: 'generated',
        error_log: null,
      })

      return buildSuccessResponse(
        stage,
        nextIdea,
        input,
        makeContentBlock('code', 'Generated Code', generatedCode),
      )
    }

    const { result } = await validateAndFix(
      idea.generated_code!,
      config,
      JSON.stringify(idea.enriched_spec),
    )
    const finalStatus = inferPipelineStatus(result)
    const nextIdea = {
      ...idea,
      generated_code: result.code,
      status: finalStatus,
      error_log: result.has_errors ? result.validation_notes : undefined,
    }

    await updateIdeaOrThrow(ideaId, {
      generated_code: result.code,
      status: finalStatus,
      error_log: result.has_errors ? result.validation_notes ?? null : null,
    })

    const output = stage === 'repair'
      ? makeContentBlock(
          'json',
          'Repair Result',
          JSON.stringify(
            {
              status: finalStatus,
              has_errors: result.has_errors,
              validation_notes: result.validation_notes ?? null,
              validation_report: result.validation_report ?? null,
              code: result.code,
            },
            null,
            2,
          ),
        )
      : makeContentBlock(
          'json',
          'Validation Result',
          JSON.stringify(
            {
              status: finalStatus,
              has_errors: result.has_errors,
              validation_notes: result.validation_notes ?? null,
              validation_report: result.validation_report ?? null,
              code: result.code,
            },
            null,
            2,
          ),
        )

    return buildSuccessResponse(stage, nextIdea, input, output)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return buildErrorResponse(stage, idea, input, message, 500)
  }
}
