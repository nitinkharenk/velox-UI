import { cache } from 'react'
import { supabase } from './supabase'
import type { Asset } from '@/types/asset'

export async function getAssetBySlug(slug: string): Promise<Asset | null> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as Asset
}

export async function getPublishedAssets(limit = 20, offset = 0): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) { console.error('getPublishedAssets:', error); return [] }
  return (data ?? []) as Asset[]
}

export const getAllAssetNavItems = cache(async function getAllAssetNavItems(): Promise<Pick<Asset, 'slug' | 'name' | 'category' | 'is_pro'>[]> {
  const { data } = await supabase
    .from('assets')
    .select('slug, name, category, is_pro')
    .eq('is_published', true)
    .order('name', { ascending: true })

  return (data ?? []) as Pick<Asset, 'slug' | 'name' | 'category' | 'is_pro'>[]
})

export const getLandingAssets = cache(async function getLandingAssets(
  limit = 12
): Promise<{ assets: Asset[]; totalPublished: number }> {
  const assetQuery = supabase
    .from('assets')
    .select(
      'id, slug, name, category, type, code, preview_html, description, seo_description, tags, tech, complexity, animation_spec, visual_spec, is_pro, is_published, license, created_at, upvotes'
    )
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  const countQuery = supabase
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)

  const [{ data }, { count }] = await Promise.all([assetQuery, countQuery])

  return {
    assets: (data ?? []) as Asset[],
    totalPublished: count ?? data?.length ?? 0,
  }
})

export const getTemplateLandingAssets = cache(async function getTemplateLandingAssets(
  limit = 12
): Promise<{ assets: Asset[]; totalTemplates: number }> {
  const assetQuery = supabase
    .from('assets')
    .select(
      'id, slug, name, category, type, code, preview_html, description, seo_description, tags, tech, complexity, animation_spec, visual_spec, is_pro, is_published, license, created_at, upvotes'
    )
    .eq('is_published', true)
    .eq('category', 'template')
    .order('created_at', { ascending: false })
    .limit(limit)

  const countQuery = supabase
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('category', 'template')

  const [{ data }, { count }] = await Promise.all([assetQuery, countQuery])

  return {
    assets: (data ?? []) as Asset[],
    totalTemplates: count ?? data?.length ?? 0,
  }
})

export async function getTemplateAssetBySlug(slug: string): Promise<Asset | null> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('slug', slug)
    .eq('category', 'template')
    .eq('is_published', true)
    .single()

  if (error || !data) return null
  return data as Asset
}

export async function getPublishedTemplateAssets(limit = 20, offset = 0): Promise<Asset[]> {
  const { data } = await supabase
    .from('assets')
    .select('*')
    .eq('category', 'template')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return (data ?? []) as Asset[]
}

export async function getRandomAssets(count = 6): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('id, slug, name, category, type, description, tags, tech, complexity, is_pro, preview_html')
    .eq('is_published', true)
    .limit(count)

  if (error) { console.error('getRandomAssets:', error); return [] }
  return (data ?? []) as Asset[]
}

export async function getAssetsByCategory(category: string, limit = 20): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('category', category)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('getAssetsByCategory:', error); return [] }
  return (data ?? []) as Asset[]
}

export async function getSimilarAssets(asset: Asset, limit = 3): Promise<Asset[]> {
  if (!asset.tags?.length) {
    return getAssetsByCategory(asset.category, limit)
  }

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('is_published', true)
    .neq('id', asset.id)
    .overlaps('tags', asset.tags.slice(0, 3))
    .limit(limit)

  if (error || !data?.length) {
    return getAssetsByCategory(asset.category, limit)
  }
  return data as Asset[]
}

export interface DashboardData {
  publishedCount: number
  weeklyDelta: number
  inReviewCount: number
  totalViews: number
  totalCopies: number
  totalUpvotes: number
  proCount: number
  stages: {
    ideas: number
    enriched: number
    generating: number
    review: number
    published: number
  }
  recentActivity: Array<{
    name: string
    status: 'published' | 'review' | 'generating' | 'enriched'
    updatedAt: string
  }>
}

export async function getDashboardData(): Promise<DashboardData> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: assetRows },
    { count: weeklyCount },
    { data: ideaRows },
    { data: recentAssets },
    { data: recentIdeas },
  ] = await Promise.all([
    // 1. Aggregate stats from all published assets
    supabase
      .from('assets')
      .select('views_count, copy_count, upvotes, is_pro')
      .eq('is_published', true),

    // 2. Assets published in the last 7 days
    supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true)
      .gte('created_at', sevenDaysAgo),

    // 3. All idea statuses for funnel counts
    supabase
      .from('ideas')
      .select('status, name, updated_at'),

    // 4. 3 most recently published assets for activity feed
    supabase
      .from('assets')
      .select('name, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(3),

    // 5. 4 most recently active ideas for activity feed
    supabase
      .from('ideas')
      .select('name, status, updated_at')
      .in('status', [
        'generating', 'generated', 'validating', 'validated',
        'repair_required', 'ready_with_warnings', 'reviewing', 'approved', 'enriched', 'enriching',
      ])
      .order('updated_at', { ascending: false })
      .limit(4),
  ])

  // Aggregate asset stats
  type AssetStat = { views_count: number | null; copy_count: number | null; upvotes: number | null; is_pro: boolean }
  const rows = (assetRows ?? []) as AssetStat[]

  const publishedCount = rows.length
  const totalViews = rows.reduce((s, r) => s + (r.views_count ?? 0), 0)
  const totalCopies = rows.reduce((s, r) => s + (r.copy_count ?? 0), 0)
  const totalUpvotes = rows.reduce((s, r) => s + (r.upvotes ?? 0), 0)
  const proCount = rows.filter(r => r.is_pro).length

  // Funnel stage counts from ideas
  type IdeaRow = { status: string; name: string; updated_at: string }
  const ideas = (ideaRows ?? []) as IdeaRow[]

  const IDEA_STAGES = {
    ideas: ['pending'],
    enriched: ['enriching', 'enriched'],
    generating: ['generating', 'generated', 'validating', 'validated', 'repair_required', 'ready_with_warnings'],
    review: ['reviewing', 'approved'],
  }

  const countByStatus = (statuses: string[]) =>
    ideas.filter(i => statuses.includes(i.status)).length

  // Merge activity feed
  type ActivityEvent = { name: string; status: 'published' | 'review' | 'generating' | 'enriched'; updatedAt: string }

  const activity: ActivityEvent[] = [
    ...(recentAssets ?? []).map(a => ({
      name: a.name as string,
      status: 'published' as const,
      updatedAt: a.updated_at as string,
    })),
    ...(recentIdeas ?? []).map(i => {
      const row = i as { name: string; status: string; updated_at: string }
      let status: ActivityEvent['status'] = 'enriched'
      if (IDEA_STAGES.review.includes(row.status)) status = 'review'
      else if (IDEA_STAGES.generating.includes(row.status)) status = 'generating'
      return { name: row.name, status, updatedAt: row.updated_at }
    }),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  return {
    publishedCount,
    weeklyDelta: weeklyCount ?? 0,
    inReviewCount: countByStatus(IDEA_STAGES.review),
    totalViews,
    totalCopies,
    totalUpvotes,
    proCount,
    stages: {
      ideas: countByStatus(IDEA_STAGES.ideas),
      enriched: countByStatus(IDEA_STAGES.enriched),
      generating: countByStatus(IDEA_STAGES.generating),
      review: countByStatus(IDEA_STAGES.review),
      published: publishedCount,
    },
    recentActivity: activity,
  }
}
