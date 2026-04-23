'use client'

import React from 'react'
import { Button } from './Button'

export function EmptyState({
  icon,
  title,
  desc,
  description,
  action,
  onAction,
}: {
  icon: React.ElementType | React.ReactNode
  title: string
  desc?: string
  description?: string
  action?: string
  onAction?: () => void
}) {
  const text = desc ?? description ?? ''
  const isComponent = typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon && (icon as Record<string, unknown>).render !== undefined)

  return (
    <div className="surface-panel-muted whitespace-normal flex w-full max-w-sm mx-auto flex-col items-center justify-center gap-4 rounded-[1.75rem] px-8 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-[--border-default] bg-[--bg-surface] text-[--accent] shadow-[var(--shadow-soft)]">
        {isComponent ? React.createElement(icon as React.ElementType, { className: 'h-5 w-5' }) : icon}
      </div>
      <div className="space-y-2">
        <p className="text-base font-medium text-[--text-primary]">{title}</p>
        <p className="mx-auto max-w-[280px] text-sm leading-7 text-[--text-secondary]">{text}</p>
      </div>
      {action && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
