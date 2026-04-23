# Dashboard & Pipeline — Technical Reference

> **Velox UI** · AI-powered animated React component generation platform  
> Generated: 2026-04-11 · Based on source at commit `9a1d2de`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Middleware & Auth](#4-middleware--auth)
5. [Dashboard Route](#5-dashboard-route)
   - [A. Route Architecture](#5a-route-architecture)
   - [B. Component Tree](#5b-component-tree)
   - [C. State Management](#5c-state-management)
   - [D. Data Flow — `getDashboardData()`](#5d-data-flow--getdashboarddata)
   - [E. Business Logic](#5e-business-logic)
   - [F. Key Functions & Hooks](#5f-key-functions--hooks)
6. [Pipeline Route](#6-pipeline-route)
   - [Pipeline Index](#61-pipeline-index-pipelinepage)
   - [Ideas Sub-route](#62-ideas-sub-route-ideaspage)
   - [Generate Sub-route](#63-generate-sub-route-generatepage)
   - [Review Sub-route](#64-review-sub-route-reviewpage)
   - [Inventory Sub-route](#65-inventory-sub-route-inventorypage)
7. [API Routes](#7-api-routes)
   - [/api/pipeline/ideas](#71-apipipelineideas)
   - [/api/pipeline/generate](#72-apipipelinegenerate-sse-stream)
   - [/api/pipeline/ingest](#73-apipipelineingest)
   - [/api/pipeline/inventory](#74-apipipelineinventory)
   - [/api/pipeline/chat](#75-apipipelinechat)
   - [/api/settings/keys](#76-apisettingskeys)
   - [/api/preview/compile](#77-apipreviewcompile)
   - [Asset APIs](#78-asset-apis)
8. [Library Layer](#8-library-layer)
   - [lib/db/assets.ts](#81-libdbassettsts)
   - [lib/db/supabase.ts](#82-libdbsupabasets)
   - [lib/pipeline/generate.ts](#83-libpipelinegeneratets)
   - [lib/pipeline/ingest.ts](#84-libpipelineingestts)
   - [lib/pipeline/prompts.ts](#85-libpipelinepromptsts)
   - [lib/preview/sandbox.ts](#86-libpreviewsandboxts)
   - [lib/ai/\*](#87-libai)
9. [Types Reference](#9-types-reference)
   - [types/pipeline.ts](#91-typespipelinets)
   - [types/asset.ts](#92-typesassetts)
10. [Database Schema](#10-database-schema)
11. [Settings Route](#11-settings-route)
12. [Validation Engine](#12-validation-engine)
13. [Sandbox Architecture](#13-sandbox-architecture)
14. [End-to-End Generation Flow](#14-end-to-end-generation-flow)
15. [Build From Scratch](#15-build-from-scratch)
16. [Critical Summary](#16-critical-summary)

---

## 1. Project Overview

Velox UI is a **self-hosted SaaS dashboard** that lets an operator:

1. **Capture ideas** for animated React components (name, type, category, complexity, feel).
2. **Enrich** those ideas through an AI pipeline into structured specs.
3. **Generate** sandbox-safe React + Framer Motion code via Claude / Gemini / Groq / Ollama.
4. **Review** the generated output in an in-browser live sandbox preview.
5. **Publish** approved components to a public-facing component library.

The public side (`/components`, `/asset/[slug]`) shows the published inventory. The dashboard side (`/dashboard`, `/pipeline/*`, `/settings`) is the operator control plane.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 (strict) |
| React | React 19 + React DOM 19 |
| Styling | Tailwind CSS 4 (PostCSS), CSS custom properties |
| Animations | Framer Motion 12, GSAP 3 |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase SSR (`@supabase/ssr`) |
| AI — Primary | Anthropic Claude 3.5 Sonnet |
| AI — Alternatives | Google Gemini, Groq, Ollama (local) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Sandbox | Babel Standalone (in-browser transpile) |
| Icons | Lucide React |
| Package manager | npm (lock file present) / pnpm (lock file also present) |
| Deployment | Vercel-ready |

---

## 3. Repository Structure

```
/
├── app/
│   ├── layout.tsx                    # Root layout — fonts, providers, theme init
│   ├── globals.css                   # Tailwind 4 + CSS variable palette
│   ├── (dashboard)/                  # Route group: dashboard shell
│   │   ├── layout.tsx                # Wraps children in <DashboardShell>
│   │   ├── dashboard/page.tsx        # Dashboard home (SSR)
│   │   ├── pipeline/
│   │   │   ├── layout.tsx            # Transparent passthrough
│   │   │   ├── page.tsx              # Pipeline overview (SSR)
│   │   │   ├── ideas/page.tsx        # Idea capture & enrichment (CSR)
│   │   │   ├── generate/page.tsx     # Code generation + live logs (CSR)
│   │   │   ├── review/page.tsx       # QA sandbox preview (CSR)
│   │   │   └── inventory/page.tsx    # Published asset management (CSR)
│   │   └── settings/page.tsx         # API keys + pipeline config (CSR)
│   ├── (public)/                     # Route group: public shell
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing page (SSR)
│   │   ├── components/page.tsx       # Component gallery (SSR)
│   │   ├── asset/[slug]/page.tsx     # Asset detail (SSR, dynamic)
│   │   ├── templetes/page.tsx        # Templates gallery
│   │   ├── templetes/[slug]/page.tsx # Template detail
│   │   └── preview/                  # Sandboxed preview routes
│   ├── api/
│   │   ├── pipeline/
│   │   │   ├── ideas/route.ts        # CRUD for ideas
│   │   │   ├── generate/route.ts     # SSE generation stream
│   │   │   ├── ingest/route.ts       # Publish component to assets
│   │   │   ├── inventory/route.ts    # Fetch/delete published assets
│   │   │   ├── chat/route.ts         # AI-to-idea conversion
│   │   │   ├── enrich/route.ts       # Standalone enrich endpoint
│   │   │   ├── validate/route.ts     # Standalone validate endpoint
│   │   │   ├── repair/route.ts       # Standalone repair endpoint
│   │   │   ├── configs/route.ts      # Pipeline config CRUD
│   │   │   └── workflows/            # Workflow + stages CRUD
│   │   ├── assets/
│   │   │   ├── [slug]/route.ts
│   │   │   ├── [slug]/view/route.ts
│   │   │   ├── [slug]/copy/route.ts
│   │   │   ├── [slug]/vote/route.ts
│   │   │   ├── search/route.ts
│   │   │   └── random/route.ts
│   │   ├── preview/compile/route.ts  # Build sandbox HTML for preview
│   │   ├── settings/keys/route.ts    # Read/write .env.local API keys
│   │   └── v1/generate/route.ts      # Legacy generation endpoint
│   └── login/page.tsx
├── components/
│   ├── dashboard/
│   │   ├── DashboardPageFrame.tsx    # Page header wrapper used by all dashboard pages
│   │   ├── DataTable.tsx
│   │   ├── StatCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   └── widgets/
│   │       ├── HeroWidget.tsx
│   │       ├── PipelineFunnelWidget.tsx
│   │       ├── AnalyticsWidget.tsx
│   │       └── ActivityFeedWidget.tsx
│   ├── pipeline/
│   │   ├── StageStrip.tsx            # Animated stage progress bar
│   │   ├── PipelineConfigsEditor.tsx # DB-backed pipeline config form
│   │   ├── ManualPipeline.tsx
│   │   └── LogTerminal.tsx
│   ├── layout/
│   │   ├── DashboardShell.tsx        # Sidebar + main area layout
│   │   ├── PublicShell.tsx
│   │   ├── Navbar.tsx
│   │   ├── LandingNavbar.tsx
│   │   ├── Footer.tsx
│   │   ├── BrandWordmark.tsx
│   │   ├── PublicShellBoundary.tsx
│   │   └── dashboardConfig.ts        # Nav link definitions
│   ├── ui/
│   │   ├── Button.tsx, Badge.tsx, Input.tsx, Textarea.tsx, Select.tsx
│   │   ├── Reveal.tsx                # Staggered fade-in animation wrapper
│   │   ├── EmptyState.tsx, Divider.tsx, Skeleton.tsx
│   │   ├── Toast.tsx                 # Global toast notification system
│   │   ├── cx.ts                     # clsx helper
│   │   └── CountUp.tsx, Marquee.tsx, StatusDot.tsx, Kbd.tsx
│   ├── theme/ThemeProvider.tsx
│   ├── landing/                      # Public-facing section components
│   └── sections/                     # More public section components
├── lib/
│   ├── db/
│   │   ├── supabase.ts               # Singleton Supabase client
│   │   ├── assets.ts                 # All asset queries + getDashboardData()
│   │   └── search.ts                 # Semantic + keyword search
│   ├── ai/
│   │   ├── anthropic.ts              # Claude enrich/generate/validate/fix/reflect
│   │   ├── gemini.ts
│   │   ├── groq.ts
│   │   └── ollama.ts
│   ├── pipeline/
│   │   ├── generate.ts               # Public orchestration facade
│   │   ├── ingest.ts                 # Publish asset + embedding creation
│   │   ├── prompts.ts                # All AI prompt templates
│   │   ├── providerDispatch.ts       # Provider-specific enrich/generate dispatch
│   │   ├── validationRuntime.ts      # Timeout budgets + semantic validation / repair loop
│   │   ├── validationStatic.ts       # Auto-fix and static sandbox validation rules
│   │   ├── workflowUtils.ts          # Workflow normalization / stage lookup helpers
│   │   └── queueCollections.ts       # Shared queue filtering, facets, and pagination math
│   └── preview/
│       └── sandbox.ts                # buildSandboxHTML()
├── types/
│   ├── pipeline.ts                   # Idea, EnrichedSpec, RunSession, etc.
│   └── asset.ts                      # Asset, AnimationSpec, VisualSpec
├── middleware.ts                     # Supabase SSR session refresh (no auth guards)
├── next.config.ts
└── supabase/                         # Schema migrations (if present)
```

---

## 4. Middleware & Auth

**File:** `middleware.ts`

```typescript
// Runs on every request except _next/static, _next/image, favicon, images
export async function middleware(request: NextRequest) {
  // Creates a Supabase SSR client that reads/writes cookies
  const supabase = createServerClient(URL, ANON_KEY, { cookies: { ... } })

  // Refreshes the session token (side effect: updates cookies)
  const { data: { user } } = await supabase.auth.getUser()

  // ⚠️ IMPORTANT: There is NO redirect or access denial here.
  // The comment "Unrestricted local access explicitly granted to dashboard routes"
  // means the dashboard is publicly accessible — no login required.
  return supabaseResponse
}
```

**Key fact:** Auth is wired up (session refresh works) but the dashboard has **no enforced auth gate**. Any visitor can access `/dashboard` and `/pipeline/*`. This is an intentional local-dev mode decision.

---

## 5. Dashboard Route

### 5A. Route Architecture

| Property | Value |
|---|---|
| File | `app/(dashboard)/dashboard/page.tsx` |
| Router | Next.js App Router |
| Rendering | **Server Component** (`async` function, no `'use client'`) |
| Auth guard | None (see §4) |
| Data fetching | Direct DB call via `getDashboardData()` — no `fetch`, no API route |
| Layout applied | `app/(dashboard)/layout.tsx` → `<DashboardShell>` |

### 5B. Component Tree

```
DashboardShell                    [server] layout wrapper — sidebar + scroll area
└── DashboardPage                 [server] page.tsx — calls getDashboardData()
    ├── HeroWidget                [server] receives: publishedCount, weeklyDelta,
    │                                       inReviewCount, totalViews, totalCopies
    └── <div> 3fr / 2fr grid
        ├── PipelineFunnelWidget  [server] receives: stages { ideas, enriched,
        │                                   generating, review, published }
        └── <div> stacked column
            ├── AnalyticsWidget   [server] receives: totalViews, totalCopies,
            │                                        totalUpvotes, proCount
            └── ActivityFeedWidget [server] receives: events (recentActivity[])
```

All widgets are server components — they receive pre-fetched props. No client-side data loading on the dashboard home.

### 5C. State Management

The dashboard home has **no client state**. All data is resolved server-side before HTML is sent. No `useState`, no hooks.

### 5D. Data Flow — `getDashboardData()`

**File:** `lib/db/assets.ts:167`

Executes **5 parallel Supabase queries** in a single `Promise.all`:

```typescript
const [
  { data: assetRows },     // (1) All published assets: views_count, copy_count, upvotes, is_pro
  { count: weeklyCount },  // (2) Assets published in last 7 days (count only)
  { data: ideaRows },      // (3) All ideas: status, name, updated_at (for funnel)
  { data: recentAssets },  // (4) 3 most recent published assets (for activity feed)
  { data: recentIdeas },   // (5) 4 most recently active ideas (generating+ statuses)
] = await Promise.all([...])
```

**Aggregation logic:**

```typescript
// From query (1) — iterate all published assets in memory
publishedCount = rows.length
totalViews     = rows.reduce((s, r) => s + (r.views_count ?? 0), 0)
totalCopies    = rows.reduce((s, r) => s + (r.copy_count ?? 0), 0)
totalUpvotes   = rows.reduce((s, r) => s + (r.upvotes ?? 0), 0)
proCount       = rows.filter(r => r.is_pro).length

// From query (3) — funnel counts
IDEA_STAGES = {
  ideas:      ['pending'],
  enriched:   ['enriching', 'enriched'],
  generating: ['generating', 'generated', 'validating', 'validated',
               'repair_required', 'ready_with_warnings'],
  review:     ['reviewing', 'approved'],
}
// No DB aggregation — count in JavaScript

// Activity feed: merge queries (4) and (5), sort by updatedAt, take top 6
```

**Return shape:**

```typescript
interface DashboardData {
  publishedCount: number
  weeklyDelta: number        // assets published in last 7 days
  inReviewCount: number      // ideas in ['reviewing', 'approved'] status
  totalViews: number
  totalCopies: number
  totalUpvotes: number
  proCount: number
  stages: {
    ideas: number            // 'pending' ideas
    enriched: number         // 'enriching' | 'enriched'
    generating: number       // mid-pipeline statuses
    review: number           // 'reviewing' | 'approved'
    published: number        // is_published=true assets
  }
  recentActivity: Array<{
    name: string
    status: 'published' | 'review' | 'generating' | 'enriched'
    updatedAt: string
  }>
}
```

### 5E. Business Logic

The dashboard home is purely **read-only observability**. It answers:
- How many components are published?
- How many were published this week?
- Where are ideas in the pipeline funnel right now?
- What happened recently?

No mutations occur on this page.

### 5F. Key Functions & Hooks

| Name | File | Input → Output | Purpose |
|---|---|---|---|
| `getDashboardData()` | `lib/db/assets.ts:167` | `void → DashboardData` | Single aggregated data fetch for entire dashboard home |
| `getPublishedAssets(limit, offset)` | `lib/db/assets.ts:16` | `number, number → Asset[]` | Paginated published assets |
| `getLandingAssets(limit)` | `lib/db/assets.ts:26` | `number → { assets, totalPublished }` | React `cache()`-wrapped; used on public landing page |
| `getSimilarAssets(asset, limit)` | `lib/db/assets.ts:123` | `Asset, number → Asset[]` | Tag overlap then category fallback |

---

## 6. Pipeline Route

### 6.1. Pipeline Index (`PipelinePage`)

**File:** `app/(dashboard)/pipeline/page.tsx`  
**Rendering:** Server Component (no `'use client'`)  
**Purpose:** Navigation hub — static cards linking to each pipeline sub-route.

No data fetching. Renders a 4-column grid of stage cards (Ideas → Enrich → Generate → Review) plus two feature cards (Backlog, Automation). All navigation via `<Link>`.

```typescript
const STAGES = [
  { n: '01', label: 'Add ideas',  href: '/pipeline/ideas',    icon: Lightbulb },
  { n: '02', label: 'Enrich',     href: '/pipeline/ideas',    icon: Sparkles  },
  { n: '03', label: 'Generate',   href: '/pipeline/generate', icon: Zap       },
  { n: '04', label: 'Review',     href: '/pipeline/review',   icon: Eye       },
]
```

---

### 6.2. Ideas Sub-route (`IdeasPage`)

**File:** `app/(dashboard)/pipeline/ideas/page.tsx`  
**Rendering:** `'use client'` — fully client-rendered  
**Purpose:** Create and enrich component ideas before generation.

#### Component Tree

```
DashboardPageFrame (title="Ideas")
├── Chat Input Bar         — POST /api/pipeline/chat → auto-create idea
├── Idea Creation Form     — inline form (name, type, category, complexity, tech, feel)
│   └── StageStrip         — visual progress: Enrich → Done (or Generate → Validate → Fix → Done)
├── Filter Bar             — search, category/type/status dropdowns
└── Ideas Table            — paginated list with inline enrichment trigger
    └── selected idea detail panel
        ├── Tab: Spec      — renders enriched_spec JSON as readable fields
        └── Tab: Code      — shows generated_code if available
```

#### State Variables

```typescript
const [ideas, setIdeas] = useState<Idea[]>([])          // full idea list
const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
const [searchQuery, setSearchQuery] = useState('')
const [showFilters, setShowFilters] = useState(false)
const [filterCategory, setFilterCategory] = useState("all")
const [filterType, setFilterType] = useState("all")
const [filterStatus, setFilterStatus] = useState("all")
const [chatQuery, setChatQuery] = useState('')
const [isChatting, setIsChatting] = useState(false)
const [isRunning, setIsRunning] = useState(false)       // enrichment in progress
const [stages, setStages] = useState<PipelineStage[]>([]) // stage strip state
const [statusMsg, setStatusMsg] = useState('')
const [errorMsg, setErrorMsg] = useState('')
const [logs, setLogs] = useState<string[]>([])
const [activeTabGroup, setActiveTabGroup] = useState<number>(0)
const [currentPage, setCurrentPage] = useState(1)
const [itemsPerPage, setItemsPerPage] = useState(10)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const abortRef = useRef<AbortController | null>(null)
const saveTimeoutRef = useRef<number | null>(null)
```

#### Key Flows

**Create idea manually:**
```
User fills form → POST /api/pipeline/ideas → refreshIdeas()
```

**AI-assisted idea creation (chat):**
```
User types natural language → POST /api/pipeline/chat
  → returns { idea: { name, type, category, ... } }
  → POST /api/pipeline/ideas with that payload
  → refreshIdeas()
```

**Filtered display:**
```typescript
// Client-side filtering (no re-fetch)
const filteredIdeas = ideas.filter(idea => {
  const matchQ = !q || name/category/type includes q
  const matchC = filterCategory === 'all' || idea.category === filterCategory
  const matchT = filterType === 'all' || idea.type === filterType
  const matchS = filterStatus === 'all' || idea.status === filterStatus
  return matchQ && matchC && matchT && matchS
})
```

Note: `approved` ideas are filtered OUT of the list client-side:
```typescript
setIdeas(nextIdeas.filter((i: Idea) => i.status !== 'approved'))
```

**Stage strip constants:**
```typescript
const ENRICH_STAGES: PipelineStage[] = [
  { key: 'enrich', label: 'Enrich', state: 'pending' },
  { key: 'done', label: 'Done', state: 'pending' },
]

const GENERATE_STAGES: PipelineStage[] = [
  { key: 'generate', label: 'Generate', state: 'pending' },
  { key: 'validate', label: 'Validate', state: 'pending' },
  { key: 'fix', label: 'Fix', state: 'pending' },
  { key: 'done', label: 'Done', state: 'pending' },
]
```

---

### 6.3. Generate Sub-route (`GeneratePage`)

**File:** `app/(dashboard)/pipeline/generate/page.tsx`  
**Rendering:** `'use client'` — fully client-rendered  
**Purpose:** Select ideas from the queue and run the full generation pipeline with live SSE log streaming.

#### Component Tree

```
DashboardPageFrame (title="Generate")
├── Metrics Row (4-column grid)
│   ├── Generate/Abort Button     — triggers handleRunSelected() or abortRun()
│   ├── Queued Jobs counter        — session?.ideas?.length
│   ├── Compiled counter           — session?.totalDone
│   └── Elapsed Clock              — live seconds since session.startedAt
└── surface-panel (table + terminal, flex column)
    ├── Compilation Queue Table
    │   ├── Filter bar (search, category/type/status dropdowns)
    │   ├── thead: checkbox | S.No. | Specification Matrix | Type | Progress | Created | Actions
    │   ├── tbody: paginated rows — checkbox, name/category/complexity, type, progress bar | badge, date, delete btn
    │   └── Pagination footer
    └── Build Logs Terminal (400px fixed height)
        ├── Header: "Build Logs", error count, "Building" pulse, Clear button
        └── Scrollable log area: [timestamp] [STAGE] [message]
```

#### State Variables

```typescript
const [pendingIdeas, setPendingIdeas] = useState<Idea[]>([])  // fetched from API on mount
const [searchQuery, setSearchQuery] = useState('')
const [showFilters, setShowFilters] = useState(false)
const [filterCategory, setFilterCategory] = useState("all")
const [filterType, setFilterType] = useState("all")
const [filterStatus, setFilterStatus] = useState("all")
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const [currentPage, setCurrentPage] = useState(1)
const [itemsPerPage, setItemsPerPage] = useState(10)
const [session, setSession] = useState<RunSession | null>(null) // entire run session
const sessionRef = useRef<RunSession | null>(null)              // ref for async access
const abortRef = useRef<AbortController | null>(null)           // for fetch cancellation
const logRef = useRef<HTMLDivElement>(null)                     // for auto-scroll
```

#### RunSession type

```typescript
interface RunSession {
  id: string           // UUID
  startedAt: number    // Date.now()
  isRunning: boolean
  totalDone: number
  totalFailed: number
  ideas: IdeaRunState[]  // per-idea progress
  logs: LogEntry[]       // all terminal log lines
}

interface IdeaRunState {
  ideaId: string
  ideaName: string
  status: 'queued' | 'running' | 'done' | 'failed'
  progress: number       // 0–100
  startedAt?: number
  durationMs?: number
}
```

#### `handleRunSelected()` — Core Generation Loop

```typescript
async function handleRunSelected() {
  // 1. Build a new RunSession from selectedIds
  const newSession = { id, startedAt, isRunning: true, totalDone: 0, totalFailed: 0,
    ideas: selectedArray.map(id => ({ status: 'queued', progress: 0, ... })),
    logs: [makeLog('SYSTEM', 'system', '─── Session started ───')]
  }

  // 2. Sequential loop — one idea at a time (deliberate: avoid API rate limits)
  for (const id of selectedArray) {
    // Mark as running
    updateSession(prev => ideas.map(i => i.ideaId === id ? { ...i, status: 'running', progress: 5 } : i))

    // 3. POST to /api/pipeline/generate → ReadableStream (SSE)
    const response = await fetch('/api/pipeline/generate', {
      method: 'POST', body: JSON.stringify({ ideaId: id, mode: 'claude' }),
      signal: abortController.signal
    })

    // 4. Read SSE stream
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      // Parse "data: {...}\n\n" lines
      // On event==='status':  update progress via STAGE_PROGRESS map, append log
      // On event==='ready':   mark idea done, append success log
      // On event==='error':   mark idea failed, append error log
    }

    // 5. 800ms pause between ideas (rate limiting)
    await new Promise(r => setTimeout(r, 800))
  }

  // 6. Append summary log, set isRunning=false
}
```

#### Stage-to-Progress Mapping

```typescript
const STAGE_PROGRESS: Record<string, number> = {
  enriching:  20,
  enriched:   30,
  generating: 50,
  generated:  65,
  validating: 75,
  validated:  85,
  reviewing:  95,
  approved:  100,
}
```

#### Log Entry Rendering

```typescript
// Color mapping by log.level:
log.level === 'error'   → text-[--danger]   (red)
log.level === 'success' → text-[--success]  (green)
log.level === 'warning' → text-[--warning]  (yellow)
log.level === 'info'    → text-[--info]     (blue)
default                 → text-[--text-tertiary] (gray)
```

#### Data Loading

```typescript
// On mount: fetch pending + enriched ideas
useEffect(() => {
  fetch('/api/pipeline/ideas?status=pending,enriched')
  // populates pendingIdeas
}, [])
```

---

### 6.4. Review Sub-route (`ReviewPage`)

**File:** `app/(dashboard)/pipeline/review/page.tsx`  
**Rendering:** `'use client'`  
**Purpose:** QA queue — inspect generated code in a sandbox preview, then approve (publish) or reject (delete).

#### State Variables

```typescript
const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([])
const [selected, setSelected] = useState<ReviewItem | null>(null)  // currently inspected item
const [previewWidth, setPreviewWidth] = useState('Full')            // 'Full'|'1024px'|'768px'|'375px'
const [viewMode, setViewMode] = useState<'preview'|'code'>('preview')
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const [currentPage, setCurrentPage] = useState(1)
const [itemsPerPage, setItemsPerPage] = useState(10)
// + search/filter state (same pattern as other pages)
```

#### ReviewItem shape (local interface)

```typescript
interface ReviewItem {
  id: string
  name: string
  created_at?: string
  slug?: string
  status: string
  category?: string
  type?: string
  complexity?: string
  tags?: string[]
  tech?: string[]
  code?: string
  generated_code: string | null
  enriched_spec: {
    name: string; description: string; seo_description: string
    tags: string[]; tech: string[]
  } | null
}
```

#### Data Loading

```typescript
// Fetches ideas with these statuses for review:
fetch('/api/pipeline/ideas?status=reviewing,validated,generated,failed')
```

Note: The review queue sources from the `ideas` table (not `assets`). It shows generated but not-yet-published components.

#### Approve Flow

```typescript
const handleApprove = async (id: string) => {
  const item = reviewQueue.find(i => i.id === id)
  // Requires: item.generated_code && item.enriched_spec
  
  await fetch('/api/pipeline/ingest', {
    method: 'POST',
    body: JSON.stringify({ code, spec: item.enriched_spec, ideaId: item.id })
  })
  // On success: toast.success('Published', data.slug), reload queue
}
```

#### Reject Flow

```typescript
const handleReject = async (id: string) => {
  await fetch('/api/pipeline/ideas', {
    method: 'PATCH',
    body: JSON.stringify({ id, status: 'rejected' })
  })
  // Reload queue
}
```

#### Preview Rendering

The preview `<iframe>` renders `src="/api/preview/compile?slug={idea.id}"` which returns a full sandbox HTML document. Width is controlled by inline style on the iframe wrapper.

---

### 6.5. Inventory Sub-route (`InventoryPage`)

**File:** `app/(dashboard)/pipeline/inventory/page.tsx`  
**Rendering:** `'use client'`  
**Purpose:** Manage published assets — browse, search, delete from inventory.

#### Data Loading

```typescript
// Fetches from assets table (published components), not ideas
fetch('/api/pipeline/inventory')
// Returns: { assets: Asset[] } — up to 100 recent
```

#### Asset shape (local interface — subset of full Asset)

```typescript
interface Asset {
  id: string; slug: string; name: string
  category: string; type: string; complexity: string; created_at: string
}
```

#### Delete Flow

```typescript
async function handleDelete(id: string) {
  await fetch('/api/pipeline/inventory', { method: 'DELETE', body: JSON.stringify({ id }) })
  await loadAssets()  // refresh
}
```

The "View live" action navigates to `/asset/${asset.slug}` (public page) — this opens in new tab via `ExternalLink`.

---

## 7. API Routes

### 7.1. `/api/pipeline/ideas`

**File:** `app/api/pipeline/ideas/route.ts`

#### GET
```
Query params:
  ?status=pending,enriched    → filter by comma-separated statuses
  ?ids=uuid1,uuid2            → fetch specific IDs
  (none)                      → all ideas

Query: SELECT id, name, type, category, complexity, status, enriched_spec, feel,
              tech, generated_code, created_at
       FROM ideas
       ORDER BY created_at DESC
       LIMIT 100

Response: { ideas: Idea[] }
```

#### POST
```
Body: single object OR array of objects
  { name, type?, category?, tech?, complexity?, feel? }

Inserts into ideas table with defaults:
  type='hover', category='animation', tech=[], complexity='medium', feel=''

Response: { ok: true, ideas: Idea[] }
```

#### PATCH
```
Body: { id, ...updates }
Performs: UPDATE ideas SET ...updates WHERE id=id
Response: { ok: true }
```

#### DELETE
```
Body: { id }
Performs: DELETE FROM ideas WHERE id=id
Response: { ok: true }
```

---

### 7.2. `/api/pipeline/generate` — SSE Stream

**File:** `app/api/pipeline/generate/route.ts`

**Method:** POST  
**Body:** `{ ideaId: string }`  
**Response:** `Content-Type: text/event-stream` (Server-Sent Events)

#### Server-side logic

```typescript
// 1. Fetch idea from DB
// 2. Fetch default pipeline from 'pipelines' table (with stages)
//    Fallback if none: 3 hardcoded stages for Anthropic Claude 3.5 Sonnet
// 3. Sort stages by step_order
// 4. Open ReadableStream, iterate stages:

for (const stage of stages) {
  if (stage.action_type === 'enrich_spec') {
    // UPDATE ideas SET status='enriching'
    // send({ event: 'status', stage: 'enriching', message: 'Executing Stage: Research...' })
    // spec = await enrichIdea(idea, config)
    // UPDATE ideas SET status='enriched', enriched_spec=spec
    // send({ event: 'enriched', spec })
  }

  if (stage.action_type === 'generate_code') {
    // UPDATE ideas SET status='generating'
    // send({ event: 'status', stage: 'generating', ... })
    // rawCode = await generateCode(spec, config)
    // UPDATE ideas SET status='generated'
    // send({ event: 'generated', code: rawCode })
  }

  if (stage.action_type === 'validate_code') {
    // UPDATE ideas SET status='validating'
    // send({ event: 'status', stage: 'validating', ... })
    // finalResult = await validateAndFix(rawCode, config, JSON.stringify(spec))
    // UPDATE ideas SET status='validated'
    // send({ event: 'validated', code, has_errors, validation_report })
  }
}

// Determine review status:
// has_errors=true || report.status='FAIL'          → 'repair_required'
// report.status='PASS_WITH_WARNINGS'               → 'ready_with_warnings'
// report.status='PASS' || no report                → 'ready'

// UPDATE ideas SET status=reviewStatus, generated_code=rawCode

if (reviewStatus === 'repair_required') {
  send({ event: 'repair_required', message, status, ideaId, has_errors: true, issues })
} else {
  send({ event: 'ready', message, status, ideaId, code })
}
```

#### SSE Event Catalogue

| `event` | When fired | Key payload fields |
|---|---|---|
| `status` | On each pipeline stage start | `stage`, `message` |
| `enriched` | After enrichment completes | `spec` (EnrichedSpec) |
| `generated` | After code generation completes | `code` |
| `validated` | After validation completes | `code`, `has_errors`, `validation_report` |
| `ready` | Final success (no blocking errors) | `status`, `ideaId`, `code` |
| `repair_required` | Final failure (blocking validation errors) | `status`, `ideaId`, `issues[]` |
| `error` | Unhandled exception | `message` |

---

### 7.3. `/api/pipeline/ingest`

**File:** `app/api/pipeline/ingest/route.ts` → delegates to `lib/pipeline/ingest.ts`

**Method:** POST  
**Body:** `{ code: string, spec: EnrichedSpec, ideaId?: string, isPro?: boolean }`

```typescript
// lib/pipeline/ingest.ts
export async function ingestAsset(ideaId, spec, code, isPro) {
  // 1. Generate slug: spec.name → lowercase → replace spaces with '-' → strip non-alphanumeric
  const slug = spec.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  // 2. Build embedding input string (name + description + seo_description + tags + trigger)
  // 3. Call OpenAI text-embedding-3-small → number[] (optional, continues on failure)

  // 4. Build preview HTML: buildSandboxHTML(code)

  // 5. UPSERT into assets (conflict on slug):
  //    slug, name, category='animation', type=spec.animation_spec.trigger,
  //    code, preview_html, description, seo_description, tags, tech, complexity='medium',
  //    animation_spec, visual_spec, is_pro, is_published=true, license='owned',
  //    embedding (if available)

  // 6. INSERT into asset_versions: { asset_slug: slug, code }

  // 7. If ideaId: UPDATE ideas SET status='approved' WHERE id=ideaId

  return { ok: true, slug }
}
```

**Response:** `{ ok: true, slug: string }` or `{ ok: false, error: string }`

---

### 7.4. `/api/pipeline/inventory`

**File:** `app/api/pipeline/inventory/route.ts`

**GET:** Returns all published assets (limit 100):
```typescript
SELECT * FROM assets ORDER BY created_at DESC LIMIT 100
Response: { assets: Asset[] }
```

**DELETE:**
```typescript
Body: { id: string }
DELETE FROM assets WHERE id=id
Response: { ok: true }
```

---

### 7.5. `/api/pipeline/chat`

**File:** `app/api/pipeline/chat/route.ts`  
**Method:** POST  
**Body:** `{ prompt: string }` — natural language idea description

Uses an AI provider to convert free-form text into a structured `Idea` object (name, type, category, tech, complexity, feel). The IdeasPage calls this then immediately POSTs to `/api/pipeline/ideas` to persist.

---

### 7.6. `/api/settings/keys`

**File:** `app/api/settings/keys/route.ts`

**GET:** Reads `.env.local` and returns which keys are configured:
```typescript
Response: {
  ANTHROPIC_API_KEY: boolean,
  OPENAI_API_KEY: boolean,
  GEMINI_API_KEY: boolean,
  GROQ_API_KEY: boolean
}
```

**POST:** Writes a key to `.env.local`:
```typescript
Body: { envKey: 'ANTHROPIC_API_KEY', value: 'sk-ant-...' }
// Reads .env.local, finds or appends KEY=value line, writes back
Response: { success: true }
```

⚠️ This modifies the filesystem at runtime. Only safe in local/self-hosted deployment.

---

### 7.7. `/api/preview/compile`

**File:** `app/api/preview/compile/route.ts`  
**Method:** GET  
**Query param:** `?slug=component-name` or `?slug=idea-{uuid}`

Looks up the component code (either from `assets` by slug or from `ideas` by ID), calls `buildSandboxHTML(code)`, and returns the full HTML document with `Content-Type: text/html`.

Used by the Review page's `<iframe src="/api/preview/compile?slug=...">`.

---

### 7.8. Asset APIs

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/assets/[slug]` | GET | Fetch single published asset |
| `/api/assets/search` | GET `?q=...&limit=12` | Semantic → keyword search |
| `/api/assets/random` | GET | Random selection |
| `/api/assets/[slug]/view` | POST | Increment `views_count` |
| `/api/assets/[slug]/copy` | POST | Increment `copy_count` |
| `/api/assets/[slug]/vote` | POST/GET | Upvote / fetch vote count |

---

## 8. Library Layer

### 8.1. `lib/db/assets.ts`

All Supabase query functions. Key exports:

| Function | Signature | Notes |
|---|---|---|
| `getAssetBySlug` | `(slug: string) → Asset \| null` | Single asset lookup |
| `getPublishedAssets` | `(limit, offset) → Asset[]` | No `is_published` filter — returns all assets |
| `getLandingAssets` | `(limit=12) → { assets, totalPublished }` | React `cache()` wrapped; filters `is_published=true` |
| `getTemplateLandingAssets` | `(limit=12) → { assets, totalTemplates }` | React `cache()` wrapped; filters `category='template'` |
| `getTemplateAssetBySlug` | `(slug) → Asset \| null` | Template-specific lookup |
| `getRandomAssets` | `(count=6) → Asset[]` | No ordering — limited selection |
| `getAssetsByCategory` | `(category, limit=20) → Asset[]` | Category filter |
| `getSimilarAssets` | `(asset, limit=3) → Asset[]` | Tag overlap first, category fallback |
| `getDashboardData` | `() → DashboardData` | Full dashboard aggregation (5 parallel queries) |

---

### 8.2. `lib/db/supabase.ts`

```typescript
// Singleton — uses service role key if present, anon key as fallback
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

This client is used server-side only. The middleware uses a separate SSR client (`@supabase/ssr`) that reads/writes cookies.

---

### 8.3. `lib/pipeline/generate.ts`

The public pipeline orchestration facade. The exported API stays the same, but the heavy logic is now split across focused helpers.

**Current helper boundaries:**

- `lib/pipeline/generate.ts` keeps `enrichIdea`, `generateCode`, and `validateAndFix`
- `lib/pipeline/providerDispatch.ts` owns provider-specific enrich/generate dispatch
- `lib/pipeline/validationRuntime.ts` owns timeout budgets, semantic validation, and repair attempts
- `lib/pipeline/validationStatic.ts` owns `cleanCodeOutput()`, `autoFixCode()`, and `validateCodeString()`
- `lib/pipeline/workflowUtils.ts` normalizes workflows and stage ordering across routes/runners
- `lib/pipeline/queueCollections.ts` centralizes queue filtering/pagination used by ideas, review, and inventory pages

#### `enrichIdea(idea, config) → EnrichedSpec`

```
1. Serialize idea fields to JSON string
2. Dispatch to provider: enrichWithClaude | enrichWithGemini | enrichWithGroq | enrichWithOllama
3. extractJson(raw) — strips markdown fences, repairs truncated JSON
4. JSON.parse → EnrichedSpec
```

#### `generateCode(spec, config) → string`

```
1. JSON.stringify(spec)
2. Dispatch to provider
3. cleanCodeOutput(raw) — strips ```tsx fences
4. Returns raw component code string
```

#### `validateAndFix(code, config, specJson?, maxAttempts=3) → GeneratedCode`

This is the most complex function — a **repair loop**:

```
autoFixCode(code)  ← mechanical transformations first

for attempt in 1..maxAttempts:
  validation = validateCodeString(code)  ← static rule engine (100+ rules)

  if validation.ok:
    if specJson:
      report = validateWithProvider(specJson, code)  ← AI semantic check
      if report.status === 'FAIL':
        if attempt === maxAttempts: return { has_errors: true, report }
        code = fixWithProvider(specJson, code, JSON.stringify(report.issues))
        code = cleanCodeOutput(code)
        code = autoFixCode(code)
        continue
      return { has_errors: false, report }

    // Legacy path: claude reflection on first attempt
    if provider === 'anthropic' && attempt === 1:
      reflected = reflectWithClaude(code)
      if validateCodeString(reflected).ok: return { code: reflected, has_errors: false }
    return { has_errors: false }

  if attempt === maxAttempts: return { has_errors: true, validation_notes: error }
  code = fixWithProvider(specJson, code, validation.error)
  code = cleanCodeOutput(code); code = autoFixCode(code)

return { has_errors: true }
```

#### `cleanCodeOutput(raw) → string`

```typescript
raw.replace(/^```(?:tsx?|jsx?|javascript|typescript)?\n?/m, '')
   .replace(/```$/m, '')
   .trim()
```

#### `autoFixCode(code) → string`

Mechanical transformations (no AI):
- `.onChange(` → `.on('change', ` (Framer Motion v11 API change)
- `React.useState` etc → bare hook names
- Remove `import React from 'react'` lines
- Remove `import { ... } from 'react'` lines
- Remove `import { ... } from 'framer-motion'` lines
- `className="...min-h-screen..."` → `className="..."` + `style={{ minHeight: "100vh" }}`
- `className="...h-screen..."` → `className="..."` + `style={{ height: "100vh" }}`

#### `validateCodeString(code) → { ok: boolean; error?: string }`

100+ static rules. Categories:
- **Structure**: must have `export default function`, no truncation
- **Import safety**: no React imports, no framer-motion imports
- **Sandbox constraints**: no viewport units, no arbitrary brackets, no template-literal classNames, no window/document event listeners
- **Framer Motion v11**: no `.onChange()`, must extract from `window.Motion`, correct MotionValue usage
- **React Hooks**: top-level only, extracted from React global, no conditional calls
- **Component composition**: no placeholder icon classes, no fake image paths, proper nesting
- **Accessibility**: button semantics, alt text

---

### 8.4. `lib/pipeline/ingest.ts`

See §7.3 for full flow. Key behaviors:
- Slug generation is **deterministic from spec.name** — re-ingesting the same component overwrites via `upsert`
- Embeddings are **optional** — continues silently if `OPENAI_API_KEY` is missing
- `preview_html` is pre-built and stored in DB (not computed at request time for public pages)

---

### 8.5. `lib/pipeline/prompts.ts`

All AI prompt templates. Not read directly for this document but key exports:

| Export | Purpose |
|---|---|
| `CODE_GEN_SYSTEM_PROMPT` | 300+ line system prompt defining sandbox context, 25+ absolute rules, example components (Magnetic Button, Staggered Menu), globals documentation |
| `buildEnrichPrompt(ideaJson)` | User message for enrichment call |
| `buildGenPrompt(specJson)` | User message for code generation call |
| `buildValidationPrompt(specJson, code)` | User message for semantic validation with scoring |
| `buildFixPrompt(specJson, code, issues)` | User message for iterative repair |

---

### 8.6. `lib/preview/sandbox.ts`

#### `buildSandboxHTML(componentCode) → string`

Generates a complete standalone HTML document:

```html
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <!-- Tailwind CSS (CDN) -->
  <!-- React 18 + React-DOM 18 (UMD from unpkg) -->
  <!-- Framer Motion v11 (UMD from unpkg) -->
  <!-- GSAP 3 (UMD from unpkg) -->
  <!-- Babel Standalone (for JSX transpilation) -->
  <style>
    /* Dark background, centered flex container */
    /* #error: fixed overlay for runtime error display */
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error"></div>
  <script>
    // 1. window.Motion = FramerMotion  (global for component use)
    // 2. window.GSAP = gsap
    // 3. theme toggle listener (postMessage 'toggle-theme')
    // 4. PolyfillFramerMotion .onChange → .on('change', cb) for v11 compat
    // 5. Error display handler (window.onerror + onunhandledrejection)
    // 6. Component globals:
    //    const { useState, useEffect, useRef, ... } = React
    //    const { motion, AnimatePresence, useMotionValue, ... } = window.Motion
  </script>
  <script type="text/babel">
    // Component code (with 'export default' stripped to plain function)
    // ReactDOM.createRoot(root).render(<ComponentName />)
  </script>
</body>
```

The function:
1. Extracts `@name` annotation if present
2. Extracts function name from `export default function FooBar`
3. Removes `export default` keyword (leaves plain `function FooBar`)
4. Injects into template — Babel transpiles at runtime in the browser

---

### 8.7. `lib/ai/*`

Each provider file (`anthropic.ts`, `gemini.ts`, `groq.ts`, `ollama.ts`) implements the same interface:

```typescript
enrichWithProvider(ideaJson: string, config: PipelineConfig): Promise<string>
generateWithProvider(specJson: string, config: PipelineConfig): Promise<string>
validateWithProvider(specJson: string, code: string, config: PipelineConfig): Promise<ValidationReport>
fixWithProvider(specJson: string | null, code: string, issues: string, config: PipelineConfig): Promise<string>
reflectWithClaude(code: string, config: PipelineConfig): Promise<string>  // Anthropic only
```

The `config.system_prompt` field overrides the default system prompt per-call if set in the pipeline configuration.

---

## 9. Types Reference

### 9.1. `types/pipeline.ts`

```typescript
type IdeaStatus =
  | 'pending'            // just created
  | 'enriching'          // enrich_spec stage running
  | 'enriched'           // spec available, not yet generated
  | 'generating'         // generate_code stage running
  | 'generated'          // code available, not yet validated
  | 'validating'         // validate_code stage running
  | 'validated'          // validation complete
  | 'reviewing'          // in review queue (legacy status)
  | 'repair_required'    // validation found blocking errors
  | 'ready_with_warnings'// validation passed with non-blocking warnings
  | 'approved'           // published to assets table
  | 'rejected'           // rejected by reviewer
  | 'failed'             // unhandled pipeline error

interface Idea {
  id: string
  name: string
  type: string           // 'hover' | 'click' | 'scroll' | 'mount'
  category: string       // 'animation' | 'component' | 'template'
  tech: string[]
  complexity: string     // 'low' | 'medium' | 'high'
  feel: string           // free-text description of desired aesthetic
  enriched_spec?: EnrichedSpec
  status: IdeaStatus
  error_log?: string
  created_at?: string
  updated_at?: string
}

interface EnrichedSpec {
  name: string
  description: string
  seo_description: string
  animation_spec: AnimationSpec
  visual_spec: VisualSpec
  implementation_notes: string
  tags: string[]
  component_structure: string
  interactions: string[]
  tech: string[]
}

type LogStage = 'SYSTEM' | 'ENRICH' | 'GEN' | 'VALID' | 'FIX' | 'REPAIR' | 'INGEST' | 'DONE' | 'ERROR'
type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'system'

interface RunSession {
  id: string; startedAt: number; isRunning: boolean
  totalDone: number; totalFailed: number
  ideas: IdeaRunState[]; logs: LogEntry[]
}
```

### 9.2. `types/asset.ts`

```typescript
interface Asset {
  id: string; slug: string; name: string
  category: 'animation' | 'component' | 'template'
  type: string                // animation trigger type or 'component'
  code: string                // full React component source
  preview_html?: string       // pre-built sandbox HTML (stored in DB)
  description: string
  seo_description?: string
  tags: string[]
  tech: string[]
  complexity: 'low' | 'medium' | 'high'
  animation_spec?: AnimationSpec
  visual_spec?: VisualSpec
  is_pro: boolean
  is_published: boolean
  license: string             // typically 'owned'
  created_at: string
  upvotes?: number
}

interface AnimationSpec {
  trigger: 'hover' | 'click' | 'scroll' | 'mount' | 'continuous'
  entry: string     // description of entry animation
  active: string    // description of active/loop animation
  exit: string      // description of exit animation
  easing: string
  duration_ms: number
  spring?: { stiffness: number; damping: number }
}

interface VisualSpec {
  dark_mode: boolean
  color_approach: string
  typography?: string
  sizing?: string
}
```

---

## 10. Database Schema

### `ideas` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Component concept name |
| `type` | text | hover / click / scroll / mount |
| `category` | text | animation / component / template |
| `tech` | jsonb | string array |
| `complexity` | text | low / medium / high |
| `feel` | text | Free-text aesthetic description |
| `status` | text | IdeaStatus enum (see §9.1) |
| `enriched_spec` | jsonb | EnrichedSpec object, nullable |
| `generated_code` | text | Raw React component code, nullable |
| `error_log` | text | Last error message, nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `assets` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text UNIQUE | URL-safe, derived from name |
| `name` | text | |
| `category` | text | animation / component / template |
| `type` | text | animation trigger |
| `code` | text | React component source |
| `preview_html` | text | Pre-built sandbox HTML |
| `description` | text | |
| `seo_description` | text | nullable |
| `tags` | jsonb | string array |
| `tech` | jsonb | string array |
| `complexity` | text | low / medium / high |
| `animation_spec` | jsonb | AnimationSpec object |
| `visual_spec` | jsonb | VisualSpec object |
| `is_pro` | boolean | default false |
| `is_published` | boolean | default false |
| `license` | text | 'owned' |
| `views_count` | integer | default 0 |
| `copy_count` | integer | default 0 |
| `upvotes` | integer | default 0 |
| `embedding` | vector | pgvector for semantic search |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `asset_versions` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `asset_slug` | text FK → assets.slug | |
| `code` | text | Version snapshot |
| `created_at` | timestamptz | |

### `pipelines` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `model` | text | e.g. 'claude-3-5-sonnet-20240620' |
| `provider` | text | anthropic / gemini / groq / ollama |
| `system_prompt` | text | nullable — overrides default if set |
| `is_default` | boolean | One pipeline must be default |

### `pipeline_stages` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `pipeline_id` | uuid FK → pipelines.id | |
| `name` | text | 'Research' / 'Code Generation' / 'Self Correction' |
| `action_type` | text | enrich_spec / generate_code / validate_code |
| `provider` | text | |
| `model` | text | |
| `step_order` | integer | Execution order |

---

## 11. Settings Route

**File:** `app/(dashboard)/settings/page.tsx`  
**Rendering:** `'use client'`

### API Key Management

Four providers shown: Anthropic, OpenAI (Embeddings), Google Gemini, Groq.

```
On mount: GET /api/settings/keys
  → { ANTHROPIC_API_KEY: bool, OPENAI_API_KEY: bool, ... }
  → Renders "Configured" badge or input field

On save: POST /api/settings/keys { envKey, value }
  → Modifies .env.local
  → Updates local configuredKeys state
```

### Pipeline Config Editor

`<PipelineConfigsEditor />` — reads from `pipelines` + `pipeline_stages` tables via `/api/pipeline/configs`. Allows editing the default pipeline's model, provider, system prompt. Changes write back to DB.

---

## 12. Validation Engine

**File:** `lib/pipeline/generate.ts` — `validateCodeString()`

The static rule engine is the core quality gate. Rules by category:

### Structure
- Must contain `export default function`
- Code must not be empty
- Output appears non-truncated (has closing braces)

### Import Prohibitions
- No `import React` (React is a global in sandbox)
- No `import { ... } from 'react'`
- No `import { ... } from 'framer-motion'` (use `window.Motion`)
- No `import { gsap }` (use `window.GSAP`)

### Sandbox Constraints
- No `h-screen`, `min-h-screen`, `100vh`, `100dvh` (use inline styles)
- No arbitrary bracket values: `h-[400px]`, `w-[800px]`
- No template-literal classNames: `` className={`..${var}..`} ``
- No `window.addEventListener`, `document.addEventListener` (use `useRef`/React events)
- No `document.querySelector`, `document.getElementById`

### Framer Motion v11 API
- No `.onChange(` — must use `.on('change', cb)`
- Must extract symbols: `const { motion, ... } = window.Motion`
- `useMotionValue`, `useSpring`, `useTransform` from `window.Motion`
- No calling `.get()` inside JSX render expressions
- No passing `useState` values into `useSpring`/`useTransform`
- No arithmetic on MotionValues (use `useTransform`)

### React Hooks
- All hooks at top level only
- All `use*` functions extracted from `React` global (not imported)
- No conditional hook calls

### Component Safety
- No `icon1`, `icon2` placeholder class names — use inline SVG
- No hardcoded image paths (`profile.jpg`, `avatar.png`) — use props
- Nested interactive elements need `stopPropagation()`

---

## 13. Sandbox Architecture

The sandbox enables live previews of untrusted AI-generated code in the browser.

### How it works

```
Component code (React + Framer Motion JSX)
    ↓
buildSandboxHTML()                          [server-side, lib/preview/sandbox.ts]
    ↓
Standalone HTML document:
  - Tailwind CSS (CDN)
  - React 18 UMD (unpkg)
  - Framer Motion 11 UMD (unpkg)
  - GSAP 3 UMD (unpkg)
  - Babel Standalone (transpiles JSX in-browser)
  - Globals script (window.Motion, window.GSAP, React hooks, error display)
    ↓
<iframe srcdoc={html} />                    OR
<iframe src="/api/preview/compile?slug=X">  [loads HTML from API]
```

### Globals available to component code

```javascript
// React hooks (destructured from React global)
const { useState, useEffect, useRef, useCallback, useMemo, useReducer } = React

// Framer Motion (destructured from window.Motion)
const {
  motion, AnimatePresence, useMotionValue, useSpring, useTransform,
  useAnimation, useInView, useScroll, MotionConfig, LayoutGroup
} = window.Motion

// GSAP
const { gsap } = window  // or window.GSAP
```

### Why no imports

Generated components must use these globals instead of ES imports because:
1. The sandbox uses `<script type="text/babel">` — Babel Standalone transpiles JSX but cannot resolve module imports
2. The UMD builds expose everything as globals
3. This is enforced by the validation engine (`validateCodeString`)

### Framer Motion v11 compat polyfill

```javascript
// .onChange was removed in FM v11, many AI outputs still generate it
var proto = Object.getPrototypeOf(motionValue(0))
if (!proto.onChange && proto.on) {
  proto.onChange = function(cb) { return this.on('change', cb) }
}
```

---

## 14. End-to-End Generation Flow

```
┌─────────────┐
│  User       │ 1. Navigate to /pipeline/ideas
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  IdeasPage (CSR)            │ 2. Fill form: name, type, category,
│  /pipeline/ideas            │    complexity, tech, feel
└──────┬──────────────────────┘
       │ POST /api/pipeline/ideas
       ▼
┌─────────────────────────────┐
│  ideas table                │ 3. Row inserted, status='pending'
│  (Supabase)                 │
└─────────────────────────────┘

       ▼ User navigates to /pipeline/generate

┌─────────────────────────────┐
│  GeneratePage (CSR)         │ 4. Loads pending/enriched ideas
│  /pipeline/generate         │    GET /api/pipeline/ideas?status=pending,enriched
└──────┬──────────────────────┘
       │ User selects ideas, clicks "Generate"
       │ handleRunSelected()
       │
       │ POST /api/pipeline/generate { ideaId }
       ▼
┌─────────────────────────────┐
│  /api/pipeline/generate     │ 5. Opens SSE stream
│  (route handler)            │    Reads default pipeline config from DB
└──────┬──────────────────────┘
       │
       │ STAGE 1: enrich_spec
       │   enrichIdea(idea, config)         [lib/pipeline/generate.ts]
       │     → enrichWithClaude(ideaJson)   [lib/ai/anthropic.ts]
       │     → extractJson() → JSON.parse() → EnrichedSpec
       │   UPDATE ideas SET status='enriched', enriched_spec=spec
       │   SSE: { event: 'enriched', spec }
       │
       │ STAGE 2: generate_code
       │   generateCode(spec, config)
       │     → generateWithClaude(specJson)
       │     → cleanCodeOutput() → raw component code
       │   UPDATE ideas SET status='generated'
       │   SSE: { event: 'generated', code }
       │
       │ STAGE 3: validate_code
       │   validateAndFix(code, config, specJson, maxAttempts=3)
       │     loop:
       │       autoFixCode()                [mechanical transforms]
       │       validateCodeString()         [100+ static rules]
       │       if ok: validateWithClaude()  [AI semantic check]
       │       if issues: fixWithClaude()   [AI repair]
       │       repeat up to 3×
       │   UPDATE ideas SET status='validated'
       │   SSE: { event: 'validated', code, validation_report }
       │
       │ Determine final status:
       │   has_errors=true        → 'repair_required'
       │   report=PASS_WITH_WARN → 'ready_with_warnings'
       │   report=PASS / none     → 'ready'
       │
       │   UPDATE ideas SET status=reviewStatus, generated_code=code
       │   SSE: { event: 'ready' | 'repair_required' }
       ▼
┌─────────────────────────────┐
│  GeneratePage               │ 6. SSE events update progress bars
│  (live log terminal)        │    and terminal log in real-time
└─────────────────────────────┘

       ▼ User navigates to /pipeline/review

┌─────────────────────────────┐
│  ReviewPage (CSR)           │ 7. Loads review queue
│  /pipeline/review           │    GET /api/pipeline/ideas?status=reviewing,
│                             │        validated,generated,failed
└──────┬──────────────────────┘
       │
       │ User clicks item → iframe preview loads
       │   <iframe src="/api/preview/compile?slug={id}">
       │   buildSandboxHTML(code) → full HTML document
       │   Babel transpiles JSX in-browser → component renders live
       │
       │ User clicks "Approve"
       │   POST /api/pipeline/ingest { code, spec, ideaId }
       ▼
┌─────────────────────────────┐
│  ingestAsset()              │ 8. Generate slug from spec.name
│  lib/pipeline/ingest.ts     │    Create OpenAI embedding (optional)
│                             │    buildSandboxHTML(code) → preview_html
│                             │    UPSERT assets (conflict on slug)
│                             │    INSERT asset_versions
│                             │    UPDATE ideas SET status='approved'
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  assets table               │ 9. Component is live at /asset/{slug}
│  is_published=true          │    Appears in public gallery /components
└─────────────────────────────┘
```

---

## 15. Build From Scratch

### Recommended Tech Stack

Based on what was found:

```
Next.js 15+ (App Router)
React 18+ (not 19 — avoid experimental APIs until stable)
TypeScript 5 (strict mode)
Tailwind CSS 4
Framer Motion 11 (use UMD build in sandbox — v11 has breaking API changes vs v10)
Supabase (PostgreSQL + pgvector extension for embeddings)
Anthropic Claude claude-3-5-sonnet API (primary)
OpenAI text-embedding-3-small (for semantic search — optional)
```

### Build Order

Build in this dependency order to avoid circular blockers:

```
Phase 1 — Foundation
  1. Supabase project: create tables (ideas, assets, asset_versions, pipelines, pipeline_stages)
     Enable pgvector extension for embeddings
  2. lib/db/supabase.ts — singleton client
  3. types/pipeline.ts, types/asset.ts — all type definitions
  4. middleware.ts — Supabase SSR session refresh

Phase 2 — AI + Pipeline Core
  5. lib/ai/anthropic.ts — enrich, generate, validate, fix, reflect
  6. lib/pipeline/prompts.ts — all prompt templates (CODE_GEN_SYSTEM_PROMPT is critical)
  7. lib/pipeline/generate.ts — enrichIdea, generateCode, validateAndFix, autoFixCode, validateCodeString
  8. lib/preview/sandbox.ts — buildSandboxHTML
  9. lib/pipeline/ingest.ts — ingestAsset (depends on sandbox + DB)

Phase 3 — API Routes
  10. /api/pipeline/ideas — CRUD
  11. /api/pipeline/generate — SSE stream (depends on lib/pipeline/generate.ts)
  12. /api/pipeline/ingest — publish (depends on lib/pipeline/ingest.ts)
  13. /api/pipeline/inventory — list/delete published assets
  14. /api/preview/compile — sandbox HTML generation
  15. /api/settings/keys — .env.local reader/writer

Phase 4 — Dashboard UI
  16. components/layout/DashboardShell.tsx — sidebar + main area
  17. components/dashboard/DashboardPageFrame.tsx — page header pattern
  18. components/ui/* — Button, Badge, Input, Reveal, EmptyState, Toast
  19. lib/db/assets.ts — getDashboardData() and all asset queries
  20. Dashboard page — server component, wire getDashboardData()
  21. Dashboard widgets — HeroWidget, PipelineFunnelWidget, AnalyticsWidget, ActivityFeedWidget

Phase 5 — Pipeline UI
  22. Pipeline index page (static nav cards)
  23. Ideas page — form, list, enrichment trigger, StageStrip
  24. Generate page — queue table, SSE consumer, log terminal
  25. Review page — review queue, iframe preview, approve/reject
  26. Inventory page — published assets table, delete
  27. Settings page — API key management, PipelineConfigsEditor

Phase 6 — Public Routes
  28. Public shell + landing page
  29. /components gallery
  30. /asset/[slug] detail page
```

### Critical Gotchas

#### 1. The sandbox requires a specific globals contract
Every generated component MUST use globals (`window.Motion`, `React`, `window.GSAP`) instead of imports. This is enforced by `validateCodeString` but also hardcoded into the system prompt (`CODE_GEN_SYSTEM_PROMPT`). If you change the sandbox HTML structure, update the prompt and validation rules to match.

#### 2. Framer Motion v11 breaking changes
FM v11 removed `.onChange()`. The sandbox polyfills it back, and `autoFixCode()` transforms it mechanically. AI still generates `.onChange()` frequently — do not remove this polyfill.

#### 3. `export default` must be stripped before Babel transpilation
`buildSandboxHTML` replaces `export default function Foo` with `function Foo`. This is required because Babel Standalone in script mode doesn't handle ES module exports. The function name is extracted separately to create the `ReactDOM.createRoot().render(<FunctionName />)` call.

#### 4. Slug generation is upsert-based
`ingestAsset` uses `upsert` with `onConflict: 'slug'`. Re-running generation on the same spec name **overwrites** the published asset silently. This is intentional (continuous improvement workflow) but means the same idea published twice replaces rather than versions the public asset.

#### 5. Middleware has no auth enforcement
The middleware refreshes sessions but does **not** redirect unauthenticated users away from dashboard routes. If you need authentication, add redirect logic in middleware after `supabase.auth.getUser()`.

#### 6. `sessionRef` pattern in GeneratePage
The generate page uses both `useState` (for React re-renders) and `useRef` (for async access inside the fetch loop). The pattern `updateSession(prev => ...)` + `sessionRef.current = next` keeps both in sync. This is necessary because async callbacks capture stale closure values.

#### 7. Ideas load filter on Review page
The review page fetches `status=reviewing,validated,generated,failed`. Note that after the generate route runs, ideas end up with status `ready`, `ready_with_warnings`, or `repair_required` — **not** `reviewing` or `validated`. The filter here may miss newly generated items if their status doesn't match. Verify the status filter matches what the generate route actually writes.

#### 8. `getPublishedAssets` has no `is_published` filter
```typescript
export async function getPublishedAssets(limit = 20, offset = 0): Promise<Asset[]> {
  const { data } = await supabase.from('assets').select('*')
    .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  // ⚠️ No .eq('is_published', true) — returns ALL assets regardless of publish status
}
```
Use `getLandingAssets()` for public-facing asset fetches which correctly filters `is_published=true`.

#### 9. Pipeline config fallback
If no pipeline exists in the `pipelines` table with `is_default=true`, the generate route falls back to hardcoded Claude 3.5 Sonnet stages. This means the system works out-of-the-box without DB pipeline config, but the Settings page pipeline editor won't reflect it until you insert a row.

#### 10. `getDashboardData()` aggregates in JavaScript, not SQL
Funnel counts iterate all idea rows in memory rather than using `COUNT(*)` with `WHERE status IN (...)`. This works at small scale but will be slow at thousands of ideas. A rebuild should use SQL aggregation with `GROUP BY status`.

---

## 16. Critical Summary

- **The generation pipeline is a sequential 3-stage loop** (Enrich → Generate → Validate) driven by a configurable `pipeline_stages` table. All three stages use the same provider/model dispatched through `lib/pipeline/generate.ts`. The entire flow streams back to the client over SSE — the client UI updates in real time from these events.

- **The sandbox is the security and compatibility boundary** — all component code runs in a `<iframe>` with Babel Standalone transpiling JSX in-browser. Components MUST use globals (`window.Motion`, `React`) instead of imports. The 100+ rule `validateCodeString()` enforces this contract mechanically before any AI code reaches a user's browser.

- **Ideas and Assets are separate tables with separate lifecycles.** The `ideas` table tracks the pipeline progression state machine. The `assets` table is the published inventory. `ingestAsset()` is the one-way bridge — it copies generated code from ideas into assets and sets `is_published=true`. There is no bidirectional sync.

- **Auth is wired but not enforced.** The Supabase SSR middleware refreshes sessions but contains no route protection. The comment in middleware.ts explicitly grants unrestricted local access. Any rebuild for production must add redirect logic.

- **The dashboard home page is 100% server-rendered** — a single `getDashboardData()` call (5 parallel Supabase queries) feeds all four widgets. There is no client state, no loading skeleton, and no re-fetching. All pipeline sub-pages (`/pipeline/*`) are fully client-rendered with `'use client'` and fetch data on mount via `useEffect`.
