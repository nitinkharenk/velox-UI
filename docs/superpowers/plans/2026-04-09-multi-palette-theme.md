# Multi-Palette Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing light/dark-only ThemeProvider with a multi-palette system supporting 10 color palettes × 2 modes, persisted to localStorage, SSR-safe via inline script injection.

**Architecture:** Palette data and pure functions live in `lib/themes.ts`; an inline script string in `lib/getInitialTheme.ts` sets CSS vars before React hydrates; `components/theme/ThemeProvider.tsx` is replaced in-place so all existing `useTheme` import paths remain unchanged. Five new `--velox-palette-*` runtime CSS vars are exposed to Tailwind v4 via `@theme inline` tokens in `globals.css`.

**Tech Stack:** Next.js 16.2.0 (App Router), React 19, Tailwind v4 (`@import "tailwindcss"` + `@theme inline`), TypeScript, Node.js `node:test` for unit tests, Playwright for integration smoke test.

> **IMPORTANT — Tailwind v4:** This project has NO `tailwind.config.ts`. All Tailwind extensions go inside the `@theme inline` block in `app/globals.css`. Read `node_modules/next/dist/docs/01-app/` for any Next.js API questions before writing code.

> **NAMING NOTE:** The Tailwind token for "primary text" is named `--color-fg` (not `--color-base` as in the spec) to avoid a utility class collision with Tailwind's built-in `text-base` font-size utility. Usage: `text-fg`, `bg-fg`. The underlying runtime CSS var stays `--velox-palette-base`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/themes.ts` | Palette data, types, `getCssVars`, `applyTheme` |
| Create | `lib/getInitialTheme.ts` | Inline script string for SSR flash prevention |
| Create | `tests/unit/themes.test.ts` | Unit tests for `getCssVars` |
| Create | `tests/unit/getInitialTheme.test.ts` | Unit tests for script content |
| Create | `tests/theme-switcher.spec.ts` | Playwright integration smoke test |
| Modify | `components/theme/theme-config.ts` | Add legacy key constant |
| Modify | `components/theme/ThemeProvider.tsx` | Replace with palette+mode context |
| Modify | `components/theme/ThemeToggle.tsx` | Rename `theme`→`mode`, `toggleTheme`→`toggleMode` |
| Create | `components/theme/ThemeSwitcher.tsx` | 10 swatches + mode toggle |
| Modify | `app/globals.css` | Add 5 `--color-*` tokens to `@theme inline` |
| Modify | `app/layout.tsx` | Inject inline script as first `<body>` child |

---

## Task 1: Create `lib/themes.ts` with palette data and pure functions

**Files:**
- Create: `lib/themes.ts`
- Create: `tests/unit/themes.test.ts`

- [ ] **Step 1: Write the failing unit tests**

Create `tests/unit/themes.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getCssVars, PALETTES } from '../../lib/themes.js'

test('PALETTES has exactly 10 entries', () => {
  assert.equal(PALETTES.length, 10)
})

test('PALETTES contains expected names', () => {
  const names = PALETTES.map(p => p.name)
  assert.deepEqual(names, [
    'blue', 'red', 'green', 'purple', 'yellow',
    'cyan', 'orange', 'beige', 'pure_red', 'monochrome',
  ])
})

test('getCssVars - blue light mode returns correct values', () => {
  const vars = getCssVars('blue', 'light')
  assert.equal(vars['--velox-palette-bg'],      '#F9F9FA')
  assert.equal(vars['--velox-palette-accent'],  '#0465ED')
  assert.equal(vars['--velox-palette-surface'], '#03354E')
  assert.equal(vars['--velox-palette-muted'],   '#808180')
  assert.equal(vars['--velox-palette-base'],    '#131314')
})

test('getCssVars - blue dark mode inverts bg and base, keeps others', () => {
  const vars = getCssVars('blue', 'dark')
  assert.equal(vars['--velox-palette-bg'],      '#131314')  // swapped from light base
  assert.equal(vars['--velox-palette-accent'],  '#0465ED')  // unchanged
  assert.equal(vars['--velox-palette-surface'], '#03354E')  // unchanged
  assert.equal(vars['--velox-palette-muted'],   '#808180')  // unchanged
  assert.equal(vars['--velox-palette-base'],    '#F9F9FA')  // swapped from light bg
})

test('getCssVars - returns exactly 5 keys', () => {
  const vars = getCssVars('purple', 'light')
  assert.deepEqual(Object.keys(vars).sort(), [
    '--velox-palette-accent',
    '--velox-palette-base',
    '--velox-palette-bg',
    '--velox-palette-muted',
    '--velox-palette-surface',
  ])
})

test('getCssVars - monochrome light mode', () => {
  const vars = getCssVars('monochrome', 'light')
  assert.equal(vars['--velox-palette-bg'],      '#FFFFFF')
  assert.equal(vars['--velox-palette-accent'],  '#CFCFCF')
  assert.equal(vars['--velox-palette-surface'], '#808080')
  assert.equal(vars['--velox-palette-muted'],   '#333333')
  assert.equal(vars['--velox-palette-base'],    '#000000')
})
```

