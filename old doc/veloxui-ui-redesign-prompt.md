# veloxui — UI Redesign Prompt
## Paste this into Cursor / Claude Code / Windsurf

---

## MISSION

Redesign the entire UI of this Next.js application into a premium, dark developer tool
with a distinct visual identity. This is NOT a generic dashboard makeover.
The aesthetic is: **"high-end code editor meets Awwwards-level design tool"** —
think Linear + Vercel + Raycast but with a more editorial, luxurious character.

Do NOT generate a new app. Redesign ONLY the styles, layouts, and UI components
of the existing pages. All functionality stays intact. All API routes stay intact.
Only touch: `app/`, `components/`, `tailwind.config.ts`, `app/globals.css`.

---

## DESIGN SYSTEM — implement this exactly

### Color palette

```css
/* app/globals.css — replace the entire :root and .dark blocks */
:root {
  /* Base */
  --bg-base: #080808;
  --bg-surface: #0f0f0f;
  --bg-elevated: #161616;
  --bg-overlay: #1e1e1e;
  --bg-hover: rgba(255,255,255,0.04);
  --bg-active: rgba(255,255,255,0.07);

  /* Borders */
  --border-subtle: rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-strong: rgba(255,255,255,0.18);

  /* Text */
  --text-primary: #f0efec;
  --text-secondary: #8a8884;
  --text-tertiary: #4a4845;
  --text-disabled: #2e2c2a;

  /* Accent — single sharp color, not multiple */
  --accent: #e8ff47;          /* electric lime — memorable, unique */
  --accent-dim: rgba(232,255,71,0.12);
  --accent-border: rgba(232,255,71,0.25);
  --accent-text: #c8dd2a;

  /* Semantic */
  --success: #4ade80;
  --success-dim: rgba(74,222,128,0.1);
  --warning: #fbbf24;
  --warning-dim: rgba(251,191,36,0.1);
  --danger: #f87171;
  --danger-dim: rgba(248,113,113,0.1);
  --info: #60a5fa;
  --info-dim: rgba(96,165,250,0.1);

  /* Pipeline stage colors */
  --stage-pending: #4a4845;
  --stage-enriching: #60a5fa;
  --stage-generating: #a78bfa;
  --stage-validating: #fbbf24;
  --stage-reviewing: #e8ff47;
  --stage-approved: #4ade80;
  --stage-rejected: #f87171;
  --stage-failed: #f87171;
}
```

### Typography

```css
/* In globals.css — add font imports */
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&display=swap');

/* Font assignments */
--font-sans: 'Geist', 'Geist Fallback', system-ui, sans-serif;
--font-mono: 'Geist Mono', 'Fira Code', monospace;
--font-display: 'Instrument Serif', Georgia, serif;  /* for hero text only */
```

### Spacing scale — use ONLY these values

```
2px  4px  6px  8px  12px  16px  20px  24px  32px  40px  48px  64px  80px
```

Translate to Tailwind: `gap-0.5 gap-1 gap-1.5 gap-2 gap-3 gap-4 gap-5 gap-6 gap-8 gap-10 gap-12 gap-16 gap-20`

### Border radius

```
buttons, inputs, badges:     rounded-md  (6px)
cards, panels:               rounded-xl  (12px)
modal, large surfaces:       rounded-2xl (16px)
pills / tags:                rounded-full
```

### Tailwind config additions

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#080808',
        surface: '#0f0f0f',
        elevated: '#161616',
        overlay: '#1e1e1e',
        accent: '#e8ff47',
        'accent-dim': 'rgba(232,255,71,0.12)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'Fira Code', 'monospace'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
export default config
```

---

## COMPONENT LIBRARY — build these reusable pieces first

Create `components/ui/` with these exact components before touching any page.

### `components/ui/Badge.tsx`

```tsx
interface BadgeProps {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  dot?: boolean
  children: React.ReactNode
}

