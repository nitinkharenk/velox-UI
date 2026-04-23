import { NextRequest, NextResponse } from 'next/server'
import { enrichIdea, generateCode, validateAndFix } from '@/lib/pipeline/generate'
import { ingestAsset } from '@/lib/pipeline/ingest'
import type { Idea } from '@/types/pipeline'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    if (token !== process.env.PIPELINE_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { name, type, category, tech, complexity, feel } = body

    if (!name || !type || !category || !tech) {
      return NextResponse.json({ error: 'Missing required idea fields' }, { status: 400 })
    }

    const ideaId = crypto.randomUUID()
    const idea: Idea = {
      id: ideaId,
      name,
      type,
      category,
      format: body.format || 'component',
      tech,
      complexity: complexity || 'medium',
      feel: feel || 'fluid',
      status: 'pending'
    }

    // Pipeline Execution
    const config = { id: '', name: 'Default', provider: 'anthropic', model: 'claude-3-5-sonnet-20240620', system_prompt: null, is_default: false }
    const { spec } = await enrichIdea(idea as any, config)
    const { code: rawCode } = await generateCode(spec, config)
    const { result: validationResult } = await validateAndFix(rawCode, config, JSON.stringify(spec))
    
    if (validationResult.has_errors || validationResult.validation_report?.status === 'FAIL') {
      return NextResponse.json({ 
        error: 'Failed to generate valid code', 
        details: validationResult.validation_notes,
        report: validationResult.validation_report
      }, { status: 500 })
    }

    // Ingest safely directly to DB
    const ingestResult = await ingestAsset(null, spec, validationResult.code)
    
    if (!ingestResult.ok) {
      return NextResponse.json({ error: ingestResult.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      slug: ingestResult.slug,
      code: validationResult.code,
      message: 'Pipeline executed programmatically successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
