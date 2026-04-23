import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { formatWorkflowRouteError, serializeRouteError } from '@/lib/pipeline/workflowRouteErrors'

function stageErrorResponse(context: string, error: unknown, fallback: string, status = 500) {
  console.error(`[workflow-stages] ${context}`, serializeRouteError(error))
  return NextResponse.json(
    { error: formatWorkflowRouteError(error, fallback) },
    { status },
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pipeline_id, step_order, name, action_type, provider, model, system_prompt } = body

    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert([{ pipeline_id, step_order, name, action_type, provider, model, system_prompt }])
      .select('*')
      .single()

    if (error) return stageErrorResponse('POST /api/pipeline/workflows/stages', error, 'Failed to create the workflow stage.')
    return NextResponse.json({ stage: data })
  } catch (error) {
    return stageErrorResponse('POST /api/pipeline/workflows/stages', error, 'Failed to create the workflow stage.')
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return stageErrorResponse('PATCH /api/pipeline/workflows/stages', error, 'Failed to update the workflow stage.')
    return NextResponse.json({ stage: data })
  } catch (error) {
    return stageErrorResponse('PATCH /api/pipeline/workflows/stages', error, 'Failed to update the workflow stage.')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
    if (error) return stageErrorResponse('DELETE /api/pipeline/workflows/stages', error, 'Failed to delete the workflow stage.')

    return NextResponse.json({ ok: true })
  } catch (error) {
    return stageErrorResponse('DELETE /api/pipeline/workflows/stages', error, 'Failed to delete the workflow stage.')
  }
}