// Styles mapping:
// default:  bg-white/5 text-[--text-secondary] border-[--border-subtle]
// accent:   bg-[--accent-dim] text-[--accent-text] border-[--accent-border]
// success:  bg-[--success-dim] text-[--success] border border-[--success]/20
// warning:  bg-[--warning-dim] text-[--warning] border border-[--warning]/20
// danger:   bg-[--danger-dim] text-[--danger] border border-[--danger]/20
// info:     bg-[--info-dim] text-[--info] border border-[--info]/20
//
// All badges: font-mono text-[10px] font-medium tracking-wider uppercase
//             rounded-md px-2 py-0.5 border inline-flex items-center gap-1.5
// dot: small circle 5px, filled with current text color, animate-pulse-subtle
```

### `components/ui/Button.tsx`

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  children: React.ReactNode
  // ... standard button props
}

// primary:   bg-white text-black hover:bg-white/90 font-medium
// secondary: bg-[--bg-elevated] border border-[--border-default]
//            text-[--text-primary] hover:border-[--border-strong] hover:bg-[--bg-overlay]
// ghost:     text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]
// danger:    bg-[--danger-dim] text-[--danger] border border-[--danger]/20
//            hover:bg-[--danger]/20
// accent:    bg-[--accent] text-black font-semibold hover:bg-[--accent]/90
//
// All: rounded-md transition-all duration-150 cursor-pointer
// sm:  h-7 px-3 text-xs
// md:  h-8 px-4 text-sm (default)
// lg:  h-10 px-5 text-sm
// icon: h-8 w-8 p-0 flex items-center justify-center
//
// loading: show spinner icon, disable pointer events
```

### `components/ui/Input.tsx`

```tsx
// Styling:
// Base wrapper: relative flex items-center
// Input:        w-full h-9 bg-[--bg-elevated] border border-[--border-default]
//               rounded-md px-3 text-sm text-[--text-primary] font-mono
//               placeholder:text-[--text-tertiary]
//               focus:outline-none focus:border-[--border-strong]
//               focus:ring-1 focus:ring-white/10
//               transition-colors duration-150
// Label:        block text-xs text-[--text-secondary] font-mono uppercase
//               tracking-wider mb-1.5
// Error state:  border-[--danger]/40 focus:border-[--danger]/60
//               focus:ring-[--danger]/10
// Icon prefix:  absolute left-3 text-[--text-tertiary] w-3.5 h-3.5
//               (shift input padding-left to pl-9)
```

### `components/ui/Select.tsx`

Same styling as Input. Use native `<select>` with custom `appearance-none` and a
ChevronDown icon absolutely positioned on the right.

### `components/ui/Card.tsx`

```tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'ghost' | 'accent-border'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

// default:       bg-[--bg-surface] border border-[--border-subtle] rounded-xl
// elevated:      bg-[--bg-elevated] border border-[--border-default] rounded-xl
// ghost:         bg-transparent border border-[--border-subtle] rounded-xl
// accent-border: bg-[--bg-surface] border border-[--accent-border] rounded-xl
//
// padding sm: p-3
// padding md: p-4 (default)
// padding lg: p-6
```

### `components/ui/StatusDot.tsx`

```tsx
// A 6px circle that maps pipeline status to color + optional pulse animation
// pending:    bg-[--stage-pending]
// enriching:  bg-[--stage-enriching] animate-pulse
// generating: bg-[--stage-generating] animate-pulse
// validating: bg-[--stage-validating] animate-pulse
// reviewing:  bg-[--stage-reviewing]
// approved:   bg-[--stage-approved]
// rejected:   bg-[--stage-rejected]
// failed:     bg-[--stage-failed]
```

### `components/ui/Kbd.tsx`

```tsx
// For keyboard shortcuts displayed in the UI
// <kbd> element: bg-[--bg-overlay] border border-[--border-default]
//                rounded px-1.5 py-0.5 text-[10px] font-mono
//                text-[--text-secondary] shadow-sm
```

### `components/ui/Divider.tsx`

```tsx
// Horizontal rule: border-t border-[--border-subtle]
// With label: relative flex items-center gap-3
//   line: flex-1 border-t border-[--border-subtle]
//   text: text-[10px] font-mono text-[--text-tertiary] uppercase tracking-wider
```

