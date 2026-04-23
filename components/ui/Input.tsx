import { cx } from './cx'

export function Input({
  label,
  error,
  icon,
  className,
  ...p
}: {
  label?: string
  error?: string
  icon?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block font-body text-[10px] uppercase tracking-[0.18em] text-[--text-tertiary]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-tertiary]">{icon}</span>}
        <input
          {...p}
          className={cx(
            'h-11 w-full rounded-2xl border bg-[--bg-surface] font-body text-[11px] tracking-[0.04em] text-[--text-primary] shadow-[var(--shadow-soft)]',
            'placeholder:text-[--text-tertiary] transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[--accent-border] focus:ring-offset-2 focus:ring-offset-[--bg-base]',
            error
              ? 'border-[color-mix(in_srgb,var(--danger)_34%,transparent)] focus:border-[--danger]'
              : 'border-[--border-default] hover:border-[--border-strong] focus:border-[--accent-border]',
            icon ? 'pl-10 pr-4' : 'px-4',
            className
          )}
        />
      </div>
      {error && <p className="text-[11px] text-[--danger]">{error}</p>}
    </div>
  )
}
