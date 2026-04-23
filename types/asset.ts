export interface Asset {
  id: string
  slug: string
  name: string
  category: 'animation' | 'component' | 'template'
  type: string
  code: string
  preview_html?: string
  description: string
  seo_description?: string
  tags: string[]
  tech: string[]
  complexity: 'low' | 'medium' | 'high'
  animation_spec?: AnimationSpec
  visual_spec?: VisualSpec
  is_pro: boolean
  is_published: boolean
  license: string
  created_at: string
  updated_at: string
  upvotes?: number
  views_count?: number
  copy_count?: number
}

export interface AnimationSpec {
  trigger: 'hover' | 'click' | 'scroll' | 'mount' | 'continuous'
  entry: string
  active: string
  exit: string
  easing: string
  duration_ms: number
  spring?: { stiffness: number; damping: number }
}

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