- [ ] **Step 2: Run tests — expect them to fail (module not found)**

```bash
node --import tsx/esm --test tests/unit/themes.test.ts
```

Expected output: Error — `Cannot find module '../../lib/themes.js'`

- [ ] **Step 3: Create `lib/themes.ts`**

```ts
export type PaletteName =
  | 'blue' | 'red' | 'green' | 'purple' | 'yellow'
  | 'cyan' | 'orange' | 'beige' | 'pure_red' | 'monochrome'

export type ThemeMode = 'light' | 'dark'

export interface ThemeConfig {
  palette: PaletteName
  mode: ThemeMode
}

interface Palette {
  name: PaletteName
  colors: [string, string, string, string, string]
}

export const PALETTES: Palette[] = [
  { name: 'blue',       colors: ['#F9F9FA', '#0465ED', '#03354E', '#808180', '#131314'] },
  { name: 'red',        colors: ['#F9F9FA', '#F93E39', '#131314', '#808180', '#000000'] },
  { name: 'green',      colors: ['#F9F9FA', '#07AA73', '#03354E', '#808180', '#131314'] },
  { name: 'purple',     colors: ['#F9F9FA', '#642EF6', '#1A103F', '#808180', '#131314'] },
  { name: 'yellow',     colors: ['#F9F9FA', '#FACA06', '#131314', '#808180', '#000000'] },
  { name: 'cyan',       colors: ['#F9F9FA', '#15CBFD', '#0A4F63', '#808180', '#131314'] },
  { name: 'orange',     colors: ['#F9F9FA', '#FF5A1F', '#3A1F2D', '#808180', '#131314'] },
  { name: 'beige',      colors: ['#F9F9FA', '#D3C6C2', '#6E6A67', '#131314', '#000000'] },
  { name: 'pure_red',   colors: ['#F9F9FA', '#FF2A2A', '#131314', '#808180', '#000000'] },
  { name: 'monochrome', colors: ['#FFFFFF', '#CFCFCF', '#808080', '#333333', '#000000'] },
]

export function getCssVars(
  palette: PaletteName,
  mode: ThemeMode,
): Record<string, string> {
  const p = PALETTES.find(p => p.name === palette)!
  const [c0, c1, c2, c3, c4] = p.colors

  if (mode === 'light') {
    return {
      '--velox-palette-bg':      c0,
      '--velox-palette-accent':  c1,
      '--velox-palette-surface': c2,
      '--velox-palette-muted':   c3,
      '--velox-palette-base':    c4,
    }
  }

  return {
    '--velox-palette-bg':      c4,
    '--velox-palette-accent':  c1,
    '--velox-palette-surface': c2,
    '--velox-palette-muted':   c3,
    '--velox-palette-base':    c0,
  }
}

export function applyTheme(palette: PaletteName, mode: ThemeMode): void {
  if (typeof window === 'undefined') return
  const vars = getCssVars(palette, mode)
  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value)
  }
  document.documentElement.dataset.theme = mode
  localStorage.setItem('velox-theme', JSON.stringify({ palette, mode }))
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
node --import tsx/esm --test tests/unit/themes.test.ts
```

Expected output:
```
✔ PALETTES has exactly 10 entries
✔ PALETTES contains expected names
✔ getCssVars - blue light mode returns correct values
✔ getCssVars - blue dark mode inverts bg and base, keeps others
✔ getCssVars - returns exactly 5 keys
✔ getCssVars - monochrome light mode
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

- [ ] **Step 5: Commit**

```bash
git add lib/themes.ts tests/unit/themes.test.ts
git commit -m "feat(theme): add palette data, getCssVars, and applyTheme to lib/themes"
```

---

## Task 2: Create `lib/getInitialTheme.ts`

**Files:**
- Create: `lib/getInitialTheme.ts`
- Create: `tests/unit/getInitialTheme.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/getInitialTheme.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialThemeScript } from '../../lib/getInitialTheme.js'

