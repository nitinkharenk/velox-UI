# veloxui — Complete UI Overhaul (Local Dev, No Auth, No Payments)
## Paste into Claude Code / Cursor — rewrites UI only, zero backend changes

---

## SCOPE

Touch ONLY these:
- `app/globals.css`
- `tailwind.config.ts`
- `app/**/layout.tsx`
- `app/**/page.tsx`
- `components/**/*.tsx` (UI layer only)

Never touch:
- `app/api/**`
- `lib/**`
- `types/**`
- `scripts/**`
- `supabase/**`

No new npm packages except `lucide-react` and `clsx` if not installed.
No auth. No payments. No light mode. Always dark.

---

## STEP 1 — app/globals.css

Replace entire file:

```css
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-base:      #080808;
  --bg-surface:   #0f0f0f;
  --bg-elevated:  #161616;
  --bg-overlay:   #1e1e1e;
  --bg-hover:     rgba(255,255,255,0.04);
  --bg-active:    rgba(255,255,255,0.07);

  --border-subtle:  rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-strong:  rgba(255,255,255,0.18);

  --text-primary:   #f0efec;
  --text-secondary: #8a8884;
  --text-tertiary:  #4a4845;
  --text-disabled:  #2e2c2a;

  --accent:        #e8ff47;
  --accent-dim:    rgba(232,255,71,0.10);
  --accent-border: rgba(232,255,71,0.22);
  --accent-text:   #c8dd2a;

  --success:      #4ade80;
  --success-dim:  rgba(74,222,128,0.10);
  --warning:      #fbbf24;
  --warning-dim:  rgba(251,191,36,0.10);
  --danger:       #f87171;
  --danger-dim:   rgba(248,113,113,0.10);
  --info:         #60a5fa;
  --info-dim:     rgba(96,165,250,0.10);
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  background: #080808;
  color: #f0efec;
  font-family: 'Geist', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

::selection { background: rgba(232,255,71,0.15); color: #f0efec; }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
```

---

## STEP 2 — tailwind.config.ts

