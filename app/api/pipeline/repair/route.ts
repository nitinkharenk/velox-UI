import { NextRequest, NextResponse } from 'next/server'
import { validateAndFix } from '@/lib/pipeline/generate'
import { supabase } from '@/lib/db/supabase'
import { inferPipelineStatus } from '@/lib/pipeline/runPipeline'
import type { PipelineConfig } from '@/types/pipeline'

async function updateIdeaOrThrow(
  ideaId: string,
  updates: Record<string, unknown>,
  context: string,
) {
  const { error } = await supabase
    .from('ideas')
    .update(updates)
    .eq('id', ideaId)

  if (error) {
    throw new Error(`Failed to persist ${context}: ${error.message}`)
  }
}

export async function POST(req: NextRequest) {
  const { ideaId } = await req.json()

  const { data: idea, error } = await supabase
    .from('ideas').select('*').eq('id', ideaId).single()
  if (error || !idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

  if (!idea.generated_code || !idea.enriched_spec) {
    return NextResponse.json({ error: 'Cannot repair an idea without generated code and spec' }, { status: 400 })
  }

  // Use a fallback config
  const config = { name: 'Self Correction', action_type: 'validate_code', provider: 'anthropic', model: 'claude-3-5-sonnet-20240620' } as unknown as PipelineConfig

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`))
      }

      try {
        let rawCode = idea.generated_code
        const spec = idea.enriched_spec
        
        await updateIdeaOrThrow(ideaId, { status: 'validating' }, 'repair validation status')
        send('status', { stage: 'validating', message: `Executing Stage: Targeted AI Repair...` })

        // 1. Run the validator / fixer precisely on the existing broken code
        const { result: finalResult, usage } = await validateAndFix(rawCode, config, JSON.stringify(spec))
        
        await updateIdeaOrThrow(ideaId, { status: 'validated' }, 'repair validated status')
        send('validated', {
          code: finalResult.code,
          has_errors: finalResult.has_errors,
          validation_notes: finalResult.validation_notes,
          validation_report: finalResult.validation_report,
          usage
        })

        rawCode = finalResult.code

        // 2. Assess results and output exact final signals exactly like the generate route
        const hasGeneratedCode = typeof rawCode === 'string' && rawCode.trim().length > 0
        const reviewStatus = hasGeneratedCode ? inferPipelineStatus(finalResult) : 'repair_required'
        const issues = !hasGeneratedCode
          ? [{ severity: 'critical', type: 'system', message: 'Repair completed without generated code.' }]
          : finalResult?.validation_report?.issues || []

        await updateIdeaOrThrow(
          ideaId,
          { status: reviewStatus, generated_code: rawCode ?? null },
          'repair final result',
        )
        
        if (reviewStatus === 'repair_required') {
          send('repair_required', { message: 'Repair cycle failed—requires manual repair', status: reviewStatus, ideaId, has_errors: true, issues })
        } else {
          send('ready', { message: 'Successfully repaired and ready for manual review', status: reviewStatus, ideaId, code: rawCode })
        }

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await updateIdeaOrThrow(ideaId, { status: 'failed', error_log: message }, 'repair failed state')
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
