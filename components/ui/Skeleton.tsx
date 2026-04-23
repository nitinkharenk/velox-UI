import { cx } from './cx'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'rounded-2xl bg-[linear-gradient(90deg,var(--bg-surface)_0%,var(--bg-elevated)_45%,var(--bg-surface)_100%)] bg-[length:200%_100%] animate-shimmer',
        className
      )}
    />
  )
}
