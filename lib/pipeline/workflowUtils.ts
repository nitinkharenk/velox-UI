import type {
  PipelineStageAction,
  PipelineStageConfig,
  WorkflowPipeline,
} from '@/types/pipeline'

type WorkflowRecord = Omit<WorkflowPipeline, 'pipeline_stages'> & {
  pipeline_stages?: PipelineStageConfig[] | null
}

export function sortPipelineStages<T extends { step_order?: number | null }>(
  stages: T[] | null | undefined,
): T[] {
  return [...(stages ?? [])].sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
}

export function normalizeWorkflow(workflow: WorkflowRecord | null | undefined): WorkflowPipeline | null {
  if (!workflow) return null

  return {
    ...workflow,
    pipeline_stages: sortPipelineStages(workflow.pipeline_stages),
  }
}

export function normalizeWorkflows(workflows: WorkflowRecord[] | null | undefined): WorkflowPipeline[] {
  return (workflows ?? []).flatMap((workflow) => {
    const normalized = normalizeWorkflow(workflow)
    return normalized ? [normalized] : []
  })
}

export function getWorkflowStageByAction(
  workflow: WorkflowPipeline | null | undefined,
  actionType: PipelineStageAction,
): PipelineStageConfig | undefined {
  return workflow?.pipeline_stages?.find((stage) => stage.action_type === actionType)
}