Replace entire file:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Geist', 'system-ui', 'sans-serif'],
        mono:    ['Geist Mono', 'Fira Code', 'monospace'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
      },
      keyframes: {
        fadeUp:  { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        blink:   { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.2' } },
        ping2:   { '0%': { transform: 'scale(1)', opacity: '0.6' }, '100%': { transform: 'scale(2)', opacity: '0' } },
      },
      animation: {
        'fade-up':  'fadeUp 0.3s ease forwards',
        'fade-in':  'fadeIn 0.25s ease forwards',
        'shimmer':  'shimmer 1.6s linear infinite',
        'blink':    'blink 1.4s ease-in-out infinite',
        'ping2':    'ping2 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
```

---

## STEP 3 — PRIMITIVE UI COMPONENTS

Create every file below exactly as written. Do not skip any.

### `components/ui/cx.ts`
```typescript
export function cx(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(' ')
}
```

### `components/ui/Badge.tsx`
```tsx
import { cx } from './cx'

type V = 'default'|'accent'|'success'|'warning'|'danger'|'info'|'purple'

const map: Record<V, string> = {
  default: 'bg-white/5 text-[#8a8884] border-white/6',
  accent:  'bg-[rgba(232,255,71,0.10)] text-[#c8dd2a] border-[rgba(232,255,71,0.22)]',
  success: 'bg-[rgba(74,222,128,0.10)] text-[#4ade80] border-[rgba(74,222,128,0.20)]',
  warning: 'bg-[rgba(251,191,36,0.10)] text-[#fbbf24] border-[rgba(251,191,36,0.20)]',
  danger:  'bg-[rgba(248,113,113,0.10)] text-[#f87171] border-[rgba(248,113,113,0.20)]',
  info:    'bg-[rgba(96,165,250,0.10)] text-[#60a5fa] border-[rgba(96,165,250,0.20)]',
  purple:  'bg-[rgba(167,139,250,0.10)] text-[#a78bfa] border-[rgba(167,139,250,0.20)]',
}

export function Badge({ variant='default', dot, children }: {
  variant?: V; dot?: boolean; children: React.ReactNode
}) {
  return (
    <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-mono text-[10px] font-medium tracking-wider uppercase', map[variant])}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-blink" />}
      {children}
    </span>
  )
}
```

### `components/ui/Button.tsx`
```tsx
import { cx } from './cx'
import { Loader2 } from 'lucide-react'

type V = 'primary'|'secondary'|'ghost'|'danger'|'accent'
type S = 'xs'|'sm'|'md'|'lg'|'icon'

const vmap: Record<V,string> = {
  primary:   'bg-white text-black hover:bg-white/90 font-medium',
  secondary: 'bg-[#161616] border border-[rgba(255,255,255,0.10)] text-[#f0efec] hover:bg-[#1e1e1e] hover:border-[rgba(255,255,255,0.18)]',
  ghost:     'text-[#8a8884] hover:text-[#f0efec] hover:bg-[rgba(255,255,255,0.04)] border border-transparent',
  danger:    'bg-[rgba(248,113,113,0.10)] text-[#f87171] border border-[rgba(248,113,113,0.20)] hover:bg-[rgba(248,113,113,0.18)]',
  accent:    'bg-[#e8ff47] text-black font-semibold hover:bg-[#e8ff47]/90',
}
const smap: Record<S,string> = {
  xs:   'h-6 px-2 text-[11px] rounded',
  sm:   'h-7 px-3 text-xs rounded-md',
  md:   'h-8 px-4 text-sm rounded-md',
  lg:   'h-10 px-5 text-sm rounded-md',
  icon: 'h-8 w-8 rounded-md flex items-center justify-center',
}

export function Button({ variant='secondary', size='md', loading, disabled, className, children, ...p }: {
  variant?: V; size?: S; loading?: boolean; className?: string;
  children?: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} disabled={disabled||loading} className={cx(
      'inline-flex items-center justify-center gap-1.5 transition-all duration-100 cursor-pointer select-none',
      'active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none',
      vmap[variant], smap[size], className
    )}>
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {children}
    </button>
  )
}
```

### `components/ui/Input.tsx`
```tsx
import { cx } from './cx'
export function Input({ label, error, icon, className, ...p }: {
  label?: string; error?: string; icon?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-[10px] font-mono text-[#4a4845] uppercase tracking-wider">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4a4845]">{icon}</span>}
        <input {...p} className={cx(
          'w-full h-9 bg-[#161616] border rounded-md text-sm font-mono text-[#f0efec]',
          'placeholder:text-[#3a3835] focus:outline-none transition-colors duration-150',
          error ? 'border-[rgba(248,113,113,0.4)] focus:border-[rgba(248,113,113,0.6)]'
                : 'border-[rgba(255,255,255,0.10)] focus:border-[rgba(255,255,255,0.26)]',
          icon ? 'pl-8 pr-3' : 'px-3', className
        )} />
      </div>
      {error && <p className="text-[10px] font-mono text-[#f87171]">{error}</p>}
    </div>
  )
}
```

### `components/ui/Textarea.tsx`
```tsx
import { cx } from './cx'
export function Textarea({ label, className, ...p }: {
  label?: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-[10px] font-mono text-[#4a4845] uppercase tracking-wider">{label}</label>}
      <textarea {...p} className={cx(
        'w-full bg-[#161616] border border-[rgba(255,255,255,0.10)] rounded-xl',
        'px-3 py-2.5 text-sm font-mono text-[#f0efec] leading-relaxed resize-y',
        'placeholder:text-[#3a3835] focus:outline-none focus:border-[rgba(255,255,255,0.26)]',
        'transition-colors duration-150 min-h-[90px]', className
      )} />
    </div>
  )
}
```

### `components/ui/Select.tsx`
```tsx
import { cx } from './cx'
import { ChevronDown } from 'lucide-react'
export function Select({ label, className, children, ...p }: {
  label?: string
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-[10px] font-mono text-[#4a4845] uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <select {...p} className={cx(
          'w-full h-9 bg-[#161616] border border-[rgba(255,255,255,0.10)] rounded-md',
          'pl-3 pr-8 text-sm font-mono text-[#f0efec] appearance-none cursor-pointer',
          'focus:outline-none focus:border-[rgba(255,255,255,0.26)] transition-colors', className
        )}>{children}</select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a4845] pointer-events-none" />
      </div>
    </div>
  )
}
```

### `components/ui/Card.tsx`
```tsx
import { cx } from './cx'
const vs = {
  default:  'bg-[#0f0f0f] border border-[rgba(255,255,255,0.06)]',
  elevated: 'bg-[#161616] border border-[rgba(255,255,255,0.10)]',
  ghost:    'bg-transparent border border-[rgba(255,255,255,0.06)]',
  accent:   'bg-[#0f0f0f] border border-[rgba(232,255,71,0.20)]',
}
export function Card({ variant='default', padding='md', className, children }: {
  variant?: keyof typeof vs; padding?: 'none'|'sm'|'md'|'lg'; className?: string; children: React.ReactNode
}) {
  const ps = { none:'', sm:'p-3', md:'p-4', lg:'p-6' }
  return <div className={cx('rounded-xl', vs[variant], ps[padding], className)}>{children}</div>
}
```

### `components/ui/StatusDot.tsx`
```tsx
import { cx } from './cx'
type S = 'pending'|'enriching'|'enriched'|'generating'|'generated'|'validating'|'validated'|'reviewing'|'approved'|'rejected'|'failed'
const c: Record<S,string> = {
  pending:'bg-[#3a3835]', enriching:'bg-[#60a5fa]', enriched:'bg-[#60a5fa]',
  generating:'bg-[#a78bfa]', generated:'bg-[#a78bfa]', validating:'bg-[#fbbf24]',
  validated:'bg-[#fbbf24]', reviewing:'bg-[#e8ff47]', approved:'bg-[#4ade80]',
  rejected:'bg-[#f87171]', failed:'bg-[#f87171]',
}
const pulse: S[] = ['enriching','generating','validating']
export function StatusDot({ status, size='sm' }: { status: S; size?: 'sm'|'md' }) {
  const dim = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'
  return (
    <span className="relative inline-flex flex-shrink-0">
      <span className={cx('rounded-full', dim, c[status])} />
      {pulse.includes(status) && (
        <span className={cx('absolute inset-0 rounded-full animate-ping2', c[status])} />
      )}
    </span>
  )
}
```

### `components/ui/Skeleton.tsx`
```tsx
import { cx } from './cx'
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('rounded bg-[#161616] bg-gradient-to-r from-[#161616] via-[rgba(255,255,255,0.04)] to-[#161616] bg-[length:200%_100%] animate-shimmer', className)} />
}
```

### `components/ui/EmptyState.tsx`
```tsx
import { Button } from './Button'
export function EmptyState({ icon: Icon, title, desc, action, onAction }: {
  icon: React.ElementType; title: string; desc: string; action?: string; onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
      <div className="w-10 h-10 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#4a4845]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[#8a8884]">{title}</p>
        <p className="text-xs text-[#4a4845] max-w-[220px] leading-relaxed">{desc}</p>
      </div>
      {action && onAction && <Button variant="secondary" size="sm" onClick={onAction}>{action}</Button>}
    </div>
  )
}
```

### `components/ui/Divider.tsx`
```tsx
export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px w-full bg-[rgba(255,255,255,0.06)]" />
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
      <span className="text-[10px] font-mono text-[#4a4845] uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
    </div>
  )
}
```

### `components/ui/Toast.tsx`
```tsx
'use client'
import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cx } from './cx'

