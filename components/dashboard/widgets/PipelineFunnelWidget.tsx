import Link from 'next/link'
import { DASHBOARD_TONE } from '@/components/dashboard/dashboardTones'

interface Stages {
  ideas: number
  enriched: number
  generating: number
  review: number
  published: number
}

const STAGE_CONFIG = [
  { key: 'ideas'      as const, label: 'Ideas',      href: '/pipeline/ideas',     tone: DASHBOARD_TONE.info },
  { key: 'enriched'   as const, label: 'Enriched',   href: '/pipeline/ideas',     tone: DASHBOARD_TONE.enrich },
  { key: 'generating' as const, label: 'Generating', href: '/pipeline/generate',  tone: DASHBOARD_TONE.warning },
  { key: 'review'     as const, label: 'Review',     href: '/pipeline/review',    tone: DASHBOARD_TONE.accent },
  { key: 'published'  as const, label: 'Published',  href: '/pipeline/inventory', tone: DASHBOARD_TONE.success },
]

export default function PipelineFunnelWidget({ stages }: { stages: Stages }) {
  const max = Math.max(...Object.values(stages), 1)

  return (
    <div className="flex h-full flex-col depth-card glass-panel p-6 rounded-[2rem]">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-500 font-bold">
        Production Funnel
      </p>

      <div className="mt-6 flex flex-1 flex-col justify-around gap-2">
        {STAGE_CONFIG.map(({ key, label, href, tone }) => {
          const count = stages[key]
          const pct = (count / max) * 100

          return (
            <Link
              key={key}
              href={href}
              className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 depth-card hover-glow-blue"
            >
              <div 
                className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]`}
                style={{ color: tone.var }}
              />

              <span className="w-24 shrink-0 text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-[--text-primary] accent-text">
                {label}
              </span>

              <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5" style={{ height: '6px' }}>
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out`}
                  style={{ 
                    width: `${pct}%`, 
                    minWidth: count > 0 ? '6px' : '0',
                    backgroundColor: tone.var,
                    boxShadow: `0 0 10px color-mix(in srgb, ${tone.var} 40%, transparent)`
                  }}
                />
              </div>

              <span className="w-8 shrink-0 text-right font-mono text-[13px] font-extrabold text-[--text-primary] accent-text">
                {count}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
