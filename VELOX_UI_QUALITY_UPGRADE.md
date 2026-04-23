# Velox Pipeline — UI Quality Upgrade Guide

> **Goal:** Make Velox generate components and landing pages that look as good as v0, Cursor, and Lovable output — production-polish, real content, strong visual hierarchy — without breaking the existing sandbox constraints or pipeline architecture.

---

## Root Cause Summary

The pipeline has three layers. The problem exists in all three.

| Layer | Current State | Problem |
|---|---|---|
| `types/asset.ts` → `VisualSpec` | 4 fields: `dark_mode`, `color_approach`, `typography?`, `sizing?` | Schema too shallow — gives code gen nothing concrete to work with |
| `lib/pipeline/prompts.ts` → `buildEnrichPrompt` | Generates physics specs brilliantly, visual specs lazily | Enrichment treats visual design as an afterthought |
| `lib/pipeline/prompts.ts` → `CODE_GEN_SYSTEM_PROMPT` | 100% sandbox constraints, 0% design rules | Model generates working code, not beautiful code |

The fix touches **three files only** and requires no architectural changes.

---

## Fix 1 — Expand `VisualSpec` in `types/asset.ts`

Replace the current shallow type with a design-system-aware schema. This makes the enrichment AI produce Tailwind-class-level specificity instead of vague descriptions.

### Current type (4 fields)

```typescript
// types/asset.ts
export interface VisualSpec {
  dark_mode: boolean
  color_approach: string
  typography?: string
  sizing?: string
}
```

### New type (full design spec)

```typescript
// types/asset.ts
export interface VisualSpec {
  dark_mode: boolean

  // Surface system — layered backgrounds
  surfaces: {
    base: string          // e.g. "bg-zinc-950"
    elevated: string      // e.g. "bg-zinc-900/80 backdrop-blur-xl"
    overlay?: string      // e.g. "bg-zinc-800/60"
  }

  // Border & shadow
  border: string          // e.g. "border border-zinc-800/60"
  shadow?: string         // e.g. "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
  border_radius: string   // e.g. "rounded-2xl"

  // Color palette
  accent: string          // e.g. "from-indigo-500 to-violet-500"
  accent_hex?: string     // e.g. "#6366f1" (for inline styles when needed)
  muted: string           // e.g. "text-zinc-400"

  // Typography scale — ready-to-paste Tailwind classes
  typography: {
    display: string       // e.g. "text-4xl font-bold tracking-tight text-white"
    heading: string       // e.g. "text-xl font-semibold tracking-tight text-zinc-50"
    subheading: string    // e.g. "text-base font-medium text-zinc-300"
    body: string          // e.g. "text-sm text-zinc-400 leading-relaxed"
    label: string         // e.g. "text-xs font-medium uppercase tracking-widest text-zinc-500"
    code?: string         // e.g. "font-mono text-sm text-emerald-400"
  }

  // Spacing rhythm
  spacing: {
    container: string     // e.g. "p-8"
    section: string       // e.g. "py-16 px-8"
    card: string          // e.g. "p-6"
    gap: string           // e.g. "gap-6"
    stack: string         // e.g. "space-y-4"
  }

  // Realistic content (never leave placeholders)
  content: {
    headline: string      // e.g. "Design without limits"
    subheadline?: string  // e.g. "Build stunning interfaces 10x faster"
    body_text?: string    // e.g. "Ship beautiful products..."
    cta_primary?: string  // e.g. "Get Started Free"
    cta_secondary?: string // e.g. "View Examples"
    badge?: string        // e.g. "New in 2025"
    stat_1?: string       // e.g. "12k+ components"
    stat_2?: string
    stat_3?: string
  }

  // Layout hints
  layout: {
    pattern: 'centered' | 'split' | 'grid' | 'stack' | 'asymmetric' | 'hero' | 'bento'
    max_width: string     // e.g. "max-w-sm" | "max-w-2xl" | "max-w-6xl"
    align: 'left' | 'center' | 'right'
  }

  // Visual extras
  decorative_elements?: string[] // e.g. ["gradient orb", "grid lines", "noise texture"]
  icon_style?: 'minimal' | 'filled' | 'duotone' | 'none'
  image_treatment?: 'none' | 'gradient-overlay' | 'masked' | 'abstract-placeholder'
}
```