type T = 'success'|'error'|'info'
interface Toast { id: string; type: T; title: string; msg?: string }

let _listeners: ((t: Toast[]) => void)[] = []
let _toasts: Toast[] = []

export const toast = {
  success: (title: string, msg?: string) => _push('success', title, msg),
  error:   (title: string, msg?: string) => _push('error', title, msg),
  info:    (title: string, msg?: string) => _push('info', title, msg),
}
function _push(type: T, title: string, msg?: string) {
  const id = Math.random().toString(36).slice(2)
  _toasts = [..._toasts, { id, type, title, msg }]
  _listeners.forEach(f => f(_toasts))
  setTimeout(() => { _toasts = _toasts.filter(t => t.id !== id); _listeners.forEach(f => f(_toasts)) }, 3000)
}

const icons = { success: CheckCircle, error: AlertCircle, info: Info }
const accents = { success: 'border-l-[#4ade80]', error: 'border-l-[#f87171]', info: 'border-l-[#60a5fa]' }
const icolor  = { success: 'text-[#4ade80]', error: 'text-[#f87171]', info: 'text-[#60a5fa]' }

export function ToastProvider() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => { _listeners.push(setItems); return () => { _listeners = _listeners.filter(f => f !== setItems) } }, [])
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map(t => {
        const Icon = icons[t.type]
        return (
          <div key={t.id} className={cx(
            'pointer-events-auto flex items-start gap-3 bg-[#1e1e1e] border border-l-2 border-[rgba(255,255,255,0.10)] rounded-xl px-4 py-3 min-w-[260px] max-w-[340px] animate-fade-up',
            accents[t.type]
          )}>
            <Icon className={cx('w-4 h-4 mt-0.5 flex-shrink-0', icolor[t.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#f0efec]">{t.title}</p>
              {t.msg && <p className="text-xs text-[#8a8884] mt-0.5">{t.msg}</p>}
            </div>
            <button onClick={() => { _toasts = _toasts.filter(x => x.id !== t.id); _listeners.forEach(f => f(_toasts)) }}
              className="text-[#4a4845] hover:text-[#8a8884] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

---

## STEP 4 — ROOT LAYOUT

`app/layout.tsx`:
```tsx
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata = {
  title: 'veloxui',
  description: 'AI-powered React component pipeline',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#080808] text-[#f0efec] antialiased">
        {children}
        <ToastProvider />
      </body>
    </html>
  )
}
```

---

## STEP 5 — DASHBOARD LAYOUT

`app/(dashboard)/layout.tsx`:
```tsx
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar }  from '@/components/layout/Topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#080808]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
```

---

## STEP 6 — SIDEBAR

`components/layout/Sidebar.tsx`:
```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from '@/components/ui/cx'
import { LayoutGrid, Lightbulb, Sparkles, Eye, Zap, SlidersHorizontal } from 'lucide-react'

const NAV = [
  { label: 'Browse',   href: '/',                   icon: LayoutGrid  },
  { label: 'Ideas',    href: '/pipeline/ideas',      icon: Lightbulb   },
  { label: 'Generate', href: '/pipeline/generate',   icon: Sparkles    },
  { label: 'Review',   href: '/pipeline/review',     icon: Eye         },
  { label: 'Settings', href: '/settings',            icon: SlidersHorizontal },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-[52px] md:w-[200px] flex-shrink-0 h-full flex flex-col bg-[#080808] border-r border-[rgba(255,255,255,0.06)] transition-all duration-200">

      {/* Logo */}
      <div className="h-12 px-4 flex items-center gap-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="w-6 h-6 rounded-md bg-[#e8ff47] flex items-center justify-center flex-shrink-0">
          <Zap className="w-3.5 h-3.5 text-black" />
        </div>
        <span className="hidden md:block font-display italic text-base text-[#f0efec] leading-none whitespace-nowrap overflow-hidden">
          veloxui
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        <p className="hidden md:block px-2 pt-1 pb-2 text-[9px] font-mono text-[#3a3835] uppercase tracking-[0.14em]">
          Workspace
        </p>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link key={href} href={href} className={cx(
              'relative group flex items-center gap-2.5 h-8 rounded-md px-2 md:px-3',
              'text-sm transition-all duration-100',
              active
                ? 'bg-[rgba(255,255,255,0.07)] text-[#f0efec]'
                : 'text-[#8a8884] hover:text-[#f0efec] hover:bg-[rgba(255,255,255,0.04)]'
            )}>
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#e8ff47] rounded-r-full" />
              )}
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:block text-sm truncate">{label}</span>

              {/* Tooltip on collapsed */}
              <span className="md:hidden absolute left-full ml-2 px-2 py-1 bg-[#1e1e1e] border border-[rgba(255,255,255,0.10)] rounded-md text-xs font-mono text-[#f0efec] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Local indicator */}
      <div className="px-2 pb-3">
        <div className={cx(
          'flex items-center gap-2 px-2 py-1.5 rounded-md',
          'bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.10)]'
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] flex-shrink-0" />
          <span className="hidden md:block text-[10px] font-mono text-[#4ade80]">localhost</span>
        </div>
      </div>
    </aside>
  )
}
```

---

## STEP 7 — TOPBAR

`components/layout/Topbar.tsx`:
```tsx
'use client'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const LABELS: Record<string, string> = {
  '/':                  'Browse',
  '/pipeline/ideas':    'Ideas',
  '/pipeline/generate': 'Generate',
  '/pipeline/review':   'Review',
  '/settings':          'Settings',
}

export function Topbar() {
  const path = usePathname()
  const segments = path === '/' ? ['Browse'] : ['Pipeline', LABELS[path] ?? '']

  return (
    <header className="h-12 flex-shrink-0 flex items-center justify-between px-5 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(8,8,8,0.9)] backdrop-blur-md">
      <div className="flex items-center gap-1 text-xs font-mono">
        {segments.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-[#3a3835]" />}
            <span className={i === segments.length - 1 ? 'text-[#f0efec]' : 'text-[#4a4845]'}>{s}</span>
          </span>
        ))}
      </div>

      {/* Keyboard shortcut hint */}
      <div className="flex items-center gap-1 text-[10px] font-mono text-[#3a3835]">
        <kbd className="px-1.5 py-0.5 rounded bg-[#161616] border border-[rgba(255,255,255,0.06)] text-[#4a4845]">⌘K</kbd>
        <span>Search</span>
      </div>
    </header>
  )
}
```

---

## STEP 8 — BROWSE PAGE (homepage)

`app/(dashboard)/page.tsx` or `app/page.tsx` — whichever is the library/search page:

```tsx
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { SearchBar } from '@/components/assets/SearchBar'
import { AssetGrid } from '@/components/assets/AssetGrid'

export default function BrowsePage() {
  return (
    <div className="px-6 py-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-display italic text-[#f0efec]">Component Library</h1>
        <p className="text-sm text-[#8a8884] mt-0.5">Search, preview, copy.</p>
      </div>

      <SearchBar />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {['All','Animations','Components','Templates','Framer Motion','GSAP'].map((f, i) => (
          <button key={f} className={cx(
            'h-7 px-3 rounded-full text-xs font-mono border transition-colors duration-100',
            i === 0
              ? 'bg-[rgba(232,255,71,0.10)] border-[rgba(232,255,71,0.22)] text-[#c8dd2a]'
              : 'bg-transparent border-[rgba(255,255,255,0.08)] text-[#8a8884] hover:text-[#f0efec] hover:border-[rgba(255,255,255,0.14)]'
          )}>{f}</button>
        ))}
      </div>

      <Suspense fallback={<GridSkeleton />}>
        <AssetGrid />
      </Suspense>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({length:6}).map((_,i) => (
        <div key={i} className="rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <Skeleton className="aspect-video w-full" />
          <div className="p-3 space-y-2 border-t border-[rgba(255,255,255,0.06)]">
            <Skeleton className="h-3 w-28" />
            <div className="flex gap-1.5"><Skeleton className="h-2 w-14" /><Skeleton className="h-2 w-10" /></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Need cx import
import { cx } from '@/components/ui/cx'
```

---

## STEP 9 — ASSET CARD

Replace `components/assets/AssetCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, Lock, ExternalLink } from 'lucide-react'
import { cx } from '@/components/ui/cx'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import type { Asset } from '@/types/asset'

export function AssetCard({ asset }: { asset: Asset }) {
  const [copied, setCopied] = useState(false)

  async function copy(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!asset.code) return
    await navigator.clipboard.writeText(asset.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const complexityVariant = { low: 'success', medium: 'default', high: 'warning' } as const

  return (
    <Link href={`/asset/${asset.slug}`} className="group block">
      <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[#0f0f0f] transition-all duration-150 hover:border-[rgba(255,255,255,0.12)] hover:-translate-y-px">

        {/* Preview */}
        <div className="aspect-video bg-[#080808] relative overflow-hidden">
          <iframe
            src={`/api/preview/compile?slug=${asset.slug}`}
            sandbox="allow-scripts"
            className="w-full h-full border-0 pointer-events-none"
            title={asset.name}
            loading="lazy"
          />

          {/* Pro overlay */}
          {asset.is_pro && (
            <div className="absolute inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-[#e8ff47]" />
              <Badge variant="accent">Pro</Badge>
            </div>
          )}

          {/* Hover actions */}
          <div className="absolute inset-0 flex items-end justify-between p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <div className="flex gap-1">
              {asset.tech?.map(t => (
                <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-[#8a8884] backdrop-blur-sm border border-white/8">{t}</span>
              ))}
            </div>
            <Link href={`/asset/${asset.slug}`} onClick={e => e.stopPropagation()}
              className="w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-[#8a8884] hover:text-[#f0efec] transition-colors">
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-2">
          <StatusDot status={asset.status ?? 'approved'} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#f0efec] truncate leading-tight">{asset.name}</p>
            <p className="text-[10px] font-mono text-[#4a4845] mt-0.5">{asset.category} · {asset.complexity}</p>
          </div>
          {!asset.is_pro && asset.code && (
            <button onClick={copy} className={cx(
              'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
              'border transition-all duration-150',
              'opacity-0 group-hover:opacity-100',
              copied
                ? 'border-[rgba(74,222,128,0.40)] text-[#4ade80] bg-[rgba(74,222,128,0.08)]'
                : 'border-[rgba(255,255,255,0.08)] text-[#4a4845] hover:text-[#f0efec] hover:border-[rgba(255,255,255,0.18)]'
            )}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
```

---

## STEP 10 — IDEAS PAGE

This is the most used page. Replace `app/(dashboard)/pipeline/ideas/page.tsx`.
Keep all existing state management and API calls — only replace the JSX/styles.

The page must have a 2-column split layout: idea list on the left, detail panel on the right.

```tsx
'use client'
import { useState } from 'react'
import { Plus, Search, Lightbulb, ChevronRight, Trash2, Sparkles, Code2 } from 'lucide-react'
import { cx } from '@/components/ui/cx'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { Divider } from '@/components/ui/Divider'

// Keep all existing logic (useEffect, fetch calls, state for ideas, selectedIdea, etc.)
// Only the return JSX changes.

export default function IdeasPage() {
  // ... keep all existing state and logic unchanged ...

  return (
    <div className="flex h-full animate-fade-in">

      {/* ── Left panel — idea list ─────────────────────────────────── */}
      <div className="w-[280px] flex-shrink-0 h-full flex flex-col border-r border-[rgba(255,255,255,0.06)]">

        {/* Search */}
        <div className="p-3 border-b border-[rgba(255,255,255,0.06)]">
          <Input
            placeholder="Search ideas…"
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}           // keep existing state variable name
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-1">
          {filteredIdeas.length === 0 ? (
            <EmptyState icon={Lightbulb} title="No ideas yet" desc="Add your first idea below." />
          ) : (
            filteredIdeas.map(idea => (
              <button
                key={idea.id}
                onClick={() => setSelectedIdea(idea)}
                className={cx(
                  'w-full flex items-center gap-2.5 h-12 px-3 text-left',
                  'border-b border-[rgba(255,255,255,0.04)] transition-colors duration-100',
                  selectedIdea?.id === idea.id
                    ? 'bg-[rgba(255,255,255,0.07)]'
                    : 'hover:bg-[rgba(255,255,255,0.04)]'
                )}
              >
                <StatusDot status={idea.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0efec] truncate leading-tight">{idea.name || 'Untitled'}</p>
                  <p className="text-[10px] font-mono text-[#4a4845] mt-0.5">{idea.category} · {idea.type}</p>
                </div>
                {selectedIdea?.id === idea.id && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#4a4845] flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Add button */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
          <Button variant="accent" size="sm" className="w-full" onClick={handleAddIdea}>
            <Plus className="w-3.5 h-3.5" />
            Add idea
          </Button>
        </div>
      </div>

      {/* ── Right panel — detail ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!selectedIdea ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <Lightbulb className="w-8 h-8 text-[#3a3835] mx-auto" />
              <p className="text-sm text-[#4a4845]">Select an idea to edit</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-2xl">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <input
                  value={selectedIdea.name}
                  onChange={e => updateSelectedIdea({ name: e.target.value })}
                  placeholder="Idea name…"
                  className="w-full bg-transparent text-xl font-display italic text-[#f0efec] placeholder:text-[#3a3835] focus:outline-none border-b border-transparent focus:border-[rgba(255,255,255,0.12)] transition-colors pb-1"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  variant={
                    selectedIdea.status === 'approved' ? 'success' :
                    selectedIdea.status === 'rejected' ? 'danger' :
                    selectedIdea.status === 'enriched' ? 'info' :
                    selectedIdea.status === 'pending' ? 'default' : 'warning'
                  }
                  dot={['enriching','generating','validating'].includes(selectedIdea.status)}
                >
                  {selectedIdea.status}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteIdea(selectedIdea.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-[#4a4845] hover:text-[#f87171]" />
                </Button>
              </div>
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-4">
              <Select label="Type" value={selectedIdea.type} onChange={e => updateSelectedIdea({ type: e.target.value })}>
                <option>hover</option><option>click</option><option>scroll</option><option>entrance</option><option>loop</option>
              </Select>
              <Select label="Category" value={selectedIdea.category} onChange={e => updateSelectedIdea({ category: e.target.value })}>
                <option>animation</option><option>component</option><option>template</option>
              </Select>
              <Select label="Complexity" value={selectedIdea.complexity} onChange={e => updateSelectedIdea({ complexity: e.target.value })}>
                <option>low</option><option>medium</option><option>high</option>
              </Select>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-[#4a4845] uppercase tracking-wider">Tech</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Tailwind','Framer Motion','GSAP','CSS'].map(t => (
                    <button key={t} onClick={() => toggleTech(t)}
                      className={cx(
                        'h-6 px-2.5 rounded-full text-[10px] font-mono border transition-colors duration-100',
                        selectedIdea.tech?.includes(t)
                          ? 'bg-[rgba(232,255,71,0.10)] border-[rgba(232,255,71,0.22)] text-[#c8dd2a]'
                          : 'bg-transparent border-[rgba(255,255,255,0.08)] text-[#4a4845] hover:text-[#8a8884]'
                      )}
                    >{t}</button>
                  ))}
                </div>
              </div>
            </div>

            <Textarea
              label="Feel / description"
              placeholder="e.g. premium, springy, satisfying — like ink bleeding on paper"
              value={selectedIdea.feel}
              onChange={e => updateSelectedIdea({ feel: e.target.value })}
              className="min-h-[80px]"
            />

            {/* Enriched spec viewer */}
            {selectedIdea.enriched_spec && (
              <div className="space-y-2">
                <Divider label="Enriched spec" />
                <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-xs leading-relaxed max-h-[200px] overflow-y-auto">
                  <pre className="text-[#8a8884] whitespace-pre-wrap">
                    {JSON.stringify(selectedIdea.enriched_spec, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Stage strip — from StageStrip component (already built) */}
            {/* Keep existing StageStrip usage here unchanged */}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={handleEnrich}
                loading={isRunning && currentStage === 'enrich'}
                disabled={isRunning}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Enrich with AI
              </Button>
              <Button
                variant="accent"
                size="md"
                className="flex-1"
                onClick={handleGenerate}
                loading={isRunning && currentStage !== 'enrich'}
                disabled={isRunning}
              >
                <Code2 className="w-3.5 h-3.5" />
                Generate code
              </Button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
```

---

## STEP 11 — GENERATE PAGE

Replace `app/(dashboard)/pipeline/generate/page.tsx`.
Keep all existing SSE logic and state — only replace JSX.

```tsx
'use client'
// Keep all existing imports, state, and SSE logic

export default function GeneratePage() {
  // ... keep all existing logic ...

  return (
    <div className="flex h-full animate-fade-in">

      {/* ── Left — queue ──────────────────────────────────────────── */}
      <div className="w-[260px] flex-shrink-0 flex flex-col border-r border-[rgba(255,255,255,0.06)]">

        <div className="p-3 border-b border-[rgba(255,255,255,0.06)]">
          <p className="text-xs font-mono text-[#4a4845] uppercase tracking-wider mb-3">Pending ideas</p>
          <Button variant="accent" size="sm" className="w-full" onClick={handleRunSelected} disabled={isRunning || selected.length === 0}>
            <Sparkles className="w-3.5 h-3.5" />
            {isRunning ? 'Running…' : `Run ${selected.length > 0 ? selected.length : ''} selected`}
          </Button>
        </div>

        {/* Idea list with checkboxes */}
        <div className="flex-1 overflow-y-auto py-1">
          {pendingIdeas.map(idea => {
            const isSel = selected.includes(idea.id)
            const progress = ideaProgress[idea.id]
            return (
              <div key={idea.id} className={cx(
                'flex items-center gap-2.5 px-3 py-2.5 border-b border-[rgba(255,255,255,0.04)]',
                'cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.04)]',
                isSel && 'bg-[rgba(255,255,255,0.04)]'
              )} onClick={() => toggleSelect(idea.id)}>
                {/* Checkbox */}
                <div className={cx(
                  'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                  isSel
                    ? 'bg-[#e8ff47] border-[#e8ff47]'
                    : 'bg-transparent border-[rgba(255,255,255,0.14)]'
                )}>
                  {isSel && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#f0efec] truncate">{idea.name}</p>
                  {/* Progress bar when running */}
                  {progress !== undefined && (
                    <div className="mt-1 h-0.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#e8ff47] rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  {progress === undefined && (
                    <p className="text-[10px] font-mono text-[#4a4845] mt-0.5">{idea.type} · {idea.complexity}</p>
                  )}
                </div>
                <StatusDot status={idea.status} />
              </div>
            )
          })}
        </div>

        {/* Select all */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
          <Button variant="ghost" size="xs" className="w-full" onClick={selectAll}>
            Select all ({pendingIdeas.length})
          </Button>
        </div>
      </div>

      {/* ── Right — live log terminal ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Terminal header */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.06)] bg-[#0f0f0f]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f87171]" />
              <span className="w-3 h-3 rounded-full bg-[#fbbf24]" />
              <span className="w-3 h-3 rounded-full bg-[#4ade80]" />
            </div>
            <span className="text-[11px] font-mono text-[#4a4845]">pipeline log</span>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8ff47] animate-ping2" />
                <span className="text-[10px] font-mono text-[#e8ff47]">running</span>
              </div>
            )}
            <Button variant="ghost" size="xs" onClick={clearLogs}>clear</Button>
          </div>
        </div>

        {/* Log lines */}
        <div ref={logRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-[#080808]">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#3a3835]">Select ideas and click Run to start.</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={cx('flex gap-3 leading-relaxed animate-fade-up', 'items-start')}>
                <span className="text-[#3a3835] flex-shrink-0 tabular-nums">{log.time}</span>
                <span className={cx(
                  'flex-shrink-0',
                  log.event === 'error'   && 'text-[#f87171]',
                  log.event === 'success' && 'text-[#4ade80]',
                  log.event === 'warn'    && 'text-[#fbbf24]',
                  log.event === 'info'    && 'text-[#60a5fa]',
                  !['error','success','warn','info'].includes(log.event) && 'text-[#4a4845]',
                )}>
                  {log.event}
                </span>
                <span className="text-[#8a8884] flex-1 break-all">{log.message}</span>
              </div>
            ))
          )}
          {isRunning && (
            <div className="flex gap-3 items-center">
              <span className="text-[#3a3835]">{new Date().toLocaleTimeString('en', {hour12:false})}</span>
              <span className="text-[#e8ff47] animate-blink">█</span>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="h-8 flex items-center gap-4 px-4 border-t border-[rgba(255,255,255,0.06)] bg-[#0f0f0f]">
          <span className="text-[10px] font-mono text-[#4a4845]">
            {completedCount ?? 0} / {totalCount ?? 0} complete
          </span>
          {errorCount > 0 && (
            <span className="text-[10px] font-mono text-[#f87171]">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
          )}
          {elapsedTime && (
            <span className="text-[10px] font-mono text-[#4a4845] ml-auto">{elapsedTime}</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## STEP 12 — REVIEW PAGE

Replace `app/(dashboard)/pipeline/review/page.tsx`.
Keep all existing approve/reject logic — only replace JSX.

```tsx
'use client'
// Keep all existing imports and logic

export default function ReviewPage() {
  // ... keep all existing state, keyboard handlers, approve/reject functions ...

  return (
    <div className="flex h-full animate-fade-in">

      {/* ── Left — review queue list ───────────────────────────────── */}
      <div className="w-[260px] flex-shrink-0 flex flex-col border-r border-[rgba(255,255,255,0.06)]">

        <div className="p-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <p className="text-xs font-mono text-[#4a4845] uppercase tracking-wider">Review queue</p>
          <Badge variant="warning">{reviewQueue.length}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {reviewQueue.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up" desc="No assets waiting for review." />
          ) : (
            reviewQueue.map((item, idx) => (
              <button key={item.id} onClick={() => setSelected(item)}
                className={cx(
                  'w-full flex items-center gap-2.5 px-3 py-3 text-left border-b border-[rgba(255,255,255,0.04)]',
                  'transition-colors hover:bg-[rgba(255,255,255,0.04)]',
                  selected?.id === item.id && 'bg-[rgba(255,255,255,0.07)]'
                )}>
                {/* Index */}
                <span className="text-[10px] font-mono text-[#3a3835] w-5 text-center flex-shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#f0efec] truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-[#4a4845]">{item.category}</span>
                    <span className="text-[#3a3835]">·</span>
                    <span className="text-[10px] font-mono text-[#4a4845]">{item.complexity}</span>
                  </div>
                </div>
                {selected?.id === item.id && <ChevronRight className="w-3.5 h-3.5 text-[#4a4845] flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right — asset review panel ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <Eye className="w-8 h-8 text-[#3a3835] mx-auto" />
              <p className="text-sm text-[#4a4845]">Select an asset to review</p>
              <p className="text-xs text-[#3a3835] font-mono">J / K to navigate · A to approve · R to reject</p>
            </div>
          </div>
        ) : (
          <>
            {/* Asset header */}
            <div className="h-12 flex items-center justify-between px-5 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-[#f0efec]">{selected.name}</p>
                <Badge variant="default">{selected.type}</Badge>
                <Badge variant={selected.complexity === 'high' ? 'warning' : selected.complexity === 'low' ? 'success' : 'default'}>
                  {selected.complexity}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="danger" size="sm" onClick={() => handleReject(selected.id)}>
                  <X className="w-3.5 h-3.5" />
                  Reject
                </Button>
                <Button variant="accent" size="sm" onClick={() => handleApprove(selected.id)}>
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </Button>
              </div>
            </div>

            {/* Preview + code split */}
            <div className="flex-1 flex overflow-hidden">

              {/* Preview iframe */}
              <div className="flex-1 flex flex-col border-r border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(255,255,255,0.06)]">
                  <span className="text-[10px] font-mono text-[#4a4845]">Preview</span>
                  {/* Responsive toggles */}
                  {['Full','768px','375px'].map(w => (
                    <button key={w} onClick={() => setPreviewWidth(w)}
                      className={cx(
                        'h-5 px-2 rounded text-[10px] font-mono transition-colors',
                        previewWidth === w
                          ? 'bg-[rgba(255,255,255,0.08)] text-[#f0efec]'
                          : 'text-[#4a4845] hover:text-[#8a8884]'
                      )}>{w}</button>
                  ))}
                </div>
                <div className="flex-1 flex items-start justify-center p-4 bg-[#050505] overflow-auto">
                  <div style={{ width: previewWidth === 'Full' ? '100%' : previewWidth }} className="h-full min-h-[400px]">
                    <iframe
                      src={`/api/preview/compile?slug=${selected.slug}`}
                      sandbox="allow-scripts"
                      className="w-full h-full min-h-[400px] rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#080808]"
                      title={selected.name}
                    />
                  </div>
                </div>
              </div>

              {/* Code panel */}
              <div className="w-[380px] flex-shrink-0 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.06)]">
                  <span className="text-[10px] font-mono text-[#4a4845]">Component code</span>
                  <Button variant="ghost" size="xs" onClick={() => copyCode(selected.code)}>
                    <Copy className="w-3 h-3" />
                    Copy
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-[#080808]">
                  <pre className="text-xs font-mono text-[#8a8884] leading-relaxed whitespace-pre-wrap break-all">
                    {selected.code}
                  </pre>
                </div>

                {/* Tags */}
                <div className="p-4 border-t border-[rgba(255,255,255,0.06)] space-y-2">
                  <p className="text-[10px] font-mono text-[#4a4845] uppercase tracking-wider">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags?.map(tag => (
                      <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161616] border border-[rgba(255,255,255,0.06)] text-[#4a4845]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="h-8 flex items-center justify-center gap-6 border-t border-[rgba(255,255,255,0.06)] bg-[#0f0f0f]">
              {[['J','Next'],['K','Prev'],['A','Approve'],['R','Reject']].map(([k,l]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <kbd className="w-5 h-5 flex items-center justify-center rounded bg-[#1e1e1e] border border-[rgba(255,255,255,0.10)] text-[10px] font-mono text-[#8a8884]">{k}</kbd>
                  <span className="text-[10px] font-mono text-[#4a4845]">{l}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

---

## STEP 13 — SETTINGS PAGE

Replace `app/(dashboard)/settings/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { SlidersHorizontal, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Divider } from '@/components/ui/Divider'
import { Badge } from '@/components/ui/Badge'

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)',  env: 'ANTHROPIC_API_KEY',  color: '#e8ff47' },
  { id: 'openai',    label: 'OpenAI (Embeddings)', env: 'OPENAI_API_KEY',     color: '#4ade80' },
  { id: 'gemini',    label: 'Google Gemini',       env: 'GEMINI_API_KEY',     color: '#60a5fa' },
  { id: 'groq',      label: 'Groq (Free)',         env: 'GROQ_API_KEY',       color: '#a78bfa' },
]

export default function SettingsPage() {
  const [show, setShow] = useState<Record<string, boolean>>({})

  return (
    <div className="px-6 py-6 max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl font-display italic text-[#f0efec]">Settings</h1>
        <p className="text-sm text-[#8a8884] mt-0.5">AI providers and pipeline configuration.</p>
      </div>

      {/* API Keys */}
      <section className="space-y-4">
        <Divider label="API keys" />
        <p className="text-[11px] font-mono text-[#3a3835]">
          Keys are read from .env.local — never sent to any external server.
        </p>
        <div className="space-y-2">
          {PROVIDERS.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.08)]">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <div className="w-44 flex-shrink-0">
                <p className="text-sm text-[#f0efec]">{p.label}</p>
                <p className="text-[10px] font-mono text-[#4a4845]">{p.env}</p>
              </div>
              <div className="flex-1 relative">
                <input
                  type={show[p.id] ? 'text' : 'password'}
                  placeholder="Not configured"
                  className="w-full h-8 bg-[#0f0f0f] border border-[rgba(255,255,255,0.08)] rounded-md px-3 pr-8 text-xs font-mono text-[#f0efec] placeholder:text-[#3a3835] focus:outline-none focus:border-[rgba(255,255,255,0.20)] transition-colors"
                />
                <button onClick={() => setShow(s => ({ ...s, [p.id]: !s[p.id] }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4a4845] hover:text-[#8a8884] transition-colors">
                  {show[p.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
              <Button variant="secondary" size="xs">Save</Button>
              <Badge variant="default">Not set</Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline defaults */}
      <section className="space-y-4">
        <Divider label="Pipeline defaults" />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Default AI model">
            <option>claude-sonnet-4-6</option>
            <option>claude-haiku-4-5</option>
            <option>gemini-1.5-flash</option>
            <option>groq / llama-3.3</option>
            <option>ollama (local)</option>
          </Select>
          <Select label="Default complexity">
            <option>medium</option>
            <option>low</option>
            <option>high</option>
          </Select>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.08)]">
          <div>
            <p className="text-sm text-[#f0efec]">Auto-publish approved assets</p>
            <p className="text-[11px] font-mono text-[#4a4845] mt-0.5">Skip the review queue entirely</p>
          </div>
          <button className="relative w-9 h-5 rounded-full bg-[#1e1e1e] border border-[rgba(255,255,255,0.10)] transition-colors">
            <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#4a4845] transition-transform" />
          </button>
        </div>
      </section>

      {/* Danger */}
      <section className="space-y-4">
        <Divider label="Danger zone" />
        <div className="rounded-xl border border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.04)] divide-y divide-[rgba(248,113,113,0.08)]">
          {[
            { label: 'Clear pipeline database', desc: 'Deletes all ideas and generated assets', action: 'Clear' },
            { label: 'Reset settings', desc: 'Restores all defaults', action: 'Reset' },
          ].map(({ label, desc, action }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-[#f0efec]">{label}</p>
                <p className="text-[11px] font-mono text-[#4a4845] mt-0.5">{desc}</p>
              </div>
              <Button variant="danger" size="sm">{action}</Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

---

## STEP 14 — PIPELINE OVERVIEW PAGE

Replace `app/(dashboard)/pipeline/page.tsx`:

```tsx
import Link from 'next/link'
import { Lightbulb, Sparkles, Eye, ArrowRight, Zap } from 'lucide-react'

const STAGES = [
  { n:'01', label:'Add ideas',   desc:'Name, feel, tech stack',         href:'/pipeline/ideas',    icon:Lightbulb, color:'#60a5fa' },
  { n:'02', label:'Enrich',      desc:'AI researches and specs it out', href:'/pipeline/ideas',    icon:Sparkles,  color:'#a78bfa' },
  { n:'03', label:'Generate',    desc:'Claude writes the component',    href:'/pipeline/generate', icon:Zap,       color:'#e8ff47' },
  { n:'04', label:'Review',      desc:'Preview, approve, or reject',    href:'/pipeline/review',   icon:Eye,       color:'#4ade80' },
]

export default function PipelinePage() {
  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl font-display italic text-[#f0efec]">Pipeline</h1>
        <p className="text-sm text-[#8a8884] mt-0.5">AI-powered component factory. Idea to published in minutes.</p>
      </div>

      {/* Stage flow */}
      <div className="grid grid-cols-4 gap-3">
        {STAGES.map(({ n, label, desc, href, icon: Icon, color }) => (
          <Link key={n} href={href} className="group block">
            <div className="rounded-xl bg-[#0f0f0f] border border-[rgba(255,255,255,0.06)] p-4 hover:border-[rgba(255,255,255,0.12)] hover:-translate-y-px transition-all duration-150 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#3a3835]">{n}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14`, border: `1px solid ${color}20` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[#f0efec]">{label}</p>
                <p className="text-[11px] text-[#4a4845] mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#3a3835] group-hover:text-[#8a8884] transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link href="/pipeline/ideas" className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] transition-colors group">
          <span className="text-sm text-[#f0efec]">Open Ideas backlog</span>
          <ArrowRight className="w-4 h-4 text-[#4a4845] group-hover:text-[#8a8884] transition-colors" />
        </Link>
        <Link href="/pipeline/generate" className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-[rgba(232,255,71,0.06)] border border-[rgba(232,255,71,0.14)] hover:border-[rgba(232,255,71,0.24)] transition-colors group">
          <span className="text-sm text-[#c8dd2a]">Run automated pipeline</span>
          <Zap className="w-4 h-4 text-[#c8dd2a]" />
        </Link>
      </div>
    </div>
  )
}
```

---

## STEP 15 — FINAL CHECKLIST

Do these in order. Do not skip.

1. `app/globals.css` — replaced ✓
2. `tailwind.config.ts` — replaced ✓
3. All `components/ui/` files created ✓
4. `components/layout/Sidebar.tsx` — created ✓
5. `components/layout/Topbar.tsx` — created ✓
6. `app/layout.tsx` — updated ✓
7. `app/(dashboard)/layout.tsx` — updated ✓
8. Browse page — updated ✓
9. AssetCard — updated ✓
10. Pipeline overview page — updated ✓
11. Ideas page — JSX updated, all logic preserved ✓
12. Generate page — JSX updated, all logic preserved ✓
13. Review page — JSX updated, all logic preserved ✓
14. Settings page — updated ✓

Rules:
- Do NOT change any logic in Ideas/Generate/Review — only JSX and styles
- Do NOT touch any file in `app/api/`, `lib/`, `types/`
- All `min-h-screen` inside iframes → `minHeight: '400px'` inline style
- `font-display italic` only for h1 titles
- `font-mono` for all numbers, tags, status, code values
- Accent `#e8ff47` only on: active nav bar, approve button, Run button, stage active indicator
- Run `pnpm dev` and verify no console errors before finishing
