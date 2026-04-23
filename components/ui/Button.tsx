'use client'

import { Loader2 } from 'lucide-react'
import { cx } from './cx'

type V = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
type S = 'xs' | 'sm' | 'md' | 'lg' | 'icon'

const vmap: Record<V, string> = {
  primary:
    'border border-transparent bg-[image:var(--card-gradient)] text-white shadow-[var(--shadow-glow)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]',
  secondary:
    'border border-[--border-default] bg-[--bg-surface] text-[--text-primary] shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:border-[--accent-border] hover:bg-[--bg-elevated]',
  ghost: 'border border-transparent bg-transparent text-[--text-secondary] hover:bg-[--bg-soft] hover:text-[--accent]',
  danger:
    'border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[--danger-dim] text-[--danger] hover:border-[color-mix(in_srgb,var(--danger)_50%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger)_24%,transparent)]',
  accent:
    'border border-transparent bg-[image:var(--card-gradient)] text-white shadow-[var(--shadow-glow)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]',
}

const smap: Record<S, string> = {
  xs: 'h-7 px-3 text-[11px] rounded-xl',
  sm: 'h-9 px-3.5 text-xs rounded-xl',
  md: 'h-10 px-4 text-sm rounded-2xl',
  lg: 'h-11 px-5 text-sm rounded-2xl',
  icon: 'h-10 w-10 rounded-2xl',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  disabled,
  className,
  children,
  ...p
}: {
  variant?: V
  size?: S
  loading?: boolean
  className?: string
  children?: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cx(
        'inline-flex cursor-pointer select-none items-center justify-center gap-2 font-body text-[11px] uppercase tracking-[0.12em]',
        'transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-border] focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg-base]',
        vmap[variant],
        smap[size],
        className
      )}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

export default Button
