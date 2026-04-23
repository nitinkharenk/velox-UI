import type {
  Idea,
  IdeaStatus,
  VisualizationIdeaSnapshot,
  VisualizationStageKey,
  VisualizationStageState,
} from '@/types/pipeline'

export interface VisualizationStageDefinition {
  key: VisualizationStageKey
  label: string
  description: string
}

type VisualizationIdeaLike = Pick<Idea, 'status' | 'enriched_spec' | 'generated_code'>

export const VISUALIZATION_STAGES: VisualizationStageDefinition[] = [
  {
    key: 'enrich',
    label: 'Enrichment',
    description: 'Expand the structured idea into a richer implementation spec.',
  },
  {
    key: 'generate',
    label: 'Code Generation',
    description: 'Generate sandbox-safe component code from the enriched spec.',
  },
  {
    key: 'validate',
    label: 'Validation',
    description: 'Run validation and auto-fix passes against the generated code.',
  },
  {
    key: 'repair',
    label: 'Repair',
    description: 'Retry a targeted repair pass for code that still needs help.',
  },
]

const SUCCESSFUL_VALIDATION_STATUSES: IdeaStatus[] = [
  'validated',
  'ready',
  'ready_with_warnings',
  'reviewing',
  'approved',
  'rejected',
]

export function canRunVisualizationStage(
  stage: VisualizationStageKey,
  idea: VisualizationIdeaLike,
): { ok: true } | { ok: false; reason: string } {
  if (stage === 'enrich') {
    return { ok: true }
  }

  if (!idea.enriched_spec) {
    return {
      ok: false,
      reason: 'Run Enrichment first to create a structured spec.',
    }
  }

  if (stage === 'generate') {
    return { ok: true }
  }

  if (!idea.generated_code || idea.generated_code.trim().length === 0) {
    return {
      ok: false,
      reason: 'Run Code Generation first to create component code.',
    }
  }

  return { ok: true }
}

export function getVisualizationStageState(
  stage: VisualizationStageKey,
  idea: VisualizationIdeaLike,
): VisualizationStageState {
  if (stage === 'enrich') {
    return idea.enriched_spec ? 'completed' : 'not_started'
  }

  if (stage === 'generate') {
    return idea.generated_code && idea.generated_code.trim().length > 0
      ? 'completed'
      : 'not_started'
  }

  if (stage === 'validate') {
    if (idea.status === 'repair_required') return 'failed'
    if (SUCCESSFUL_VALIDATION_STATUSES.includes(idea.status)) return 'completed'
    return 'not_started'
  }

  if (stage === 'repair') {
    if (idea.status === 'repair_required') return 'failed'
    return 'not_started'
  }

  return 'not_started'
}

export function toVisualizationIdeaSnapshot(
  idea: Idea & { generated_code?: string | null },
): VisualizationIdeaSnapshot {
  return {
    id: idea.id,
    name: idea.name,
    type: idea.type,
    category: idea.category,
    tech: idea.tech,
    complexity: idea.complexity,
    feel: idea.feel,
    status: idea.status,
    enriched_spec: idea.enriched_spec,
    generated_code: idea.generated_code ?? null,
    error_log: idea.error_log,
  }
}