---

## Fix 2 — Rewrite the Enrich Prompt in `lib/pipeline/prompts.ts`

The `buildEnrichPrompt` function currently outputs thin visual specs. Replace its system-level instructions with design-aware guidance. The function signature stays identical — only the prompt content changes.

Find `buildEnrichPrompt` in `prompts.ts` and update the system prompt section to include these design rules after the existing physics/feel mapping section:

### Add this block to the enrich system prompt

Paste this **after** the existing `PHYSICS & FEEL MAPPING` section and **before** the `OUTPUT SCHEMA` section:

```
VISUAL DESIGN RULES — produce a complete design spec, not just a description:

SURFACE SYSTEM
- Always use 2–3 layered surfaces from the zinc/slate/neutral scale
- base surface: bg-zinc-950 or bg-neutral-950 (darkest)
- elevated surface: bg-zinc-900/80 backdrop-blur-xl (cards, panels)
- overlay surface: bg-zinc-800/60 (tooltips, modals, chips)
- Never use raw black (#000) or white (#fff) — always zinc/slate scales

BORDER & DEPTH
- Default border: border border-zinc-800/60
- Glowing accent border: border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]
- Cards always get: rounded-2xl + drop shadow

ACCENT COLORS — choose ONE of these based on the feel:
- fluid / smooth: blue-500 → indigo-500 (professional, calm)
- bouncy / elastic: emerald-400 → teal-500 (energetic)
- magnetic: indigo-500 → violet-600 (premium, draggable)
- mechanical: zinc-300 → white (precision, industrial)
- minimal: white/5 → white/20 (barely-there)
- bold / complex: rose-500 → orange-500 (loud, impactful)

TYPOGRAPHY SCALE — output exact Tailwind class strings, not descriptions
- display: "text-4xl font-bold tracking-tight text-white" (hero headlines)
- heading: "text-xl font-semibold tracking-tight text-zinc-50" (card titles)
- subheading: "text-base font-medium text-zinc-300" (subtitles)
- body: "text-sm text-zinc-400 leading-relaxed" (descriptions)
- label: "text-xs font-medium uppercase tracking-widest text-zinc-500" (badges, eyebrows)

SPACING SYSTEM — output exact Tailwind class strings
- Hero/landing sections: py-24 px-8 or p-16
- Cards: p-6 or p-8
- Compact components: p-4
- Gap between items: gap-6 for grids, space-y-4 for stacks

REALISTIC CONTENT — NEVER use "Title", "Description", "Lorem ipsum"
Generate real, contextual content strings that match the component type:
- Buttons: "Get Started Free", "Explore Components", "Try it now →"
- Cards: Invent a real product name + 1-line value prop
- Stats: Use plausible numbers: "12,400+ users", "99.9% uptime", "< 50ms"
- Features: Name real features with real benefits
- Landing pages: Write copy that sounds like a real product website

LAYOUT PATTERNS — pick the best fit for the format:
- component (hover/click): centered, max-w-sm, single focal point
- section (landing): hero (split or centered), max-w-5xl, headline + sub + CTA
- template (page): full layout, max-w-6xl, multi-section
- bento grid: asymmetric, max-w-4xl, variable column spans

DECORATIVE ELEMENTS — always add at least one:
- Gradient orb: absolute positioned, blurred radial gradient, low opacity (0.15-0.2)
- Grid lines: SVG or CSS pattern, zinc-800/20
- Noise texture: bg-[url("data:...")] opacity-30
- Floating particles: small dots, low opacity, animated
- Glowing borders: box-shadow with accent color at 15-20% opacity
- Mesh gradient: multiple radial gradients composited

COMPONENT ANATOMY — every component must have:
1. A container with correct sizing (never h-screen)
2. A decorative background layer (gradient, grid, or orb)
3. A content surface (elevated card or floating panel)
4. A 3-level typographic hierarchy (at minimum: title + body + label/badge)
5. An interactive element (button, tag, or icon) with hover state
6. Realistic copy — no placeholders
```