test('initialThemeScript is a non-empty string', () => {
  assert.equal(typeof initialThemeScript, 'string')
  assert.ok(initialThemeScript.length > 100)
})

test('initialThemeScript sets all 5 palette CSS vars', () => {
  assert.ok(initialThemeScript.includes('--velox-palette-bg'))
  assert.ok(initialThemeScript.includes('--velox-palette-accent'))
  assert.ok(initialThemeScript.includes('--velox-palette-surface'))
  assert.ok(initialThemeScript.includes('--velox-palette-muted'))
  assert.ok(initialThemeScript.includes('--velox-palette-base'))
})

test('initialThemeScript reads velox-theme storage key', () => {
  assert.ok(initialThemeScript.includes('"velox-theme"') || initialThemeScript.includes("'velox-theme'"))
})

test('initialThemeScript reads legacy veloxui-theme key as fallback', () => {
  assert.ok(initialThemeScript.includes('"veloxui-theme"') || initialThemeScript.includes("'veloxui-theme'"))
})

test('initialThemeScript sets dataset.theme attribute', () => {
  assert.ok(initialThemeScript.includes('dataset.theme'))
})

test('initialThemeScript contains all 10 palette names', () => {
  for (const name of ['blue', 'red', 'green', 'purple', 'yellow', 'cyan', 'orange', 'beige', 'pure_red', 'monochrome']) {
    assert.ok(initialThemeScript.includes(name), `missing palette: ${name}`)
  }
})
```

- [ ] **Step 2: Run tests — expect them to fail**

```bash
node --import tsx/esm --test tests/unit/getInitialTheme.test.ts
```

Expected: Error — `Cannot find module '../../lib/getInitialTheme.js'`

- [ ] **Step 3: Create `lib/getInitialTheme.ts`**

```ts
export const initialThemeScript: string = `(function(){
  var PALETTES={
    blue:["#F9F9FA","#0465ED","#03354E","#808180","#131314"],
    red:["#F9F9FA","#F93E39","#131314","#808180","#000000"],
    green:["#F9F9FA","#07AA73","#03354E","#808180","#131314"],
    purple:["#F9F9FA","#642EF6","#1A103F","#808180","#131314"],
    yellow:["#F9F9FA","#FACA06","#131314","#808180","#000000"],
    cyan:["#F9F9FA","#15CBFD","#0A4F63","#808180","#131314"],
    orange:["#F9F9FA","#FF5A1F","#3A1F2D","#808180","#131314"],
    beige:["#F9F9FA","#D3C6C2","#6E6A67","#131314","#000000"],
    pure_red:["#F9F9FA","#FF2A2A","#131314","#808180","#000000"],
    monochrome:["#FFFFFF","#CFCFCF","#808080","#333333","#000000"]
  };
  var DEFAULT={palette:"blue",mode:"light"};
  var cfg=DEFAULT;
  try{
    var raw=localStorage.getItem("velox-theme")||localStorage.getItem("veloxui-theme");
    if(raw){
      var p=JSON.parse(raw);
      if(p&&PALETTES[p.palette]&&(p.mode==="light"||p.mode==="dark")){
        cfg=p;
        if(!localStorage.getItem("velox-theme")){
          localStorage.setItem("velox-theme",raw);
          localStorage.removeItem("veloxui-theme");
        }
      }
    }
  }catch(e){}
  var c=PALETTES[cfg.palette];
  var isDark=cfg.mode==="dark";
  var el=document.documentElement;
  el.style.setProperty("--velox-palette-bg",     isDark?c[4]:c[0]);
  el.style.setProperty("--velox-palette-accent",  c[1]);
  el.style.setProperty("--velox-palette-surface", c[2]);
  el.style.setProperty("--velox-palette-muted",   c[3]);
  el.style.setProperty("--velox-palette-base",    isDark?c[0]:c[4]);
  el.dataset.theme=cfg.mode;
})();`
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
node --import tsx/esm --test tests/unit/getInitialTheme.test.ts
```

Expected output:
```
✔ initialThemeScript is a non-empty string
✔ initialThemeScript sets all 5 palette CSS vars
✔ initialThemeScript reads velox-theme storage key
✔ initialThemeScript reads legacy veloxui-theme key as fallback
✔ initialThemeScript sets dataset.theme attribute
✔ initialThemeScript contains all 10 palette names
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

