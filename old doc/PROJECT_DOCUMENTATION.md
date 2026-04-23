# Velox UI

This document explains the full project in one place:

1. Full project overview
2. Technical specification
3. Project flow
4. How the main systems work

---

## 1. Project Overview

### What this project is

`veloxui` is a Next.js 16 application for curating, generating, previewing, and publishing animated UI components.

It has two major sides:

- A public-facing component library where users can browse published assets
- An internal dashboard where ideas move through an AI-assisted content pipeline

The product combines:

- A curated gallery of motion-driven UI components
- AI-assisted idea enrichment and code generation
- A validation and repair loop for generated code
- A sandbox preview system for rendering components safely
- Supabase-backed storage for assets, ideas, workflows, analytics, and versions

### Main product goals

- Store reusable animated UI assets in a searchable catalog
- Let operators submit rough ideas and turn them into production-ready assets
- Preview generated components before publishing
- Support multiple AI providers for enrichment, generation, validation, and repair
- Keep a lightweight editorial workflow from backlog to published asset

### Core user areas

#### Public app

- Home/library page at `/`
- Asset detail page at `/asset/[slug]`
- Fullscreen preview at `/preview/[slug]`
- Live temporary preview workspace at `/preview/live`

#### Dashboard

- Asset browser at `/dashboard`
- Pipeline landing page at `/pipeline`
- Idea backlog at `/pipeline/ideas`
- Batch generation workspace at `/pipeline/generate`
- Review queue at `/pipeline/review`
- Published inventory at `/pipeline/inventory`
- Settings and provider configuration at `/settings`

---

## 2. Technical Specification

### Framework and frontend

| Layer | Technology |
| --- | --- |
| App framework | Next.js `16.2.0` |
| UI runtime | React `19.2.4` |
| Language | TypeScript |
| Styling | Tailwind CSS `4` + global CSS variables |
| Motion | Framer Motion `12.38.0` |
| Icons | Lucide React |
| Syntax highlighting | Shiki |
| Test tooling | Playwright |

### Backend and data

| Layer | Technology |
| --- | --- |
| Database | Supabase / PostgreSQL |
| Vector search | `pgvector` |
| DB client | `@supabase/supabase-js` |
| Auth/session middleware | `@supabase/ssr` |

### AI integrations

| Provider | Purpose in project |
| --- | --- |
| Anthropic | Main structured enrichment, generation, validation, and repair |
| OpenAI | Embeddings for semantic asset search |
| Gemini | Optional pipeline provider |
| Groq | Optional pipeline provider |
| Ollama | Optional local pipeline provider |

### Build and runtime commands

Defined in `package.json`:

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - production server
- `npm run lint` - ESLint
- `npm run pipeline:enrich` - enrich pending ideas through CLI
- `npm run pipeline:generate` - generate code for pending ideas through CLI
- `npm run pipeline:full` - run full CLI pipeline
- `npm run db:seed` - seed ideas table

### Important environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `PIPELINE_API_SECRET`

### Configuration details

- `next.config.ts` enables `optimizePackageImports` for `lucide-react`, `framer-motion`, and `@monaco-editor/react`
- Remote images are allowed from `images.unsplash.com` and `picsum.photos`
- Middleware initializes a Supabase server client and keeps request/response cookies in sync

---

## 3. High-Level Architecture

### Main folders

```text
app/
  (public)/                 Public library pages
  (dashboard)/              Internal dashboard and pipeline UI
  api/                      Route handlers for assets, pipeline, preview, settings

components/
  assets/                   Asset cards, previews, code blocks, live preview page
  pipeline/                 Queue, stage strip, logs, config editor, manual pipeline UI
  layout/                   Public shell, dashboard shell, navbar, sidebar, footer
  ui/                       Shared UI primitives
  theme/                    Theme provider and toggle

lib/
  ai/                       Anthropic, Gemini, Groq, Ollama adapters
  db/                       Supabase access and search helpers
  pipeline/                 Enrich/generate/validate/ingest logic and prompts
  preview/                  Sandbox HTML builders and live preview helpers

supabase/migrations/        Database schema and SQL functions
scripts/                    CLI pipeline runner and seed script
types/                      Shared TypeScript models
```

### Architectural split

The app is organized around four subsystems:

1. Library system
   Stores and serves published assets

2. Generation pipeline
   Takes an idea through enrichment, code generation, validation, repair, and review

3. Preview sandbox
   Renders generated code inside an isolated iframe-friendly HTML shell

4. Search and analytics
   Supports semantic/keyword search plus view, copy, and vote tracking

---

## 4. Data Model and Database

### Core tables from migrations

#### `assets`

Stores published components.

Key fields:

- `slug`, `name`, `category`, `type`
- `code`
- `preview_html`
- `description`, `seo_description`
- `tags`, `tech`
- `complexity`
- `animation_spec`, `visual_spec`
- `is_pro`, `is_published`
- `license`
- `embedding`
- `views_count`, `copy_count`, `upvotes`

