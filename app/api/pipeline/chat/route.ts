import { NextRequest, NextResponse } from 'next/server'
import { structureIdeaFromPrompt } from '@/lib/pipeline/structureIdea'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    const idea = await structureIdeaFromPrompt(prompt)
    return NextResponse.json({ idea })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
