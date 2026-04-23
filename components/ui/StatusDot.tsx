import { cx } from './cx'

type S =
  | 'pending'
  | 'enriching'
  | 'enriched'
  | 'generating'
  | 'generated'
  | 'validating'
  | 'validated'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'failed'

const c: Record<S, string> = {
  pending: 'bg-[--text-disabled]',
  enriching: 'bg-[--info]',
  enriched: 'bg-[--info]',
  generating: 'bg-[--accent]',
  generated: 'bg-[--accent]',
  validating: 'bg-[--warning]',
  validated: 'bg-[--warning]',
  reviewing: 'bg-[--accent]',
  approved: 'bg-[--success]',
  rejected: 'bg-[--danger]',
  failed: 'bg-[--danger]',
}

const pulse: S[] = ['enriching', 'generating', 'validating']

export function StatusDot({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const s = status as S
  const dim = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2'

  return (
    <span className="relative inline-flex flex-shrink-0">
      <span className={cx('rounded-full', dim, c[s] ?? 'bg-[--text-disabled]')} />
      {pulse.includes(s) && <span className={cx('absolute inset-0 rounded-full animate-ping2', c[s])} />}
    </span>
  )
}

export default StatusDot
