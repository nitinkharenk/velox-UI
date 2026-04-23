import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('pipeline_configs')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ configs: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, model, provider, system_prompt, is_default } = body

  // If making default, we need to unset the previous default in the client or DB
  if (is_default) {
    await supabase.from('pipeline_configs').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await supabase
    .from('pipeline_configs')
    .insert([{ name, model, provider, system_prompt, is_default }])
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ config: data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, is_default, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  if (is_default) {
    // Unset others
    await supabase.from('pipeline_configs').update({ is_default: false }).neq('id', id)
  }

  const payload = is_default !== undefined ? { ...updates, is_default } : updates

  const { data, error } = await supabase
    .from('pipeline_configs')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ config: data })
}

export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { id } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Check if it is the default
  const { data: config } = await supabase.from('pipeline_configs').select('is_default').eq('id', id).single()
  if (config?.is_default) {
    return NextResponse.json({ error: 'Cannot delete the default configuration' }, { status: 400 })
  }

  const { error } = await supabase.from('pipeline_configs').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
