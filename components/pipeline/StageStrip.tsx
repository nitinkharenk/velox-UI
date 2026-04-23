'use client'
import { cx } from '@/components/ui/cx'

export type StageState = 'pending' | 'active' | 'complete' | 'error'

export interface PipelineStage {
  key: string
  label: string
  state: StageState
}

interface StageStripProps {
  stages: PipelineStage[]
  currentMessage: string
  isRunning: boolean
  errorMessage?: string
  className?: string
}

export default function StageStrip({
  stages,
  currentMessage,
  isRunning,
  errorMessage,
  className,
}: StageStripProps) {
  return (
    <div className={cx('w-full space-y-4', className)}>
      <div className="flex items-center justify-between gap-2 px-2">
        {stages.map((stage, i) => {
          const isActive = stage.state === 'active'
          const isComplete = stage.state === 'complete'
          const isError = stage.state === 'error'

          return (
            <div key={stage.key} className="flex min-w-0 flex-1 items-center">
              <div className="group relative flex flex-shrink-0 flex-col items-center gap-2">
                <div 
                  className={cx(
                    'relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-500',
                    isComplete && 'border-[--dashboard-success-border] bg-[--dashboard-success-soft] text-[--dashboard-success]',
                    isActive && 'border-[--dashboard-accent-border] bg-[--dashboard-accent-soft] text-[--dashboard-accent] shadow-[0_0_20px_var(--dashboard-accent-soft-strong)]',
                    isError && 'border-[--dashboard-danger-border] bg-[--dashboard-danger-soft] text-[--dashboard-danger]',
                    !isActive && !isComplete && !isError && 'border-[--border-subtle] bg-[--bg-soft] text-[--text-tertiary]'
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 animate-ping2 rounded-full border border-[--dashboard-accent-border] opacity-50" />
                  )}
                  
                  {isComplete ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-fade-in">
                      <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : isError ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-fade-in">
                      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : isActive ? (
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[--dashboard-accent]" />
                  ) : (
                    <span className="font-mono text-[10px] font-bold">{i + 1}</span>
                  )}
                </div>

                <span 
                  className={cx(
                    'whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-colors duration-300',
                    isComplete ? 'text-[--dashboard-success]' : isActive ? 'text-[--dashboard-accent]' : isError ? 'text-[--dashboard-danger]' : 'text-[--text-soft]'
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {i < stages.length - 1 && (
                <div className="mx-4 mb-6 flex-1">
                  <div 
                    className={cx(
                      'h-[2px] w-full rounded-full transition-all duration-700',
                      isComplete ? 'bg-[--dashboard-success-border]' : 'bg-[--dashboard-border-subtle]'
                    )} 
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(isRunning || errorMessage || currentMessage) && (
        <div 
          className={cx(
            'flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 animate-fade-up depth-card glass-panel',
            errorMessage ? 'border-[--dashboard-danger-border] bg-[--dashboard-danger-soft]' : 'border-[--dashboard-border-subtle]'
          )}
        >
          {isRunning && !errorMessage && (
            <div className="relative flex h-4 w-4 shrink-0 transition-transform">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-[--dashboard-accent-border] border-t-transparent" />
              <div className="m-auto h-1 w-1 rounded-full bg-[--dashboard-accent]" />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-0.5">
            <p 
              className={cx(
                'font-mono text-[11px] font-bold leading-none tracking-tight',
                errorMessage ? 'text-[--dashboard-danger]' : 'text-[--text-primary]'
              )}
            >
              {errorMessage ? 'Process Interrupted' : isRunning ? 'Active Stream' : 'Ready'}
            </p>
            <p className="font-mono text-[10px] text-[--text-secondary] opacity-80">
              {errorMessage || currentMessage || 'Waiting for instruction...'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
