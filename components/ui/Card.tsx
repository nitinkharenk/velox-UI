import { cx } from './cx'

const vs = {
  default: 'surface-panel',
  elevated: 'surface-panel-elevated',
  ghost: 'border border-[--border-subtle] bg-transparent',
  accent: 'surface-panel border-[--accent-border]',
}

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
}: {
  variant?: keyof typeof vs
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}) {
  const ps = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-7' }
  return <div className={cx('rounded-[1.5rem]', vs[variant], ps[padding], className)}>{children}</div>
}