### `components/ui/EmptyState.tsx`

```tsx
// Centered empty state with icon, title, description, optional action
// Container: flex flex-col items-center justify-center gap-3 py-16 text-center
// Icon:      w-10 h-10 text-[--text-tertiary] mb-1
// Title:     text-sm font-medium text-[--text-secondary]
// Desc:      text-xs text-[--text-tertiary] max-w-[240px] leading-relaxed
```

---

## LAYOUT — global shell

### `app/layout.tsx` — root layout

```tsx
// Structure:
// <html> with class="dark" (always dark)
// <body> bg-[--bg-base] text-[--text-primary] font-sans antialiased
//
// Layout:
// <div class="flex h-screen overflow-hidden">
//   <Sidebar />                      ← fixed left, 220px wide
//   <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
//     <Topbar />                     ← fixed top, 48px tall
//     <main class="flex-1 overflow-y-auto">
//       {children}
//     </main>
//   </div>
// </div>
```

### `components/layout/Sidebar.tsx`

```tsx
// Width: 220px fixed, never collapses on desktop
// Background: bg-[--bg-base] border-r border-[--border-subtle]
//
// Structure top to bottom:
// ─────────────────────────────────
// Logo area (h-12, px-4)
//   · "veloxui" in font-display italic text-lg text-[--text-primary]
//   · Small superscript badge: "beta" in --accent color
//
// ─────────────────────────────────
// Nav section label (px-4 pt-5 pb-1)
//   · "WORKSPACE" in text-[9px] font-mono tracking-[0.15em] text-[--text-tertiary]
//
// Nav items (px-2):
//   Each: flex items-center gap-2.5 px-3 h-8 rounded-md cursor-pointer
//         text-sm text-[--text-secondary] hover:text-[--text-primary]
//         hover:bg-[--bg-hover] transition-colors
//   Active: bg-[--bg-active] text-[--text-primary]
//   Icon: w-4 h-4 flex-shrink-0
//   Label: flex-1
//   Count badge (optional): tiny pill, bg-[--bg-overlay] text-[9px] font-mono
//
//   Pages:
//   · Home (search icon) → /
//   · Browse (grid icon) → /browse
//   ─── divider ───
//   · Pipeline (zap icon) → /pipeline
//   · Ideas (lightbulb icon) → /pipeline/ideas  [count of pending ideas]
//   · Generate (sparkles icon) → /pipeline/generate
//   · Review (eye icon) → /pipeline/review  [count of reviewing]
//   ─── divider ───
//   · Settings (sliders icon) → /settings
//
// ─────────────────────────────────
// Bottom section (mt-auto, p-3)
//   · Small API status indicator:
//     Green dot + "claude" text OR red dot + "no key"
//     Text: text-[10px] font-mono text-[--text-tertiary]
//   · User avatar / logout (if Clerk auth present)
```

### `components/layout/Topbar.tsx`

```tsx
// Height: 48px
// Background: bg-[--bg-base]/80 backdrop-blur-sm
//             border-b border-[--border-subtle]
//
// Structure: flex items-center px-5 gap-4 h-full
// Left:   Breadcrumb — current page path in font-mono text-xs text-[--text-tertiary]
//         separator: "/" character
//         current page: text-[--text-primary]
//
// Right side items (ml-auto, flex items-center gap-2):
//   · Search trigger: ghost button with Cmd+K shortcut visible
//     "Search assets..." text-[--text-tertiary] text-xs
//     <Kbd>⌘K</Kbd> on the right
//   · Separator
//   · Stats: total assets count, font-mono text-xs text-[--text-tertiary]
//     e.g. "482 assets"
//   · New idea button: accent variant, sm size, "+ Idea" label
```

---

## PAGE REDESIGNS

### Public: `/` — Search / Home page

