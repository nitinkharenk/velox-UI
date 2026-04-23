'use client'

import { motion, AnimatePresence } from 'framer-motion'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Layers3,
  Loader2,
  Sparkles,
  TerminalSquare,
  XCircle,
  RotateCcw,
  ClipboardCopy,
  Settings2,
  Box,
  Zap,
} from 'lucide-react'
import DashboardPageFrame from '@/components/dashboard/DashboardPageFrame'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import LogTerminal from '@/components/pipeline/LogTerminal'
import { getProviderModelTokenLimits } from '@/lib/pipeline/providerModels'
import { toast } from '@/components/ui/Toast'
import type {
  IdeaRunState,
  LogEntry,
  LogLevel,
  LogStage,
  PipelineEvent,
  RunSession,
  WorkflowPipeline,
} from '@/types/pipeline'

interface ReviewIdea {
  id: string
  name: string
  type: string
  category: string
  complexity: string
  status: string
  created_at?: string
}

const STATUS_VARIANTS: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  reviewing: 'accent',
  ready: 'success',
  ready_with_warnings: 'warning',
  repair_required: 'danger',
  failed: 'danger',
}

const STATUS_LABELS: Record<string, string> = {
  reviewing: 'Reviewing',
  ready: 'Ready',
  ready_with_warnings: 'Warnings',
  repair_required: 'Repair',
  failed: 'Failed',
}

