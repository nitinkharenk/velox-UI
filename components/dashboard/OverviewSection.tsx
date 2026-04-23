import type { LucideIcon } from 'lucide-react'
import { DASHBOARD_TONE } from './dashboardTones'
import { cx } from '@/components/ui/cx'

interface MetricItem {
  label: string
  value: string | number
  trend?: string
  icon: LucideIcon
  tone: keyof typeof DASHBOARD_TONE
}

interface OverviewSectionProps {
  metrics: MetricItem[]
  className?: string
}

export default function OverviewSection({ metrics, className }: OverviewSectionProps) {
  return (
    <section 
      className={cx(
        "surface-panel relative flex flex-wrap divide-x divide-[--border-subtle] overflow-hidden rounded-[2rem] border border-[--border-subtle] bg-[--bg-surface] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      {metrics.map((m, i) => {
        const tone = DASHBOARD_TONE[m.tone]
        return (
          <div 
            key={i} 
            className="group relative flex min-w-[200px] flex-1 flex-col gap-2 p-6 transition-all duration-300 hover:bg-[--bg-soft]"
          >
            {/* Hover Glow */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              <div 
                className="absolute inset-x-4 top-0 h-px blur-[2px]" 
                style={{ backgroundColor: tone.var }}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[--text-tertiary] opacity-80">
                {m.label}
              </p>
              <m.icon className={cx("h-3.5 w-3.5 opacity-60 transition-transform group-hover:scale-110", tone.text)} />
            </div>

            <div className="flex items-baseline gap-2">
              <p className="font-display text-3xl font-bold tracking-tight text-[--text-primary] accent-text">
                {m.value}
              </p>
            </div>

            {m.trend && (
              <p className="font-mono text-[10px] font-medium text-[--text-secondary]">
                {m.trend}
              </p>
            )}
          </div>
        )
      })}
    </section>
  )
}
