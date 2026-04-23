import type { LucideIcon } from 'lucide-react'
import { BarChart3, Eye, FlaskConical, LayoutGrid, Lightbulb, Package, SlidersHorizontal, Sparkles, Workflow } from 'lucide-react'

export interface DashboardRouteMeta {
  label: string
  shortLabel: string
  description: string
  section: string
}

export interface DashboardNavItem extends DashboardRouteMeta {
  href: string
  icon: LucideIcon
  match: RegExp
  badge?: number
}

export interface DashboardNavSection {
  label: string
  items: DashboardNavItem[]
}

export const DASHBOARD_NAV_SECTIONS: DashboardNavSection[] = [
  {
    label: 'WORKSPACE',
    items: [
      {
        label: 'Overview',
        shortLabel: 'Home',
        description: 'See the latest pipeline state, priorities, and published work.',
        section: 'Workspace',
        href: '/dashboard',
        icon: LayoutGrid,
        match: /^\/dashboard$/,
      },
      {
        label: 'Pipeline',
        shortLabel: 'Pipeline',
        description: 'Track the full VeloxUI production system.',
        section: 'Workspace',
        href: '/pipeline',
        icon: BarChart3,
        match: /^\/pipeline$/,
      },
    ],
  },
  {
    label: 'PRODUCTION',
    items: [
      {
        label: 'Forge',
        shortLabel: 'Forge',
        description: 'Unified AI production hub — capture ideas and forge components.',
        section: 'Production',
        href: '/forge',
        icon: Sparkles,
        match: /^\/forge/,
      },
      {
        label: 'Review',
        shortLabel: 'Review',
        description: 'Approve generated components and publish.',
        section: 'Production',
        href: '/pipeline/review',
        icon: Eye,
        match: /^\/pipeline\/review/,
        badge: 4,
      },
      {
        label: 'Inventory',
        shortLabel: 'Inventory',
        description: 'Manage the published component library.',
        section: 'Production',
        href: '/pipeline/inventory',
        icon: Package,
        match: /^\/pipeline\/inventory/,
      },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      {
        label: 'Settings',
        shortLabel: 'Settings',
        description: 'Manage providers, keys, and workspace preferences.',
        section: 'System',
        href: '/settings',
        icon: SlidersHorizontal,
        match: /^\/settings/,
      },
      {
        label: 'Vertex AI',
        shortLabel: 'Vertex AI',
        description: 'Test Vertex AI prompts, inspect output, and debug request failures.',
        section: 'System',
        href: '/vertex-ai',
        icon: FlaskConical,
        match: /^\/vertex-ai/,
      },
    ],
  },
]

const FALLBACK_ROUTE_META: DashboardRouteMeta = {
  label: 'Workspace',
  shortLabel: 'Workspace',
  description: 'Manage content from a focused studio shell.',
  section: 'Workspace',
}

export function getDashboardRouteMeta(pathname: string | null | undefined): DashboardRouteMeta {
  const normalizedPath = pathname ?? '/dashboard'

  for (const section of DASHBOARD_NAV_SECTIONS) {
    const match = section.items.find((item) => item.match.test(normalizedPath))
    if (match) {
      return {
        label: match.label,
        shortLabel: match.shortLabel,
        description: match.description,
        section: match.section,
      }
    }
  }

  return FALLBACK_ROUTE_META
}
