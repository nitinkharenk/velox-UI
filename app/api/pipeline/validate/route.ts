import { NextRequest, NextResponse } from 'next/server'
import { validateAndFix } from '@/lib/pipeline/generate'
import type { PipelineConfig } from '@/types/pipeline'

export async function POST(req: NextRequest) {
  const { code, specJson = null, provider = 'anthropic', model = undefined }: { code: string; specJson?: string | null; provider?: string; model?: string } = await req.json()

  try {
    const config: PipelineConfig = { id: 'api', name: 'API', provider, model: model || 'claude-3-5-sonnet-20240620', system_prompt: null, is_default: false }
    const result = await validateAndFix(code, config, specJson)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
