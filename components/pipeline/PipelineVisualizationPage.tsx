'use client'

import { useEffect, useState, type ElementType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Bot,
  Sparkles,
  Wrench,
  Copy,
  Check,
  ChevronRight,
  Zap,
  Search,
  ArrowRight,
} from 'lucide-react'
import DashboardPageFrame from '@/components/dashboard/DashboardPageFrame'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { toast } from '@/components/ui/Toast'
import { cx } from '@/components/ui/cx'
import {
  VISUALIZATION_STAGES,
  canRunVisualizationStage,
  getVisualizationStageState,
} from '@/lib/pipeline/visualization'
import type {
  Idea,
  RunVisualizationStageResponse,
  VisualizationStageKey,
  VisualizationStageState,
  VisualizationStageTrace,
} from '@/types/pipeline'

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const STAGE_ICONS: Record<VisualizationStageKey, ElementType> = {
  enrich: Sparkles,
  generate: Bot,
  validate: Activity,
  repair: Wrench,
}

const STAGE_COLORS: Record<VisualizationStageKey, { accent: string; glow: string; bg: string }> = {
  enrich: { accent: '#fb923c', glow: 'rgba(251,146,60,0.15)', bg: 'rgba(251,146,60,0.08)' },
  generate: { accent: '#0465ED', glow: 'rgba(4,101,237,0.15)', bg: 'rgba(4,101,237,0.08)' },
  validate: { accent: '#34d399', glow: 'rgba(52,211,153,0.15)', bg: 'rgba(52,211,153,0.08)' },
  repair: { accent: '#f87171', glow: 'rgba(248,113,113,0.15)', bg: 'rgba(248,113,113,0.08)' },
}

