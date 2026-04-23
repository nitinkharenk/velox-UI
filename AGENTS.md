<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Velox UI — Agent Reference

**What this is:** A self-hosted dashboard for AI-powered animated React component generation. Operators capture ideas → enrich with Claude/Gemini/Groq → generate sandbox-safe code → review in live preview → publish to a public component library.

Full architecture is documented in `DASHBOARD_PIPELINE_REFERENCE.md`. Read that before any non-trivial task.

---

## Critical Architectural Facts

Know these before touching any file — they are non-obvious and cause bugs when missed:

1. **Auth is not enforced.** Middleware refreshes Supabase sessions but never redirects. The dashboard is publicly accessible by design (local-dev mode). Add route protection only if explicitly asked.

2. **Sandbox components use globals, not imports.** All generated React components must use `window.Motion` (Framer Motion), `React` (global), and `window.GSAP` — never ES `import`. The sandbox uses Babel Standalone + UMD builds. Any component code with `import` statements will fail.

3. **`ideas` and `assets` are separate tables with separate lifecycles.** `ideas` tracks pipeline state. `assets` is the published inventory. `ingestAsset()` is the one-way bridge — it copies code from `ideas` into `assets` and sets `is_published=true`.

4. **`getPublishedAssets()` has no `is_published` filter.** Use `getLandingAssets()` for public-facing pages. `getPublishedAssets` returns all assets regardless of publish state.

5. **Slug generation is upsert-based.** `ingestAsset()` uses `upsert` on `slug` (derived from `spec.name`). Publishing the same component name twice silently overwrites the existing asset.

6. **`getDashboardData()` aggregates in JavaScript, not SQL.** It fetches all idea rows and counts in-memory. Fine at current scale; avoid at thousands of rows.

7. **Framer Motion v11 `.onChange()` is polyfilled.** FM v11 removed `.onChange()`. The sandbox HTML polyfills it back; `autoFixCode()` also transforms it mechanically. Keep both.

8. **`sessionRef` in GeneratePage is intentional.** The Generate page maintains both `useState` (for re-renders) and `useRef` (for access inside async fetch loops). Do not simplify to one or the other.

9. **Pipeline config fallback.** If `pipelines` table has no `is_default=true` row, the generate route falls back to hardcoded Claude 3.5 Sonnet. The system works without DB pipeline config.

10. **`export default` is stripped in sandbox.** `buildSandboxHTML()` replaces `export default function Foo` with `function Foo` so Babel Standalone can hoist it. The function name is extracted separately for `ReactDOM.createRoot().render(<Foo />)`.

---

## File Map — Go Here First

| What you need | File(s) |
|---|---|
| Dashboard home data | `lib/db/assets.ts:167` — `getDashboardData()` |
| All asset DB queries | `lib/db/assets.ts` |
| Supabase client | `lib/db/supabase.ts` |
| Pipeline orchestration | `lib/pipeline/generate.ts` — `enrichIdea`, `generateCode`, `validateAndFix` |
| Validation rules (100+) | `lib/pipeline/generate.ts` — `validateCodeString()` |
| Auto-fix transforms | `lib/pipeline/generate.ts` — `autoFixCode()` |
| Publish to assets | `lib/pipeline/ingest.ts` — `ingestAsset()` |
| Sandbox HTML builder | `lib/preview/sandbox.ts` — `buildSandboxHTML()` |
| AI prompt templates | `lib/pipeline/prompts.ts` |
| All type definitions | `types/pipeline.ts`, `types/asset.ts` |
| Dashboard layout | `app/(dashboard)/layout.tsx` → `components/layout/DashboardShell.tsx` |
| SSE generation route | `app/api/pipeline/generate/route.ts` |
| Ideas CRUD API | `app/api/pipeline/ideas/route.ts` |
| Publish API | `app/api/pipeline/ingest/route.ts` |
| Sandbox preview API | `app/api/preview/compile/route.ts` |
| Page header wrapper | `components/dashboard/DashboardPageFrame.tsx` |
| Reveal animation wrapper | `components/ui/Reveal.tsx` |
| CSS variables / theme | `app/globals.css` |
| Nav link config | `components/layout/dashboardConfig.ts` |

---

## IdeaStatus State Machine

