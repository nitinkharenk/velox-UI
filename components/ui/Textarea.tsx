import { cx } from './cx'

export function Textarea({
  label,
  className,
  ...p
}: {
  label?: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block font-body text-[10px] uppercase tracking-[0.18em] text-[--text-tertiary]">
          {label}
        </label>
      )}
      <textarea
        {...p}
        className={cx(
          'min-h-[110px] w-full resize-y rounded-[1.35rem] border border-[--border-default] bg-[--bg-surface] px-4 py-3 font-body text-[11px] leading-relaxed tracking-[0.04em] text-[--text-primary] shadow-[var(--shadow-soft)]',
          'placeholder:text-[--text-tertiary] transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[--accent-border] focus:ring-offset-2 focus:ring-offset-[--bg-base]',
          'hover:border-[--border-strong]',
          className
        )}
      />
    </div>
  )
}
