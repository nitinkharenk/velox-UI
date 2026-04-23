import { NextRequest, NextResponse } from 'next/server'
import { enrichIdea } from '@/lib/pipeline/generate'
import { supabase } from '@/lib/db/supabase'
import { getWorkflowStageByAction, normalizeWorkflow } from '@/lib/pipeline/workflowUtils'
import type { PipelineConfig, WorkflowPipeline } from '@/types/pipeline'

const DEFAULT_ENRICH_CONFIG: PipelineConfig = {
  id: 'default-enrich-spec',
  name: 'Research',
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20240620',
  system_prompt: null,
  is_default: true,
}

export async function POST(req: NextRequest) {
  const { ideaId } = await req.json()

  const { data: pipelineData } = await supabase
    .from('pipelines')
    .select('*, pipeline_stages(*)')
    .eq('is_default', true)
    .single()

  const workflow = normalizeWorkflow(pipelineData as WorkflowPipeline | null)
  const stage = getWorkflowStageByAction(workflow, 'enrich_spec')
  const activeConfig: PipelineConfig = stage
    ? {
        id: stage.id ?? `${workflow?.id ?? 'default'}-enrich-spec`,
        name: stage.name,
        provider: stage.provider,
        model: stage.model,
        system_prompt: stage.system_prompt ?? null,
        is_default: workflow?.is_default ?? false,
      }
    : DEFAULT_ENRICH_CONFIG

  const { data: idea, error } = await supabase
    .from('ideas').select('*').eq('id', ideaId).single()
  if (error || !idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`)
        )

      try {
        await supabase.from('ideas')
          .update({ status: 'enriching' }).eq('id', ideaId)

        send('status', {
          stage: 'enriching',
          message: 'Researching animation behaviour, physics, and visual spec…'
        })

        const { spec, usage } = await enrichIdea(idea, activeConfig)

        await supabase.from('ideas')
          .update({ status: 'enriched', enriched_spec: spec }).eq('id', ideaId)

        send('enriched', {
          stage: 'enriched',
          message: `Spec complete — ${spec.tags?.slice(0, 3).join(', ')}`,
          spec,
          usage
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await supabase.from('ideas')
          .update({ status: 'failed', error_log: message }).eq('id', ideaId)
        send('error', { message })
      } finally {
        controller.close()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