#### `ideas`

Stores rough concepts before they become published assets.

Key fields:

- `name`, `type`, `category`
- `tech`
- `complexity`
- `feel`
- `enriched_spec`
- `status`
- `error_log`

#### `pipeline_runs`

Stores high-level CLI pipeline run stats.

#### `asset_versions`

Stores version history of published component code.

#### `pipeline_configs`

Stores provider/model presets for AI usage.

#### `pipelines`

Stores named workflows.

#### `pipeline_stages`

Stores ordered steps inside each workflow, such as:

- `enrich_spec`
- `generate_code`
- `validate_code`

### Database functions

- `search_assets(query_embedding, similarity_threshold, match_count)`
- `increment_asset_view(asset_slug)`
- `increment_asset_copy(asset_slug)`
- `increment_asset_upvote(asset_slug)`

### Indexes and performance

- IVFFlat vector index on `assets.embedding`
- Standard indexes on asset state flags and idea status
- Unique partial indexes to enforce a single default pipeline config and a single default workflow

### Important schema note

The checked-in TypeScript and API code expect a few `ideas` fields and statuses that do not appear in the visible migrations, including:

- `generated_code`
- `updated_at`
- statuses such as `repair_required`, `ready_with_warnings`, and `ready`

That strongly suggests the live database has schema changes beyond the SQL files currently committed, or the migrations are incomplete. This is an inference from code/database mismatch and is worth keeping in mind during maintenance.

---

## 5. Project Flow

## A. Public asset flow

1. Published assets are stored in Supabase
2. The public home page loads recent assets with `getPublishedAssets()`
3. Users open an asset detail page at `/asset/[slug]`
4. The app shows:
   - large preview
   - dependencies
   - install command
   - usage snippet
   - source code
   - related assets
5. A fullscreen iframe preview is available at `/preview/[slug]`
6. Views and votes can be recorded through asset API routes

## B. Pipeline flow

1. An operator creates or drafts an idea
2. The idea is saved into the `ideas` table
3. The idea is enriched into a detailed spec
4. A selected AI provider generates component code
5. The generated code is validated and optionally auto-fixed
6. The idea moves into review-ready or repair-required state
7. A human approves or rejects it
8. Approved output is ingested into `assets`
9. Version history is saved in `asset_versions`
10. The new asset becomes visible in the public library

## C. CLI flow

1. Seed ideas with `npm run db:seed`
2. Run pipeline commands from `scripts/run-pipeline.ts`
3. Pending ideas are processed in sequence
4. The CLI can enrich only, generate only, or run the full pipeline
5. The full pipeline can create multiple design variants per idea before ingest

---

## 6. How Things Work

### 6.1 Asset browsing and library pages

The public page in `app/(public)/page.tsx` is server-rendered and loads up to 50 published assets directly from Supabase. The dashboard asset browser in `app/(dashboard)/dashboard/page.tsx` is client-driven and queries `/api/assets/search`.

Search behavior:

- If `OPENAI_API_KEY` is available, the app generates an embedding and calls the `search_assets` SQL function
- If embeddings are unavailable or fail, it falls back to keyword search on `name`, `description`, and `tags`

### 6.2 Asset detail pages

The asset detail page loads one asset by slug, derives imported packages by parsing the code string, and builds:

- install command
- suggested component filename
- usage example
- related assets by overlapping tags, then category fallback

This makes each asset page behave like both a showcase page and a copy/paste implementation reference.

### 6.3 Preview sandbox

The preview system is one of the most important parts of the project.

`buildSandboxHTML()` creates a complete HTML document around a generated component. That HTML:

- injects Tailwind from CDN
- loads React UMD, ReactDOM UMD, Framer Motion, GSAP, and Babel Standalone
- converts `export default function Foo()` into a plain function declaration
- exposes runtime globals on `window`
- mounts the component into `#root`
- captures runtime errors and displays them inside the preview

This lets the system preview generated code without compiling it through the main app bundle.

### 6.4 Live preview workspace

The live preview page uses browser `localStorage` rather than the database.

Flow:

1. Preview HTML is stored under a namespaced key
2. `/preview/live?id=...` loads the HTML back from local storage
3. `PreviewViewport` renders it in a frame/workspace shell
4. `buildPreviewWorkspaceHTML()` adds viewport switching and zoom controls

This is meant for temporary operator review, not durable storage.

### 6.5 AI pipeline orchestration

The real pipeline logic lives in:

- `lib/pipeline/generate.ts`
- `lib/pipeline/ingest.ts`
- `lib/pipeline/prompts.ts`

Core stages:

1. `enrichIdea()`
   Turns a rough idea into an `EnrichedSpec`

2. `generateCode()`
   Produces raw React component code from the spec

