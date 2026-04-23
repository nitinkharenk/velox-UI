# Dashboard Redesign — Design Spec

**Date:** 2026-04-09  
**Status:** Approved, ready for implementation

---

## 1. Problem

The current `/dashboard` page (`app/(dashboard)/dashboard/page.tsx`) shows generic productivity widgets (to-do list, time tracker, activity rings) that have no relation to the VeloxUI product. It does not communicate pipeline state, published component counts, or content performance. It fails its job as the command centre for the platform.

---

## 2. Goal

Replace the dashboard with a **Hybrid Overview** page that gives the operator an accurate, at-a-glance picture of:

- How many components are published and trending
- Where work is sitting in the AI-assisted pipeline
- Key content performance metrics
- What changed recently

---

## 3. Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Dashboard type | Hybrid Overview | Shows both pipeline state and library performance without deep-diving into either |
| Theme | Light + dark, driven by existing toggle | CSS variable system already supports both; no extra work needed |
| Layout | Hero full-width, pipeline + analytics/activity in two columns | Classic top-to-bottom read order; pipeline gets more horizontal space |
| Motion | Subtle only | Fade-in on load, hover states, smooth transitions — no theatrical entrance animations |
| Data strategy | Server-rendered async server component | Accurate on load; no client polling complexity; consistent with other pages |

---

## 4. Layout

```
┌──────────────────────────────────────────────────────┐
│  HERO WIDGET                                         │  full width
│  Published count · weekly delta · 3 stat pills      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌────────────────────────┐
│  PIPELINE FUNNEL         │  │  ANALYTICS (2×2 grid)  │
│  (≈60% width)            │  │  views / copies /      │
│                          │  │  upvotes / pro count   │
│  Ideas        12  ████░  ├──┤────────────────────────┤
│  Enriched      5  ███░░  │  │  ACTIVITY FEED         │
│  Generating    3  ██░░░  │  │  5 most recent events  │
│  Review        8  ████░  │  │  from assets + ideas   │
│  Published    94  █████  │  │                        │
└──────────────────────────┘  └────────────────────────┘
```

Column split: `lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]` — pipeline takes 60%, right column 40%.

---

## 5. Widgets

### 5.1 Hero Widget

**File:** `components/dashboard/widgets/HeroWidget.tsx` (server component)

**Content:**
- Large published component count (e.g. `94`) in `--text-primary`, `text-5xl font-bold`
- Label: "published components" in `--text-tertiary`
- Weekly delta badge: `+12 this week` in `--velox-sage` / `--accent-secondary-dim`
- Three secondary pills in a row:
  - In review count → links to `/pipeline/review`
  - Total views (lifetime) formatted as `48K`
  - Total copies formatted as `3.2K`
- Right side: a subtle Velox rose accent — a thin vertical bar or circular progress ring showing publish rate (published / (published + in_review))

**Data props:**
```ts
{
  publishedCount: number
  weeklyDelta: number
  inReviewCount: number
  totalViews: number
  totalCopies: number
}
```

---

### 5.2 Pipeline Funnel Widget

**File:** `components/dashboard/widgets/PipelineFunnelWidget.tsx` (server component)

**Content:**
- Section label: "Production Pipeline"
- Five stage rows, each containing:
  - Stage label (Ideas, Enriched, Generating, Review, Published)
  - Count number
  - Proportional fill bar (width = count / max_count across all stages)
  - Each row is a `<Link>` to the relevant pipeline page
- Stage accent colours consistent with the existing pipeline page:
  - Ideas → `--info` blue
  - Enriched → violet `#a78bfa`
  - Generating → `--warning` amber
  - Review → `--accent` rose
  - Published → `--success` sage

**Data props:**
```ts
{
  stages: {
    ideas: number
    enriched: number
    generating: number
    review: number
    published: number
  }
}
```

**Interaction:** Each stage row shows a `→` arrow on hover and links to its stage page. No client JS needed.

---

### 5.3 Analytics Widget

