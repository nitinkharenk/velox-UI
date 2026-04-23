import type { LucideIcon } from 'lucide-react'
import { cx } from '@/components/ui/cx'

const toneMap = {
  accent: 'border-[--accent-border] bg-[--accent-dim] text-[--accent]',
  success: 'border-[color-mix(in_srgb,var(--success)_34%,transparent)] bg-[--success-dim] text-[--success]',
  info: 'border-[color-mix(in_srgb,var(--info)_34%,transparent)] bg-[--info-dim] text-[--info]',
} as const

export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  tone = 'accent',
  className,
}: {
  label: string
  value: string | number
  trend?: string
  icon: LucideIcon
  tone?: keyof typeof toneMap
  className?: string
}) {
  return (
    <article
      className={cx(
        'surface-panel group rounded-[1.7rem] p-5 hover:-translate-y-1 hover:border-[--accent-border] hover:shadow-[var(--shadow-lift)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[--text-tertiary]">{label}</p>
          <p className="mt-3 font-display text-4xl font-bold leading-none tracking-[-0.05em] text-[--text-primary]">{value}</p>
          {trend && <p className="mt-3 text-xs font-medium text-[--text-secondary]">{trend}</p>}
        </div>
        <span className={cx('flex h-11 w-11 items-center justify-center rounded-2xl border', toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </article>
  )
}

export default StatCard