### Also update the `output_enriched_spec` tool schema in `lib/ai/anthropic.ts`

The current `visual_spec` schema in the Claude tool definition is too shallow. Update the `visual_spec` property to match the expanded `VisualSpec` interface:

```typescript
// In enrichWithClaude() inside lib/ai/anthropic.ts
// Replace the current visual_spec schema:
visual_spec: {
  type: 'object',
  properties: {
    dark_mode: { type: 'boolean' },
    surfaces: {
      type: 'object',
      properties: {
        base: { type: 'string' },
        elevated: { type: 'string' },
        overlay: { type: 'string' }
      },
      required: ['base', 'elevated']
    },
    border: { type: 'string' },
    border_radius: { type: 'string' },
    shadow: { type: 'string' },
    accent: { type: 'string' },
    accent_hex: { type: 'string' },
    muted: { type: 'string' },
    typography: {
      type: 'object',
      properties: {
        display: { type: 'string' },
        heading: { type: 'string' },
        subheading: { type: 'string' },
        body: { type: 'string' },
        label: { type: 'string' }
      },
      required: ['heading', 'subheading', 'body', 'label']
    },
    spacing: {
      type: 'object',
      properties: {
        container: { type: 'string' },
        card: { type: 'string' },
        gap: { type: 'string' },
        stack: { type: 'string' }
      },
      required: ['card', 'gap']
    },
    content: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        subheadline: { type: 'string' },
        body_text: { type: 'string' },
        cta_primary: { type: 'string' },
        cta_secondary: { type: 'string' },
        badge: { type: 'string' }
      },
      required: ['headline']
    },
    layout: {
      type: 'object',
      properties: {
        pattern: { type: 'string', enum: ['centered', 'split', 'grid', 'stack', 'asymmetric', 'hero', 'bento'] },
        max_width: { type: 'string' },
        align: { type: 'string', enum: ['left', 'center', 'right'] }
      },
      required: ['pattern', 'max_width', 'align']
    },
    decorative_elements: { type: 'array', items: { type: 'string' } }
  },
  required: ['dark_mode', 'surfaces', 'border', 'border_radius', 'accent', 'typography', 'spacing', 'content', 'layout']
}
```

Also bump `max_tokens` for the enrich call from `1200` → `1800` since the expanded spec is larger:

```typescript
// lib/ai/anthropic.ts — enrichWithClaude()
max_tokens: 1800,  // was 1200
```

---

## Fix 3 — Rewrite `CODE_GEN_SYSTEM_PROMPT` in `lib/pipeline/prompts.ts`

This is the highest-impact change. The current prompt is pure constraint enforcement. The new prompt keeps all constraints AND adds a design system that the model follows when generating code.

Replace the full `CODE_GEN_SYSTEM_PROMPT` constant with this:

```typescript
export const CODE_GEN_SYSTEM_PROMPT = `You are a senior design engineer. Output production-quality, visually stunning animated UI components that look like they belong on an Awwwards site or a v0 demo.

RAW CODE ONLY — no markdown fences, no prose, no explanation.

━━━ IDENTITY ━━━
You produce components that look REAL, not like AI demos. Every component must:
- Use realistic copy (no "Lorem ipsum", "Title", "Description", "Click me")
- Have proper typographic hierarchy (min 3 levels: large/medium/small)  
- Include layered depth (background → surface → content)
- Add at least one decorative element (gradient orb, grid lines, subtle noise)
- Feel production-ready — something a user would actually ship