3. `validateAndFix()`
   Runs mechanical validation first, then AI-based semantic validation, then repair if needed

4. `ingestAsset()`
   Builds preview HTML, creates embeddings, upserts into `assets`, stores version history, and marks the idea approved

### 6.6 Validation and repair model

Validation is two-layered:

- Local string-based validation
  Checks for bad imports, invalid sandbox patterns, missing globals, viewport issues, invalid Tailwind usage, truncated code, duplicate props, and other runtime hazards

- AI semantic validation
  Compares generated code to the enriched spec and scores fidelity, correctness, and completeness

If validation fails, the system asks the selected provider to repair the code and retries.

This design is important because generated components do not run in a normal app module system. They run in a constrained iframe sandbox with strict rules.

### 6.7 Workflow configuration

The project supports both:

- provider presets via `pipeline_configs`
- full multi-stage workflows via `pipelines` and `pipeline_stages`

That means the operator can change not only which model to use, but also the ordered sequence of enrichment, generation, and validation steps.

### 6.8 Settings and key management

The settings page writes supported API keys directly into `.env.local` through `/api/settings/keys`.

Supported managed keys:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`

This is convenient for local admin tooling, but it also means the dashboard currently assumes trusted internal usage.

---

## 7. API Surface Summary

### Asset APIs

- `GET /api/assets/search` - semantic or keyword search
- `GET /api/assets/random` - fetch random/promo assets
- `GET /api/assets/[slug]` - fetch one asset
- `POST /api/assets/[slug]/view` - increment views
- `POST /api/assets/[slug]/vote` - increment upvotes

### Preview APIs

- `GET /api/preview/compile?slug=...` - compile asset or idea code into sandbox HTML

### Pipeline APIs

- `GET/POST/PATCH/DELETE /api/pipeline/ideas`
- `POST /api/pipeline/chat` - convert natural language into structured idea fields
- `POST /api/pipeline/enrich` - enrich one idea
- `POST /api/pipeline/generate` - run staged generation flow
- `POST /api/pipeline/validate` - validate arbitrary code/spec input
- `POST /api/pipeline/repair` - targeted repair pass on existing generated code
- `POST /api/pipeline/ingest` - publish code/spec into assets
- `GET/DELETE /api/pipeline/inventory`
- `GET/POST/PATCH/DELETE /api/pipeline/configs`
- `GET/POST/PATCH/DELETE /api/pipeline/workflows`
- `POST/PATCH/DELETE /api/pipeline/workflows/stages`

### External/programmatic API

- `POST /api/v1/generate`

This endpoint is token-protected with `PIPELINE_API_SECRET` and can run the full idea-to-asset flow in one request.

---

## 8. Key Runtime Pages

### Public pages

- `/` - catalog view of published assets
- `/asset/[slug]` - asset showcase, install info, code, related assets
- `/preview/[slug]` - fullscreen preview
- `/preview/live` - temporary local live preview

### Dashboard pages

- `/dashboard` - searchable internal asset browser
- `/pipeline` - pipeline overview
- `/pipeline/ideas` - create, edit, enrich, and manage idea backlog
- `/pipeline/generate` - batch-run generation on pending ideas
- `/pipeline/review` - review and publish generated results
- `/pipeline/inventory` - manage published assets
- `/settings` - model presets, API keys, theme, automation UI

---

## 9. End-to-End Example

Here is the simplest way to understand the system:

1. Create an idea like "Magnetic Button"
2. Save it to `ideas`
3. Run enrichment to produce a structured motion/design spec
4. Generate component code from that spec
5. Validate the code against sandbox rules and semantic expectations
6. Repair if necessary
7. Review the generated component in the dashboard
8. Approve it
9. Ingest it into `assets`
10. Browse it publicly at `/asset/[slug]`
11. Preview it in an isolated iframe at `/preview/[slug]`
12. Search for it later through semantic or keyword search

---

## 10. Practical Maintenance Notes

- The checked-in `README.md` is still the default Next.js starter and does not describe this app
- `PROJECT_DOCUMENTATION.md` is the more accurate project-level reference
- The pipeline is heavily dependent on prompt quality and sandbox constraints
- The preview renderer currently mixes React 19 in the app with React 18 UMD in the sandbox; that is intentional in the current implementation but worth tracking
- The app appears designed primarily for trusted internal/admin use rather than hardened public authoring
- Schema drift between code and migrations should be resolved before major production work

---

## 11. Summary

This project is an AI-assisted animation component platform with:

- a public asset library
- an internal editorial/pipeline dashboard
- configurable AI generation workflows
- a custom sandboxed preview renderer
- Supabase-backed search, analytics, and publishing

The most important concept in the codebase is this:

`idea -> enriched spec -> generated code -> validated code -> reviewed asset -> published library item`

That flow is the backbone of the entire application.
