import { supabase } from '@/lib/db/supabase'

const REQUIRED_IDEA_COLUMNS = [
  'id', 'name', 'type', 'category', 'format',
  'tech', 'complexity', 'feel', 'prompt',
  'enriched_spec', 'generated_code', 'status',
  'error_log', 'created_at', 'updated_at',
]

/**
 * Checks that the `ideas` table contains all columns the pipeline expects.
 * Returns `missing` columns and whether the schema is `ok`.
 *
 * This is a lightweight check — it fetches ONE row (or empty array) and
 * compares the keys against the expected list. No writes are performed.
 */
export async function checkIdeasSchema(): Promise<{
  missing: string[]
  ok: boolean
}> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .limit(1)

  // If the table itself can't be queried, skip and let the pipeline surface the real error
  if (error) {
    console.warn('[schemaCheck] Could not query ideas table:', error.message)
    return { missing: [], ok: false }
  }

  // If the table is empty we can't introspect columns from a row.
  // Return ok=true (not a schema problem) so the pipeline runs normally.
  if (!data || data.length === 0) {
    return { missing: [], ok: true }
  }

  const actualColumns = Object.keys(data[0])
  const missing = REQUIRED_IDEA_COLUMNS.filter(col => !actualColumns.includes(col))

  return { missing, ok: missing.length === 0 }
}