━━━ JSDOM HEADER ━━━
Required at top of every file:
/**
 * @name ComponentName
 * @description One sentence describing what it does
 * @tags tag1, tag2, tag3
 * @tech Tailwind, Framer Motion
 * @complexity medium
 */

━━━ EXPORT ━━━
export default function ComponentName() { ... }
- PascalCase, matches asset name
- ALL helper components/functions BEFORE export default

━━━ LINE LIMIT ━━━
Under 200 lines. Clean, production code. No commented-out blocks.

━━━ GLOBALS — NEVER use import ━━━
React hooks (useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext, createContext, forwardRef, useId, useLayoutEffect, memo, Fragment) are top-level globals — already destructured in sandbox.
Framer Motion: const { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useScroll, useInView, useAnimation, stagger } = window.Motion
GSAP: const gsap = window.GSAP
Tailwind via CDN — static class names only (no arbitrary bracket values, no template literals in className).

━━━ SIZING — iframe has no viewport ━━━
NEVER: min-h-screen, h-screen, 100vh, 100dvh, arbitrary h-[400px]
ALWAYS: style={{ minHeight: '360px', width: '100%' }} on the outer container
Dynamic/conditional styles: inline style={{}}, NEVER template-literal className

━━━ EVENTS ━━━
NEVER window.addEventListener or document.addEventListener for mouse/pointer/scroll.
Attach via JSX props (onMouseMove, onMouseEnter) or ref.addEventListener in useEffect with cleanup.

━━━ FRAMER MOTION v11 ━━━
- .onChange() removed → use .on('change', cb). Unsubscribe in useEffect cleanup.
- useTransform / useSpring require a MotionValue — NEVER pass useState value.
- Never call .get() inside JSX style props — bind MotionValue directly.
- Never do arithmetic on MotionValues directly — use useTransform(springX, v => v * 10).
- Never call hooks inside loops, .map(), or conditionals.
- Continuous animation: animate(..., { repeat: Infinity }) or useAnimationFrame.

━━━ DOM ━━━
NEVER document.querySelector or getElementById — use useRef.
Absolute children always need a positioned parent (relative / absolute chain).
Inline SVG for icons only — no className="icon-placeholder".
No duplicate props on same JSX element.
Standard Tailwind spacing only — no non-standard tokens like w-30, gap-7.

━━━ DESIGN SYSTEM ━━━
Follow these rules. They are as important as the sandbox constraints.