const STAGE_PROGRESS: Record<string, number> = {
  enriching: 25,
  generating: 55,
  validating: 80,
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

function now() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

function makeLog(
  stage: LogStage,
  level: LogLevel,
  message: string,
  ideaName?: string,
  detail?: string,
): LogEntry {
  return { id: makeId(), ts: now(), stage, level, message, ideaName, detail }
}

function stageFromStatus(stage: string): LogStage {
  if (stage === 'enriching') return 'ENRICH'
  if (stage === 'generating') return 'GEN'
  if (stage === 'validating') return 'VALID'
  return 'SYSTEM'
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMs(ms?: number) {
  if (!ms) return null
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function getWorkflowHeadline(workflow: WorkflowPipeline | undefined) {
  const firstStage = workflow?.pipeline_stages?.[0]
  return {
    provider: firstStage?.provider ?? workflow?.provider ?? 'anthropic',
    model: firstStage?.model ?? workflow?.model ?? 'claude-3-5-sonnet-20240620',
    systemPrompt: firstStage?.system_prompt ?? workflow?.system_prompt ?? '',
  }
}

export default function VeloxAIPage() {
  const [prompt, setPrompt] = useState('')
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null)
  const [count, setCount] = useState(1)
  const [pipelines, setPipelines] = useState<WorkflowPipeline[]>([])
  const [loadingPipelines, setLoadingPipelines] = useState(true)
  const [session, setSession] = useState<RunSession | null>(null)
  const [mounted, setMounted] = useState(false)

  // Tactical Options
  const [showTactical, setShowTactical] = useState(false)
  const [tacticalFormat, setTacticalFormat] = useState<string>('')
  const [tacticalComplexity, setTacticalComplexity] = useState<string>('')
  const [tacticalFeel, setTacticalFeel] = useState<string>('')

  const sessionRef = useRef<RunSession | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Per-idea state for showing logs vs preview
  const [ideaViewMode, setIdeaViewMode] = useState<Record<string, 'preview' | 'log'>>({})
  const [copyingReport, setCopyingReport] = useState<string | null>(null)
  const [showSessionLog, setShowSessionLog] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isRunning = session?.isRunning ?? false
  const isIdle = session === null
  const isFailedFull = session !== null && !session.isRunning && session.totalDone === 0 && session.totalFailed > 0
  const isDone = session !== null && !session.isRunning && session.totalDone > 0
  
  // Terminal should be shown if running OR if the run completely failed.
  const showTerminal = (session && isRunning) || isFailedFull

  const selectedWorkflow = useMemo(
    () =>
      pipelines.find((p) => p.id === selectedPipeline) ??
      pipelines.find((p) => p.is_default) ??
      pipelines[0],
    [pipelines, selectedPipeline],
  )
  const workflowHeadline = getWorkflowHeadline(selectedWorkflow)

  const updateSession = useCallback((updater: (prev: RunSession | null) => RunSession | null) => {
    setSession((prev) => {
      const next = updater(prev)
      sessionRef.current = next
      return next
    })
  }, [])

  const appendLog = useCallback(
    (entry: LogEntry) => {
      updateSession((prev) => (prev ? { ...prev, logs: [...prev.logs, entry] } : prev))
    },
    [updateSession],
  )

  const upsertIdeaRun = useCallback(
    (ideaId: string, ideaName: string, patch: Partial<IdeaRunState>) => {
      updateSession((prev) => {
        if (!prev) return prev
        const existing = prev.ideas.find((i) => i.ideaId === ideaId)
        if (!existing) {
          return {
            ...prev,
            ideas: [...prev.ideas, { ideaId, ideaName, status: 'queued', progress: 0, ...patch }],
          }
        }
        return {
          ...prev,
          ideas: prev.ideas.map((i) => (i.ideaId === ideaId ? { ...i, ...patch } : i)),
        }
      })
    },
    [updateSession],
  )

  const loadPipelines = useCallback(async () => {
    try {
      setLoadingPipelines(true)
      const res = await fetch('/api/pipeline/workflows', { cache: 'no-store' })
      const data = (await res.json()) as { pipelines?: WorkflowPipeline[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load pipelines.')
      const next = data.pipelines ?? []
      setPipelines(next)
      setSelectedPipeline(
        (cur) => cur ?? next.find((p) => p.is_default)?.id ?? next[0]?.id ?? null,
      )
    } catch (error) {
      toast.error('Could not load pipelines', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingPipelines(false)
    }
  }, [])

  useEffect(() => {
    void loadPipelines()
  }, [loadPipelines])

  // Scroll chat to top whenever state changes (run → done)
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [isRunning])

  // Auto-resize textarea as the user types
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [prompt])

  const handleEvent = useCallback(
    (event: PipelineEvent) => {
      // Common update for all events that carry trace data
      const tracePatch = {
        input: event.event === 'status' || event.event === 'error' ? undefined : (event as any).input,
        output: event.event === 'status' || event.event === 'error' ? undefined : (event as any).output,
        attempt: event.event === 'status' ? event.attempt : undefined,
      }

      if (event.event === 'run_started') {
        const newSession: RunSession = {
          id: event.runId,
          startedAt: Date.now(),
          isRunning: true,
          totalDone: 0,
          totalFailed: 0,
          ideas: [],
          logs: [makeLog('SYSTEM', 'system', `─── Velox AI started · ${event.totalIdeas} ideas ───`)],
        }
        setSession(newSession)
        sessionRef.current = newSession
        return
      }

      if (event.event === 'ideas_created') {
        appendLog(makeLog('SYSTEM', 'info', `Created ${event.ideaIds.length} idea records`))
        return
      }

      if (event.event === 'idea_started') {
        upsertIdeaRun(event.ideaId, event.ideaName, {
          status: 'running',
          progress: 5,
          startedAt: Date.now(),
        })
        appendLog(
          makeLog('SYSTEM', 'info', `Starting pipeline`, event.ideaName, `${event.index}/${event.total}`),
        )
        return
      }

      if (event.event === 'status') {
        const ideaName = event.ideaName ?? event.ideaId ?? 'Idea'
        const progress = STAGE_PROGRESS[event.stage] ?? 40
        if (event.ideaId) {
          upsertIdeaRun(event.ideaId, ideaName, {
            progress,
            status: 'running',
            attempt: event.attempt,
            isFatal: event.isFatal,
            action: event.stage === 'validating' ? 'validate_code' : undefined,
          })
        }
        appendLog({
          ...makeLog(stageFromStatus(event.stage), 'info', event.message, event.ideaName),
          input: event.input,
          output: event.output,
          attempt: event.attempt,
          isFatal: event.isFatal,
          action: event.stage === 'validating' ? 'validate_code' : undefined,
        })
        return
      }

      if (event.event === 'enriched') {
        if (event.ideaId)
          upsertIdeaRun(event.ideaId, event.ideaName ?? event.ideaId, { progress: 30, status: 'running' })
        appendLog({
          ...makeLog('ENRICH', 'success', 'Spec enriched', event.ideaName),
          input: event.input,
          output: event.output,
        })
        return
      }

      if (event.event === 'generated') {
        if (event.ideaId)
          upsertIdeaRun(event.ideaId, event.ideaName ?? event.ideaId, { progress: 65, status: 'running' })
        appendLog({
          ...makeLog('GEN', 'success', 'Code generated', event.ideaName, `${event.code.split('\n').length} lines`),
          input: event.input,
          output: event.output,
        })
        return
      }

      if (event.event === 'validated') {
        if (event.ideaId)
          upsertIdeaRun(event.ideaId, event.ideaName ?? event.ideaId, { progress: 85, status: 'running' })
        appendLog({
          ...makeLog(
            event.has_errors ? 'FIX' : 'VALID',
            event.has_errors ? 'warning' : 'success',
            event.has_errors ? 'Validation found issues' : 'Validation passed',
            event.ideaName,
            event.validation_notes,
          ),
          isFatal: event.isFatal,
          action: event.has_errors ? 'validate_code' : undefined,
          input: event.input,
          output: event.output,
        })
        return
      }

      if (event.event === 'ready') {
        upsertIdeaRun(event.ideaId, event.ideaName ?? event.ideaId, {
          progress: event.status === 'reviewing' ? 100 : 96,
          status: event.status === 'reviewing' ? 'done' : 'running',
        })
        appendLog(
          makeLog(
            'DONE',
            'success',
            event.status === 'reviewing' ? 'Moved to review queue' : 'Ready for manual review',
            event.ideaName,
          ),
        )
        return
      }

      if (event.event === 'repair_required') {
        upsertIdeaRun(event.ideaId, event.ideaName ?? event.ideaId, { progress: 100, status: 'failed' })
        appendLog(makeLog('REPAIR', 'error', event.message, event.ideaName))
        return
      }

      if (event.event === 'idea_completed') {
        updateSession((prev) => {
          if (!prev) return prev
          const currentIdea = prev.ideas.find((i) => i.ideaId === event.ideaId)
          const didFail = event.status === 'failed' || event.status === 'repair_required'
          return {
            ...prev,
            totalDone: didFail ? prev.totalDone : prev.totalDone + 1,
            totalFailed: didFail ? prev.totalFailed + 1 : prev.totalFailed,
            ideas: prev.ideas.map((i) =>
              i.ideaId === event.ideaId
                ? {
                  ...i,
                  status: didFail ? 'failed' : 'done',
                  progress: 100,
                  durationMs: currentIdea?.startedAt ? Date.now() - currentIdea.startedAt : undefined,
                }
                : i,
            ),
          }
        })
        return
      }

      if (event.event === 'run_completed') {
        appendLog(
          makeLog(
            'DONE',
            'system',
            `─── Run completed · ${event.completed} done · ${event.failed} failed ───`,
          ),
        )
        updateSession((prev) => (prev ? { ...prev, isRunning: false } : prev))

        if (event.failed > 0) {
          toast.info('Velox AI finished', `${event.completed} completed, ${event.failed} need attention.`)
        } else {
          toast.success('Velox AI finished', `${event.completed} ideas moved forward.`)
        }
        return
      }

      if (event.event === 'error') {
        appendLog(makeLog('ERROR', 'error', event.message, event.ideaName))
        if (event.ideaId) {
          upsertIdeaRun(event.ideaId, event.ideaName ?? event.ideaId, {
            status: 'failed',
            isFatal: event.isFatal,
            action: event.action
          })
        }
        updateSession((prev) => (prev ? { ...prev, isRunning: false } : prev))
        toast.error('Velox AI failed', event.message)
      }
    },
    [appendLog, updateSession, upsertIdeaRun],
  )

  const handleRerunStage = async (ideaId: string, ideaName: string, action: string) => {
    // 1. Mark ideas in sidebar as running
    upsertIdeaRun(ideaId, ideaName, { status: 'running', progress: 5 })
    updateSession(prev => prev ? { ...prev, isRunning: true } : null)

    try {
      const sseUrl = `/api/pipeline/generate?ideaId=${ideaId}&resumeFromAction=${action}`
      const response = await fetch(sseUrl, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
      })

      if (!response.ok || !response.body) throw new Error('Failed to resume stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          handleEvent(JSON.parse(trimmed.slice(6)))
        }
      }
    } catch (e) {
      toast.error('Failed to resume', e instanceof Error ? e.message : 'Unknown error')
      updateSession(prev => prev ? { ...prev, isRunning: false } : null)
    }
  }

  const handleCopyFullLog = async (targetIdeaName: string) => {
    if (!session?.logs.length) return
    setCopyingReport(targetIdeaName)

    // Filter logs for this specific idea + common systems
    const ideaLogs = session.logs.filter(l => l.ideaName === targetIdeaName || l.stage === 'SYSTEM' || l.stage === 'ERROR')

    let report = `VELOX AI STUDIO - PIPELINE EXECUTION REPORT\n`
    report += `Idea: ${targetIdeaName}\n`
    report += `Date: ${new Date().toLocaleString()}\n`
    report += `================================================================================\n\n`

    ideaLogs.forEach((log, index) => {
      report += `STEP ${index + 1}: [${log.stage}]\n`
      report += `Time: ${log.ts}\n`
      report += `Message: ${log.message}\n`
      if (log.input) report += `Input:\n${log.input}\n`
      if (log.output) report += `Output:\n${log.output}\n`
      report += `--------------------------------------------------------------------------------\n\n`
    })

    await navigator.clipboard.writeText(report)
    setTimeout(() => setCopyingReport(null), 2000)
    toast.success('Report Copied', `Master log for ${targetIdeaName} copied to clipboard.`)
  }

  async function handleGenerate() {
    const currentPrompt = prompt.trim()
    if (!currentPrompt || isRunning) return

    setPrompt('')
    setShowSessionLog(false)

    const pendingSession: RunSession = {
      id: makeId(),
      startedAt: Date.now(),
      isRunning: true,
      totalDone: 0,
      totalFailed: 0,
      ideas: [],
      logs: [makeLog('SYSTEM', 'system', 'Preparing Velox AI run...')],
    }

    setSession(pendingSession)
    sessionRef.current = pendingSession

    try {
      const response = await fetch('/api/pipeline/run-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          prompt: currentPrompt,
          pipelineId: selectedPipeline,
          count,
          format: tacticalFormat || undefined,
          complexity: tacticalComplexity || undefined,
          feel: tacticalFeel || undefined,
        }),
      })

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({ error: 'Unable to start run.' }))) as {
          error?: string
        }
        throw new Error(payload.error ?? `HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const jsonStr = trimmed.slice(6).trim()
          if (!jsonStr) continue

          try {
            handleEvent(JSON.parse(jsonStr) as PipelineEvent)
          } catch (e) {
            console.warn('SSE Parse Error:', e, jsonStr)
            appendLog(makeLog('ERROR', 'error', 'Payload parse error', undefined, jsonStr.slice(0, 100)))
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      appendLog(makeLog('ERROR', 'error', message))
      updateSession((prev) => (prev ? { ...prev, isRunning: false } : prev))
      setShowSessionLog(true) // Ensure log is visible on failure
      toast.error('Velox AI failed', message)
    }
  }  // ─── Derived ───────────────────────────────────────────────────────────────
  const doneIdeas = session?.ideas.filter((i) => i.status === 'done') ?? []
  const failedIdeas = session?.ideas.filter((i) => i.status === 'failed') ?? []
  const selectedWorkflowName = selectedWorkflow?.name ?? 'Default workflow'
  const workflowTokenLimits = getProviderModelTokenLimits(
    workflowHeadline.provider,
    workflowHeadline.model,
  )

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardPageFrame
      title="Velox AI"
      hideHeader
      className="velox-ai-shell pb-24"
      actions={(
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-[--dashboard-border] bg-[--dashboard-panel] px-4 py-3 shadow-sm">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-disabled]">
              Generation workspace
            </p>
            <p className="mt-1 max-w-[17rem] truncate text-sm font-semibold text-[--text-primary]">
              {selectedWorkflowName}
            </p>
            <p className="mt-1 font-mono text-[10px] leading-5 text-[--text-tertiary]">
              Context window {workflowTokenLimits.contextWindow} · Max output {workflowTokenLimits.maxOutputTokens}
            </p>
          </div>
          <Link
            href="/pipeline/review"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[--border-default] bg-[--bg-surface] px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[--text-secondary] transition-all duration-200 hover:border-[--accent-border] hover:text-[--accent]"
          >
            Open review queue
          </Link>
        </div>
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-12 pb-32">
        {(isRunning || isFailedFull) && session && session.ideas.length > 0 && (
          <div className="flex flex-wrap gap-3 pb-2">
            {session.ideas.map((idea) => (
              <div
                key={idea.ideaId}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-2 transition-all ${idea.status === 'done' ? 'bg-[--success-dim] border-[--success-border]' :
                  idea.status === 'failed' ? 'bg-[--danger-dim] border-[--danger-border]' :
                    'bg-white/5 border-white/10'
                  }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black uppercase tracking-widest text-[--text-primary]">
                    {idea.ideaName}
                  </p>
                </div>
                {idea.status === 'done' ? <CheckCircle2 className="h-3 w-3 text-[--success]" /> :
                  idea.status === 'failed' ? <XCircle className="h-3 w-3 text-[--danger]" /> :
                    <Loader2 className="h-3 w-3 animate-spin text-[--accent]" />}
              </div>
            ))}
          </div>
        )}

        <section className="dashboard-panel relative flex min-h-[48rem] flex-col overflow-hidden bg-[--dashboard-surface]/60 backdrop-blur-3xl shadow-[--dashboard-panel-shadow] xl:h-[min(84vh,68rem)]">
          <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">

            {isIdle && (
              <div className="relative flex h-full flex-col items-center justify-center px-6 py-20 text-center">
                {/* Background glow effects */}
                <div className="absolute inset-x-0 top-1/4 -z-10 flex justify-center">
                  <div className="h-[300px] w-[500px] rounded-full bg-[--accent-soft-15] blur-[120px]" />
                </div>

                <div className="mb-10 flex flex-col items-center gap-6">
                  <div className="group relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[2.5rem] border border-[--border-default] bg-[--bg-elevated] shadow-[var(--shadow-soft)] transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                      <Sparkles className="h-9 w-9 text-[--accent]" />
                    </div>
                    <div className="absolute -inset-2 -z-10 rounded-[3rem] bg-[--accent-soft-20] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <div className="max-w-[420px] space-y-4">
                    <h2
                      className="font-bold leading-[0.85] tracking-tight text-[--dashboard-text-strong]"
                      style={{ fontSize: '4.8rem' }}
                    >
                      Forge <span className="text-[--dashboard-accent] drop-shadow-[0_0_20px_var(--accent-soft-20)]">Studio</span>
                    </h2>
                    <p className="mx-auto max-w-[380px] font-mono text-[11px] leading-relaxed text-[--dashboard-text-muted] font-bold uppercase tracking-[0.1em] opacity-80">
                      High-fidelity React component generation. Describe your vision, then enrich, assembly, and validate in one unified technical workspace.
                    </p>
                  </div>
                </div>

                {/* Example prompts - Cleaner Pills */}
                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[--dashboard-text-soft]">
                    Prompt ideas
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      'Animated luxury pricing toggle',
                      'Glassmorphic dashboard card',
                      'Scroll-triggered reveal effect',
                      'Magnetic button with spring physics',
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setPrompt(example)}
                        className="rounded-2xl border border-[--dashboard-border] bg-[--dashboard-chip] px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[--dashboard-text-muted] transition-all duration-300 hover:scale-[1.05] hover:border-[--dashboard-accent-border] hover:bg-[--dashboard-hover] hover:text-[--dashboard-text-strong] shadow-sm"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── RUNNING OR FAILED STATE — live terminal ────────────────── */}
            {showTerminal && (
              <div className="flex h-full flex-col">
                {/* Run header */}
                <div className="flex items-center gap-4 border-b border-[--border-subtle] bg-[--bg-soft] px-6 py-4">
                  {isRunning ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--accent] opacity-50" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[--accent]" />
                    </span>
                  ) : (
                    <div className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[--danger]" />
                  )}
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[--text-primary]">
                      {isRunning ? 'Pipeline running' : 'Pipeline failed'}
                    </p>
                    {session.ideas.length > 0 && (
                      <span className="font-mono text-[10px] text-[--text-tertiary] opacity-80">
                        {session.ideas.filter((i) => i.status === 'done').length}/{session.ideas.length} completed
                      </span>
                    )}
                  </div>
                </div>
                {/* Terminal fills remaining space */}
                <div className="flex-1 bg-[--surface-code] overflow-hidden">
                  <LogTerminal
                    logs={session.logs}
                    isRunning={isRunning}
                    onClear={() => {
                      if (isRunning) return
                      setSession(null)
                      sessionRef.current = null
                    }}
                    onRerunStage={(action) => {
                      // Find the first idea that matches the requirement for rerun
                      const targetIdea = session.ideas.find(i => i.status === 'failed' && i.action === action)
                      if (targetIdea) handleRerunStage(targetIdea.ideaId, targetIdea.ideaName, action)
                    }}
                    height="100%"
                  />
                </div>
              </div>
            )}

            {/* ── DONE STATE — preview cards ───────────────────── */}
            {isDone && (
              <div className="space-y-6 p-6">
                {/* Run summary bar */}
                <div className="flex items-center justify-between rounded-2xl border border-[--border-subtle] bg-[--bg-soft] px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--bg-elevated] shadow-sm">
                      {session.totalFailed === 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-[--success]" />
                      ) : (
                        <TerminalSquare className="h-5 w-5 text-[--warning]" />
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[--text-secondary]">
                        Run complete
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium text-[--text-primary]">
                        <span className="text-[--success]">{session.totalDone} generated</span>
                        {session.totalFailed > 0 && (
                          <span className="text-[--text-tertiary]">
                            {' '}·{' '}
                            <span className="text-[--danger]">{session.totalFailed} failed</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowSessionLog(!showSessionLog)}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-all duration-200 ${showSessionLog
                        ? 'bg-[--dashboard-accent-soft] border-[--dashboard-accent-border] text-[--dashboard-accent]'
                        : 'bg-[--bg-elevated] border-[--border-default] text-[--text-secondary] hover:border-[--accent-border] hover:text-[--accent]'
                        }`}
                    >
                      <TerminalSquare className="h-3 w-3" />
                      {showSessionLog ? 'Hide Execution Log' : 'Show Full Log'}
                    </button>
                    <button
                      onClick={() => {
                        setSession(null)
                        sessionRef.current = null
                        setPrompt('')
                      }}
                      className="group inline-flex items-center gap-2 rounded-xl border border-[--border-default] bg-[--bg-elevated] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-secondary] transition-all duration-200 hover:border-[--accent-border] hover:text-[--accent]"
                    >
                      <RotateCcw className="h-3 w-3 transition-transform duration-300 group-hover:-rotate-180" />
                      New run
                    </button>
                  </div>
                </div>

                {/* Optional session-wide log */}
                {showSessionLog && (
                  <div className="h-[400px] overflow-hidden rounded-[2.5rem] border border-white/5 bg-black/20 shadow-inner">
                    <LogTerminal
                      logs={session.logs}
                      isRunning={false}
                      onClear={() => setShowSessionLog(false)}
                      height="100%"
                    />
                  </div>
                )}

                {/* Generated components */}
                {doneIdeas.length > 0 && (
                  <div className="space-y-8">
                    {doneIdeas.map((idea) => (
                      <div
                        key={idea.ideaId}
                        className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-[--bg-elevated]/50 backdrop-blur-md shadow-[var(--shadow-soft)] transition-all duration-500 hover:border-white/10"
                      >
                        {/* Card header */}
                        <div className="flex items-center justify-between border-b border-white/5 px-8 py-5 bg-gradient-to-b from-white/[0.02] to-transparent">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 shadow-lg shadow-green-500/5">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold tracking-tight text-[--text-primary]">
                                {idea.ideaName}
                              </h3>
                              {idea.durationMs && (
                                <p className="mt-0.5 font-mono text-[10px] font-bold text-[--text-tertiary] opacity-60">
                                  SUCCESSFULLY FORGED · {formatMs(idea.durationMs)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setIdeaViewMode(prev => ({ ...prev, [idea.ideaId]: prev[idea.ideaId] === 'log' ? 'preview' : 'log' }))}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-[9px] font-black uppercase tracking-widest transition-all ${ideaViewMode[idea.ideaId] === 'log'
                                ? 'bg-[#0465ED] border-[#0465ED] text-white shadow-lg'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                              <TerminalSquare className="h-3.5 w-3.5" />
                              {ideaViewMode[idea.ideaId] === 'log' ? 'Close Log' : 'Production Log'}
                            </button>
                            <button
                              onClick={() => handleCopyFullLog(idea.ideaName)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/5 border-white/10 font-mono text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                              {copyingReport === idea.ideaName ? <span className="text-green-500">Report Copied</span> : <><ClipboardCopy className="h-3.5 w-3.5" /> Copy Master Log</>}
                            </button>
                            <Link
                              href={`/pipeline/review?ideaId=${idea.ideaId}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-[--border-strong] bg-[--bg-soft] px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest text-[--text-secondary] transition-all hover:border-[--accent] hover:text-[--accent]"
                            >
                              Full Review <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>

                        {/* Layout Shift: Preview vs Log */}
                        <div className="p-1">
                          {ideaViewMode[idea.ideaId] === 'log' ? (
                            <div className="h-[450px] overflow-hidden rounded-[2rem] bg-black/40">
                              <LogTerminal
                                logs={session.logs.filter(l => l.ideaName === idea.ideaName || l.stage === 'SYSTEM' || l.stage === 'ERROR')}
                                isRunning={false}
                                onClear={() => { }}
                                height="100%"
                              />
                            </div>
                          ) : (
                            <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-[--surface-canvas] shadow-inner">
                              <iframe
                                title={`${idea.ideaName} preview`}
                                src={`/api/preview/compile?slug=idea-${idea.ideaId}`}
                                sandbox="allow-scripts allow-same-origin"
                                className="h-[450px] w-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Failed components */}
                {failedIdeas.length > 0 && (
                  <div className="space-y-3">
                    <p className="px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[--dashboard-text-soft]">
                      Failed · {failedIdeas.length}
                    </p>
                    {failedIdeas.map((idea) => (
                      <div
                        key={idea.ideaId}
                        className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--danger)_15%,transparent)] bg-[--danger-dim]"
                      >
                        <div className="flex items-center gap-4 px-5 py-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--bg-elevated]">
                            <XCircle className="h-4 w-4 text-[--danger]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-[--text-primary]">
                              {idea.ideaName}
                            </p>
                            <p className="font-mono text-[11px] text-[--danger] opacity-80">
                              Repair required — review to retry
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIdeaViewMode(prev => ({ ...prev, [idea.ideaId]: prev[idea.ideaId] === 'log' ? 'preview' : 'log' }))}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[8px] font-black uppercase tracking-widest transition-all ${ideaViewMode[idea.ideaId] === 'log'
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                }`}
                            >
                              Log
                            </button>
                            <Link
                              href={`/pipeline/review?ideaId=${idea.ideaId}`}
                              className="shrink-0 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 font-mono text-[8px] uppercase tracking-widest text-gray-400 hover:text-white transition-all"
                            >
                              Detail
                            </Link>
                          </div>
                        </div>
                        {ideaViewMode[idea.ideaId] === 'log' && (
                          <div className="h-[300px] border-t border-white/5 bg-black/20">
                            <LogTerminal
                              logs={session.logs.filter(l => l.ideaName === idea.ideaName || l.stage === 'SYSTEM' || l.stage === 'ERROR')}
                              isRunning={false}
                              onClear={() => { }}
                              height="100%"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Input bar — anchored to the bottom with sidebar offset ────────────────── */}
      {mounted && (
        <div className="fixed bottom-[5px] left-0 right-0 z-50 transition-all duration-300 md:left-[220px] bg-gradient-to-t from-[--bg-surface] via-[--bg-surface]/90 to-transparent pt-32 pb-1 px-6">
          <div className="mx-auto max-w-2xl">
            <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[--bg-surface]/80 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 focus-within:border-[--accent-border] focus-within:bg-[--bg-surface]/95 focus-within:shadow-[0_0_80px_var(--accent-soft-20)]">

              <AnimatePresence>
                {showTactical && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b border-white/5 bg-white/[0.02] overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-8 px-8 py-5">
                      {/* Global: Pipeline & Count */}
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="space-y-2">
                          <label className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[--dashboard-text-soft]">
                            Pipeline
                          </label>
                          <div className="relative">
                            <select
                              value={selectedPipeline ?? ''}
                              onChange={(e) => setSelectedPipeline(e.target.value || null)}
                              disabled={loadingPipelines || isRunning}
                              className="h-8 cursor-pointer appearance-none rounded-lg border border-white/5 bg-white/5 pl-3 pr-8 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-gray-300 transition-all hover:bg-white/10 focus:outline-none disabled:cursor-not-allowed"
                            >
                              {pipelines.length === 0 && <option value="">Default</option>}
                              {pipelines.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[--dashboard-text-soft]">
                            Batch
                          </label>
                          <div className="relative">
                            <select
                              value={String(count)}
                              onChange={(e) => setCount(Number(e.target.value))}
                              disabled={isRunning}
                              className="h-8 cursor-pointer appearance-none rounded-lg border border-white/5 bg-white/5 pl-3 pr-8 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-gray-300 transition-all hover:bg-white/10 focus:outline-none disabled:cursor-not-allowed"
                            >
                              {[1, 2, 3, 4, 5].map((v) => (
                                <option key={v} value={v}>{v} {v === 1 ? 'Idea' : 'Ideas'}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
                          </div>
                        </div>
                      </div>

                      <div className="h-8 w-px bg-white/5 mx-2" />

                      {/* Format */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[--dashboard-text-soft]">
                          <Box className="h-2.5 w-2.5" /> Format
                        </label>
                        <div className="flex gap-1">
                          {['component', 'section', 'template', 'page'].map(f => (
                            <button
                              key={f}
                              onClick={() => setTacticalFormat(tacticalFormat === f ? '' : f)}
                              className={`rounded-lg px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider transition-all border ${tacticalFormat === f
                                ? 'bg-[--accent] border-[--accent] text-white'
                                : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10'
                                }`}
                            >
                              {f.slice(0, 4)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Complexity */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[--dashboard-text-soft]">
                          Complexity
                        </label>
                        <div className="flex gap-1">
                          {['micro', 'standard', 'complex'].map(c => (
                            <button
                              key={c}
                              onClick={() => setTacticalComplexity(tacticalComplexity === c ? '' : c)}
                              className={`rounded-lg px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider transition-all border ${tacticalComplexity === c
                                ? 'bg-white border-white text-black'
                                : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10'
                                }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Personality */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[--dashboard-text-soft]">
                          <Zap className="h-2.5 w-2.5" /> Personality
                        </label>
                        <div className="flex gap-1">
                          {['fluid', 'bouncy', 'elastic', 'smooth', 'instant'].map(f => (
                            <button
                              key={f}
                              onClick={() => setTacticalFeel(tacticalFeel === f ? '' : f)}
                              className={`rounded-lg px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider transition-all border ${tacticalFeel === f
                                ? 'bg-[--accent-soft-20] border-[--accent] text-[--accent]'
                                : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10'
                                }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

              {/* Textarea — premium airy feel */}
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe a component to generate..."
                disabled={isRunning}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isRunning) {
                    void handleGenerate()
                  }
                }}
                className="w-full resize-none bg-transparent px-8 pt-2.5 pb-0.5 font-body text-[13px] leading-relaxed text-[--dashboard-text] placeholder:text-[--dashboard-text-soft] focus:outline-none disabled:opacity-40"
              />

              {/* Toolbar — compact & professional */}
              <div className="relative flex items-center justify-between gap-4 px-6 pb-3 pt-0">

                {/* Left: configuration chips */}
                <div className="flex items-center gap-3">
                  {/* Active model Badge */}
                  <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-1.5 border border-white/5">
                    <div className="relative flex h-1.5 w-1.5">
                      <div className="absolute h-full w-full animate-pulse rounded-full bg-[--accent]/30" />
                      <div className="h-full w-full rounded-full bg-[--accent]/80" />
                    </div>
                    <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-[--dashboard-text-soft] uppercase">
                      {workflowHeadline.model.split('-').slice(0, 2).join('-')}
                    </span>
                  </div>

                  {/* Settings Toggle */}
                  <button
                    onClick={() => setShowTactical(!showTactical)}
                    className={`flex h-8 items-center gap-2 rounded-lg border px-3 font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-all ${showTactical
                      ? 'border-[--dashboard-accent-border] bg-[--dashboard-accent-soft] text-[--dashboard-accent]'
                      : 'border-white/5 bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                      }`}
                  >
                    <Settings2 className={`h-3 w-3 ${showTactical ? 'animate-spin-slow' : ''}`} />
                    Configure
                  </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                  <span className="hidden font-mono text-[10px] font-bold text-[--text-disabled] uppercase tracking-widest opacity-40 xl:block">⌘↵</span>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => void handleGenerate()}
                    disabled={!prompt.trim() || loadingPipelines}
                    loading={isRunning}
                    className="h-8 rounded-xl px-4 font-mono text-[10px] font-bold uppercase tracking-[0.1em] shadow-lg shadow-[--accent-soft-20]"
                  >
                    {!isRunning && <Sparkles className="mr-2 h-3 w-3" />}
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardPageFrame>
  )
}
