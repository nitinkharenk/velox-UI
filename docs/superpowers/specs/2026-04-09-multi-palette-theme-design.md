# Multi-Palette Theme System — Design Spec

**Date:** 2026-04-09  
**Status:** Approved  
**Project:** Velox UI (animation-library)

---

## Overview

Extend the existing light/dark theme system to support 10 color palettes with light/dark mode per palette. The new `--color-*` tokens live alongside the existing `--bg-base`, `--text-primary`, `--accent` etc. tokens — existing components are untouched. All palette-aware components use the new tokens.

---

## Constraints

- No `next-themes` or third-party theme library
- No CSS files for theme vars — CSS vars set via inline JS injection and `applyTheme()`
- All types strict — no `any`
- Tailwind v4 (no `tailwind.config.ts` — extensions go in `globals.css` `@theme inline` block)
- `applyTheme` callable outside React
- Dark mode via CSS vars only — do NOT use Tailwind's `dark:` variant for palette-driven styles
- Project uses Next.js 16.2.0 — check `node_modules/next/dist/docs/` before writing any Next.js code

---

## Color Palette Data

10 palettes, each with 5 colors mapped to semantic roles:

| Index | Light role     | Dark role      | CSS var injected          |
|-------|----------------|----------------|---------------------------|
| [0]   | `--velox-palette-bg`      | ← colors[4]   | background                |
| [1]   | `--velox-palette-accent`  | ← colors[1]   | primary brand/action      |
| [2]   | `--velox-palette-surface` | ← colors[2]   | cards, elevated surfaces  |
| [3]   | `--velox-palette-muted`   | ← colors[3]   | secondary text, borders   |
| [4]   | `--velox-palette-base`    | ← colors[0]   | primary text, headings    |

Dark mode inverts bg ↔ base; accent, surface, muted are kept as-is.

Palettes: `blue`, `red`, `green`, `purple`, `yellow`, `cyan`, `orange`, `beige`, `pure_red`, `monochrome`.

---

## File Map

### New files

**`lib/themes.ts`**
- Exports `PALETTES` typed const array
- Exports types: `PaletteName`, `ThemeMode`, `ThemeConfig`
- Exports `getCssVars(palette: PaletteName, mode: ThemeMode): Record<string, string>` — returns 5 `--velox-palette-*` key/value pairs with dark inversion applied
- Exports `applyTheme(palette: PaletteName, mode: ThemeMode): void` — sets vars on `document.documentElement`, saves `{ palette, mode }` to `localStorage["velox-theme"]`

**`lib/getInitialTheme.ts`**
- Exports `initialThemeScript: string` — a self-invoking JS snippet (no imports, no React)
- Reads `localStorage["velox-theme"]`, falls back to `{ palette: "blue", mode: "light" }`
- Also tries `localStorage["veloxui-theme"]` as migration fallback (old key)
- Sets 5 `--velox-palette-*` CSS vars on `document.documentElement`
- Sets `data-theme` attribute to `"light"` or `"dark"` for existing CSS rules

**`components/theme/ThemeSwitcher.tsx`**
- `'use client'`
- Row of 10 swatch buttons (20px circles, filled with `palette.colors[1]`)
- Active swatch: `ring-2 ring-offset-2`, ring color via inline style `var(--velox-palette-base)`
- Mode toggle button: inline SVG sun (shown in dark mode) / moon (shown in light mode)
- Calls `toggleMode()` on click
- Only dependency: `useTheme` hook

### Modified files

**`components/theme/theme-config.ts`**
- Add `PaletteName` type (re-export from `lib/themes.ts` or define here)
- Add `ThemeConfig` type
- Update `THEME_STORAGE_KEY` to `"velox-theme"` (was `"veloxui-theme"`)
- Add `LEGACY_THEME_STORAGE_KEY = "veloxui-theme"` for migration

**`components/theme/ThemeProvider.tsx`**
- Replace `useSyncExternalStore` pattern with `useState`
- `useEffect` on mount: read `localStorage["velox-theme"]` (fallback to legacy key, then to default), call `applyTheme()`
- Expose via context: `palette: PaletteName`, `mode: ThemeMode`, `setPalette(name)`, `toggleMode()`, `setTheme(palette, mode)`
- All setters call `applyTheme()` and persist to `localStorage["velox-theme"]`
- `useTheme()` hook stays exported from this file — no import path changes

