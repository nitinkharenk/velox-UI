import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ai_providers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('ai_providers table not found — returning empty array. Run migration 009 to enable custom providers.')
        return NextResponse.json({ providers: [], warning: 'Schema not applied' })
      }
      console.error('Error fetching custom providers:', error)
      return NextResponse.json({ error: 'Failed to fetch custom providers' }, { status: 500 })
    }

    return NextResponse.json({ providers: data || [] })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, provider_id, default_model, env_key } = body

    if (!name || !provider_id || !default_model || !env_key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upsert logic
    const payload = { 
      name, 
      provider_id: provider_id.toLowerCase(), 
      default_model, 
      base_url: body.base_url || null,
      env_key 
    }

    let result
    if (id) {
      result = await supabase
        .from('ai_providers')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()
    } else {
      result = await supabase
        .from('ai_providers')
        .insert([payload])
        .select('*')
        .single()
    }

    if (result.error) {
      console.error('Error saving custom provider:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ provider: result.data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase
      .from('ai_providers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting custom provider:', error)
      return NextResponse.json({ error: 'Failed to delete custom provider' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
