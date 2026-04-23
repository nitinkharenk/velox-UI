import { NextRequest, NextResponse } from 'next/server'
import { getAssetBySlug } from '@/lib/db/assets'
import { buildSandboxHTML } from '@/lib/preview/sandbox'
import { toSandboxCode } from '@/lib/transform'
import { supabase } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'No slug' }, { status: 400 })

  let codeToCompile: string | null = null

  if (slug.startsWith('idea-')) {
    const id = slug.replace('idea-', '')
    const { data: idea, error } = await supabase.from('ideas').select('generated_code').eq('id', id).single()
    
    if (error) {
      console.error(`[compile] Supabase error fetching idea ${id}:`, error.message)
      if (error.code === 'PGRST116') { // single() found no rows
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
      }
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    if (!idea || !idea.generated_code) {
      return NextResponse.json({ error: 'No code generated yet for this idea' }, { status: 404 })
    }
    
    codeToCompile = idea.generated_code
  } else {
    const asset = await getAssetBySlug(slug)
    if (!asset || !asset.code) {
      return NextResponse.json({ error: 'Asset not found or has no code' }, { status: 404 })
    }
    codeToCompile = asset.code
  }

  const html = buildSandboxHTML(toSandboxCode(codeToCompile || ''))
  console.log('=== SANDBOX INPUT (first 300 chars) ===')
  console.log(toSandboxCode(codeToCompile || '').substring(0, 300))
  console.log('=== END ===')

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': [
        "default-src 'self' https://unpkg.com https://cdn.tailwindcss.com data: blob:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https:",
        "connect-src 'self' https://unpkg.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
        "frame-ancestors 'self'",
      ].join('; '),
    }
  })
}