**`components/theme/ThemeToggle.tsx`**
- Change `theme` → `mode`, `toggleTheme` → `toggleMode` in destructure
- Icon logic unchanged (`mode === 'dark'` → sun, otherwise moon)

**`app/layout.tsx`**
- Import `initialThemeScript` from `lib/getInitialTheme`
- Add `<script dangerouslySetInnerHTML={{ __html: initialThemeScript }} />` as FIRST child of `<body>`
- `suppressHydrationWarning` already present on `<html>` — no change needed

**`app/globals.css`**
- Add to existing `@theme inline` block:
  ```css
  --color-bg:      var(--velox-palette-bg);
  --color-accent:  var(--velox-palette-accent);
  --color-surface: var(--velox-palette-surface);
  --color-muted:   var(--velox-palette-muted);
  --color-base:    var(--velox-palette-base);
  ```
- Generates utility classes: `bg-bg`, `text-accent`, `bg-surface`, `text-muted`, `text-base`, `border-muted`, etc.

---

## CSS Variable Architecture

```
JS runtime (applyTheme)          Tailwind v4 @theme inline         Generated utility classes
─────────────────────────        ──────────────────────────────     ──────────────────────────
--velox-palette-bg      ──────►  --color-bg: var(--velox-palette-bg)   ► bg-bg, text-bg
--velox-palette-accent  ──────►  --color-accent: var(...)               ► bg-accent, text-accent
--velox-palette-surface ──────►  --color-surface: var(...)              ► bg-surface, text-surface
--velox-palette-muted   ──────►  --color-muted: var(...)                ► bg-muted, text-muted
--velox-palette-base    ──────►  --color-base: var(...)                 ► bg-base, text-base

Existing tokens (untouched):
--bg-base, --text-primary, --accent, --border-default, etc.
```

The two-level naming avoids Tailwind v4's self-reference problem (you cannot write `--color-bg: var(--color-bg)` in `@theme inline`).

---

## State Management

```ts
// Default state (SSR safe)
{ palette: "blue", mode: "light" }

// ThemeConfig type
type ThemeConfig = { palette: PaletteName; mode: ThemeMode }

// Context shape
interface ThemeContextValue {
  palette: PaletteName
  mode: ThemeMode
  setPalette: (name: PaletteName) => void
  toggleMode: () => void
  setTheme: (palette: PaletteName, mode: ThemeMode) => void
}
```

Mount flow:
1. Inline script runs before React hydrates → sets CSS vars from localStorage
2. `ThemeProvider` mounts → reads same localStorage, sets React state
3. `useEffect` fires → `applyTheme()` called again (idempotent, no flash)

---

## Dark Mode Rule

```
light:  bg=colors[0], accent=colors[1], surface=colors[2], muted=colors[3], base=colors[4]
dark:   bg=colors[4], accent=colors[1], surface=colors[2], muted=colors[3], base=colors[0]
```

Accent, surface, and muted are identical in both modes. Only bg and base are swapped.

---

## Storage Migration

On mount, `ThemeProvider` checks keys in this order:
1. `"velox-theme"` (new key) — use if present
2. `"veloxui-theme"` (old key) — migrate: read value, write to new key, delete old key
3. Neither present — use default `{ palette: "blue", mode: "light" }`

Same fallback logic is duplicated inside `initialThemeScript` (inline, no imports).

---

## Expected Usage

```tsx
const { palette, mode, setPalette, toggleMode, setTheme } = useTheme()

// Switch to purple dark
setTheme("purple", "dark")

// In JSX — works with any palette automatically
<div className="bg-bg text-base border border-muted">
  <span className="text-accent">Hello</span>
</div>
```

---

## Out of Scope

- System color scheme (`prefers-color-scheme`) detection — removed from new provider (existing code had it, new code uses explicit user choice only)
- `next-themes` or any third-party library
- `tailwind.config.ts` (project is Tailwind v4)
- Storybook integration (mentioned in original spec as a `applyTheme` use case — supported by design since `applyTheme` has no React dependency)
