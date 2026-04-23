# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic placeholder dashboard at `/dashboard` with a real Hybrid Overview page showing published component counts, pipeline stage funnel, analytics metrics, and a recent activity feed — all server-rendered from Supabase.

**Architecture:** Async server component page fetches 4 parallel Supabase queries, aggregates in JS, and passes plain data props to four focused widget server components. No client JS, no polling, no API routes. Both light and dark themes work automatically via the existing CSS variable system.

**Tech Stack:** Next.js 16 App Router (async server components), Supabase JS client (`lib/db/supabase.ts`), Tailwind CSS 4 + CSS custom properties, Lucide React icons, existing `surface-panel` / `surface-panel-elevated` CSS classes.

**Spec:** `docs/superpowers/specs/2026-04-09-dashboard-redesign.md`

---

## File Map

| File | Change |
|---|---|
| `lib/db/assets.ts` | Add `getDashboardData()` at the bottom |
| `components/dashboard/widgets/HeroWidget.tsx` | New file |
| `components/dashboard/widgets/PipelineFunnelWidget.tsx` | New file |
| `components/dashboard/widgets/AnalyticsWidget.tsx` | New file |
| `components/dashboard/widgets/ActivityFeedWidget.tsx` | New file |
| `app/(dashboard)/dashboard/page.tsx` | Full rewrite |
| `tests/dashboard.spec.ts` | New Playwright smoke test |

---

## Task 1: Read Next.js 16 server component conventions

**AGENTS.md requires this step before writing any Next.js code.**

- [ ] **Step 1.1: Read the App Router server components guide**

```bash
cat "node_modules/next/dist/docs/app/building-your-application/rendering/server-components.md" 2>/dev/null \
  || ls node_modules/next/dist/docs/ 2>/dev/null \
  || echo "docs not present — check next/dist for relevant patterns"
```

- [ ] **Step 1.2: Note any breaking changes relevant to async server components and parallel data fetching in Next 16**

Look specifically for: how `async` page components are declared, whether `cache()` from React is still the right primitive for deduplication, and any changes to how `Promise.all` is used inside server components.

- [ ] **Step 1.3: Check existing async server component pattern in this codebase**

```bash
grep -r "async function" app/ --include="*.tsx" -l
```

Open one of those files to confirm the pattern in use (no `"use client"` directive, plain `async function`, direct Supabase import).

---

## Task 2: Add `getDashboardData` to `lib/db/assets.ts`

**Files:**
- Modify: `lib/db/assets.ts`

This keeps all Supabase access in one place, consistent with the existing `getAssetBySlug`, `getPublishedAssets` pattern.

- [ ] **Step 2.1: Define the return type and add the function**

Append to the bottom of `lib/db/assets.ts`:

```ts
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

    // 5. 4 most recently active ideas (in-flight statuses) for activity feed
    supabase
      .from('ideas')
      .select('name, status, updated_at')
      .in('status', ['generating', 'generated', 'validating', 'validated',
                     'repair_required', 'ready_with_warnings', 'reviewing', 'approved', 'enriched', 'enriching'])
      .order('updated_at', { ascending: false })
      .limit(4),
  ])

  // --- Aggregate asset stats ---
  type AssetStat = { views_count: number | null; copy_count: number | null; upvotes: number | null; is_pro: boolean }
  const rows = (assetRows ?? []) as AssetStat[]

  const publishedCount = rows.length
  const totalViews = rows.reduce((s, r) => s + (r.views_count ?? 0), 0)
  const totalCopies = rows.reduce((s, r) => s + (r.copy_count ?? 0), 0)
  const totalUpvotes = rows.reduce((s, r) => s + (r.upvotes ?? 0), 0)
  const proCount = rows.filter(r => r.is_pro).length

  // --- Funnel stage counts from ideas ---
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

  // --- Merge activity feed ---
  type ActivityEvent = { name: string; status: 'published' | 'review' | 'generating' | 'enriched'; updatedAt: string }

  const activity: ActivityEvent[] = [
    ...(recentAssets ?? []).map(a => ({
      name: a.name as string,
      status: 'published' as const,
      updatedAt: a.updated_at as string,
    })),
    ...(recentIdeas ?? []).map(i => {
      const ideaRow = i as { name: string; status: string; updated_at: string }
      let status: ActivityEvent['status'] = 'enriched'
      if (IDEA_STAGES.review.includes(ideaRow.status)) status = 'review'
      else if (IDEA_STAGES.generating.includes(ideaRow.status)) status = 'generating'
      return { name: ideaRow.name, status, updatedAt: ideaRow.updated_at }
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
```

