import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { Idea, IdeaStatus } from '@/types/pipeline'
import { isMissingColumnError } from '@/lib/db/schema-utils'

/**
 * Extracts the offending column name from a Supabase missing-column error.
 * Error format: 'column "xyz" of relation "ideas" does not exist'
 */
function extractMissingColumn(errorMessage: string): string | null {
  const match = errorMessage.match(/column "([^"]+)"/)
  return match ? match[1] : null
}

// ── CONFIGURATION & CONSTANTS ───────────────────────────────────────────────

/** Full selection including prompt and format columns */
const IDEA_SELECT_FULL =
  'id, name, type, category, format, complexity, status, enriched_spec, feel, prompt, tech, generated_code, created_at'

/** Selection without the prompt column (for legacy schemas) */
const IDEA_SELECT_NO_PROMPT =
  'id, name, type, category, format, complexity, status, enriched_spec, feel, tech, generated_code, created_at'

/** Selection without prompt and format columns (for very early schemas) */
const IDEA_SELECT_NO_PROMPT_NO_FORMAT =
  'id, name, type, category, complexity, status, enriched_spec, feel, tech, generated_code, created_at'

/** Only these columns can be updated via the PATCH method */
const PATCHABLE_FIELDS = new Set([
  'name', 'type', 'category', 'format', 'tech',
  'complexity', 'feel', 'prompt', 'status',
  'enriched_spec', 'generated_code'
])

/** Valid formats for AI generation templates */
const VALID_FORMATS = ['component', 'section', 'template', 'page']

/** Valid status transitions for the pipeline state machine */
const VALID_STATUSES: IdeaStatus[] = [
  'pending', 'enriching', 'enriched', 'generating', 'generated',
  'validating', 'validated', 'ready', 'reviewing', 'repair_required',
  'ready_with_warnings', 'approved', 'rejected', 'failed',
]

/** Statuses that are shown in the Review Queue page */
const REVIEW_FACING_STATUSES = new Set(['reviewing', 'ready', 'ready_with_warnings', 'validated', 'generated'])

// ── DATABASE HELPERS ────────────────────────────────────────────────────────

/**
 * Ensures the 'prompt' field is correctly typed as string|null.
 * Helpful for mapping database results to Idea types.
 */
function withPromptField<T>(rows: T[]): Array<T & { prompt: string | null }> {
  return rows.map((row: any) => ({
    ...row,
    prompt: typeof row.prompt === 'string' ? row.prompt : null,
  }))
}

/**
 * Constructs a Supabase select query with common filters and sorting.
 */
function buildIdeasQuery(selectClause: string, status: string | null, ids: string | null) {
  let query = supabase
    .from('ideas')
    .select(selectClause)
    .order('created_at', { ascending: false })

  if (ids) {
    query = query.in('id', ids.split(','))
  } else if (status) {
    query = query.in('status', status.split(','))
  }

  return query.limit(100)
}

// ── ROUTE HANDLERS ──────────────────────────────────────────────────────────

