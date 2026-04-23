import { supabase } from '@/lib/db/supabase'
import { buildSandboxHTML } from '@/lib/preview/sandbox'
import OpenAI from 'openai'
import type { EnrichedSpec } from '@/types/pipeline'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function ingestAsset(
  ideaId: string | null,
  spec: EnrichedSpec,
  code: string,
  isPro = false
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const slug = spec.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  const embeddingInput = [
    spec.name,
    spec.description || '',
    spec.seo_description || spec.description || '',
    ...(spec.tags ?? []),
    ...(spec.animation_spec?.trigger ? [spec.animation_spec.trigger] : [])
  ].join(' ')

  let embedding: number[] | undefined
  try {
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingInput
    })
    embedding = embRes.data[0].embedding
  } catch {
    // Embeddings are optional — continue without if key is missing
  }

  const preview_html = buildSandboxHTML(code)

  const { error } = await supabase.from('assets').upsert({
    slug,
    name: spec.name,
    category: (spec.format || 'component').toLowerCase(),
    type: (spec.animation_spec?.trigger ?? 'component').toLowerCase(),
    code,
    preview_html,
    description: spec.description || '',
    seo_description: spec.seo_description || spec.description || '',
    tags: spec.tags ?? [],
    tech: spec.tech ?? [],
    complexity: 'medium',
    animation_spec: spec.animation_spec || {},
    visual_spec: spec.visual_spec || {},
    is_pro: isPro,
    is_published: true,
    license: 'owned',
    ...(embedding ? { embedding } : {})
  }, { onConflict: 'slug' })

  if (error) return { ok: false, error: error.message }

  // Store the version history with full context snapshot
  await supabase.from('asset_versions').insert({
    asset_slug: slug,
    code,
    spec_snapshot: spec, // Save the spec that produced this code
    source_idea_id: ideaId // Link back to the originating idea
  })

  if (ideaId) {
    await supabase.from('ideas')
      .update({ status: 'approved' })
      .eq('id', ideaId)
  }

  return { ok: true, slug }
}