- [ ] **Step 2.2: Verify TypeScript compiles**

```bash
cd /Users/nitinkhare/Documents/awwwards/animation-library && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `lib/db/assets.ts`. Fix any type errors before continuing.

- [ ] **Step 2.3: Commit**

```bash
git add lib/db/assets.ts
git commit -m "feat(db): add getDashboardData for overview page"
```

---

## Task 3: Build `HeroWidget.tsx`

**Files:**
- Create: `components/dashboard/widgets/HeroWidget.tsx`

Full-width card at the top of the dashboard. Shows published count, weekly delta, and three secondary stat pills.

- [ ] **Step 3.1: Create the file**

```tsx
// components/dashboard/widgets/HeroWidget.tsx
import Link from 'next/link'

interface HeroWidgetProps {
  publishedCount: number
  weeklyDelta: number
  inReviewCount: number
  totalViews: number
  totalCopies: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function HeroWidget({
  publishedCount,
  weeklyDelta,
  inReviewCount,
  totalViews,
  totalCopies,
}: HeroWidgetProps) {
  // Arc ring: treat published as 75% of some target (purely decorative)
  const pct = Math.min(publishedCount / Math.max(publishedCount + inReviewCount, 1), 1)
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct * 0.75)

  return (
    <div className="surface-panel-elevated rounded-[1.8rem] p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

        {/* Left: headline stat */}
        <div className="flex items-end gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[--text-tertiary]">
              Overview
            </p>
            <p className="mt-1 font-display text-[clamp(3.5rem,7vw,5.5rem)] font-bold leading-none tracking-[-0.04em] text-[--text-primary]">
              {publishedCount.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-[--text-secondary]">published components</p>
          </div>

          {weeklyDelta > 0 && (
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[--accent-secondary-dim] px-3 py-1 text-xs font-semibold text-[--accent-secondary-text]">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                <path d="M5 8V2M5 2L2 5M5 2L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              +{weeklyDelta} this week
            </span>
          )}
        </div>

        {/* Right: arc ring + stat pills */}
        <div className="flex flex-col items-start gap-5 sm:items-end">
          {/* Decorative arc ring */}
          <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden className="hidden sm:block">
            <circle
              cx="44" cy="44" r={r}
              fill="none"
              stroke="var(--border-default)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle
              cx="44" cy="44" r={r}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 44 44)"
            />
            <text
              x="44" y="44"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fontWeight="700"
              fill="var(--text-primary)"
            >
              {Math.round(pct * 100)}%
            </text>
          </svg>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/pipeline/review"
              className="inline-flex items-center gap-1.5 rounded-full border border-[--accent-border] bg-[--accent-dim] px-3 py-1.5 text-xs font-semibold text-[--accent-text] transition-colors hover:bg-[--accent-dim]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[--accent]" />
              {inReviewCount} in review
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[--border-default] bg-[--bg-soft] px-3 py-1.5 text-xs font-semibold text-[--text-secondary]">
              {fmt(totalViews)} views
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[--border-default] bg-[--bg-soft] px-3 py-1.5 text-xs font-semibold text-[--text-secondary]">
              {fmt(totalCopies)} copies
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 3.2: Type-check**

```bash
cd /Users/nitinkhare/Documents/awwwards/animation-library && npx tsc --noEmit 2>&1 | grep "HeroWidget" | head -10
```

Expected: no output (no errors).

- [ ] **Step 3.3: Commit**

```bash
git add components/dashboard/widgets/HeroWidget.tsx
git commit -m "feat(dashboard): add HeroWidget"
```

---

## Task 4: Build `PipelineFunnelWidget.tsx`

**Files:**
- Create: `components/dashboard/widgets/PipelineFunnelWidget.tsx`

Shows each pipeline stage as a labelled row with a proportional fill bar. Each row links to its stage page.

- [ ] **Step 4.1: Create the file**

```tsx
// components/dashboard/widgets/PipelineFunnelWidget.tsx
import Link from 'next/link'

interface Stages {
  ideas: number
  enriched: number
  generating: number
  review: number
  published: number
}

interface PipelineFunnelWidgetProps {
  stages: Stages
}

const STAGE_CONFIG = [
  { key: 'ideas' as const,      label: 'Ideas',      href: '/pipeline/ideas',    color: 'var(--info)',    colorDim: 'var(--info-dim)' },
  { key: 'enriched' as const,   label: 'Enriched',   href: '/pipeline/ideas',    color: '#a78bfa',        colorDim: 'rgba(167,139,250,0.12)' },
  { key: 'generating' as const, label: 'Generating', href: '/pipeline/generate', color: 'var(--warning)', colorDim: 'var(--warning-dim)' },
  { key: 'review' as const,     label: 'Review',     href: '/pipeline/review',   color: 'var(--accent)',  colorDim: 'var(--accent-dim)' },
  { key: 'published' as const,  label: 'Published',  href: '/pipeline/inventory',color: 'var(--success)', colorDim: 'var(--success-dim)' },
]

export default function PipelineFunnelWidget({ stages }: PipelineFunnelWidgetProps) {
  const max = Math.max(...Object.values(stages), 1)

  return (
    <div className="surface-panel flex h-full flex-col rounded-[1.8rem] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[--text-tertiary]">
        Production Pipeline
      </p>

      <div className="mt-5 flex flex-1 flex-col justify-around gap-1">
        {STAGE_CONFIG.map(({ key, label, href, color, colorDim }) => {
          const count = stages[key]
          const pct = (count / max) * 100

          return (
            <Link
              key={key}
              href={href}
              className="group flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-[--bg-hover]"
            >
              {/* Colour dot */}
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: color }}
              />

              {/* Label */}
              <span className="w-24 shrink-0 text-sm font-medium text-[--text-secondary] group-hover:text-[--text-primary]">
                {label}
              </span>

              {/* Bar */}
              <div className="flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-soft)', height: '6px' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color, minWidth: count > 0 ? '6px' : '0' }}
                />
              </div>

              {/* Count */}
              <span
                className="w-8 shrink-0 rounded-md px-1.5 py-0.5 text-center text-xs font-bold"
                style={{ background: colorDim, color }}
              >
                {count}
              </span>

              {/* Arrow */}
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
              >
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Type-check**

```bash
cd /Users/nitinkhare/Documents/awwwards/animation-library && npx tsc --noEmit 2>&1 | grep "PipelineFunnelWidget" | head -10
```

Expected: no output.

- [ ] **Step 4.3: Commit**

```bash
git add components/dashboard/widgets/PipelineFunnelWidget.tsx
git commit -m "feat(dashboard): add PipelineFunnelWidget"
```

---

## Task 5: Build `AnalyticsWidget.tsx`

**Files:**
- Create: `components/dashboard/widgets/AnalyticsWidget.tsx`

2×2 grid of key library performance stats.

- [ ] **Step 5.1: Create the file**

```tsx
// components/dashboard/widgets/AnalyticsWidget.tsx
import { Eye, Copy, ThumbsUp, Star } from 'lucide-react'

interface AnalyticsWidgetProps {
  totalViews: number
  totalCopies: number
  totalUpvotes: number
  proCount: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const STATS = (p: AnalyticsWidgetProps) => [
  { icon: Eye,       label: 'Total views',   value: fmt(p.totalViews),   color: 'var(--info)',    dim: 'var(--info-dim)' },
  { icon: Copy,      label: 'Code copies',   value: fmt(p.totalCopies),  color: 'var(--warning)', dim: 'var(--warning-dim)' },
  { icon: ThumbsUp,  label: 'Upvotes',       value: fmt(p.totalUpvotes), color: 'var(--accent)',  dim: 'var(--accent-dim)' },
  { icon: Star,      label: 'Pro components',value: String(p.proCount),  color: 'var(--success)', dim: 'var(--success-dim)' },
]

export default function AnalyticsWidget(props: AnalyticsWidgetProps) {
  const stats = STATS(props)

  return (
    <div className="surface-panel rounded-[1.8rem] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[--text-tertiary]">
        Library Performance
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map(({ icon: Icon, label, value, color, dim }) => (
          <div
            key={label}
            className="flex flex-col gap-2 rounded-xl p-4"
            style={{ background: dim }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color }} />
            </span>
            <p className="font-display text-2xl font-bold leading-none tracking-tight text-[--text-primary]">
              {value}
            </p>
            <p className="text-[11px] text-[--text-tertiary]">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5.2: Type-check**

```bash
cd /Users/nitinkhare/Documents/awwwards/animation-library && npx tsc --noEmit 2>&1 | grep "AnalyticsWidget" | head -10
```

Expected: no output.

- [ ] **Step 5.3: Commit**

```bash
git add components/dashboard/widgets/AnalyticsWidget.tsx
git commit -m "feat(dashboard): add AnalyticsWidget"
```

---

## Task 6: Build `ActivityFeedWidget.tsx`

**Files:**
- Create: `components/dashboard/widgets/ActivityFeedWidget.tsx`

Shows the 6 most recent pipeline events — published assets and in-flight ideas — with colour-coded dots and relative timestamps.

- [ ] **Step 6.1: Create the file**

```tsx
// components/dashboard/widgets/ActivityFeedWidget.tsx
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface ActivityEvent {
  name: string
  status: 'published' | 'review' | 'generating' | 'enriched'
  updatedAt: string
}

interface ActivityFeedWidgetProps {
  events: ActivityEvent[]
}

function rel(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return `${d}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

const STATUS_META: Record<ActivityEvent['status'], { label: string; color: string }> = {
  published:  { label: 'Published',  color: 'var(--success)' },
  review:     { label: 'In review',  color: 'var(--accent)' },
  generating: { label: 'Generating', color: 'var(--warning)' },
  enriched:   { label: 'Enriched',   color: 'var(--info)' },
}

export default function ActivityFeedWidget({ events }: ActivityFeedWidgetProps) {
  return (
    <div className="surface-panel flex flex-col rounded-[1.8rem] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[--text-tertiary]">
        Recent Activity
      </p>

      <div className="mt-4 flex-1">
        {events.length === 0 ? (
          <p className="text-sm text-[--text-tertiary]">No recent activity.</p>
        ) : (
          <ul className="divide-y divide-[--border-subtle]">
            {events.map((evt, i) => {
              const meta = STATUS_META[evt.status]
              return (
                <li key={i} className="flex items-center gap-3 py-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: meta.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[--text-primary]">
                    {evt.name}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}
                  >
                    {meta.label}
                  </span>
                  <span className="w-12 shrink-0 text-right text-[11px] text-[--text-tertiary]">
                    {rel(evt.updatedAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Link
        href="/pipeline"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[--text-tertiary] transition-colors hover:text-[--text-primary]"
      >
        View all pipeline activity
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
```

- [ ] **Step 6.2: Type-check**

```bash
cd /Users/nitinkhare/Documents/awwwards/animation-library && npx tsc --noEmit 2>&1 | grep "ActivityFeedWidget" | head -10
```

Expected: no output.

- [ ] **Step 6.3: Commit**

```bash
git add components/dashboard/widgets/ActivityFeedWidget.tsx
git commit -m "feat(dashboard): add ActivityFeedWidget"
```

---

## Task 7: Rewrite `app/(dashboard)/dashboard/page.tsx`

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

This replaces the entire file. It is an async server component — no `"use client"` directive.

- [ ] **Step 7.1: Read the current file to confirm what's being replaced**

```bash
wc -l app/(dashboard)/dashboard/page.tsx
```

The current file is ~220 lines of generic productivity widgets. We are replacing it entirely.

- [ ] **Step 7.2: Write the new file**

```tsx
// app/(dashboard)/dashboard/page.tsx
import { getDashboardData } from '@/lib/db/assets'
import HeroWidget from '@/components/dashboard/widgets/HeroWidget'
import PipelineFunnelWidget from '@/components/dashboard/widgets/PipelineFunnelWidget'
import AnalyticsWidget from '@/components/dashboard/widgets/AnalyticsWidget'
import ActivityFeedWidget from '@/components/dashboard/widgets/ActivityFeedWidget'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 animate-[fadeIn_0.35s_ease_forwards]">

      {/* Hero — full width */}
      <HeroWidget
        publishedCount={data.publishedCount}
        weeklyDelta={data.weeklyDelta}
        inReviewCount={data.inReviewCount}
        totalViews={data.totalViews}
        totalCopies={data.totalCopies}
      />

      {/* Two-column section */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">

        {/* Left: pipeline funnel */}
        <PipelineFunnelWidget stages={data.stages} />

        {/* Right: analytics + activity stacked */}
        <div className="flex flex-col gap-6">
          <AnalyticsWidget
            totalViews={data.totalViews}
            totalCopies={data.totalCopies}
            totalUpvotes={data.totalUpvotes}
            proCount={data.proCount}
          />
          <ActivityFeedWidget events={data.recentActivity} />
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 7.3: Type-check the full project**

```bash
cd /Users/nitinkhare/Documents/awwwards/animation-library && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors. Fix any before continuing.

- [ ] **Step 7.4: Run the dev server and open /dashboard**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` in a browser. Verify:
- Hero widget renders with a number (may be 0 if Supabase is empty — that's fine)
- Pipeline funnel shows 5 stage rows
- Analytics shows a 2×2 grid
- Activity feed shows rows or "No recent activity"
- Toggle the dark/light theme button in the Topbar — both modes look correct

- [ ] **Step 7.5: Commit**

```bash
git add app/(dashboard)/dashboard/page.tsx
git commit -m "feat(dashboard): replace placeholder with Hybrid Overview"
```

---

## Task 8: Playwright smoke test

**Files:**
- Create: `tests/dashboard.spec.ts`

Verifies the page loads and key sections render. Runs against the dev server (configured in `playwright.config.ts`).

- [ ] **Step 8.1: Write the test**

```ts
// tests/dashboard.spec.ts
import { test, expect } from '@playwright/test'

// Note: if /dashboard redirects to /login due to auth middleware,
// set SKIP_AUTH=true in .env.local or add a cookie-based bypass here.
// The test below assumes the dev server allows unauthenticated access
// or that auth is bypassed in the test environment.

test.describe('Dashboard overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('renders the hero widget', async ({ page }) => {
    // The "Overview" eyebrow label
    await expect(page.getByText('Overview')).toBeVisible()
    // "published components" label exists
    await expect(page.getByText('published components')).toBeVisible()
  })

  test('renders the pipeline funnel with all stages', async ({ page }) => {
    await expect(page.getByText('Production Pipeline')).toBeVisible()
    for (const label of ['Ideas', 'Enriched', 'Generating', 'Review', 'Published']) {
      await expect(page.getByText(label)).toBeVisible()
    }
  })

  test('renders the analytics widget', async ({ page }) => {
    await expect(page.getByText('Library Performance')).toBeVisible()
    await expect(page.getByText('Total views')).toBeVisible()
    await expect(page.getByText('Code copies')).toBeVisible()
    await expect(page.getByText('Upvotes')).toBeVisible()
    await expect(page.getByText('Pro components')).toBeVisible()
  })

  test('renders the activity feed', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible()
    await expect(page.getByText('View all pipeline activity')).toBeVisible()
  })

  test('pipeline stage rows link to their pages', async ({ page }) => {
    const reviewLink = page.getByRole('link', { name: /Review/ }).first()
    await expect(reviewLink).toHaveAttribute('href', '/pipeline/review')
  })
})
```

- [ ] **Step 8.2: Run the tests**

In a separate terminal, ensure the dev server is running (`npm run dev`), then:

```bash
cd /Users/nitinkhare/Documents/awwwards/animation-library && npx playwright test tests/dashboard.spec.ts --reporter=list
```

Expected: all 5 tests pass. If any fail due to auth redirect, see the note in the test file about the `SKIP_AUTH` pattern or add a login step in `test.beforeEach`.

- [ ] **Step 8.3: Commit**

```bash
git add tests/dashboard.spec.ts
git commit -m "test(dashboard): add Playwright smoke tests for overview page"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 4 widgets from spec §5 are implemented. Data queries match §6. Layout matches §4. Both themes handled by CSS vars (no explicit dark-mode class logic needed). Motion: single `animate-[fadeIn]` on the page wrapper only.
- [x] **No placeholders:** All code blocks are complete and self-contained.
- [x] **Type consistency:** `DashboardData` interface defined in Task 2. Every widget prop interface matches the fields pulled from `DashboardData` in Task 7. `ActivityEvent` used identically in `getDashboardData` return type and `ActivityFeedWidget` props.
- [x] **`fmt()` defined in two files** (`HeroWidget` and `AnalyticsWidget`) — intentional duplication; extracting a shared util for two call sites would be premature abstraction.
- [x] **`rel()` defined in `ActivityFeedWidget` only** — only one consumer.
- [x] **Supabase client** — imported from `lib/db/supabase` (the existing singleton), not re-instantiated.
