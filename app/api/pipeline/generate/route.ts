import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { runPipeline } from '@/lib/pipeline/runPipeline'
import type { PipelineEvent } from '@/types/pipeline'

const RUNNABLE_STATUSES = ['pending', 'enriched', 'repair_required', 'failed']

export async function GET(req: NextRequest) {
  const ideaId = req.nextUrl.searchParams.get('ideaId')
  const resumeFromAction = req.nextUrl.searchParams.get('resumeFromAction') as any
  if (!ideaId) return NextResponse.json({ error: 'ideaId required' }, { status: 400 })
  return handleStreaming(ideaId, resumeFromAction)
}

export async function POST(req: NextRequest) {
  const { ideaId, resumeFromAction } = await req.json()
  if (!ideaId || typeof ideaId !== 'string') {
    return NextResponse.json({ error: 'ideaId required' }, { status: 400 })
  }
  return handleStreaming(ideaId, resumeFromAction)
}

async function handleStreaming(ideaId: string, resumeFromAction?: any) {

  // Check idea exists AND is in a runnable state before opening the SSE stream.
  // Returns 409 immediately for in-flight ideas, avoiding a wasted stream open.
  const { data: idea, error } = await supabase
    .from('ideas')
    .select('id, status')
    .eq('id', ideaId)
    .single()

  if (error || !idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }

  if (!RUNNABLE_STATUSES.includes(idea.status)) {
    return NextResponse.json(
      { error: `Idea not in runnable state. Current status: ${idea.status}` },
      { status: 409 }
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let cumulativeUsage = { input: 0, output: 0 }

      const send = (event: PipelineEvent) => {
        if (event.usage) {
          cumulativeUsage.input += event.usage.input
          cumulativeUsage.output += event.usage.output
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...event, usage: cumulativeUsage })}\n\n`))
      }

      // Heartbeat pulse to keep the stream alive during long generation passes (Gemini can take 2min+)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 15000)

      try {
        await runPipeline(ideaId, { onEvent: send, resumeFromAction })
      } catch {
        // runPipeline already emitted the failure event and wrote DB state
      } finally {
        clearInterval(heartbeat)
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
}
