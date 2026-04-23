import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { formatWorkflowRouteError, serializeRouteError } from '@/lib/pipeline/workflowRouteErrors'
import { DEFAULT_PIPELINE_MODEL } from '@/lib/pipeline/providerModels'
import { normalizeWorkflow, normalizeWorkflows } from '@/lib/pipeline/workflowUtils'
import type { WorkflowPipeline } from '@/types/pipeline'

function workflowErrorResponse(context: string, error: unknown, fallback: string, status = 500) {
  console.error(`[workflows] ${context}`, serializeRouteError(error))
  return NextResponse.json(
    { error: formatWorkflowRouteError(error, fallback) },
    { status },
  )
}

export async function GET() {
  try {
    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select('*, pipeline_stages(*)')
      .order('created_at', { ascending: true })

    if (error) {
      return workflowErrorResponse('GET /api/pipeline/workflows', error, 'Failed to load workflows.')
    }

    return NextResponse.json({
      pipelines: normalizeWorkflows(pipelines as WorkflowPipeline[] | null),
    })
  } catch (error) {
    return workflowErrorResponse('GET /api/pipeline/workflows', error, 'Failed to load workflows.')
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, is_default } = body

    if (is_default) {
      const { error: resetError } = await supabase
        .from('pipelines')
        .update({ is_default: false })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (resetError) {
        return workflowErrorResponse(
          'POST /api/pipeline/workflows reset defaults',
          resetError,
          'Failed to reset the current default workflow.',
        )
      }
    }

    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .insert([{ name, description, is_default }])
      .select('*')
      .single()

    if (error) {
      return workflowErrorResponse(
        'POST /api/pipeline/workflows insert pipeline',
        error,
        'Failed to create the workflow.',
      )
    }

    const { error: stageError } = await supabase.from('pipeline_stages').insert([
      {
        pipeline_id: pipeline.id,
        step_order: 1,
        name: 'Single Generative Pass',
        action_type: 'generate_code',
        provider: 'anthropic',
        model: DEFAULT_PIPELINE_MODEL,
      },
    ])

    if (stageError) {
      return workflowErrorResponse(
        'POST /api/pipeline/workflows seed stage',
        stageError,
        'The workflow was created, but the default stage could not be added.',
      )
    }

    const { data: reloaded, error: reloadError } = await supabase
      .from('pipelines')
      .select('*, pipeline_stages(*)')
      .eq('id', pipeline.id)
      .single()

    if (reloadError) {
      return workflowErrorResponse(
        'POST /api/pipeline/workflows reload pipeline',
        reloadError,
        'The workflow was created, but it could not be reloaded.',
      )
    }

    return NextResponse.json({ pipeline: normalizeWorkflow(reloaded as WorkflowPipeline | null) })
  } catch (error) {
    return workflowErrorResponse('POST /api/pipeline/workflows', error, 'Failed to create the workflow.')
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, is_default, ...updates } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    if (is_default) {
      const { error: resetError } = await supabase.from('pipelines').update({ is_default: false }).neq('id', id)
      if (resetError) {
        return workflowErrorResponse(
          'PATCH /api/pipeline/workflows reset defaults',
          resetError,
          'Failed to reset the current default workflow.',
        )
      }
    }

    const payload = is_default !== undefined ? { ...updates, is_default } : updates

    const { data, error } = await supabase
      .from('pipelines')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return workflowErrorResponse('PATCH /api/pipeline/workflows', error, 'Failed to update the workflow.')
    }

    return NextResponse.json({ pipeline: data })
  } catch (error) {
    return workflowErrorResponse('PATCH /api/pipeline/workflows', error, 'Failed to update the workflow.')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: info, error: infoError } = await supabase.from('pipelines').select('is_default').eq('id', id).single()
    if (infoError) {
      return workflowErrorResponse(
        'DELETE /api/pipeline/workflows fetch workflow',
        infoError,
        'Failed to inspect the workflow before deletion.',
      )
    }
    if (info?.is_default) return NextResponse.json({ error: 'Cannot delete the default pipeline' }, { status: 400 })

    const { error } = await supabase.from('pipelines').delete().eq('id', id)
    if (error) {
      return workflowErrorResponse('DELETE /api/pipeline/workflows', error, 'Failed to delete the workflow.')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return workflowErrorResponse('DELETE /api/pipeline/workflows', error, 'Failed to delete the workflow.')
  }
}