/**
 * GET: Fetch ideas with optional filtering by status or ID list.
 * Includes auto-repair logic for ideas missing code in review statuses.
 */
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  const ids = req.nextUrl.searchParams.get('ids')
  
  const requestedStatuses = status?.split(',').map(s => s.trim()).filter(Boolean) ?? []

  // 1. Try FULL select
  let { data, error } = await buildIdeasQuery(IDEA_SELECT_FULL, status, ids)

  // 2. Cascade fallback if columns are missing
  if (error && isMissingColumnError(error.message)) {
    console.warn('[Ideas API] Falling back to legacy schema (missing prompt/format columns)');
    // Try without prompt
    const secondTry = await buildIdeasQuery(IDEA_SELECT_NO_PROMPT, status, ids)
    data = secondTry.data
    error = secondTry.error

    if (error && isMissingColumnError(error.message)) {
      console.warn('[Ideas API] Falling back to ancient schema (missing format column)');
      // Try without prompt or format
      const thirdTry = await buildIdeasQuery(IDEA_SELECT_NO_PROMPT_NO_FORMAT, status, ids)
      data = thirdTry.data
      error = thirdTry.error
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ideas = withPromptField((data ?? []) as any as Idea[])

  // Trigger repair for ideas that shouldn't be in review status without code
  if (requestedStatuses.some(v => REVIEW_FACING_STATUSES.has(v))) {
    const invalidIdeas = ideas.filter((idea) => {
      if (!REVIEW_FACING_STATUSES.has(idea.status)) return false
      return typeof idea.generated_code !== 'string' || idea.generated_code.trim().length === 0
    })

    if (invalidIdeas.length > 0) {
      await Promise.all(
        invalidIdeas.map((idea) =>
          supabase
            .from('ideas')
            .update({
              status: 'repair_required',
              error_log: 'Missing generated_code while in a review-facing status.',
            })
            .eq('id', idea.id),
        ),
      )
    }

    // Filter out the now-repairing ideas from the active response
    return NextResponse.json({
      ideas: ideas.filter((idea) => !invalidIdeas.some((iv) => iv.id === idea.id)),
    })
  }

  return NextResponse.json({ ideas })
}

/**
 * POST: Create one or more new ideas (blueprint ingestion).
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const items = Array.isArray(body) ? body : [body]

  // Validate formats if provided
  for (const p of items) {
    if (p.format && !VALID_FORMATS.includes(p.format as string)) {
      return NextResponse.json(
        { ok: false, error: `Invalid format: "${p.format}". Must be: ${VALID_FORMATS.join(', ')}` },
        { status: 400 }
      )
    }
  }

  const rows = items.map((p: Record<string, unknown>) => ({
    name: p.name as string,
    format: (p.format as string) || 'component',
    type: (p.type as string) || 'hover',
    category: (p.category as string) || 'animation',
    tech: (p.tech as string[]) || [],
    complexity: (p.complexity as string) || 'medium',
    feel: (p.feel as string) || '',
    prompt: (p.prompt as string) || null,
  }))

  let { data, error } = await supabase.from('ideas').insert(rows).select('*')

  // Handle schema mismatch fallback — only strip the specific missing column
  if (error && isMissingColumnError(error.message)) {
    console.warn('[Ideas API] Schema mismatch during POST — attempting minimal fallback')

    const missingCol = extractMissingColumn(error.message)
    console.warn('[Ideas API] Missing column detected:', missingCol)

    const fallbackRows = rows.map((row) => {
      const safeRow = { ...row } as Record<string, unknown>
      // Only strip the specific missing column, preserving all other fields
      if (missingCol && missingCol in safeRow) {
        delete safeRow[missingCol]
      }
      return safeRow
    })

    const fallback = await supabase.from('ideas').insert(fallbackRows).select('*')
    if (fallback.error) {
      console.error('[Ideas API] Fallback also failed:', fallback.error)
      return NextResponse.json({ error: fallback.error.message }, { status: 500 })
    }
    data = fallback.data
    error = null
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    ok: true, 
    ideas: withPromptField((data ?? []) as any[]) 
  })
}

/**
 * PATCH: Update specific fields of an existing idea.
 */
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, ...rawUpdates } = body
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 })
  }

  // Filter to allowlisted patchable fields
  const updates: Record<string, unknown> = {}
  const rejected: string[] = []

  for (const [key, value] of Object.entries(rawUpdates)) {
    if (PATCHABLE_FIELDS.has(key)) updates[key] = value
    else rejected.push(key)
  }

  if (rejected.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Field(s) not patchable: ${rejected.join(', ')}` },
      { status: 400 }
    )
  }

  // Logic Validations
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'No valid fields to update' }, { status: 400 })
  }
  if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status as IdeaStatus)) {
    return NextResponse.json({ ok: false, error: `Invalid status: "${updates.status}"` }, { status: 400 })
  }
  if (updates.tech !== undefined && !Array.isArray(updates.tech)) {
    return NextResponse.json({ ok: false, error: 'tech must be an array' }, { status: 400 })
  }
  if (updates.complexity !== undefined && !['low', 'medium', 'high'].includes(updates.complexity as string)) {
    return NextResponse.json({ ok: false, error: 'complexity must be low/medium/high' }, { status: 400 })
  }

  let { error } = await supabase.from('ideas').update(updates).eq('id', id)

  // Handle schema mismatch fallback — only strip the specific missing column
  if (error && isMissingColumnError(error.message)) {
    console.warn('[Ideas API] Schema mismatch during PATCH — attempting minimal fallback')

    const missingCol = extractMissingColumn(error.message)
    console.warn('[Ideas API] Missing column detected:', missingCol)

    const fallbackUpdates = { ...updates }
    if (missingCol && missingCol in fallbackUpdates) {
      delete fallbackUpdates[missingCol]
    }

    if (Object.keys(fallbackUpdates).length === 0) {
      return NextResponse.json({ ok: true, skipped: [missingCol].filter(Boolean) })
    }
    const fallback = await supabase.from('ideas').update(fallbackUpdates).eq('id', id)
    error = fallback.error
  }

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

/**
 * DELETE: Permanently remove an idea from the record.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase.from('ideas').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}
