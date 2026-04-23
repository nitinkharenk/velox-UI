import { cx } from '@/components/ui/cx'

interface DashboardPageFrameProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  hideHeader?: boolean
}

export default function DashboardPageFrame({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  hideHeader,
}: DashboardPageFrameProps) {
  return (
    <div className={cx('mx-auto flex w-full max-w-[1360px] flex-col gap-6', className)}>
      {!hideHeader && (
        <header
          className="relative overflow-hidden depth-card glass-panel rounded-[2rem] px-6 py-8 sm:px-10"
        >
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[720px]">
              {eyebrow && (
                <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0465ED]">
                  {eyebrow}
                </p>
              )}
              <h1
                className={cx(
                  'font-bold leading-tight tracking-tight text-[--text-primary]',
                )}
                style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
              >
                {title}
              </h1>
              {description && (
                <p className="mt-3 max-w-[600px] text-sm font-medium leading-relaxed text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </header>
      )}

      <div className={cx('space-y-6', contentClassName)}>
        {children}
      </div>
    </div>
  )
}
