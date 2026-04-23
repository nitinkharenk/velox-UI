'use client'

import { ChevronDown } from 'lucide-react'
import { cx } from './cx'

export function Select({
  label,
  className,
  children,
  ...p
}: {
  label?: string
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block font-body text-[10px] uppercase tracking-[0.18em] text-[--text-tertiary]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...p}
          className={cx(
            'h-11 w-full cursor-pointer appearance-none rounded-2xl border border-[--border-default] bg-[--bg-surface] pl-4 pr-10 font-body text-[11px] tracking-[0.04em] text-[--text-primary] shadow-[var(--shadow-soft)]',
            'transition-all duration-200 hover:border-[--border-strong]',
            'focus:outline-none focus:ring-2 focus:ring-[--accent-border] focus:ring-offset-2 focus:ring-offset-[--bg-base]',
            className
          )}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[--text-tertiary]" />
      </div>
    </div>
  )
}
