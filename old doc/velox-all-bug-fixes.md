# Velox AI — Bug Fix Reference
> All 6 fixes in one file. Each section is self-contained — copy the code directly into your project.

---

## Table of Contents

- [Bug #1 — Missing `is_published` Filter (High)](#bug-1)
- [Bug #2 — `autoFixCode` Duplicate Style Props (Medium)](#bug-2)
- [Bug #3 — PATCH Ideas No Field Allowlist (Medium)](#bug-3)
- [Bug #4 — No Concurrency Guard on `runPipeline` (Medium)](#bug-4)
- [Bug #5 — Silent Asset Overwrite on Slug Collision (Low)](#bug-5)
- [Bug #6 — `extractJson` Brace-Counting Ignores Strings (Low)](#bug-6)
- [Implementation Order](#implementation-order)
- [Testing Checklist](#testing-checklist)

---

<a name="bug-1"></a>
## Bug #1 — Missing `is_published` Filter
**Severity:** High  
**Locations:** `lib/db/assets.ts` (4 functions) · `app/api/pipeline/inventory/route.ts`  
**Impact:** Unpublished draft assets are exposed in public gallery, category views, similar assets, and random picks.

### Root Cause

5 functions query the `assets` table without `.eq('is_published', true)`. The function names imply they return published assets but they return everything.

---

### Fix 1A — `lib/db/assets.ts`

Replace these 4 functions. `getDashboardData()` is intentionally left unfiltered — it's an internal operator view.

```ts
// ── getPublishedAssets ────────────────────────────────────────────
export async function getPublishedAssets(limit = 20, offset = 0): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('is_published', true)          // ← ADDED
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) { console.error('getPublishedAssets:', error); return [] }
  return data ?? []
}

// ── getAssetsByCategory ───────────────────────────────────────────
export async function getAssetsByCategory(category: string, limit = 20): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('category', category)
    .eq('is_published', true)          // ← ADDED
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('getAssetsByCategory:', error); return [] }
  return data ?? []
}

// ── getRandomAssets ───────────────────────────────────────────────
export async function getRandomAssets(count = 6): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('is_published', true)          // ← ADDED
    .limit(count)

  if (error) { console.error('getRandomAssets:', error); return [] }
  return data ?? []
}

// ── getSimilarAssets ──────────────────────────────────────────────
// Both the tag-overlap query AND the category fallback need the filter.
export async function getSimilarAssets(asset: Asset, limit = 3): Promise<Asset[]> {
  if (!asset.tags?.length) {
    // Fallback uses getAssetsByCategory — already fixed above
    return getAssetsByCategory(asset.category, limit)
  }

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('is_published', true)          // ← ADDED
    .neq('id', asset.id)
    .contains('tags', asset.tags.slice(0, 3))
    .limit(limit)

  if (error || !data?.length) {
    return getAssetsByCategory(asset.category, limit)
  }
  return data
}
```

---

### Fix 1B — `app/api/pipeline/inventory/route.ts`

The GET route now accepts `?view=published|drafts|all`. Default is `all` for the operator dashboard. Public-facing callers should pass `?view=published`.

```ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') ?? 'all'

  let query = supabase
    .from('assets')
    .select('id, slug, name, category, type, complexity, created_at, is_published')
    .order('created_at', { ascending: false })
    .limit(100)

  if (view === 'published') query = query.eq('is_published', true)
  if (view === 'drafts')    query = query.eq('is_published', false)
  // view === 'all' → no filter, operator sees everything

  const { data, error } = await query
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ assets: data ?? [] })
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

---

<a name="bug-2"></a>
## Bug #2 — `autoFixCode` Creates Duplicate Style Props
**Severity:** Medium  
**Location:** `lib/pipeline/generate.ts` — `autoFixCode()` around line 446  
**Impact:** The fixer creates invalid JSX that immediately triggers the validator, causing unnecessary AI repair cycles.

### Root Cause

```tsx
// Element going in:
<div className="min-h-screen" style={{ color: 'red' }}>

// Old code blindly appended a second style prop:
<div className="" style={{ color: 'red' }} style={{ minHeight: "100vh" }}>
//                                         ^^^ DUPLICATE — validator flags this
```

The fixer was breaking valid code and then the validator called the AI to repair the fixer's own mistake.

---

### Fix — `lib/db/generate.ts`

Add the `mergeStyleProp` helper and replace the `autoFixCode` function.

```ts
// ── HELPER ────────────────────────────────────────────────────────
// Merges a new CSS property into an element's existing style prop,
// or creates a new style prop if none exists.
function mergeStyleProp(tag: string, cssProp: string, cssValue: string): string {
  const styleMatch = tag.match(/style=\{\{([^}]*)\}\}/)

  if (styleMatch) {
    const existing = styleMatch[1].trim()
    // Don't add if this property already exists
    if (existing.includes(cssProp)) return tag
    return tag.replace(/style=\{\{[^}]*\}\}/, `style={{ ${existing}, ${cssProp}: ${cssValue} }}`)
  }

  // No existing style prop — append one before the closing >
  return tag.replace(/>$/, ` style={{ ${cssProp}: ${cssValue} }}>`)
}

// ── autoFixCode ───────────────────────────────────────────────────
export function autoFixCode(code: string): string {
  let fixed = code

  // 1. Remove ALL import statements (safe — sandbox uses globals)
  fixed = fixed.replace(/^import\s[^\n]+$/gm, '')

  // 2. FM v11: .onChange → .on('change', ...)
  fixed = fixed.replace(/\.onChange\s*\(\s*([\w\s=>{}.,]+)\)/g, ".on('change', $1)")

  // 3. React namespace hooks → bare hooks
  const reactHooks = ['useState', 'useEffect', 'useRef', 'useCallback',
    'useMemo', 'useReducer', 'useContext', 'useLayoutEffect', 'useId']
  reactHooks.forEach(hook => {
    fixed = fixed.replace(new RegExp(`React\\.${hook}\\b`, 'g'), hook)
  })

  // 4. min-h-screen → inline style (SAFE: merges into existing style if present)
  fixed = fixed.replace(
    /(<[a-zA-Z][^>]*)className="([^"]*)\bmin-h-screen\b([^"]*)"/g,
    (_, tagStart, before, after) => {
      const cleanClass = `${before}${after}`.replace(/\s+/g, ' ').trim()
      return mergeStyleProp(`${tagStart}className="${cleanClass}"`, 'minHeight', '"360px"')
    }
  )

  // 5. h-screen → inline style (SAFE: merges into existing style if present)
  fixed = fixed.replace(
    /(<[a-zA-Z][^>]*)className="([^"]*)\bh-screen\b([^"]*)"/g,
    (_, tagStart, before, after) => {
      const cleanClass = `${before}${after}`.replace(/\s+/g, ' ').trim()
      return mergeStyleProp(`${tagStart}className="${cleanClass}"`, 'height', '"100%"')
    }
  )

  // 6. 100vh / 100dvh / 100svh in style string values → fixed pixel
  // 360px is safer than 100% in an iframe (100% collapses if parent has no height)
  fixed = fixed.replace(/(['"])(100vh|100dvh|100svh)\1/g, '"360px"')

  // 7. Auto-inject window.Motion destructure if symbols used but not declared
  const motionSymbols = ['motion', 'AnimatePresence', 'useSpring', 'useMotionValue',
    'useTransform', 'useAnimation', 'useInView', 'useScroll', 'MotionConfig', 'LayoutGroup']
  const usedMotion = motionSymbols.filter(s => new RegExp(`\\b${s}\\b`).test(fixed))
  if (usedMotion.length > 0 && !fixed.includes('window.Motion')) {
    fixed = fixed.replace(
      /(export default function\s+\w+\s*\([^)]*\)\s*\{)/,
      `$1\n  const { ${usedMotion.join(', ')} } = window.Motion`
    )
  }

  // 8. Auto-inject React hooks destructure if missing
  const usedHooks = reactHooks.filter(h =>
    new RegExp(`\\b${h}\\s*\\(`).test(fixed) && !fixed.includes(`{ ${h}`)
  )
  if (usedHooks.length > 0 && !fixed.includes('} = React')) {
    fixed = fixed.replace(
      /(export default function\s+\w+\s*\([^)]*\)\s*\{)/,
      `$1\n  const { ${usedHooks.join(', ')} } = React`
    )
  }

  // 9. Remove duplicate export default
  let firstExport = false
  fixed = fixed.replace(/export default/g, match => {
    if (!firstExport) { firstExport = true; return match }
    return ''
  })

  // 10. Remove .get() in style props: style={{ x: x.get() }} → style={{ x }}
  fixed = fixed.replace(/(\w+)\.get\(\)\s*(?=[,}])/g, '$1')

  // 11. Collapse multiple blank lines
  fixed = fixed.replace(/\n{3,}/g, '\n\n')

  return fixed.trim()
}
```

---

<a name="bug-3"></a>
## Bug #3 — PATCH Ideas Endpoint Has No Field Validation
**Severity:** Medium  
**Location:** `app/api/pipeline/ideas/route.ts` — PATCH handler ~line 80  
**Impact:** A client can overwrite any column including `id`, `created_at`, `error_log` by sending arbitrary fields in the request body.

### Root Cause

```ts
// Old code — no validation:
const { id, ...updates } = await req.json()
await supabase.from('ideas').update(updates).eq('id', id)
// { id: 'x', created_at: '2020-01-01' } → overwrites created_at ✓ (bad)
```

---

### Fix — `app/api/pipeline/ideas/route.ts`

Replace the `PATCH` handler with this. The `GET`, `POST`, and `DELETE` handlers stay unchanged.

```ts
import type { IdeaStatus } from '@/types/pipeline'

// Only these columns can be updated via PATCH.
// Add fields here intentionally as schema evolves.
const PATCHABLE_FIELDS = new Set([
  'name', 'type', 'category', 'tech',
  'complexity', 'feel', 'status',
  'enriched_spec', 'generated_code',
  // Intentionally excluded:
  // 'id', 'created_at', 'updated_at' — never patchable
  // 'error_log' — pipeline-write only, not writable from UI
])

const VALID_STATUSES: IdeaStatus[] = [
  'pending', 'enriching', 'enriched', 'generating', 'generated',
  'validating', 'validated', 'reviewing', 'repair_required',
  'ready_with_warnings', 'approved', 'rejected', 'failed',
]

export async function PATCH(req: Request) {
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

  // Filter to allowlisted fields
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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'No valid fields to update' }, { status: 400 })
  }

  // Type validation
  if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status as IdeaStatus)) {
    return NextResponse.json(
      { ok: false, error: `Invalid status: "${updates.status}"` },
      { status: 400 }
    )
  }

  if (updates.tech !== undefined && !Array.isArray(updates.tech)) {
    return NextResponse.json({ ok: false, error: 'tech must be an array' }, { status: 400 })
  }

  if (updates.complexity !== undefined && !['low', 'medium', 'high'].includes(updates.complexity as string)) {
    return NextResponse.json(
      { ok: false, error: 'complexity must be "low", "medium", or "high"' },
      { status: 400 }
    )
  }

  const { error } = await supabase.from('ideas').update(updates).eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

---

<a name="bug-4"></a>
## Bug #4 — No Concurrency Guard on `runPipeline`
**Severity:** Medium  
**Location:** `lib/pipeline/runPipeline.ts` · `app/api/pipeline/generate/route.ts`  
**Impact:** Two simultaneous requests for the same `ideaId` both run the full pipeline — conflicting status writes, double AI spend, non-deterministic final state.

### Root Cause

The generate route only checks the idea exists. It doesn't check if another process is already running it. There's no lock.

---

### Fix Part A — `lib/pipeline/runPipeline.ts`

Add these two functions and call `acquirePipelineLock()` at the top of `runPipeline()`.

```ts
import { supabase } from '@/lib/db/supabase'
import type { IdeaStatus } from '@/types/pipeline'

// Statuses from which a pipeline run is allowed to start
const RUNNABLE_STATUSES: IdeaStatus[] = ['pending', 'enriched', 'repair_required', 'failed']

// ── acquirePipelineLock ───────────────────────────────────────────
// Atomically transitions idea → 'enriching' using PostgreSQL row-level
// atomicity. Two concurrent requests: exactly one gets count=1 (wins),
// the other gets count=0 (bails). No Redis or queues needed.
export async function acquirePipelineLock(ideaId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('ideas')
    .update({ status: 'enriching' })
    .eq('id', ideaId)
    .in('status', RUNNABLE_STATUSES)
    .select('id')

  if (error) {
    console.error(`[pipeline] Lock error for ${ideaId}:`, error.message)
    return false
  }

  if (!data || data.length === 0) {
    console.warn(`[pipeline] ${ideaId} already running — skipping duplicate`)
    return false
  }

  return true
}

// ── releasePipelineLock ───────────────────────────────────────────
// Called only if an unhandled error escapes before a terminal status
// is written, to avoid leaving the idea stuck in 'enriching' forever.
export async function releasePipelineLock(ideaId: string, errorMessage: string): Promise<void> {
  await supabase
    .from('ideas')
    .update({ status: 'failed', error_log: errorMessage })
    .eq('id', ideaId)
}
```

Call the lock at the very top of `runPipeline()`:

```ts
export async function runPipeline(ideaId: string, options: ...) {
  // ── CONCURRENCY GUARD ─────────────────────────────────────────
  const locked = await acquirePipelineLock(ideaId)
  if (!locked) {
    send({ event: 'error', message: `Idea ${ideaId} is already running` })
    return
  }
  // Status is now 'enriching' in DB. This process owns the run.
  // Skip the initial status write in Stage 1 (enrich_spec) since
  // it's already set to 'enriching' by the lock.

  try {
    // ... your existing pipeline stages loop ...
  } catch (err) {
    await releasePipelineLock(ideaId, String(err))
    send({ event: 'error', message: String(err) })
  }
}
```

---

### Fix Part B — `app/api/pipeline/generate/route.ts`

Add a status pre-check before opening the SSE stream. Returns `409` immediately if the idea is already in-flight, saving the overhead of opening a stream that will just bail out.

```ts
const RUNNABLE_STATUSES = ['pending', 'enriched', 'repair_required', 'failed']

export async function POST(req: Request) {
  const { ideaId } = await req.json()

  // Verify idea exists and is in a runnable state BEFORE opening SSE stream
  const { data: idea } = await supabase
    .from('ideas')
    .select('id, status')
    .eq('id', ideaId)
    .single()

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }

  if (!RUNNABLE_STATUSES.includes(idea.status)) {
    return NextResponse.json(
      { error: `Idea not in runnable state. Current status: ${idea.status}` },
      { status: 409 }  // 409 Conflict
    )
  }

  // Safe to open SSE stream — lock acquired inside runPipeline()
  const stream = new ReadableStream({ ... })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
```

---

<a name="bug-5"></a>
## Bug #5 — Silent Asset Overwrite on Slug Collision
**Severity:** Low  
**Location:** `app/api/pipeline/ingest/route.ts` · `lib/pipeline/ingest.ts`  
**Impact:** Publishing a component with the same name as an existing one silently replaces it with no warning. The old asset's code, preview, and metadata are overwritten.

### Root Cause

`ingestAsset()` uses `upsert` with `onConflict: 'slug'`. The API layer does no collision check before delegating. The operator gets no indication this happened.

---

### Fix — `app/api/pipeline/ingest/route.ts`

Replace the entire route. The `ingestAsset()` lib function is unchanged.

```ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { ingestAsset } from '@/lib/pipeline/ingest'
import type { EnrichedSpec } from '@/types/pipeline'

export async function POST(req: Request) {
  const body = await req.json()
  const { code, spec, ideaId, isPro, force } = body as {
    code: string
    spec: EnrichedSpec
    ideaId?: string
    isPro?: boolean
    force?: boolean   // ← new: explicit overwrite intent required
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
      // Return conflict info — client shows a confirmation dialog and
      // re-submits with force=true if user confirms
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

  const result = await ingestAsset(ideaId, spec, code, isPro ?? false)
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true, slug: result.slug })
}
```

---

### UI Change — `app/(dashboard)/pipeline/review/page.tsx`

Update `handleApprove` to handle the new `409` response:

```ts
const handleApprove = async (id: string, force = false) => {
  const item = reviewQueue.find(i => i.id === id)
  if (!item?.generated_code || !item?.enriched_spec) return

  const res = await fetch('/api/pipeline/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: item.generated_code,
      spec: item.enriched_spec,
      ideaId: item.id,
      force,
    }),
  })

  const data = await res.json()

  if (res.status === 409 && data.conflict) {
    const publishedDate = new Date(data.existing.created_at).toLocaleDateString()
    const confirmed = window.confirm(
      `"${data.existing.name}" was already published on ${publishedDate}.\n\nOverwrite it with this new version?`
    )
    if (confirmed) handleApprove(id, true)
    return
  }

  if (data.ok) {
    toast.success(`Published: ${data.slug}`)
    await loadReviewQueue()
  } else {
    toast.error(data.error ?? 'Publish failed')
  }
}
```

---

<a name="bug-6"></a>
## Bug #6 — `extractJson` Brace-Counting Ignores String Contents
**Severity:** Low  
**Location:** `lib/pipeline/generate.ts` — `extractJson()` around line 276  
**Impact:** JSON strings containing `{` or `}` characters (e.g. `"description": "use { curly braces } here"`) throw off the depth counter, producing malformed repair output and silently broken specs.

### Root Cause

```ts
// Old logic — naive character iteration:
for (const char of text) {
  if (char === '{') depth++
  if (char === '}') depth--
  // { inside "description": "use { braces }" increments depth by mistake
}
```

---

### Fix — `lib/pipeline/generate.ts`

Replace `extractJson()` entirely. The new version uses a proper state machine that skips string contents.

```ts
export function extractJson(raw: string): string {
  // Strip markdown fences
  let text = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim()

  // Find the first { or [
  const firstBrace   = text.indexOf('{')
  const firstBracket = text.indexOf('[')

  let startIndex: number
  let openChar: string
  let closeChar: string

  if (firstBrace === -1 && firstBracket === -1) return text

  if (firstBrace === -1) {
    startIndex = firstBracket; openChar = '['; closeChar = ']'
  } else if (firstBracket === -1) {
    startIndex = firstBrace; openChar = '{'; closeChar = '}'
  } else {
    const useBrace = firstBrace < firstBracket
    startIndex = useBrace ? firstBrace  : firstBracket
    openChar   = useBrace ? '{'         : '['
    closeChar  = useBrace ? '}'         : ']'
  }

  text = text.slice(startIndex)

  // State machine — tracks depth while skipping string contents
  let depth    = 0
  let inString = false
  let escaped  = false
  let endIndex = -1

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\' && inString) {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue  // ← braces inside strings are ignored

    if (char === openChar) {
      depth++
    } else if (char === closeChar) {
      depth--
      if (depth === 0) {
        endIndex = i
        break
      }
    }
  }

  if (endIndex === -1) {
    // Truncated JSON — append missing closers based on remaining depth
    const closer = closeChar.repeat(depth)
    return text + closer
  }

  return text.slice(0, endIndex + 1)
}
```

**Test cases to verify:**

```ts
// Braces inside string values — was broken, now fixed
extractJson('{"description": "use { curly } braces", "ok": true}')
// → '{"description": "use { curly } braces", "ok": true}'  ✅

// Escaped quotes inside strings
extractJson('{"name": "say \\"hello\\"", "x": 1}')
// → '{"name": "say \\"hello\\"", "x": 1}'  ✅

// Truncation repair
extractJson('{"name": "truncated')
// → '{"name": "truncated"}'  ✅ (closes with })

// Strips preamble text
extractJson('Here is the JSON:\n{"key": "value"}\nDone.')
// → '{"key": "value"}'  ✅
```

---

<a name="implementation-order"></a>
## Implementation Order

Apply in this order — highest impact / lowest risk first:

| Step | Bug | Why this order |
|---|---|---|
| 1 | #1 — `is_published` filter | Pure additions, no behavior change, immediate security fix |
| 2 | #3 — PATCH allowlist | Pure restrictions, no behavior change |
| 3 | #6 — `extractJson` | Isolated function, pure bug fix, no side effects |
| 4 | #2 — `autoFixCode` | Replaces transform logic — run a test build after |
| 5 | #4 — Concurrency guard | New locking logic — test with simultaneous requests |
| 6 | #5 — Overwrite guard | Requires both API change + ReviewPage UI change |

---

<a name="testing-checklist"></a>
## Testing Checklist

```
Bug #1
  □ Public /components page shows only is_published=true assets
  □ /asset/[slug] with an unpublished slug returns 404 (not the draft)
  □ Random assets endpoint never returns a draft
  □ Similar assets panel on a published asset shows only published results
  □ Inventory route with ?view=published filters correctly
  □ Inventory route with ?view=all (default) still shows drafts for operator

Bug #2
  □ Component with existing style prop: autoFixCode merges min-h-screen into it, no duplicate
  □ Component with no style prop: autoFixCode adds new style prop correctly
  □ Validator does not flag duplicate style props after autoFixCode runs
  □ 100vh in style values replaced with 360px

Bug #3
  □ PATCH with { id, created_at: 'x' } → 400 with "Field(s) not patchable: created_at"
  □ PATCH with { id, status: 'invalid' } → 400
  □ PATCH with { id, status: 'rejected' } → 200 ok
  □ PATCH with { id, tech: 'not-array' } → 400
  □ PATCH with { id, complexity: 'extreme' } → 400

Bug #4
  □ Two simultaneous POST /api/pipeline/generate with same ideaId → only one runs
  □ Second request returns 409 immediately
  □ Idea in 'generating' status → POST returns 409, not 500
  □ Idea stuck in 'enriching' after crash → releasePipelineLock sets it to 'failed'

Bug #5
  □ Approving a component whose name matches an existing asset shows confirm dialog
  □ Cancelling the dialog does NOT publish
  □ Confirming re-submits with force=true and publishes successfully
  □ New component with unique name publishes without dialog

Bug #6
  □ Enriched spec with { or } in description field parses correctly
  □ Truncated JSON repair appends correct number of closing braces
  □ Preamble text before JSON object is stripped correctly
  □ Escaped quotes inside strings don't break parsing
```
