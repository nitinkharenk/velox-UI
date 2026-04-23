import { Bot, Eye, MessageSquare, SlidersHorizontal } from 'lucide-react'
import type { DashboardNavSection, DashboardRouteMeta } from './dashboardConfig'

export const STUDIO_NAV_SECTIONS: DashboardNavSection[] = [
  {
    label: 'STUDIO',
    items: [
      {
        label: 'Velox AI',
        shortLabel: 'Velox AI',
        description: 'Launch autonomous prompt-to-review pipeline runs.',
        section: 'Studio',
        href: '/velox-ai-studio',
        icon: Bot,
        match: /^\/velox-ai-studio$/,
      },
      {
        label: 'Velox Chat',
        shortLabel: 'Velox Chat',
        description: 'Chat with Gemini in a focused streaming workspace.',
        section: 'Studio',
        href: '/velox-ai-studio/chat',
        icon: MessageSquare,
        match: /^\/velox-ai-studio\/chat/,
      },
    ],
  },
  {
    label: 'REVIEW',
    items: [
      {
        label: 'Review Queue',
        shortLabel: 'Review',
        description: 'Open the review queue for generated ideas waiting on approval.',
        section: 'Review',
        href: '/pipeline/review',
        icon: Eye,
        match: /^\/pipeline\/review/,
      },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      {
        label: 'Settings',
        shortLabel: 'Settings',
        description: 'Manage providers, keys, and studio preferences.',
        section: 'System',
        href: '/velox-ai-studio/settings',
        icon: SlidersHorizontal,
        match: /^\/velox-ai-studio\/settings/,
      },
    ],
  },
]

const FALLBACK_STUDIO_ROUTE_META: DashboardRouteMeta = {
  label: 'Velox AI Studio',
  shortLabel: 'Studio',
  description: 'Manage autonomous AI generation and chat workflows.',
  section: 'Studio',
}

export function getStudioRouteMeta(pathname: string | null | undefined): DashboardRouteMeta {
  const normalizedPath = pathname ?? '/velox-ai-studio'

  for (const section of STUDIO_NAV_SECTIONS) {
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

  return FALLBACK_STUDIO_ROUTE_META
}
