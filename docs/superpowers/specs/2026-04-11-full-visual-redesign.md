# Full Visual Redesign — Velox UI

**Date:** 2026-04-11
**Scope:** Complete visual overhaul of all routes — public and dashboard
**Implementation order:** Homepage (`/`) first; all other routes built on user instruction after that

---

## 1. Design Direction

Bold, expressive, brand-heavy aesthetic in the vein of Awwwards and Framer. All three visual levers pushed equally hard: typography, color, and motion. The existing warm/organic palette (cream, rose, sage) is completely replaced.

---

## 2. Color & Token System

### Canonical mode: Dark

The app lives in dark mode. Near-black base with near-white text and a single vivid accent. Light mode exists but is secondary.

| Token | Dark value | Light value |
|---|---|---|
| `--color-bg` | `#0A0A0A` | `#F5F5F5` |
| `--color-fg` | `#F5F5F5` | `#0A0A0A` |
| `--color-accent` | `#FF4D00` | `#FF4D00` |
| `--color-muted` | `rgba(245,245,245,0.4)` | `rgba(10,10,10,0.4)` |
| `--color-border` | `rgba(245,245,245,0.08)` | `rgba(10,10,10,0.08)` |
| `--color-surface` | `rgba(245,245,245,0.04)` | `rgba(10,10,10,0.04)` |

### Accent usage rules

`#FF4D00` is the **only** non-neutral color in the system. It appears on:
- Primary CTAs and active states
- Active nav/sidebar indicators
- Hover accents (borders, underlines)
- Kinetic type highlights
- Progress indicators and status pulses
- Custom cursor

One accent element per section maximum. Never decorative — always purposeful.

### Token migration

- `globals.css` `:root` block replaced with the new mono system above
- `[data-theme='dark']` becomes the primary (pre-applied via SSR init script)
- `lib/themes` gets a new `velox-mono` palette registered as the default
- All existing palette infrastructure stays; only the default palette changes

---

## 3. Typography System

Three typefaces with strict, non-overlapping roles.

### Typefaces

| Role | Font | Usage |
|---|---|---|
| Display | Bebas Neue (Google Fonts, `next/font/google`) | Hero headlines, section titles, oversized numbers |
| Body / UI | Geist Mono (already in project) | Body text, nav items, labels, metadata, code |
| Accent | Space Grotesk (Google Fonts, `next/font/google`) | Subheadings, card titles, longer descriptive text |

### Type scale

```
--text-display-xl:  clamp(80px, 12vw, 160px)   // hero headlines
--text-display-lg:  clamp(48px, 7vw, 96px)     // section headers
--text-display-md:  clamp(32px, 4vw, 56px)     // subsection titles
--text-body:        15px                        // Geist Mono body
--text-label:       12px                        // Geist Mono label
--text-accent-lg:   24px                        // Space Grotesk sub
--text-accent-md:   18px                        // Space Grotesk desc
```

### Display type rules

- Bebas Neue: all-caps, `line-height: 0.9`, `letter-spacing: 0.02em`
- Hero headlines fill `100%` of container width via clamped `font-size`
- Type contrast (160px display next to 12px mono) is the primary visual drama

---

## 4. Motion System

Two libraries with clear ownership — no overlap.

### GSAP (complex, sequenced, scroll-driven)

- **Scroll reveals**: `ScrollTrigger` drives all section entrances. Standard contract: `clipPath` from `inset(0 0 100% 0)` → `inset(0 0 0% 0)` (bottom wipe up) for sections; `y: 40, opacity: 0` → `y: 0, opacity: 1` with stagger for cards/groups.
- **Kinetic typography**:
  - *Scramble*: characters cycle random glyphs before resolving. Custom implementation using GSAP ticker. Applied to hero headlines and section titles on enter.
  - *Clip reveal*: words in `overflow: hidden` wrappers, translate up from `110%`. Standard entry for all display type.
  - *Counter*: numeric stats count from `0` on ScrollTrigger entry.
- **Ambient background**: cursor-parallax dot grid in hero. `mousemove` → GSAP quickSetter on CSS custom properties → `translate`. Max drift `±20px`.
- **Floating shapes**: 2–3 `#FF4D00` geometric fragments (opacity `0.06–0.12`) on looping GSAP timelines in hero and CTA sections.
- **Marquee**: TechBand becomes a continuous GSAP `ticker`-driven marquee.
- **Cursor**: custom `24px` circle, `#FF4D00`, lags behind pointer. GSAP quickSetter for performance.

