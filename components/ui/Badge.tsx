import { cx } from './cx'

type V = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

const map: Record<V, string> = {
  default: 'border-[--border-default] bg-[--bg-soft] text-[--text-secondary]',
  accent: 'border-[--accent-border] bg-[--accent-dim] text-[--accent-text]',
  success: 'border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[--success-dim] text-[--success]',
  warning: 'border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[--warning-dim] text-[--warning]',
  danger: 'border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[--danger-dim] text-[--danger]',
  info: 'border-[color-mix(in_srgb,var(--info)_28%,transparent)] bg-[--info-dim] text-[--info]',
  purple: 'border-[color-mix(in_srgb,var(--info)_30%,transparent)] bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[--info]',
}

export function Badge({
  variant = 'default',
  dot,
  size = 'sm',
  className,
  children,
}: {
  variant?: V
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border font-body uppercase tracking-[0.14em]',
        size === 'md' ? 'px-3 py-1 text-[11px]' : 'px-2.5 py-1 text-[10px]',
        map[variant],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-pulse" />}
      {children}
    </span>
  )
}

export default Badge
