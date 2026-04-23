---
name: frontend-veloxui
description: Use when working on frontend UI, pages, layouts, responsive behavior, motion, styling, or component polish in this Velox UI project. Best for Next.js App Router, Tailwind CSS v4, React 19, Framer Motion, dashboard screens, public marketing pages, asset pages, and design-system-aligned frontend changes. Also use before editing preview-related UI or generated asset rendering behavior.
---

# Purpose

Use this skill for frontend work in this repository so changes stay aligned with the app's actual stack, UI patterns, and preview constraints.

# Use When

Use this skill when the request involves:

- landing pages, marketing sections, dashboard screens, or page layout changes
- component styling, spacing, typography, responsive fixes, or visual polish
- asset browsing, preview UI, code blocks, or library presentation
- frontend architecture decisions in the Next.js App Router
- animation choices in app UI

If the task edits generated sandbox asset code or preview compilation behavior, also read [references/preview-sandbox.md](references/preview-sandbox.md).

# Project Stack

- Next.js App Router
- React 19
- Tailwind CSS v4
- Framer Motion in the app UI
- Supabase-backed data loading
- Custom UI primitives in `components/ui`
- Shared visual tokens in `app/globals.css`

# Workflow

1. Read the relevant route, nearby components, and shared primitives before changing UI.
2. Read the relevant Next.js guide in `node_modules/next/dist/docs/` before changing framework-facing code or conventions.
3. Preserve the existing visual language unless the user explicitly asks for a redesign.
4. Reuse existing building blocks before adding new ones:
   - `components/ui/*`
   - `components/layout/*`
   - `components/sections/*`
   - `components/assets/*`
5. Keep App Router boundaries clean:
   - default to Server Components
   - add `'use client'` only when hooks, browser APIs, or client interactivity are required
   - keep metadata logic on the server side
6. Use the existing CSS variables and theme tokens from `app/globals.css` instead of introducing one-off colors or spacing.
7. Prefer Framer Motion for app-level motion. Only introduce GSAP in app code if the user specifically wants timeline-heavy behavior and the dependency strategy is handled deliberately.
8. Make mobile behavior intentional, not an afterthought.
9. Verify accessibility basics:
   - semantic buttons/links
   - keyboard reachability
   - visible focus states
   - sufficient contrast
10. After edits, sanity-check the affected page/flow and note any unverified areas.

# Styling Rules

- Prefer semantic design tokens and existing surface classes over raw hex values.
- Follow current type choices and spacing rhythm before inventing new patterns.
- Use expressive layouts, but keep them consistent with the current product style.
- Avoid generic card spam and filler UI.
- Keep animations meaningful and restrained.

# App Router Rules

- Fetch data in Server Components where possible.
- Use client components for search bars, toggles, live filtering, and browser-only state.
- Do not move server work into the client without a real need.
- Be careful with route groups and segment layouts; preserve the current shell structure.

# Component Rules

- Reuse `Reveal`, `Badge`, `Button`, `Input`, `Select`, `EmptyState`, `Toast`, and existing layout shells when they fit.
- Prefer extending existing components over creating near-duplicates.
- Keep props simple and readable.
- Add brief comments only when a block would otherwise be hard to parse.

# Motion Rules

- Use Framer Motion for hover states, reveal transitions, and small interaction choreography.
- Keep animation performant and easy to reason about.
- Respect reduced-motion expectations when behavior is substantial.
- For generated asset code and iframe previews, follow the stricter rules in [references/preview-sandbox.md](references/preview-sandbox.md).

# Files To Check First

- `app/globals.css`
- `app/layout.tsx`
- `components/ui/*`
- `components/layout/*`
- `components/sections/*`
- `components/assets/*`
- `next.config.ts`

# Output Expectations

When implementing frontend work with this skill:

- preserve the current architecture
- keep the UI cohesive with the rest of the app
- avoid unnecessary client-side expansion
- call out any schema, preview, or dependency caveats discovered during the work