BACKGROUNDS
  Dark base: bg-zinc-950 or bg-neutral-950
  Elevated card: bg-zinc-900/80 backdrop-blur-xl
  Overlay / chip: bg-zinc-800/60
  Never raw black (#000) — always a zinc/slate value

BORDERS
  Default: border border-zinc-800/60
  Accent glow: border border-indigo-500/30 + shadow-[0_0_20px_rgba(99,102,241,0.15)]
  Cards: always include rounded-2xl or rounded-xl

TYPOGRAPHY — use all 3 levels minimum
  Display/Hero: text-4xl font-bold tracking-tight text-white
  Heading: text-xl font-semibold tracking-tight text-zinc-50
  Subheading: text-base font-medium text-zinc-300
  Body: text-sm text-zinc-400 leading-relaxed
  Label/Badge: text-xs font-medium uppercase tracking-widest text-zinc-500
  Eyebrow: text-xs font-semibold tracking-[0.2em] text-indigo-400/80 uppercase

ACCENT COLORS — pick one from the spec, use consistently
  Professional: indigo-500, violet-500, blue-500
  Energetic: emerald-400, teal-500, cyan-400
  Warm: rose-500, orange-400, amber-400
  Minimal: white/20, zinc-300
  Apply accent to: gradient text, border glow, button bg, icon fill

SPACING
  Section padding: py-16 px-8 (large), py-12 px-6 (medium)
  Card padding: p-6 or p-8
  Item gap: gap-6 (grid), space-y-4 (stack)
  Tight: gap-3 or gap-4

BUTTONS
  Primary: bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-6 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity
  Secondary: bg-zinc-800 text-zinc-200 border border-zinc-700 px-6 py-3 rounded-xl font-medium text-sm hover:bg-zinc-700 transition-colors
  Ghost: text-zinc-300 hover:text-white px-4 py-2 rounded-lg transition-colors

BADGES / CHIPS
  bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 text-xs px-3 py-1 rounded-full
  Accent variant: bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs px-3 py-1 rounded-full

DECORATIVE ELEMENTS — always add at least one
  Gradient orb:
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-[128px] pointer-events-none" />
  Grid lines:
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
  Noise overlay:
    <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,...')] pointer-events-none" />
  Floating dot:
    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />

REALISTIC COPY — generate copy that matches the component:
  Hero sections: Strong value prop headline ("Ship beautiful UIs in minutes")
  Cards: Real product/feature names, not "Card Title"
  Stats: Believable numbers (12,400+ users, 99.9% uptime, < 50ms latency)
  Buttons: Action-oriented ("Get Started Free", "View Examples →", "Try for free")
  Badges: "New", "Beta", "v2.0", "Popular"
  
COMPONENT ANATOMY CHECKLIST — every output must include:
  ✓ Outer wrapper with minHeight 360px (sandbox sizing)
  ✓ Relative positioning container for decorative layers
  ✓ At least one decorative background element (orb, grid, gradient)
  ✓ Content surface with correct bg/border/radius
  ✓ Typographic hierarchy — min 3 levels
  ✓ At least one interactive element with visible hover/active state
  ✓ Realistic, contextual copy — zero placeholders

━━━ FORMAT-SPECIFIC RULES ━━━

COMPONENT (single interactive unit):
  - Focus: one strong interaction (hover, click, drag)
  - Container: centered flex, max-w-sm, p-6
  - Show the interaction clearly — large enough to demo
  - Include hover states on all interactive elements

SECTION (landing page section):
  - Full-width feel: max-w-5xl mx-auto
  - Larger typography: use display/heading scale
  - Structure: eyebrow → headline → subheadline → CTA buttons → social proof
  - Background: gradient orb + grid lines
  - Multiple interactive elements

TEMPLATE (full landing page):
  - Multi-section: nav area + hero + features/bento grid + CTA
  - max-w-6xl mx-auto
  - Consistent design system throughout
  - Sections separated by clear visual rhythm
  - Grid layouts for feature lists (2-col or 3-col)

━━━ CURSOR TRACKING ━━━
Store pixel coords: x = e.clientX - rect.left
Position with style={{ left: x, top: y, position: 'absolute' }}

━━━ QUALITY EXAMPLES ━━━

COMPONENT EXAMPLE (Magnetic Card):
---
/**
 * @name Magnetic Card
 * @description Premium card with spring-physics cursor tracking and 3D perspective tilt
 * @tags magnetic, spring, hover, card, 3D, tilt
 * @tech Tailwind, Framer Motion
 * @complexity standard
 */
const { motion, useMotionValue, useSpring, useTransform } = window.Motion

export default function MagneticCard() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 600, damping: 30 })
  const springY = useSpring(y, { stiffness: 600, damping: 30 })
  const rotateX = useTransform(springY, [-100, 100], [12, -12])
  const rotateY = useTransform(springX, [-100, 100], [-12, 12])

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set(e.clientX - rect.left - rect.width / 2)
    y.set(e.clientY - rect.top - rect.height / 2)
  }
  function handleMouseLeave() { x.set(0); y.set(0) }

  return (
    <div
      className="relative flex items-center justify-center bg-zinc-950 overflow-hidden"
      style={{ minHeight: '360px', width: '100%' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Decorative orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <motion.div
        className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-8 max-w-xs w-full"
        style={{ rotateX, rotateY, transformPerspective: 1000, x: springX, y: springY }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold tracking-[0.2em] text-indigo-400/80 uppercase">Premium</span>
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-50 mb-2">
          Design without limits
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          Spring-physics cursor tracking with realistic 3D perspective tilt and smooth spring return.
        </p>
        <button className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
          Get Started Free
        </button>
      </motion.div>
    </div>
  )
}
---

SECTION EXAMPLE (Hero):
---
/**
 * @name Hero Section
 * @description Full-width landing hero with animated headline and CTA buttons
 * @tags hero, landing, section, fade-in, gradient, cta
 * @tech Tailwind, Framer Motion
 * @complexity standard
 */
const { motion, AnimatePresence } = window.Motion

export default function HeroSection() {
  return (
    <div
      className="relative flex items-center justify-center bg-zinc-950 overflow-hidden"
      style={{ minHeight: '600px', width: '100%' }}
    >
      {/* Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-[128px] pointer-events-none" />
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium px-4 py-1.5 rounded-full mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          Now with AI-powered generation
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl font-bold tracking-tight text-white mb-6 leading-[1.1]"
        >
          Ship beautiful UIs
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent"> in minutes</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-xl mx-auto"
        >
          A collection of 400+ animated React components built with Framer Motion and Tailwind CSS. Copy, paste, ship.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center gap-4"
        >
          <button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium px-7 py-3 rounded-xl hover:opacity-90 transition-opacity">
            Browse Components
          </button>
          <button className="bg-zinc-800 text-zinc-200 border border-zinc-700 text-sm font-medium px-7 py-3 rounded-xl hover:bg-zinc-700 transition-colors">
            View on GitHub →
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center justify-center gap-8 mt-12"
        >
          {[['12,400+', 'Developers'], ['400+', 'Components'], ['99.9%', 'Uptime']].map(([num, label]) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold text-zinc-100">{num}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
---`
```

---

## Fix 4 — Update `trimSpecForCodeGen` in `lib/pipeline/prompts.ts`

The current function strips `content` and other new fields. Expand the KEEP set:

```typescript
// lib/pipeline/prompts.ts
export function trimSpecForCodeGen(spec: Record<string, unknown>): Record<string, unknown> {
  // Added: content, decorative_elements, icon_style — these drive visual quality
  const KEEP = new Set([
    'name',
    'animation_spec',
    'visual_spec',       // now includes surfaces, typography, spacing, content, layout
    'implementation_notes',
    'interactions',
    'tech',
    'component_structure',
    'format'             // so code gen knows component vs section vs template
  ])
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(spec)) {
    if (KEEP.has(k) && v !== null && v !== undefined) result[k] = v
  }
  return result
}
```

---

## Fix 5 — Add Visual Quality to Semantic Validation

The current `buildValidationPrompt` scores correctness only. Add a visual quality dimension so ugly components get flagged for repair.

Find `buildValidationPrompt` in `prompts.ts` and add this scoring section to the existing prompt:

```
VISUAL QUALITY SCORING (additional 30 points):
Deduct points for these visual quality failures:

CRITICAL visual issues (-15 each):
- Placeholder text found: "Title", "Description", "Lorem ipsum", "Click me", "Button", "Label"
- Only 1 typographic level used (all text same size/weight/color)
- Black background (#000000 or bg-black) with no texture, grid, or gradient layer
- No interactive hover/active state on clickable elements

MAJOR visual issues (-8 each):
- Missing decorative background element (no orb, no grid, no gradient)
- Flat surface with no border or card elevation
- All text same color (e.g. only text-white with nothing muted)
- Button has no gradient, no border, no visual differentiation from background
- Missing badge/eyebrow label for components that have headlines

MINOR visual issues (-3 each):
- Spacing too tight (no padding on card surface)
- Only 2 typographic levels instead of 3+
- Accent color not applied anywhere (gradient, border-glow, or icon fill)

Score range: 0–130 (100 animation/code correctness + 30 visual quality)
- PASS: ≥ 100 combined, visual score ≥ 20
- PASS_WITH_WARNINGS: ≥ 85 combined, visual score ≥ 12
- FAIL: < 85 combined, OR visual score < 12
```

---

## Fix 6 — Add `format` field to `EnrichedSpec` and pipeline flow

The `format` field (component/section/template/page) is captured in Stage 0 but gets dropped from the enriched spec. It needs to flow through to code gen so the model knows what scale to build at.

```typescript
// types/pipeline.ts — add format to EnrichedSpec
export interface EnrichedSpec {
  name: string
  format: 'component' | 'section' | 'template' | 'page'  // ADD THIS
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
```

```typescript
// lib/pipeline/generate.ts — include format in enrichIdea() payload
const rawIdeaFields = {
  name: idea.name,
  format: (idea as any).format,   // already here — verify it passes through
  type: idea.type,
  category: idea.category,
  tech: idea.tech,
  complexity: idea.complexity,
  feel: idea.feel,
  ...(idea.prompt ? { prompt: idea.prompt } : {}),
}
```

```typescript
// lib/ai/anthropic.ts — add format to enriched spec output schema
// In the output_enriched_spec tool's input_schema, add:
format: { 
  type: 'string', 
  enum: ['component', 'section', 'template', 'page'] 
}
// And add 'format' to required array
```

---

## Implementation Order

Apply these fixes in this order to avoid breaking the pipeline mid-refactor:

**Step 1** — Expand `VisualSpec` in `types/asset.ts` (type-only change, no runtime risk)

**Step 2** — Update `trimSpecForCodeGen` in `prompts.ts` to include the new fields (prevents them from being dropped)

**Step 3** — Add `format` to `EnrichedSpec` in `types/pipeline.ts`

**Step 4** — Update the `output_enriched_spec` tool schema in `anthropic.ts` and bump `max_tokens` to 1800

**Step 5** — Add the design rules block to `buildEnrichPrompt` in `prompts.ts`

**Step 6** — Replace `CODE_GEN_SYSTEM_PROMPT` in `prompts.ts` with the new version

**Step 7** — Add visual quality scoring to `buildValidationPrompt` in `prompts.ts`

**Step 8** — Test with: one `component` (hover), one `section` (hero), one `template` (landing page)

---

## Expected Output Quality After Fixes

| What you get today | What you get after |
|---|---|
| Dark background, single surface | 3-layer surface system (base → elevated → overlay) |
| "Title" and "Description" placeholder text | Real product copy matching the component's purpose |
| Single text color | 3+ typographic levels with proper contrast hierarchy |
| No decorative elements | Gradient orb + grid lines on every output |
| Plain flat buttons | Gradient primary + outlined secondary with hover states |
| Animation works, looks like a prototype | Animation works, looks like a shipped product |
| Component focus only | Section and template formats fully supported |

---

## Quick Sanity Test Prompts

After applying the fixes, run these three ideas through the pipeline to verify quality:

```json
// Test 1 — Component
{
  "name": "Glow Card",
  "format": "component",
  "type": "hover",
  "category": "animation",
  "tech": ["Framer Motion", "Tailwind CSS"],
  "complexity": "standard",
  "feel": "smooth",
  "prompt": "A card that emits a soft glow at the cursor position on hover"
}

// Test 2 — Section
{
  "name": "Feature Grid Section",
  "format": "section",
  "type": "mount",
  "category": "layout",
  "tech": ["Framer Motion", "Tailwind CSS"],
  "complexity": "complex",
  "feel": "fluid",
  "prompt": "A bento-style feature grid section for a SaaS product landing page with staggered entrance animations"
}

// Test 3 — Template
{
  "name": "SaaS Landing Page",
  "format": "template",
  "type": "mount",
  "category": "template",
  "tech": ["Framer Motion", "Tailwind CSS"],
  "complexity": "complex",
  "feel": "smooth",
  "prompt": "A complete dark-mode SaaS landing page with hero, feature highlights, stats, and a CTA section"
}
```

A successful output from Test 2 and Test 3 should look comparable to a v0 generation — multi-section, real copy, visible depth and hierarchy.