- [ ] **Step 5: Commit**

```bash
git add lib/getInitialTheme.ts tests/unit/getInitialTheme.test.ts
git commit -m "feat(theme): add SSR-safe inline script for zero-flash palette init"
```

---

## Task 3: Update `components/theme/theme-config.ts`

**Files:**
- Modify: `components/theme/theme-config.ts`

This file currently contains:
```ts
export type ThemeMode = 'light' | 'dark'
export const THEME_STORAGE_KEY = 'veloxui-theme'
export const DEFAULT_THEME_MODE: ThemeMode = 'light'
```

- [ ] **Step 1: Replace the file contents**

```ts
export const THEME_STORAGE_KEY = 'velox-theme'
export const LEGACY_THEME_STORAGE_KEY = 'veloxui-theme'
```

Note: `ThemeMode` and `ThemeConfig` are now exported from `lib/themes.ts`. `DEFAULT_THEME_MODE` is no longer needed — the default lives in `ThemeProvider.tsx` as a local constant.

- [ ] **Step 2: Commit**

```bash
git add components/theme/theme-config.ts
git commit -m "refactor(theme): update storage key constants, remove types now in lib/themes"
```

---

## Task 4: Replace `components/theme/ThemeProvider.tsx`

**Files:**
- Modify: `components/theme/ThemeProvider.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applyTheme, type PaletteName, type ThemeMode, type ThemeConfig } from '@/lib/themes'
import { THEME_STORAGE_KEY, LEGACY_THEME_STORAGE_KEY } from './theme-config'

const DEFAULT: ThemeConfig = { palette: 'blue', mode: 'light' }

interface ThemeContextValue {
  palette: PaletteName
  mode: ThemeMode
  setPalette: (name: PaletteName) => void
  toggleMode: () => void
  setTheme: (palette: PaletteName, mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readSavedTheme(): ThemeConfig {
  try {
    const raw =
      localStorage.getItem(THEME_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeConfig>
      if (parsed.palette && parsed.mode) {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          localStorage.setItem(THEME_STORAGE_KEY, raw)
          localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
        }
        return parsed as ThemeConfig
      }
    }
  } catch {}
  return DEFAULT
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT)

  useEffect(() => {
    const saved = readSavedTheme()
    setConfig(saved)
    applyTheme(saved.palette, saved.mode)
  }, [])

  const setTheme = useCallback((palette: PaletteName, mode: ThemeMode) => {
    setConfig({ palette, mode })
    applyTheme(palette, mode)
  }, [])

  const setPalette = useCallback((name: PaletteName) => {
    setConfig(prev => {
      applyTheme(name, prev.mode)
      return { palette: name, mode: prev.mode }
    })
  }, [])

  const toggleMode = useCallback(() => {
    setConfig(prev => {
      const next: ThemeMode = prev.mode === 'dark' ? 'light' : 'dark'
      applyTheme(prev.palette, next)
      return { palette: prev.palette, mode: next }
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ palette: config.palette, mode: config.mode, setPalette, toggleMode, setTheme }),
    [config, setPalette, toggleMode, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/theme/ThemeProvider.tsx
git commit -m "feat(theme): replace ThemeProvider with multi-palette + mode context"
```

---

## Task 5: Update `components/theme/ThemeToggle.tsx`

**Files:**
- Modify: `components/theme/ThemeToggle.tsx`

Current file destructures `{ theme, toggleTheme }` from `useTheme()`. The new context exposes `{ mode, toggleMode }` instead.

- [ ] **Step 1: Update the destructure and references**

Replace the entire file:

```tsx
'use client'

import { useSyncExternalStore } from 'react'
import { MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from './ThemeProvider'

function subscribe() {
  return () => undefined
}

export default function ThemeToggle() {
  const { mode, toggleMode } = useTheme()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const isDark = mounted ? mode === 'dark' : false

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="group relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[--border-default] bg-[--bg-overlay]/75 text-[--text-secondary] shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[--accent-border] hover:bg-[--bg-hover] hover:text-[--text-primary] active:scale-[0.98]"
    >
      <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,var(--accent-dim),transparent_68%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <span className="relative">
        {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/theme/ThemeToggle.tsx
git commit -m "refactor(theme): update ThemeToggle to use mode/toggleMode from new context"
```