```
Layout: centered, max-w-3xl, px-6 pt-16 pb-24

Hero section:
  · Eyebrow: "veloxui / library" in font-mono text-xs text-[--text-tertiary]
  · Headline: large italic serif font (font-display) — 
    "500 animations.  
     300 components.  
     100 templates."
    font-size: text-5xl, color: text-[--text-primary], leading-tight
    Use staggered animate-fade-up with 0.1s delay per line
  · Subline: "Search, copy, ship." text-lg text-[--text-secondary]

Search bar (mt-10):
  · Large input, h-12, text-base, font-mono
  · Left icon: search (magnifying glass) w-4 h-4 text-[--text-tertiary]
  · Right: <Kbd>/</Kbd> shortcut hint
  · On focus: border-[--border-strong] ring-1 ring-white/8
  · Below: category filter pills (All / Animations / Components / Templates)
    Pill style: h-7 px-3 text-xs font-mono rounded-full
    Default:  bg-[--bg-elevated] border-[--border-default] text-[--text-secondary]
    Active:   bg-[--accent-dim] border-[--accent-border] text-[--accent-text]

Results grid (mt-8):
  · 3 columns on desktop, 2 on tablet, 1 on mobile
  · gap-3
```

### Asset Card (used in grid):

```
Card: bg-[--bg-surface] border border-[--border-subtle] rounded-xl
      overflow-hidden hover:border-[--border-default] transition-colors
      group cursor-pointer

Preview area (aspect-video, bg-[--bg-elevated]):
  · <iframe> rendering the component — sandbox="allow-scripts"
  · Overlay on hover: subtle gradient from transparent to black/20
  · Top-right corner: complexity badge (only visible on hover)

Info area (p-3 border-t border-[--border-subtle]):
  · Name: text-sm font-medium text-[--text-primary] leading-tight
  · Tags: flex gap-1 mt-1 flex-wrap
    Each tag: text-[10px] font-mono text-[--text-tertiary]
              bg-[--bg-elevated] rounded px-1.5 py-0.5
  · Bottom row: tech badges + copy button
    Copy button: ghost icon-only button, appears on card hover
    Icon: clipboard, w-3.5 h-3.5
    On copy: brief "✓" state, green color

Pro lock overlay (if is_pro and user not subscribed):
  · Blur the preview slightly
  · Lock icon centered in preview area
  · "Pro" badge top-right of card
```

### Dashboard: `/pipeline` — Pipeline page

```
Full page layout inside the shell.

Page header (px-6 pt-6 pb-4):
  · Title: "Pipeline" text-xl font-medium
  · Subtitle: "Generate · validate · publish" font-mono text-xs text-[--text-tertiary]
  · Right: mode switcher + AI model selector (compact inline controls)

Mode switcher:
  · Two segments: "Automated" | "Manual"
  · Pill-style toggle: 
    Container: bg-[--bg-elevated] border border-[--border-default] rounded-lg p-0.5
    Active segment: bg-[--bg-overlay] rounded-md text-[--text-primary]
    Inactive: text-[--text-tertiary]
    Text: text-xs font-mono

AI model selector:
  · Minimal select: no visible border unless focused
    text-xs font-mono text-[--text-secondary]
    Options: claude / gemini / groq / ollama
    Each option prefixed with colored dot:
    claude → purple dot, gemini → blue dot, groq → orange dot, ollama → gray dot

Stats row (px-6 pb-5):
  · 4 stat cards in a row: gap-3
  · Each stat card:
    bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-4
    Label: text-[10px] font-mono text-[--text-tertiary] uppercase tracking-wider
    Value: text-2xl font-mono font-light text-[--text-primary] mt-1
    Change: text-xs text-[--text-secondary] (e.g. "+12 today")
  · Stats: Total assets | Pending ideas | In review | Published today

Tab navigation (px-6):
  · Underline style tabs: Ideas / Generate / Review
  · Active: border-b-2 border-[--accent] text-[--text-primary]
  · Inactive: text-[--text-tertiary] hover:text-[--text-secondary]
  · Font: text-sm font-mono

Content area (px-6 pt-4):
  → renders the active tab component
```

### Pipeline: Ideas tab