const STATE_META: Record<VisualizationStageState, { label: string; dot: string; badge: string }> = {
  not_started: {
    label: 'Idle',
    dot: 'bg-gray-500',
    badge: 'border-white/10 bg-white/5 text-gray-500',
  },
  running: {
    label: 'Running',
    dot: 'bg-[#0465ED] animate-pulse',
    badge: 'border-blue-500/30 bg-blue-500/10 text-[#0465ED]',
  },
  completed: {
    label: 'Done',
    dot: 'bg-emerald-400',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  failed: {
    label: 'Failed',
    dot: 'bg-red-400',
    badge: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
}

const IDEA_STATUS_FILTER = [
  'pending', 'enriching', 'enriched', 'generating', 'generated',
  'validating', 'validated', 'ready', 'ready_with_warnings',
  'reviewing', 'repair_required', 'failed',
].join(',')

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function createLoadingTrace(
  stage: VisualizationStageKey,
  idea: Idea & { generated_code?: string | null },
): VisualizationStageTrace {
  return {
    stage,
    state: 'running',
    input: {
      format: 'text',
      title: 'Preparing Stage',
      content: `Running ${stage} for ${idea.name}...`,
    },
    output: {
      format: 'text',
      title: 'Awaiting Response',
      content: 'Waiting for the pipeline stage to finish.',
    },
    idea: {
      id: idea.id,
      name: idea.name,
      type: idea.type,
      category: idea.category,
      tech: idea.tech,
      complexity: idea.complexity,
      feel: idea.feel,
      status: idea.status,
      enriched_spec: idea.enriched_spec,
      generated_code: idea.generated_code ?? null,
      error_log: idea.error_log,
    },
    updatedAt: new Date().toISOString(),
  }
}

function createTraceFromResponse(payload: RunVisualizationStageResponse): VisualizationStageTrace {
  return {
    stage: payload.stage,
    state: payload.state,
    input: payload.input,
    output: payload.output,
    idea: payload.idea,
    error: payload.error,
    updatedAt: new Date().toISOString(),
  }
}

function statusColor(status: string): string {
  if (['ready', 'approved', 'validated', 'ready_with_warnings'].includes(status)) return 'text-emerald-400'
  if (['failed', 'repair_required'].includes(status)) return 'text-red-400'
  if (['enriching', 'generating', 'validating'].includes(status)) return 'text-[#0465ED]'
  return 'text-gray-500'
}

/* ═══════════════════════════════════════════════════════════════════════════
   COPY BUTTON
   ═══════════════════════════════════════════════════════════════════════════ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function PipelineVisualizationPage() {
  const [ideas, setIdeas] = useState<Array<Idea & { generated_code?: string | null }>>([])
  const [selectedIdeaId, setSelectedIdeaId] = useState('')
  const [selectedStage, setSelectedStage] = useState<VisualizationStageKey>('enrich')
  const [traceMap, setTraceMap] = useState<Record<string, Partial<Record<VisualizationStageKey, VisualizationStageTrace>>>>({})
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(true)
  const [runningStage, setRunningStage] = useState<VisualizationStageKey | null>(null)
  const [ideaSearch, setIdeaSearch] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadIdeas() {
      setIsLoadingIdeas(true)
      try {
        const response = await fetch(`/api/pipeline/ideas?status=${IDEA_STATUS_FILTER}`, {
          cache: 'no-store',
        })
        const data = await response.json()
        if (cancelled) return

        const nextIdeas = Array.isArray(data.ideas)
          ? (data.ideas as Array<Idea & { generated_code?: string | null }>)
          : []

        setIdeas(nextIdeas)

        if (!selectedIdeaId && nextIdeas.length > 0) {
          setSelectedIdeaId(nextIdeas[0].id)
        }
        if (selectedIdeaId && !nextIdeas.some((idea) => idea.id === selectedIdeaId)) {
          setSelectedIdeaId(nextIdeas[0]?.id ?? '')
        }
      } catch (error) {
        if (!cancelled) {
          toast.error('Failed to load ideas', error instanceof Error ? error.message : undefined)
        }
      } finally {
        if (!cancelled) setIsLoadingIdeas(false)
      }
    }

    void loadIdeas()
    return () => { cancelled = true }
  }, [selectedIdeaId])

  const selectedIdea = ideas.find((idea) => idea.id === selectedIdeaId) ?? null
  const currentTrace = selectedIdeaId ? traceMap[selectedIdeaId]?.[selectedStage] : undefined
  const stageColor = STAGE_COLORS[selectedStage]

  const filteredIdeas = ideaSearch.trim()
    ? ideas.filter(i => i.name.toLowerCase().includes(ideaSearch.toLowerCase()))
    : ideas

  async function handleRunStage() {
    if (!selectedIdea || runningStage) return

    const readiness = canRunVisualizationStage(selectedStage, selectedIdea)
    if (!readiness.ok) {
      toast.error('Stage blocked', readiness.reason)
      return
    }

    setRunningStage(selectedStage)
    setTraceMap((prev) => ({
      ...prev,
      [selectedIdea.id]: {
        ...prev[selectedIdea.id],
        [selectedStage]: createLoadingTrace(selectedStage, selectedIdea),
      },
    }))

    try {
      const response = await fetch('/api/pipeline/visualization/run-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: selectedIdea.id, stage: selectedStage }),
      })
      const payload = await response.json() as RunVisualizationStageResponse

      setTraceMap((prev) => ({
        ...prev,
        [selectedIdea.id]: {
          ...prev[selectedIdea.id],
          [selectedStage]: createTraceFromResponse(payload),
        },
      }))

      setIdeas((prev) =>
        prev.map((idea) => (idea.id === payload.idea.id ? { ...idea, ...payload.idea } as typeof idea : idea)),
      )

      if (payload.ok) {
        toast.success(`${payload.idea.name} updated`, `${payload.stage} completed`)
      } else {
        toast.error(`${payload.stage} failed`, payload.error ?? payload.output.content)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      setTraceMap((prev) => ({
        ...prev,
        [selectedIdea.id]: {
          ...prev[selectedIdea.id],
          [selectedStage]: {
            ...createLoadingTrace(selectedStage, selectedIdea),
            state: 'failed',
            output: {
              format: 'text',
              title: 'Request Error',
              content: message,
            },
            error: message,
            updatedAt: new Date().toISOString(),
          },
        },
      }))

      toast.error('Stage request failed', message)
    } finally {
      setRunningStage(null)
    }
  }

  return (
    <DashboardPageFrame title="Pipeline Inspector" hideHeader>
      <div className="mx-auto max-w-[1400px] py-10 space-y-10">

        {/* ═══════════════════════════════════════════════════════════════
            HERO HEADER
        ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-150" />
              <div className="relative h-14 w-14 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0465ED] to-[#6366f1] text-white shadow-2xl">
                <Zap className="h-7 w-7" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-[--text-primary]">Pipeline Inspector</h2>
              <p className="text-[--text-secondary] font-medium">Debug stages individually — inspect raw prompts and model output in real-time.</p>
            </div>
          </div>

          <Button
            variant="accent"
            onClick={handleRunStage}
            loading={runningStage === selectedStage}
            disabled={!selectedIdea || !!runningStage}
            className="h-14 rounded-2xl px-10 text-[11px] font-mono font-black uppercase tracking-[0.3em] bg-[#0465ED] text-white shadow-2xl shadow-blue-500/20 active:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Execute Stage <ArrowRight className="ml-3 h-4 w-4" />
          </Button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            HORIZONTAL STAGE RAIL
        ═══════════════════════════════════════════════════════════════ */}
        <div className="depth-card glass-panel rounded-[2.5rem] p-8">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-6 px-1">
            Stage Selector
          </p>
          <div className="grid grid-cols-4 gap-4">
            {VISUALIZATION_STAGES.map((stage, idx) => {
              const Icon = STAGE_ICONS[stage.key]
              const color = STAGE_COLORS[stage.key]
              const traceState = selectedIdeaId ? traceMap[selectedIdeaId]?.[stage.key]?.state : undefined
              const computedState = selectedIdea
                ? getVisualizationStageState(stage.key, selectedIdea)
                : 'not_started'
              const state = runningStage === stage.key
                ? 'running'
                : traceState ?? computedState
              const meta = STATE_META[state]
              const isActive = selectedStage === stage.key
              const readiness = selectedIdea
                ? canRunVisualizationStage(stage.key, selectedIdea)
                : { ok: false as const, reason: 'Select an idea first.' }

              return (
                <button
                  key={stage.key}
                  onClick={() => setSelectedStage(stage.key)}
                  className={cx(
                    'relative group rounded-[2rem] border p-6 text-left transition-all duration-300',
                    isActive
                      ? 'border-[#0465ED]/50 shadow-[0_8px_30px_rgba(4,101,237,0.12)] scale-[1.02]'
                      : 'border-white/5 hover:border-white/15 hover:scale-[1.01]',
                  )}
                  style={isActive ? { background: color.bg } : undefined}
                >
                  {/* Stage number connector */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={cx(
                        'flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300',
                        isActive
                          ? 'text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-gray-500 group-hover:text-white',
                      )}
                      style={isActive ? { background: color.accent, borderColor: color.accent } : undefined}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cx('h-2 w-2 rounded-full', meta.dot)} />
                      <span className={cx(
                        'rounded-lg border px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-[0.15em]',
                        meta.badge,
                      )}>
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  <p className={cx(
                    'text-sm font-black transition-colors',
                    isActive ? 'text-[--text-primary]' : 'text-gray-400 group-hover:text-[--text-primary]',
                  )}>
                    {stage.label}
                  </p>
                  <p className="mt-1 text-[10px] font-medium leading-relaxed text-gray-500 line-clamp-2">
                    {stage.description}
                  </p>

                  {!readiness.ok && (
                    <p className="mt-3 text-[9px] font-bold italic text-gray-500/60">
                      {readiness.reason}
                    </p>
                  )}

                  {/* Active indicator line */}
                  {isActive && (
                    <motion.div
                      layoutId="stage-indicator"
                      className="absolute bottom-0 left-6 right-6 h-[3px] rounded-full"
                      style={{ background: color.accent }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            IDEA SELECTOR + METADATA
        ═══════════════════════════════════════════════════════════════ */}
        <div className="depth-card glass-panel rounded-[2.5rem] p-8">
          {isLoadingIdeas ? (
            <div className="flex items-center gap-4 text-sm font-bold text-[#0465ED] py-8 justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0465ED] border-t-transparent" />
              Retrieving active artifacts...
            </div>
          ) : ideas.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No active ideas"
              description="Create or enrich an idea first, then come back here to inspect each stage."
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 px-1">
                  Target Idea
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                  <input
                    placeholder="Filter ideas..."
                    value={ideaSearch}
                    onChange={(e) => setIdeaSearch(e.target.value)}
                    className="h-9 w-56 rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-4 text-[11px] font-medium placeholder:text-white/15 focus:outline-none focus:ring-2 focus:ring-[#0465ED]/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {filteredIdeas.map((idea) => {
                  const isSelected = idea.id === selectedIdeaId
                  return (
                    <button
                      key={idea.id}
                      onClick={() => setSelectedIdeaId(idea.id)}
                      className={cx(
                        'group relative rounded-2xl border p-4 text-left transition-all duration-300',
                        isSelected
                          ? 'border-[#0465ED]/50 bg-blue-500/5 shadow-lg shadow-blue-500/10 scale-[1.02]'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/5',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className={cx(
                          'text-[13px] font-black truncate transition-colors',
                          isSelected ? 'text-[#0465ED]' : 'text-[--text-primary]',
                        )}>
                          {idea.name}
                        </p>
                        {isSelected && (
                          <div className="flex-shrink-0 h-2 w-2 rounded-full bg-[#0465ED] mt-1.5" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cx(
                          'text-[9px] font-mono font-black uppercase tracking-widest',
                          statusColor(idea.status),
                        )}>
                          {idea.status.replace(/_/g, ' ')}
                        </span>
                        {idea.format && (
                          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider text-gray-500">
                            {idea.format}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Selected idea metadata strip */}
              <AnimatePresence mode="wait">
                {selectedIdea && (
                  <motion.div
                    key={selectedIdea.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5"
                  >
                    {[
                      { label: 'Category', value: selectedIdea.category },
                      { label: 'Status', value: selectedIdea.status.replace(/_/g, ' ') },
                      { label: 'Complexity', value: selectedIdea.complexity },
                      { label: 'Tech', value: selectedIdea.tech.join(', ') || '—' },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                          {f.label}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[--text-primary] truncate">
                          {f.value}
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TRACE PANELS — INPUT & OUTPUT
        ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {selectedIdea ? (
            <motion.div
              key={`trace-${selectedIdeaId}-${selectedStage}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="grid gap-8 lg:grid-cols-2"
            >
              {/* SOURCE INPUT PANEL */}
              <article className="depth-card glass-panel rounded-[2.5rem] p-8 flex flex-col">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div>
                    <p
                      className="font-mono text-[10px] uppercase tracking-[0.3em] font-black"
                      style={{ color: stageColor.accent }}
                    >
                      Source Input
                    </p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-[--text-primary]">
                      {currentTrace?.input.title ?? 'Pending Execution'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {runningStage === selectedStage && (
                      <div className="flex items-center gap-2 text-[9px] font-mono font-black uppercase tracking-widest text-gray-500">
                        <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-[#0465ED] border-t-transparent" />
                        Live
                      </div>
                    )}
                    <CopyButton text={currentTrace?.input.content ?? ''} />
                  </div>
                </div>
                <div className="relative flex-1">
                  <div
                    className="absolute inset-0 blur-3xl rounded-full opacity-40"
                    style={{ background: stageColor.glow }}
                  />
                  <pre className="relative z-10 h-full min-h-[400px] max-h-[600px] overflow-auto rounded-2xl border border-white/5 bg-black/20 p-6 font-mono text-[11px] leading-relaxed text-[--text-primary] custom-scrollbar">
                    <code>{currentTrace?.input.content ?? 'Run a stage to inspect the outbound prompt or payload.'}</code>
                  </pre>
                </div>
              </article>

              {/* MODEL RESPONSE PANEL */}
              <article className="depth-card glass-panel rounded-[2.5rem] p-8 flex flex-col">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div>
                    <p
                      className="font-mono text-[10px] uppercase tracking-[0.3em] font-black"
                      style={{ color: stageColor.accent }}
                    >
                      Model Response
                    </p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-[--text-primary]">
                      {currentTrace?.output.title ?? 'Awaiting Output'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {currentTrace?.state === 'failed' && (
                      <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest text-red-400">
                        Error
                      </span>
                    )}
                    {currentTrace?.state === 'completed' && (
                      <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest text-emerald-400">
                        Success
                      </span>
                    )}
                    <CopyButton text={currentTrace?.output.content ?? ''} />
                  </div>
                </div>
                <div className="relative flex-1">
                  <div
                    className="absolute inset-0 blur-3xl rounded-full opacity-40"
                    style={{ background: stageColor.glow }}
                  />
                  <pre className="relative z-10 h-full min-h-[400px] max-h-[600px] overflow-auto rounded-2xl border border-white/5 bg-black/20 p-6 font-mono text-[11px] leading-relaxed text-[--text-primary] custom-scrollbar">
                    <code>{currentTrace?.output.content ?? 'Stage responses will appear here after a manual run.'}</code>
                  </pre>
                </div>
              </article>
            </motion.div>
          ) : (
            <motion.div
              key="empty-trace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <EmptyState
                icon={Activity}
                title="Select an idea"
                description="Choose an active idea to unlock the stage-by-stage visualization workflow."
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardPageFrame>
  )
}