```
pending → enriching → enriched → generating → generated → validating → validated
                                                                           ↓
                                                              repair_required  ← validation FAIL
                                                              ready_with_warnings ← PASS_WITH_WARNINGS
                                                              ready           ← PASS
                                                                 ↓ (manual review approve)
                                                              approved        ← ingested to assets
                                                              rejected        ← reviewer declined
                                                              failed          ← unhandled exception
```

Review page queries: `status=reviewing,validated,generated,failed`  
Generate page loads: `status=pending,enriched`  
Ideas page hides: `status=approved`

---

## Key API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/pipeline/ideas?status=X,Y` | Fetch ideas filtered by status |
| POST | `/api/pipeline/ideas` | Create idea(s) |
| PATCH | `/api/pipeline/ideas` | Update idea fields |
| DELETE | `/api/pipeline/ideas` | Delete idea |
| POST | `/api/pipeline/generate` | Start SSE generation stream `{ ideaId }` |
| POST | `/api/pipeline/ingest` | Publish component `{ code, spec, ideaId? }` |
| GET | `/api/pipeline/inventory` | List published assets (limit 100) |
| DELETE | `/api/pipeline/inventory` | Delete published asset `{ id }` |
| GET | `/api/preview/compile?slug=X` | Get sandbox HTML for preview iframe |
| GET/POST | `/api/settings/keys` | Read/write `.env.local` API keys |

---

## SSE Event Contract (`/api/pipeline/generate`)

Client reads a `ReadableStream`. Each line: `data: { event, ...payload }\n\n`

| `event` | Payload keys | Client action |
|---|---|---|
| `status` | `stage`, `message` | Update progress bar via `STAGE_PROGRESS` map |
| `enriched` | `spec` | — |
| `generated` | `code` | — |
| `validated` | `code`, `has_errors`, `validation_report` | — |
| `ready` | `status`, `ideaId`, `code` | Mark idea done, append success log |
| `repair_required` | `status`, `ideaId`, `issues[]` | Mark idea failed |
| `error` | `message` | Mark idea failed, append error log |

---

## DB Tables (Quick Reference)

| Table | Key columns | Purpose |
|---|---|---|
| `ideas` | `id, name, type, category, tech, complexity, feel, status, enriched_spec, generated_code, error_log` | Pipeline work queue |
| `assets` | `id, slug, name, code, preview_html, tags, is_published, views_count, copy_count, embedding` | Published component inventory |
| `asset_versions` | `id, asset_slug, code, created_at` | Version history per asset |
| `pipelines` | `id, name, model, provider, system_prompt, is_default` | Pipeline configs |
| `pipeline_stages` | `id, pipeline_id, name, action_type, provider, model, step_order` | Per-pipeline stage definitions |

`action_type` values: `enrich_spec` / `generate_code` / `validate_code`

---

## Sandbox Component Rules (enforce in any generated code)

- **NO** `import` statements — use globals only
- **NO** `h-screen`, `min-h-screen`, `100vh`, `100dvh` — use `style={{ minHeight: '100vh' }}`
- **NO** `window.addEventListener` / `document.querySelector` — use `useRef` + React events
- **NO** `.onChange(cb)` on MotionValues — use `.on('change', cb)` (or let `autoFixCode` handle it)
- **NO** template-literal classNames: `` className={`foo ${var}`} ``
- **NO** arbitrary Tailwind brackets: `h-[400px]`
- **MUST** extract Motion symbols: `const { motion, useMotionValue } = window.Motion`
- **MUST** have `export default function ComponentName()`
- **MUST** use inline SVG for icons (no `icon1`, `icon2` placeholder classes)

---

## Routing Patterns

- `app/(dashboard)/*` — all routes wrapped in `DashboardShell` (sidebar + main)
- `app/(public)/*` — all routes wrapped in `PublicShell`
- Dashboard pages are **CSR** (`'use client'`) except the home: `app/(dashboard)/dashboard/page.tsx` is **SSR**
- Public pages are **SSR** (server components, direct DB calls)
- Route groups `(dashboard)` and `(public)` do not affect URL paths

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL        required
NEXT_PUBLIC_SUPABASE_ANON_KEY   required
SUPABASE_SERVICE_ROLE_KEY       optional (falls back to anon key)
ANTHROPIC_API_KEY               required for generation
OPENAI_API_KEY                  optional (embeddings for semantic search)
GEMINI_API_KEY                  optional
GROQ_API_KEY                    optional
OLLAMA_URL                      optional (local LLM, default http://localhost:11434)
```