---

## Task 6: Create `components/theme/ThemeSwitcher.tsx`

**Files:**
- Create: `components/theme/ThemeSwitcher.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { PALETTES } from '@/lib/themes'
import { useTheme } from './ThemeProvider'

export default function ThemeSwitcher() {
  const { palette, mode, setPalette, toggleMode } = useTheme()

  return (
    <div className="flex items-center gap-2">
      {PALETTES.map((p) => (
        <button
          key={p.name}
          type="button"
          onClick={() => setPalette(p.name)}
          aria-label={`Switch to ${p.name} palette`}
          style={{ backgroundColor: p.colors[1] }}
          className={[
            'h-5 w-5 rounded-full transition-all duration-200',
            palette === p.name
              ? 'scale-110 ring-2 ring-offset-2 ring-[--velox-palette-base] ring-offset-[--velox-palette-bg]'
              : 'opacity-60 hover:opacity-100 hover:scale-105',
          ].join(' ')}
        />
      ))}

      <button
        type="button"
        onClick={toggleMode}
        aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[--velox-palette-muted] text-[--velox-palette-base] transition-all duration-200 hover:bg-[--velox-palette-surface]"
      >
        {mode === 'dark' ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/theme/ThemeSwitcher.tsx
git commit -m "feat(theme): add ThemeSwitcher component with 10 palette swatches and mode toggle"
```

---

## Task 7: Update `app/globals.css` — add Tailwind v4 color tokens

**Files:**
- Modify: `app/globals.css`

The existing `@theme inline` block starts at line 134. Add the 5 color tokens at the top of that block, before the font variables.

> **Tailwind v4 note:** `--color-{name}` tokens in `@theme inline` generate `bg-{name}`, `text-{name}`, `border-{name}`, `ring-{name}` utility classes. The `inline` keyword means the generated utilities use `var(--color-{name})` at runtime — enabling dynamic theming. The token `--color-fg` (not `--color-base`) is used to avoid colliding with Tailwind's built-in `text-base` font-size utility.

- [ ] **Step 1: Add 5 color tokens to `@theme inline` block**

Find the line `@theme inline {` in `app/globals.css` and add the 5 tokens as the first entries in the block:

Old block opening:
```css
@theme inline {
  --font-sans: var(--font-body);
```

New block opening:
```css
@theme inline {
  --color-bg:      var(--velox-palette-bg);
  --color-accent:  var(--velox-palette-accent);
  --color-surface: var(--velox-palette-surface);
  --color-muted:   var(--velox-palette-muted);
  --color-fg:      var(--velox-palette-base);

  --font-sans: var(--font-body);
```

- [ ] **Step 2: Verify the dev build picks up the new tokens**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds (exit 0). No CSS errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): register palette CSS vars as Tailwind v4 color tokens"
```

---

## Task 8: Update `app/layout.tsx` — inject inline script

**Files:**
- Modify: `app/layout.tsx`

> Before editing, read `node_modules/next/dist/docs/01-app/02-guides/` for any questions about `dangerouslySetInnerHTML` in Server Components and script placement.

- [ ] **Step 1: Add imports and inject script as first `<body>` child**

Add two imports after the existing imports:

```tsx
import { initialThemeScript } from '@/lib/getInitialTheme'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
```

Remove the old ThemeProvider import (currently `import { ThemeProvider } from '@/components/theme/ThemeProvider'` — it may already match; verify the path is unchanged).

Update the `<body>` element — add the script as its very first child:

```tsx
<body className="min-h-screen bg-[--bg-base] font-body text-[--text-primary] antialiased">
  <script dangerouslySetInnerHTML={{ __html: initialThemeScript }} />
  <ThemeProvider>
    {children}
    <ToastProvider />
  </ThemeProvider>
