'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Idea, IdeaRunState } from '@/types/pipeline'

interface IdeaQueueProps {
  runStates: IdeaRunState[]
  isRunning: boolean
  onRun: (selectedIds: string[]) => void
  onRepair?: (ideaId: string) => void
}

export default function IdeaQueue({ runStates, isRunning, onRun, onRepair }: IdeaQueueProps) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadIdeas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pipeline/ideas?status=pending,enriched,failed,repair_required', { cache: 'no-store' })
      const data = await res.json()
      setIdeas(data.ideas ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isRunning) return

    const timeoutId = window.setTimeout(() => {
      void loadIdeas()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadIdeas, isRunning])

  function toggleAll() {
    if (selected.size === ideas.length) setSelected(new Set())
    else setSelected(new Set(ideas.map(i => i.id)))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runStateMap = Object.fromEntries(runStates.map(r => [r.ideaId, r]))

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 animate-shimmer rounded-lg bg-[--bg-elevated]" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[--border-subtle] px-4 py-3">
        <span className="text-xs font-mono uppercase tracking-wider text-[--text-tertiary]">
          Ideas queue
        </span>
        {ideas.length > 0 && (
          <button
            onClick={toggleAll}
            className="text-[10px] font-mono text-[--text-tertiary] transition-colors hover:text-[--text-primary]"
          >
            {selected.size === ideas.length ? 'deselect all' : 'select all'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {ideas.length === 0 ? (
          <div className="flex h-32 items-center justify-center font-mono text-xs text-[--text-tertiary]">
            No pending ideas
          </div>
        ) : (
          ideas.map(idea => {
            const run = runStateMap[idea.id]
            const isThisRunning = run?.status === 'running'
            const isDone = run?.status === 'done'
            const isFailed = run?.status === 'failed'

            return (
              <div
                key={idea.id}
                onClick={() => !isRunning && toggle(idea.id)}
                className={`
                  mx-2 mb-0.5 rounded-lg px-3 py-2.5 transition-colors duration-100
                  ${isRunning ? 'cursor-default' : 'cursor-pointer'}
                  ${selected.has(idea.id) && !isRunning
                    ? 'border border-[--border-default] bg-[--bg-elevated]'
                    : 'hover:bg-[--bg-hover]'
                  }
                `}
              >
                <div className="flex items-center gap-2.5">
                  {!isRunning && (
                    <div className={`
                      flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-100
                      ${selected.has(idea.id)
                        ? 'border-[--accent-border] bg-[--accent-dim]'
                        : 'border-[--border-default] bg-[--bg-elevated]'
                      }
                    `}>
                      {selected.has(idea.id) && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none" className="text-lime-300">
                          <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )}

                  {isRunning && (
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {isThisRunning && (
                        <div className="h-3 w-3 animate-spin rounded-full border border-[--accent] border-t-transparent" />
                      )}
                      {isDone && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[--dashboard-success]">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {isFailed && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[--dashboard-danger]">
                          <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                      {run?.status === 'queued' && (
                        <div className="h-2 w-2 rounded-full bg-[--text-tertiary]" />
                      )}
                      {!run && (
                        <div className="h-2 w-2 rounded-full bg-[--border-default]" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm leading-tight text-[--text-primary]">
                      {idea.name}
                    </p>
                    {isThisRunning && run?.progress !== undefined ? (
                      <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-[--border-subtle]">
                        <div
                          className="h-full rounded-full bg-[--accent] transition-all duration-500"
                          style={{ width: `${run.progress}%` }}
                        />
                      </div>
                    ) : (
                      <p className="mt-0.5 text-[10px] font-mono text-[--text-tertiary]">
                        {idea.category} · {idea.type}
                        {run?.durationMs && (
                          <span className="ml-2 text-[--text-tertiary]">
                            {(run.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {!isRunning && (
                    <span className={`
                      shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono
                      ${idea.complexity === 'low'
                        ? 'border-[--dashboard-success-border] bg-[--dashboard-success-soft] text-[--dashboard-success]'
                        : idea.complexity === 'medium'
                        ? 'border-[--dashboard-warning-border] bg-[--dashboard-warning-soft] text-[--dashboard-warning]'
                        : 'border-[--dashboard-danger-border] bg-[--dashboard-danger-soft] text-[--dashboard-danger]'
                      }
                    `}>
                      {idea.complexity}
                    </span>
                  )}
                  {(!isRunning && (idea.status === 'failed' || idea.status === 'repair_required')) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRepair?.(idea.id)
                      }}
                      className="shrink-0 rounded bg-[--danger]/10 border border-[--danger]/20 px-2 py-1 text-[10px] font-mono text-[--danger] hover:bg-[--danger]/20 transition-colors"
                    >
                      Repair
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-[--border-subtle] p-3">
        {isRunning ? (
          <div className="flex h-9 items-center justify-center gap-2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border border-[--accent] border-t-transparent" />
            <span className="text-xs font-mono text-[--text-secondary]">
              Running {runStates.filter(r => r.status === 'done').length} / {runStates.length}...
            </span>
          </div>
        ) : (
          <button
            onClick={() => onRun([...selected])}
            disabled={selected.size === 0}
            className="h-9 w-full rounded-lg bg-[--accent] font-mono text-xs font-semibold text-[--accent-contrast] transition-all duration-150 hover:bg-[--accent-hover] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {selected.size === 0
              ? 'Select ideas to run'
              : `Run ${selected.size} idea${selected.size > 1 ? 's' : ''} →`
            }
          </button>
        )}
      </div>
    </div>
  )
}