```
Layout: 2-column split — 40% idea list / 60% editor

Left column (idea list):
  · Search input at top (compact, h-8)
  · List of ideas, each row:
    h-12 flex items-center gap-3 px-3 rounded-lg
    hover:bg-[--bg-hover] cursor-pointer
    ·  Left: <StatusDot status={idea.status} />
    · Middle: idea name text-sm text-[--text-primary]
               category text-xs text-[--text-tertiary] font-mono
    · Right:  action icon (play button if pending)
  · Active item: bg-[--bg-elevated] border border-[--border-default]
  · Empty state: <EmptyState> with lightbulb icon

  Bottom: "+ Add ideas" button, accent variant, full width

Right column (editor / detail):
  · If no idea selected: centered placeholder
    "Select an idea to view details" text-[--text-tertiary] text-sm
  · If idea selected:
    Header: idea name (editable inline on click)
            status badge top-right
    Fields (label-input pairs, 2-col grid):
      Type, Category, Complexity, Feel
      Tech (multi-select chips)
    Enriched spec (if available):
      Collapsible section with JSON viewer
      Monospace, syntax-colored
    Actions:
      "Enrich with AI" button (secondary)
      "Generate code" button (accent)
      Progress indicator during generation

JSON viewer for enriched spec:
  · bg-[--bg-elevated] rounded-xl p-4 font-mono text-xs
  · Keys: text-[--info]
  · String values: text-[--success]
  · Numbers: text-[--warning]
  · Booleans: text-[--accent-text]
```

### Pipeline: Generate tab (automated mode)

```
Two-panel layout: queue list + live generation log

Left: pending ideas queue
  · Each item: checkbox + name + complexity badge
  · "Select all" at top
  · Bottom: "Run selected (N)" accent button

Right: generation log
  · Terminal-style output area:
    bg-[--bg-elevated] rounded-xl border border-[--border-default]
    font-mono text-xs p-4 h-96 overflow-y-auto
  · Log lines by stage:
    timestamp: text-[--text-tertiary]
    [ENRICH]:  text-[--info]
    [GEN]:     text-[--accent-text]
    [VALID]:   text-[--warning]
    [APPROVE]: text-[--success]
    [ERROR]:   text-[--danger]
  · Auto-scroll to bottom as logs stream in (SSE)
  · Live progress bar per active idea:
    h-1 bg-[--border-subtle] rounded-full overflow-hidden
    Fill: animated gradient using accent color, indeterminate while running
```

### Pipeline: Review tab

```
Layout: full-width review queue

Filter row: All / Reviewing / Failed (tab pills, compact)

Review cards grid (2 columns, gap-4):
  Each card: bg-[--bg-surface] border border-[--border-default] rounded-xl overflow-hidden

  Top section — preview (aspect-video):
    <iframe> of the component — same as asset card
    Top-left: status badge
    Top-right: idea name truncated

  Middle section (p-3 border-t border-[--border-subtle]):
    Spec summary: name, tags, tech, complexity badge
    Code peek: first 3 lines of code in monospace, text-[--text-tertiary]
               "View full code" toggle

  Bottom action row (p-3 pt-0 flex gap-2):
    · Reject: danger ghost button "Reject"
    · Edit code: secondary button "Edit"
    · Approve: success/accent button "Approve + Publish"
    · Keyboard hint: <Kbd>A</Kbd> approve, <Kbd>R</Kbd> reject

  Code editor (expandable, hidden by default):
    Textarea: bg-[--bg-elevated] border-t border-[--border-default]
              font-mono text-xs p-4 w-full h-48 resize-y
              text-[--text-primary] focus:outline-none

Keyboard navigation:
  · J/K to move between cards
  · A to approve focused card
  · R to reject focused card
  · E to expand/collapse code editor
  · Show keyboard hint bar at bottom:
    fixed bottom-4 left-1/2 -translate-x-1/2
    bg-[--bg-overlay] border border-[--border-default] rounded-full
    px-4 py-2 flex gap-4 text-[10px] font-mono text-[--text-tertiary]
    backdrop-blur-sm
```

### Asset detail page `/asset/[slug]`

