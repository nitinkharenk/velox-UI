import { supabase } from './supabase'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function semanticSearch(query: string, limit = 12) {
  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  })

  const { data, error } = await supabase.rpc('search_assets', {
    query_embedding: embRes.data[0].embedding,
    similarity_threshold: 0.25,
    match_count: limit
  })

  if (error) throw error
  return data
}

export async function keywordSearch(query: string, limit = 12) {
  const { data } = await supabase
    .from('assets')
    .select('id, slug, name, category, type, description, tags, tech, complexity, is_pro')
    .eq('is_published', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .limit(limit)
  return data
}
