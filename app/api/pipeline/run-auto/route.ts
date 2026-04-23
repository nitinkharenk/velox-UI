import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { resolveWorkflowPipeline, runPipeline } from '@/lib/pipeline/runPipeline'
import { structureIdeaFromPrompt } from '@/lib/pipeline/structureIdea'
import type { IdeaStatus, PipelineEvent, StructuredIdeaInput } from '@/types/pipeline'
import { isMissingColumnError, getMissingColumnName } from '@/lib/db/schema-utils'

interface RunAutoRequestBody {
  prompt?: string
  pipelineId?: string | null
  count?: number
  format?: string
  complexity?: string
  feel?: string
}

function parseCount(count: number | undefined) {
  if (typeof count !== 'number' || Number.isNaN(count)) return 1
  return Math.max(1, Math.min(5, Math.floor(count)))
}

function createRunId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

async function structureIdeas(prompt: string, count: number, workflow?: import('@/types/pipeline').WorkflowPipeline | null, ideaOverrides?: any) {
  const ideas: StructuredIdeaInput[] = []

  for (let index = 0; index < count; index += 1) {
    const structuredIdea = await structureIdeaFromPrompt(prompt, {
      variationIndex: index,
      totalCount: count,
      existingIdeas: ideas,
      workflow,
      idea: ideaOverrides,
    })
    ideas.push(structuredIdea)
  }

  return ideas
}

async function insertIdeas(ideas: StructuredIdeaInput[], originalPrompt?: string) {
  let rows = ideas.map((idea) => ({
    name: idea.name,
    type: idea.type || 'hover',
    category: idea.category || 'animation',
    format: (idea as any).format || 'component',
    tech: idea.tech || [],
    complexity: idea.complexity || 'standard',
    feel: idea.feel || 'fluid',
    prompt: originalPrompt || null,
  }))

  const tryInsert = async (dataRows: any[]): Promise<Array<{ id: string; name: string; status: IdeaStatus }>> => {
    const { data, error } = await supabase
      .from('ideas')
      .insert(dataRows)
      .select('id, name, status')

    if (error) {
      // Logic for missing columns (e.g., format, complexity, feel, prompt)
      if (isMissingColumnError(error.message)) {
        const missingColumn = getMissingColumnName(error.message)
        if (missingColumn) {
          console.warn(`[schema] Stripping missing column '${missingColumn}' and retrying insert...`)
          const strippedRows = dataRows.map(row => {
            const { [missingColumn]: _, ...rest } = row
            return rest
          })
          return tryInsert(strippedRows)
        }
      }
      throw new Error(error.message ?? 'Failed to create ideas.')
    }

    if (!data) throw new Error('No data returned from insert')
    return data as Array<{ id: string; name: string; status: IdeaStatus }>
  }

  return tryInsert(rows)
}

async function handoffReadyIdea(ideaId: string, status: IdeaStatus) {
  if (status !== 'ready' && status !== 'ready_with_warnings') return status

  const { error } = await supabase
    .from('ideas')
    .update({ status: 'reviewing' })
    .eq('id', ideaId)

  if (error) {
    throw new Error(`Idea ${ideaId} finished, but could not be moved to review.`)
  }

  return 'reviewing' as const
}

async function runAutoBatch(
  payload: Required<Pick<RunAutoRequestBody, 'prompt'>> & Pick<RunAutoRequestBody, 'pipelineId'> & { count: number },
  onEvent?: (event: PipelineEvent) => void | Promise<void>,
) {
  const runId = createRunId()
  // Resolve the workflow FIRST so structureIdeas can use the correct provider
  const workflow = await resolveWorkflowPipeline(payload.pipelineId ?? null)
  const structuredIdeas = await structureIdeas(payload.prompt, payload.count, workflow, (payload as any).idea)
  const createdIdeas = await insertIdeas(structuredIdeas, payload.prompt)
  const ideaIds = createdIdeas.map((idea) => idea.id)

  let completed = 0
  let failed = 0

  if (onEvent) {
    await onEvent({
      event: 'run_started',
      runId,
      totalIdeas: createdIdeas.length,
      pipelineId: workflow?.id ?? payload.pipelineId ?? null,
    })
    await onEvent({
      event: 'ideas_created',
      runId,
      ideaIds,
    })
  }

  for (const [index, createdIdea] of createdIdeas.entries()) {
    await onEvent?.({
      event: 'idea_started',
      runId,
      ideaId: createdIdea.id,
      ideaName: createdIdea.name,
      index: index + 1,
      total: createdIdeas.length,
    })

    try {
      const result = await runPipeline(createdIdea.id, {
        workflow,
        onEvent: async (event) => {
          if (!onEvent) return
          await onEvent({
            ...event,
            runId,
          })
        },
      })

      const handedOffStatus = await handoffReadyIdea(createdIdea.id, result.status)
      const isSuccessfulHandoff = handedOffStatus === 'reviewing'

      if (handedOffStatus === 'reviewing') {
        await onEvent?.({
          event: 'ready',
          message: 'Moved to review queue',
          status: 'reviewing',
          ideaId: createdIdea.id,
          ideaName: createdIdea.name,
          code: result.code ?? '',
          runId,
        })
      }

      if (isSuccessfulHandoff) completed += 1
      else failed += 1
      await onEvent?.({
        event: 'idea_completed',
        runId,
        ideaId: createdIdea.id,
        ideaName: createdIdea.name,
        status: handedOffStatus,
        index: index + 1,
        total: createdIdeas.length,
      })
    } catch {
      failed += 1
      await onEvent?.({
        event: 'idea_completed',
        runId,
        ideaId: createdIdea.id,
        ideaName: createdIdea.name,
        status: 'failed',
        index: index + 1,
        total: createdIdeas.length,
      })
    }
  }

  await onEvent?.({
    event: 'run_completed',
    runId,
    ideaIds,
    status: 'completed',
    completed,
    failed,
  })

  return {
    runId,
    ideaIds,
    status: 'completed' as const,
    completed,
    failed,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as RunAutoRequestBody
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const count = parseCount(body.count)
    const pipelineId = typeof body.pipelineId === 'string' && body.pipelineId.trim()
      ? body.pipelineId
      : null
    
    // Tactical overrides
    const ideaOverrides = {
      format: body.format,
      complexity: body.complexity,
      feel: body.feel
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
    }

    const wantsStream = req.headers.get('accept')?.includes('text/event-stream')

    if (!wantsStream) {
      const result = await runAutoBatch({ 
        prompt, 
        pipelineId, 
        count,
        idea: ideaOverrides
      } as any)
      return NextResponse.json(result)
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: PipelineEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }

        try {
          await runAutoBatch({ 
            prompt, 
            pipelineId, 
            count,
            idea: ideaOverrides
          } as any, send)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          send({ event: 'error', message })
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message === 'Selected pipeline could not be loaded.' || message === 'Selected pipeline was not found.') {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