```
Max-width: max-w-5xl, centered, px-6 py-10

Two column: 60% preview / 40% metadata

Left — preview:
  Large iframe preview
  aspect-video, rounded-xl, border border-[--border-default]
  Below: responsive preview toggles (desktop/tablet/mobile widths)

Right — metadata:
  Name: text-2xl font-display italic text-[--text-primary]
  Description: text-sm text-[--text-secondary] leading-relaxed mt-2

  Tags: flex gap-1.5 flex-wrap mt-4
  Tech pills: same as tags but with colored dots per tech

  Metadata grid (2×2, gap-3, mt-4):
    Category / Type / Complexity / License
    Each: label text-[10px] font-mono text-[--text-tertiary] uppercase
          value text-sm text-[--text-primary] font-mono

  Divider

  Code section:
    Header: "Component code" + copy button
    Code block: bg-[--bg-elevated] rounded-xl p-4 overflow-x-auto
                font-mono text-xs text-[--text-primary]
                border border-[--border-subtle]
                (use shiki for syntax highlighting if available,
                 else plain monospace with manual color classes)
    Copy button: shows "Copied!" for 2 seconds with checkmark

  If pro and not subscribed:
    Code is blurred with frosted overlay
    "Unlock with Pro" button centered over blur
```

### Settings page `/settings`

```
Max-width: max-w-2xl, px-6 py-10

Section structure:
  Each section: mb-10
  Section title: text-xs font-mono text-[--text-tertiary] uppercase tracking-wider
                 border-b border-[--border-subtle] pb-2 mb-4

API Keys section:
  For each provider (Claude, Gemini, Groq, OpenAI):
    Label row: provider name + status badge (Connected / Not set)
    Input: password type, masked, with show/hide toggle icon
    Save button: compact secondary

  Note: text-xs text-[--text-tertiary] font-mono
        "Keys are stored locally in .env.local and never sent to any server."

Pipeline defaults section:
  Default AI model: select
  Default complexity: radio pills (Low / Medium / High)
  Auto-publish approved: toggle switch
    Toggle: w-9 h-5, track bg-[--bg-overlay], thumb bg-white
            checked: track bg-[--accent-dim] border-[--accent-border]
                     thumb bg-[--accent]

Danger zone:
  "Clear pipeline DB" button: danger variant
  "Reset all settings" button: danger variant
  Confirmation modal for destructive actions
```

### Manual pipeline page (within pipeline tabs)

```
Step indicator at top:
  4 numbered steps in a row with connecting line
  Circle: w-7 h-7, border, font-mono text-xs
  Active:   bg-[--accent] border-[--accent] text-black
  Complete: bg-[--success-dim] border-[--success]/30 text-[--success]
  Pending:  bg-transparent border-[--border-default] text-[--text-tertiary]
  Line:     flex-1 h-px bg-[--border-subtle] (bg-[--success]/30 if step complete)

Each step panel:
  Card with elevation, full-width

Step 1 — Idea input:
  Inline textarea styled as code editor (monospace, dark)

Step 2 — Copy prompt:
  Two-column: left = generated prompt in copy-able block
              right = links to free AI tools as clickable buttons
  Buttons: Gemini / ChatGPT / Claude / Groq
  Each: brand icon + name + "Open →" text
  Style: secondary button full-width

Step 3 — Paste code:
  Textarea styled as terminal (dark, monospace)
  Real-time syntax hint under textarea

Step 4 — Preview + approve:
  Preview iframe (left, 60%)
  Actions panel (right, 40%)
  Quick-edit textarea below if "Edit" clicked
```

---

## MICRO-INTERACTIONS — implement all of these

