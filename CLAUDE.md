# Velox UI — Claude Instructions

**Project:** AI-powered animated React component generation platform.

**Stack:** Next.js 16.2 App Router · React 19 · Supabase · Claude/Gemini/Groq/Vertex/Ollama · Tailwind CSS 4 · Framer Motion 12 · GSAP 3.

**Before any task:** Read `PIPELINE_REFERENCE.md` (root) for architecture and data flows. For deep dives, see `old doc/DASHBOARD_PIPELINE_REFERENCE.md`. Do not blindly explore files — consult these first.

**Key constraint:** Generated component code must be sandbox-safe (globals only, no imports). See AGENTS.md for the full rule list.

@AGENTS.md

---

## Route Architecture

### Route Groups & Pages

| Route Group | URL Pattern | Rendering |
|---|---|---|
| `(dashboard)` | `/dashboard`, `/pipeline/*`, `/settings`, `/forge`, `/pipeline-visualization`, `/test`, `/vertex-ai`, `/vertex-chat` | CSR (except `/dashboard` which is SSR) |
| `(velox-ai)` | `/velox-ai` | SSR |
| `(velox-ai-studio)` | `/velox-ai-studio`, `/velox-ai-studio/chat`, `/velox-ai-studio/settings` | CSR |
| `(public)` | `/` (landing) | SSR |
| root | `/preview/[slug]`, `/preview/live`, `/login` | CSR |

### Key Dashboard Routes
- `/pipeline/ideas` — Idea capture & enrichment queue
- `/pipeline/generate` — Live SSE code generation with log terminal
- `/pipeline/review` — QA sandbox preview & approve/reject
- `/pipeline/inventory` — Published asset management

---

## File Map — Go Here First

| What you need | File(s) |
|---|---|
| Dashboard home data | `lib/db/assets.ts` — `getDashboardData()` |
| All asset DB queries | `lib/db/assets.ts` |
| Supabase client | `lib/db/supabase.ts` |
| Pipeline orchestration | `lib/pipeline/generate.ts` — `enrichIdea`, `generateCode`, `validateAndFix` |
| Validation rules (100+) | `lib/pipeline/generate.ts` — `validateCodeString()` |
| Auto-fix transforms | `lib/pipeline/generate.ts` — `autoFixCode()` |
| Static validation & auto-fix | `lib/pipeline/validationStatic.ts` |
| Runtime validation | `lib/pipeline/validationRuntime.ts` |
| Full pipeline runner | `lib/pipeline/runPipeline.ts` |
| Provider routing | `lib/pipeline/providerDispatch.ts` |
| Model names per provider | `lib/pipeline/providerModels.ts` |
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
| Theme definitions | `lib/themes.ts`, `components/theme/theme-config.ts` |

---

## Key Components

### Pipeline
- `components/pipeline/PipelineRunner.tsx` — Orchestrates pipeline execution UI
- `components/pipeline/LogTerminal.tsx` — Live SSE log display
- `components/pipeline/IdeaQueue.tsx` — Queue of ideas to process
- `components/pipeline/ReviewQueue.tsx` — Ideas awaiting QA review
- `components/pipeline/StageStrip.tsx` — Animated progress bar

### Dashboard Widgets
- `components/dashboard/widgets/HeroWidget.tsx` — Key metrics
- `components/dashboard/widgets/PipelineFunnelWidget.tsx` — ideas → enriched → generating → review → published
- `components/dashboard/widgets/AnalyticsWidget.tsx` — Stats
- `components/dashboard/widgets/ActivityFeedWidget.tsx` — Recent activity

### Motion / Animation
- `components/motion/AmbientGrid.tsx` — Animated background grid
- `components/motion/ClipReveal.tsx` — Clip path reveal
- `components/motion/ScrambleText.tsx` — Text scramble effect
- `components/motion/MarqueeTrack.tsx` — Marquee scrolling

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

- Review page queries: `status=reviewing,validated,generated,failed`
- Generate page loads: `status=pending,enriched`
- Ideas page hides: `status=approved`

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
| POST | `/api/pipeline/chat` | AI-to-idea conversion |
| GET/POST | `/api/pipeline/configs` | Pipeline config CRUD |
| POST | `/api/pipeline/enrich` | Standalone enrich endpoint |
| POST | `/api/pipeline/validate` | Standalone validate endpoint |
| POST | `/api/pipeline/repair` | Standalone repair endpoint |
| POST | `/api/pipeline/visualization/run-stage` | Stage visualization |

---

## SSE Event Contract (`/api/pipeline/generate`)

Each line: `data: { event, ...payload }\n\n`

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

## Critical Architectural Facts

1. **Auth is not enforced.** Middleware refreshes Supabase sessions but never redirects. Dashboard is publicly accessible by design.

2. **Sandbox components use globals, not imports.** All generated React components must use `window.Motion` (Framer Motion), `React` (global), and `window.GSAP` — never ES `import`. Sandbox uses Babel Standalone + UMD builds.

3. **`ideas` and `assets` are separate tables with separate lifecycles.** `ingestAsset()` is the one-way bridge — copies code from `ideas` into `assets` and sets `is_published=true`.

4. **`getPublishedAssets()` has no `is_published` filter.** Use `getLandingAssets()` for public-facing pages.

5. **Slug generation is upsert-based.** `ingestAsset()` uses `upsert` on `slug` (derived from `spec.name`). Publishing same component name twice silently overwrites.

6. **`getDashboardData()` aggregates in JavaScript, not SQL.** Fetches all idea rows and counts in-memory. Fine at current scale.

7. **Framer Motion v11 `.onChange()` is polyfilled.** FM v11 removed `.onChange()`. The sandbox HTML polyfills it back; `autoFixCode()` also transforms it. Keep both.

8. **`sessionRef` in GeneratePage is intentional.** Maintains both `useState` (re-renders) and `useRef` (access inside async fetch loops). Do not simplify to one.

9. **Pipeline config fallback.** If `pipelines` table has no `is_default=true` row, the generate route falls back to hardcoded Claude 3.5 Sonnet.

10. **`export default` is stripped in sandbox.** `buildSandboxHTML()` replaces `export default function Foo` with `function Foo` so Babel Standalone can hoist it.

11. **40k token budget.** Project-wide limit for generation phases enforced by `validationRuntime.ts`.

---

## Sandbox Component Rules (enforce in any generated code)

- **NO** `import` statements — use globals only
- **NO** `h-screen`, `min-h-screen`, `100vh`, `100dvh` — use `style={{ minHeight: '100vh' }}`
- **NO** `window.addEventListener` / `document.querySelector` — use `useRef` + React events
- **NO** `.onChange(cb)` on MotionValues — use `.on('change', cb)`
- **NO** template-literal classNames: `` className={`foo ${var}`} ``
- **NO** arbitrary Tailwind brackets: `h-[400px]`
- **MUST** extract Motion symbols: `const { motion, useMotionValue } = window.Motion`
- **MUST** have `export default function ComponentName()`
- **MUST** use inline SVG for icons (no placeholder icon classes)

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