</body>
```

The complete updated `RootLayout` function:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="light"
      className={`${inter.variable} ${geistMono.variable}`}
    >
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[--bg-base] font-body text-[--text-primary] antialiased">
        <script dangerouslySetInnerHTML={{ __html: initialThemeScript }} />
        <ThemeProvider>
          {children}
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

The full imports block at the top of the file:

```tsx
import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { initialThemeScript } from '@/lib/getInitialTheme'
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(theme): inject SSR-safe palette init script in layout before hydration"
```

---

## Task 9: Playwright integration smoke test

**Files:**
- Create: `tests/theme-switcher.spec.ts`

- [ ] **Step 1: Write the Playwright test**

Create `tests/theme-switcher.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('multi-palette theme system', () => {
  test('default palette sets blue CSS vars on <html>', async ({ page }) => {
    await page.goto('/')
    const bg = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--velox-palette-bg').trim()
    )
    // Blue palette light mode: colors[0] = #F9F9FA
    expect(bg).toBe('#F9F9FA')
  })

  test('default data-theme is "light"', async ({ page }) => {
    await page.goto('/')
    const theme = await page.evaluate(() =>
      document.documentElement.dataset.theme
    )
    expect(theme).toBe('light')
  })

  test('saved palette is restored from localStorage on reload', async ({ page }) => {
    await page.goto('/')

    // Simulate saving a purple dark theme to localStorage
    await page.evaluate(() => {
      localStorage.setItem('velox-theme', JSON.stringify({ palette: 'purple', mode: 'dark' }))
    })

    await page.reload()

    const [bg, theme] = await page.evaluate(() => [
      document.documentElement.style.getPropertyValue('--velox-palette-bg').trim(),
      document.documentElement.dataset.theme,
    ])

    // Purple dark: bg = colors[4] = #131314
    expect(bg).toBe('#131314')
    expect(theme).toBe('dark')
  })

  test('legacy veloxui-theme key is migrated to velox-theme on load', async ({ page }) => {
    await page.goto('/')

    await page.evaluate(() => {
      localStorage.removeItem('velox-theme')
      localStorage.setItem('veloxui-theme', JSON.stringify({ palette: 'green', mode: 'light' }))
    })

    await page.reload()

    const [newKey, legacyKey] = await page.evaluate(() => [
      localStorage.getItem('velox-theme'),
      localStorage.getItem('veloxui-theme'),
    ])

    expect(newKey).not.toBeNull()
    expect(legacyKey).toBeNull()
  })
})
```

- [ ] **Step 2: Start the dev server (in a separate terminal if not running)**

```bash
npm run dev
```

Wait for: `▲ Next.js 16.2.0 — Local: http://localhost:3000`

- [ ] **Step 3: Run the Playwright tests**

```bash
npx playwright test tests/theme-switcher.spec.ts
```

Expected output:
```
Running 4 tests using 1 worker

  ✓ multi-palette theme system › default palette sets blue CSS vars on <html>
  ✓ multi-palette theme system › default data-theme is "light"
  ✓ multi-palette theme system › saved palette is restored from localStorage on reload
  ✓ multi-palette theme system › legacy veloxui-theme key is migrated to velox-theme on load

  4 passed (8s)
```

- [ ] **Step 4: Commit**

```bash
git add tests/theme-switcher.spec.ts
git commit -m "test(theme): add Playwright smoke tests for palette init and localStorage migration"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ 10 palettes with correct color data — Task 1
- ✅ `getCssVars(palette, mode)` — Task 1
- ✅ `applyTheme(palette, mode)` with `typeof window` guard — Task 1
- ✅ `initialThemeScript` inline, no imports, sets 5 vars + `data-theme` — Task 2
- ✅ Legacy key migration (`veloxui-theme` → `velox-theme`) — Tasks 2, 4, 9
- ✅ `ThemeProvider` with `palette`, `mode`, `setPalette`, `toggleMode`, `setTheme` — Task 4
- ✅ `useTheme()` stays in provider file, no import path changes — Task 4
- ✅ `ThemeToggle.tsx` updated — Task 5
- ✅ `ThemeSwitcher.tsx` with 10 swatches + inline SVG sun/moon — Task 6
- ✅ Tailwind v4 tokens in `@theme inline` — Task 7
- ✅ Script injected as first `<body>` child — Task 8
- ✅ `suppressHydrationWarning` on `<html>` — already present, Task 8 preserves it
- ✅ SSR-safe: `applyTheme` guards `typeof window === 'undefined'` — Task 1

**Known deviation from spec:**
- `--color-fg` is used instead of `--color-base` in Tailwind tokens to avoid collision with Tailwind's built-in `text-base` font-size utility. Use `text-fg` / `bg-fg` instead of `text-base` / `bg-base` in components. All other token names match the spec exactly.
