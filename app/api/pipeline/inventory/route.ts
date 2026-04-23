import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get('view') ?? 'all'

  let query = supabase
    .from('assets')
    .select('id, slug, name, category, type, complexity, is_published, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (view === 'published') query = query.eq('is_published', true)
  if (view === 'drafts')    query = query.eq('is_published', false)
  // view === 'all' → no filter, operator sees everything

  const { data, error } = await query
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ assets: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