**File:** `components/dashboard/widgets/AnalyticsWidget.tsx` (server component)

**Content:**
- Section label: "Library Performance"
- 2×2 grid of stat tiles:
  - Total views (formatted: `48K`)
  - Total copies (`3.2K`)
  - Total upvotes (`1.8K`)
  - Pro components count
- Each tile: large number in `--text-primary`, label in `--text-tertiary`
- No deltas in v1 (adds complexity without clear value yet)

**Data props:**
```ts
{
  totalViews: number
  totalCopies: number
  totalUpvotes: number
  proCount: number
}
```

---

### 5.4 Activity Feed Widget

**File:** `components/dashboard/widgets/ActivityFeedWidget.tsx` (server component)

**Content:**
- Section label: "Recent Activity"
- 5–6 rows, newest first, drawn from:
  - Recently published assets (`assets` ordered by `updated_at DESC` where `is_published = true`)
  - Currently generating/in-review ideas (`ideas` ordered by `updated_at DESC` where status IN ('generating', 'review'))
- Each row:
  - Colour-coded dot (green = published, blue = in-review, amber = generating)
  - Asset/idea name (truncated)
  - Relative timestamp (`2m ago`, `1h ago`)
- Bottom: "View all →" link to `/pipeline`

**Data props:**
```ts
{
  events: Array<{
    name: string
    status: 'published' | 'review' | 'generating' | 'enriched'
    updatedAt: string
  }>
}
```

---

## 6. Data Fetching

**File:** `app/(dashboard)/dashboard/page.tsx` — async server component

Four parallel Supabase queries using `Promise.all`:

```ts
const [assetsStats, weeklyNew, ideaStages, recentActivity] = await Promise.all([
  // 1. Aggregate stats from published assets
  supabase
    .from('assets')
    .select('views_count, copy_count, upvotes, is_pro')
    .eq('is_published', true),

  // 2. Weekly published delta
  supabase
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),

  // 3. Idea counts by status
  supabase
    .from('ideas')
    .select('status'),

  // 4. Recent activity (published assets + active ideas)
  Promise.all([
    supabase.from('assets').select('name, updated_at').eq('is_published', true)
      .order('updated_at', { ascending: false }).limit(3),
    supabase.from('ideas').select('name, status, updated_at')
      .in('status', ['generating', 'review', 'enriched'])
      .order('updated_at', { ascending: false }).limit(3),
  ])
])
```

All aggregation (summing views, grouping idea statuses) happens in JS after the queries, not in Supabase RPC calls — keeps it simple and avoids RPC maintenance.

---

## 7. Styling

- Uses existing design tokens from `globals.css` — no new CSS variables
- Widget card style: `surface-panel` class already used in pipeline pages, or equivalent (`bg-[--bg-elevated] border border-[--border-default] rounded-[1.8rem]`)
- Dark mode: automatic via `[data-theme='dark']` CSS vars — no conditional class logic needed in components
- Typography: `--font-heading` (Clash Display) for the hero number, `--font-body` (Satoshi) everywhere else
- Spacing: consistent `p-6` card padding, `gap-6` grid gaps

---

## 8. Files Changed

| File | Change |
|---|---|
| `app/(dashboard)/dashboard/page.tsx` | Full rewrite — async server component with data fetching |
| `components/dashboard/widgets/HeroWidget.tsx` | New file |
| `components/dashboard/widgets/PipelineFunnelWidget.tsx` | New file |
| `components/dashboard/widgets/AnalyticsWidget.tsx` | New file |
| `components/dashboard/widgets/ActivityFeedWidget.tsx` | New file |

No changes to the shell (`DashboardShell`, `Sidebar`, `Topbar`), design tokens, or any other page.

---

## 9. Out of Scope

- Sparkline/chart rendering (no charting library)
- Real-time updates / polling
- Notifications or alerts
- Mobile-specific layout adjustments beyond what Tailwind responsive prefixes handle automatically