```typescript
// 1. Navigation active state
// When route changes, the sidebar item slides in a left accent bar:
// active item: relative, ::before pseudo: absolute left-0 w-0.5 h-4
//              bg-[--accent] rounded-full top-1/2 -translate-y-1/2

// 2. Copy button feedback
// State: idle → copying → copied → idle
// idle:    clipboard icon, text-[--text-tertiary]
// copying: spinner (animate-spin), text-[--info]
// copied:  checkmark, text-[--success] for 1.5s then resets

// 3. Card hover
// transform: translateY(-1px)  transition: 150ms ease
// border: transitions from border-subtle to border-default

// 4. Button press
// active:scale-[0.98] transition-transform duration-75

// 5. Page entrance animation
// Each page: children stagger in with animate-fade-up
// Delay: first element 0ms, +50ms per subsequent element
// Max 5 elements staggered, rest appear simultaneously

// 6. Status transitions in ideas list
// When status changes: the StatusDot briefly scales up (scale-125)
//                       then returns to normal over 300ms
// New items: slide in from top with fade

// 7. Generation log streaming
// New log lines slide in from bottom with fade, 200ms

// 8. Search focus
// When search bar focused: subtle glow ring appears
//   box-shadow: 0 0 0 1px rgba(232,255,71,0.15)
//   transition: 200ms ease

// 9. Keyboard shortcut highlights
// When user presses J/K on review page:
//   focused card gets a 1px accent border for 100ms then settles to default
//   smooth scroll to keep focused card in view

// 10. Toast notifications (for approve/reject/error)
//   Position: bottom-right, fixed
//   Stack from bottom, animate in from right
//   Auto-dismiss after 3s
//   Success: bg-[--bg-elevated] border-l-2 border-[--success]
//   Error:   bg-[--bg-elevated] border-l-2 border-[--danger]
//   Info:    bg-[--bg-elevated] border-l-2 border-[--info]
//   Text: name + description, small close button
```

---

## LOADING STATES — implement consistently

```
Skeleton shimmer:
  bg-[--bg-elevated] rounded animate-shimmer
  background: linear-gradient(90deg,
    rgba(255,255,255,0.02) 25%,
    rgba(255,255,255,0.05) 50%,
    rgba(255,255,255,0.02) 75%)
  background-size: 200% 100%

Asset card skeleton: full card height with shimmer blocks
  · Preview area: full aspect-video shimmer
  · Title: h-3 w-32 shimmer
  · Tags: three h-2 w-12 shimmer blocks in a row

Ideas list skeleton: 8 rows of h-12 shimmer

Stats row skeleton: 4 cards with shimmer value blocks

Full page loading:
  NOT a spinner in the center
  Instead: skeleton of the actual layout that will appear
  Everything fades out when real data arrives (opacity transition 200ms)
```

---

## EMPTY STATES — use themed illustrations

```
No assets: icon=Sparkles, title="No assets yet", 
           desc="Run the pipeline to generate your first assets."
           action="Open pipeline →"

No ideas: icon=Lightbulb, title="Ideas backlog is empty",
          desc="Add ideas to get started. A name and feel is enough.",
          action="+ Add first idea"

No results: icon=Search, title="No results",
            desc="Try different keywords or browse by category."

Review empty: icon=CheckCircle, title="All caught up",
              desc="No assets waiting for review."
```

---

## FINAL INSTRUCTIONS FOR THE AI IMPLEMENTING THIS

1. Read the ENTIRE prompt before writing a single line of code.
2. Create the design system tokens in `globals.css` FIRST.
3. Build the reusable `components/ui/` components SECOND.
4. Build layout components (Sidebar, Topbar) THIRD.
5. Redesign pages FOURTH, using only the components you built.
6. Do NOT change any API routes, database queries, or business logic.
7. Do NOT introduce new npm packages except:
   - `lucide-react` for icons (already likely installed)
   - `clsx` for conditional classes (already likely installed)
8. Every component must work correctly in dark mode (there is no light mode).
9. Use `font-mono` for ALL data, numbers, status values, tags, and technical content.
10. Use `font-display` (Instrument Serif italic) ONLY for main page headings and asset names.
11. Use `font-sans` (Geist) for all body copy, labels, and UI text.
12. The accent color `#e8ff47` should appear SPARINGLY — active states, CTAs,
    approved status, focused elements. It should feel like a signal, not wallpaper.
13. Test every page for layout integrity at: 1440px, 1280px, 1024px.
14. Do NOT add any light mode toggle. Always dark.
15. Do NOT use purple/blue gradients anywhere. Flat, dark surfaces only.
```