### Framer Motion (reactive, component-level)

- `AnimatePresence` for route transitions and component mount/unmount
- `layout` prop for card grid reflow animations (dashboard filters)
- `whileHover` / `whileTap` micro-interactions on buttons and cards
- Spring-physics for interactive elements

### Performance contract

All ambient and kinetic animations are gated behind `prefers-reduced-motion: no-preference`. Behind the media query: instant opacity transitions only — no position, clip, scramble, or parallax animations.

---

## 5. Layout Principles

- **Full-viewport sections**: most sections are `100vh` or content-driven with `clamp(80px, 10vw, 160px)` vertical padding
- **Asymmetric composition**: headlines break the grid. Display type may start `col-1` while subtext starts `col-4`. White space is active.
- **Edge-to-edge type**: hero headlines span `100%` of container width
- **Hard dividers**: sections separated by `1px rgba(fg, 0.08)` or raw juxtaposition — no margin-based separation
- **Accent discipline**: `#FF4D00` on one element per section maximum

---

## 6. New Shared Components

| Component | Purpose | Animation engine |
|---|---|---|
| `CustomCursor` | `#FF4D00` circle, spring lag, scale on hover | GSAP quickSetter + Framer Motion scale |
| `ScrambleText` | Character scramble on mount/trigger | GSAP ticker |
| `ClipReveal` | Wrapper: ScrollTrigger bottom-wipe on children | GSAP ScrollTrigger |
| `AmbientGrid` | Cursor-parallax dot grid for hero background | GSAP mousemove |
| `MarqueeTrack` | Continuous looping marquee | GSAP ticker |

All new components live in `components/motion/`.

---

## 7. Public Pages

### `/` — Homepage (built first)

- **Hero**: full-viewport. Bebas Neue headline fills width. GSAP scramble + clip reveal on load. `AmbientGrid` behind. `CustomCursor` active sitewide.
- **Section order**: Hero → Showcase → Bento → Pipeline → Pricing → Testimonials → CTA → Footer
- Each section enters via GSAP ScrollTrigger bottom-wipe
- Section titles use display scale throughout
- `MarqueeTrack` replaces current TechBand; logos monochrome, `#FF4D00` on hover

### `/asset/[slug]`

- Full-bleed component preview above fold
- Title in display scale, metadata in Geist Mono labels
- Code block in Geist Mono + Shiki, enters via clip reveal

### `/preview/[slug]` and `/preview/live`

- Near-empty dark `#0A0A0A` shell
- Component preview centered
- Minimal chrome: `#FF4D00` close/back control only

### `/login`

- Split layout: oversized Bebas Neue "SIGN IN" fills left half
- Form in Geist Mono on the right
- `#FF4D00` on submit button only

---

## 8. Dashboard Pages

Same token layer and type system as public — dialed back to serve the tool.

### `/dashboard` (Asset Browser)

- 12-column grid. Cards: `--color-surface` background, `--color-border` edges
- Card titles: Space Grotesk medium. Metadata: Geist Mono `12px`
- `#FF4D00` on active filter pills and hover border only
- Framer Motion `layout` for card grid reflow

### `/pipeline` and nested routes

- Left sidebar: Geist Mono `13px`. Active route: `2px #FF4D00` left border
- Pipeline stages: horizontal timeline, GSAP-animated `#FF4D00` progress fill
- Tables: monochrome, dense. `#FF4D00` single bottom border on row hover
- `active/running` status badges: `#FF4D00` pulse ring via GSAP

### `/settings`

- Two-column: nav tree left, content right. All Geist Mono.
- Form inputs: `#FF4D00` focus ring. No other color.

### Global dashboard chrome

- `#0A0A0A` background. Logo in Bebas Neue. Nav in Geist Mono `13px`.
- `#FF4D00` on active item only.

---

## 9. Error States & Testing

**Error states:** Not redesigned in this pass. They inherit new tokens via CSS vars automatically.

**Testing:** Playwright visual smoke tests (`tests/visual.spec.ts`) get updated baseline screenshots after each route is built.

---

## 10. Implementation Order

1. Homepage (`/`) — full treatment: tokens, fonts, motion system, all landing sections
2. Remaining routes — built on user instruction after homepage ships
