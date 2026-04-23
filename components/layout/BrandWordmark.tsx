import Link from 'next/link'
import { cx } from '@/components/ui/cx'

interface BrandWordmarkProps {
  href?: string
  className?: string
  withTagline?: boolean
  dark?: boolean
}

export default function BrandWordmark({
  href = '/',
  className,
  withTagline = false,
  dark = false,
}: BrandWordmarkProps) {
  const inkClass = dark ? 'text-[var(--legacy-velox-cream)]' : 'text-[--text-primary]'
  const subClass = dark ? 'text-white/65' : 'text-[--text-secondary]'

  return (
    <Link
      href={href}
      className={cx('inline-flex items-center gap-3 transition-transform duration-200 hover:scale-[1.01]', className)}
    >
      <span className={cx('font-heading text-[2rem] font-semibold italic tracking-[-0.06em]', inkClass)}>
        Velox UI
      </span>
      {withTagline && (
        <span className={cx('hidden text-[11px] font-medium tracking-[0.2em] uppercase sm:inline', subClass)}>
          Components, alive.
        </span>
      )}
    </Link>
  )
}
