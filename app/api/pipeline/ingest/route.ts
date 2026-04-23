import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { ingestAsset } from '@/lib/pipeline/ingest'
import type { EnrichedSpec } from '@/types/pipeline'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, spec, ideaId, isPro, force } = body as {
      code: string
      spec: EnrichedSpec
      ideaId?: string
      isPro?: boolean
      force?: boolean
    }

    if (!code || !spec) {
      return NextResponse.json({ ok: false, error: 'code and spec are required' }, { status: 400 })
    }

    // Generate slug the same way ingestAsset() does
    const slug = spec.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Collision check — skip if force=true (user already confirmed overwrite)
    if (!force) {
      const { data: existing } = await supabase
        .from('assets')
        .select('id, name, created_at')
        .eq('slug', slug)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          {
            ok: false,
            conflict: true,
            slug,
            existing: {
              id: existing.id,
              name: existing.name,
              created_at: existing.created_at,
            },
            message: `Asset "${slug}" already exists. Re-submit with force=true to overwrite.`,
          },
          { status: 409 }
        )
      }
    }

    const result = await ingestAsset(ideaId ?? null, spec, code, isPro ?? false)
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    return NextResponse.json({ ok: true, slug: result.slug })
  } catch (err: any) {
    console.error('[ingest-api] Fatal Error:', err)
    return NextResponse.json({ 
      ok: false, 
      error: err.message || 'An unexpected error occurred during ingestion' 
    }, { status: 500 })
  }
}
