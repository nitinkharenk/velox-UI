'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import AssetPreview from '@/components/assets/AssetPreview'
import IdeaQueue from './IdeaQueue'
import LogTerminal from './LogTerminal'
import type { IdeaRunState, LogEntry, LogLevel, LogStage, RunSession } from '@/types/pipeline'

interface PipelineRunnerProps {
  aiMode: string
}

const IDEA_PAUSE_MS = 800

function makeId(): string {
  return typeof crypto !== 'undefined'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

function now(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

function makeLog(
  stage: LogStage,
  level: LogLevel,
  message: string,
  ideaName?: string,
  detail?: string
): LogEntry {
  return { id: makeId(), ts: now(), stage, level, message, ideaName, detail }
}

const STAGE_PROGRESS: Record<string, number> = {
  enriching: 20,
  enriched: 30,
  generating: 50,
  generated: 65,
  validating: 75,
  validated: 85,
  reviewing: 95,
  approved: 100,
}

export default function PipelineRunner({ aiMode }: PipelineRunnerProps) {
  const [session, setSession] = useState<RunSession | null>(null)
  const [previewCode, setPreviewCode] = useState<string | null>(null)
  const sessionRef = useRef<RunSession | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const updateSession = useCallback((updater: (prev: RunSession | null) => RunSession | null) => {
    setSession(prev => {
      const next = updater(prev)
      sessionRef.current = next
      return next
    })
  }, [])

  const appendLog = useCallback((log: LogEntry) => {
    updateSession(prev => {
      if (!prev) return prev
      return { ...prev, logs: [...prev.logs, log] }
    })
  }, [updateSession])

  const updateIdeaState = useCallback((ideaId: string, patch: Partial<IdeaRunState>) => {
    updateSession(prev => {
      if (!prev) return prev
      return {
        ...prev,
        ideas: prev.ideas.map(idea =>
          idea.ideaId === ideaId ? { ...idea, ...patch } : idea
        ),
      }
    })
  }, [updateSession])

  const incrementDone = useCallback(() => {
    updateSession(prev => prev ? { ...prev, totalDone: prev.totalDone + 1 } : prev)
  }, [updateSession])

  const incrementFailed = useCallback(() => {
    updateSession(prev => prev ? { ...prev, totalFailed: prev.totalFailed + 1 } : prev)
  }, [updateSession])

  const markSessionStopped = useCallback(() => {
    updateSession(prev => prev ? { ...prev, isRunning: false } : prev)
  }, [updateSession])

  async function runIdea(ideaId: string, ideaName: string) {
    updateIdeaState(ideaId, { status: 'running', startedAt: Date.now(), progress: 5 })
    appendLog(makeLog('SYSTEM', 'info', `Starting pipeline for "${ideaName}"`, ideaName))

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const response = await fetch('/api/pipeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, mode: aiMode }),
        signal: abort.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue

          const raw = chunk.slice(6).trim()
          if (!raw) continue

          let payload: Record<string, unknown>
          try {
            payload = JSON.parse(raw) as Record<string, unknown>
          } catch {
            continue
          }

          if (payload.event === 'status') {
            const stageKey = String(payload.stage ?? '')
            const stage = stageKey.toUpperCase() as LogStage
            const progress = STAGE_PROGRESS[stageKey] ?? 50

            updateIdeaState(ideaId, { progress })
            appendLog(makeLog(stage, 'info', String(payload.message ?? 'Working...'), ideaName))
          } else if (payload.event === 'enriched') {
            const spec = payload.spec as { tags?: string[] } | undefined
            updateIdeaState(ideaId, { progress: 30 })
            appendLog(makeLog(
              'ENRICH',
              'success',
              `Spec enriched — ${spec?.tags?.slice(0, 3).join(', ') ?? 'done'}`,
              ideaName,
              `${Object.keys((payload.spec as Record<string, unknown>) ?? {}).length} fields generated`
            ))
          } else if (payload.event === 'generated') {
            const code = String(payload.code ?? '')
            const lineCount = code ? code.split('\n').length : 0
            updateIdeaState(ideaId, { progress: 65 })
            appendLog(makeLog('GEN', 'success', `Code generated — ${lineCount} lines`, ideaName))
          } else if (payload.event === 'validated') {
            const code = String(payload.code ?? '')
            if (code) setPreviewCode(code)

            updateIdeaState(ideaId, { progress: 85 })
            if (payload.has_errors) {
              appendLog(makeLog(
                'FIX',
                'warning',
                'Validation found issues — auto-fixing...',
                ideaName,
                typeof payload.validation_notes === 'string' ? payload.validation_notes : undefined
              ))
            } else {
              appendLog(makeLog('VALID', 'success', 'Validation passed', ideaName))
            }
          } else if (payload.event === 'ready') {
            const code = String(payload.code ?? '')
            if (code) setPreviewCode(code)

            const startedAt = sessionRef.current?.ideas.find(idea => idea.ideaId === ideaId)?.startedAt ?? Date.now()
            const durationMs = Date.now() - startedAt

            updateIdeaState(ideaId, { status: 'done', progress: 100, durationMs })
            appendLog(makeLog(
              'DONE',
              'success',
              `"${ideaName}" ready for review`,
              ideaName,
              `Completed in ${(durationMs / 1000).toFixed(1)}s`
            ))
            incrementDone()
          } else if (payload.event === 'repair_required') {
            const startedAt = sessionRef.current?.ideas.find(idea => idea.ideaId === ideaId)?.startedAt ?? Date.now()
            const durationMs = Date.now() - startedAt

            updateIdeaState(ideaId, { status: 'failed', progress: 100, durationMs })
            appendLog(makeLog(
              'REPAIR',
              'error',
              `"${ideaName}" blocked by validation`,
              ideaName,
              String(payload.message ?? 'Requires manual repair')
            ))
            incrementFailed()
          } else if (payload.event === 'error') {
            const startedAt = sessionRef.current?.ideas.find(idea => idea.ideaId === ideaId)?.startedAt ?? Date.now()
            const durationMs = Date.now() - startedAt

            updateIdeaState(ideaId, { status: 'failed', progress: 0, durationMs })
            appendLog(makeLog(
              'ERROR',
              'error',
              `"${ideaName}" failed`,
              ideaName,
              String(payload.message ?? 'Unknown error')
            ))
            incrementFailed()
          }
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')

      if (error.name === 'AbortError') {
        appendLog(makeLog('SYSTEM', 'warning', 'Pipeline aborted', ideaName))
      } else {
        appendLog(makeLog('ERROR', 'error', 'Connection error', ideaName, error.message))
      }

      updateIdeaState(ideaId, { status: 'failed' })
      incrementFailed()
    }
  }

  async function handleRepair(ideaId: string) {
    const ideaName = sessionRef.current?.ideas.find(i => i.ideaId === ideaId)?.ideaName ?? ideaId
    updateIdeaState(ideaId, { status: 'running', startedAt: Date.now(), progress: 75 })
    appendLog(makeLog('SYSTEM', 'info', `Starting quick repair pass for "${ideaName}"`, ideaName))

    const abort = new AbortController()
    abortRef.current = abort
    setPreviewCode(null)

    // Ensure session is technically running during repair if not already
    if (!sessionRef.current) {
      const newSession: RunSession = {
        id: makeId(),
        startedAt: Date.now(),
        isRunning: true,
        totalDone: 0,
        totalFailed: 0,
        ideas: [{ ideaId, ideaName, status: 'queued', progress: 0 }],
        logs: [makeLog('SYSTEM', 'system', `─── Target Repair Session started ───`)],
      }
      setSession(newSession)
      sessionRef.current = newSession
    } else if (!sessionRef.current.isRunning) {
      updateSession(prev => prev ? { ...prev, isRunning: true } : prev)
    }

    try {
      const response = await fetch('/api/pipeline/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
        signal: abort.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue

          const raw = chunk.slice(6).trim()
          if (!raw) continue

          let payload: Record<string, unknown>
          try {
            payload = JSON.parse(raw) as Record<string, unknown>
          } catch {
            continue
          }

          if (payload.event === 'status') {
            const stageKey = String(payload.stage ?? '')
            const stage = stageKey.toUpperCase() as LogStage
            const progress = STAGE_PROGRESS[stageKey] ?? 80

            updateIdeaState(ideaId, { progress })
            appendLog(makeLog(stage, 'info', String(payload.message ?? 'Working...'), ideaName))
          } else if (payload.event === 'validated') {
            const code = String(payload.code ?? '')
            if (code) setPreviewCode(code)

            updateIdeaState(ideaId, { progress: 85 })
            if (payload.has_errors) {
              appendLog(makeLog(
                'FIX',
                'warning',
                'Repair evaluation issues...',
                ideaName,
                typeof payload.validation_notes === 'string' ? payload.validation_notes : undefined
              ))
            } else {
              appendLog(makeLog('VALID', 'success', 'Repair Validation passed', ideaName))
            }
          } else if (payload.event === 'ready') {
            const code = String(payload.code ?? '')
            if (code) setPreviewCode(code)

            const startedAt = sessionRef.current?.ideas.find(idea => idea.ideaId === ideaId)?.startedAt ?? Date.now()
            const durationMs = Date.now() - startedAt

            updateIdeaState(ideaId, { status: 'done', progress: 100, durationMs })
            appendLog(makeLog(
              'DONE',
              'success',
              `"${ideaName}" repaired and ready for review`,
              ideaName,
              `Repaired in ${(durationMs / 1000).toFixed(1)}s`
            ))
            incrementDone()
          } else if (payload.event === 'repair_required') {
            const startedAt = sessionRef.current?.ideas.find(idea => idea.ideaId === ideaId)?.startedAt ?? Date.now()
            const durationMs = Date.now() - startedAt

            updateIdeaState(ideaId, { status: 'failed', progress: 100, durationMs })
            appendLog(makeLog(
              'REPAIR',
              'error',
              `"${ideaName}" blocked again by validation`,
              ideaName,
              String(payload.message ?? 'Requires extended repair')
            ))
            incrementFailed()
          } else if (payload.event === 'error') {
            const startedAt = sessionRef.current?.ideas.find(idea => idea.ideaId === ideaId)?.startedAt ?? Date.now()
            const durationMs = Date.now() - startedAt

            updateIdeaState(ideaId, { status: 'failed', progress: 0, durationMs })
            appendLog(makeLog(
              'ERROR',
              'error',
              `"${ideaName}" repair failed`,
              ideaName,
              String(payload.message ?? 'Unknown error')
            ))
            incrementFailed()
          }
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      if (error.name === 'AbortError') {
        appendLog(makeLog('SYSTEM', 'warning', 'Repair aborted', ideaName))
      } else {
        appendLog(makeLog('ERROR', 'error', 'Connection error', ideaName, error.message))
      }
      updateIdeaState(ideaId, { status: 'failed' })
      incrementFailed()
    } finally {
      markSessionStopped()
      abortRef.current = null
    }
  }

  async function handleRun(selectedIds: string[]) {
    if (selectedIds.length === 0) return

    setPreviewCode(null)

    const res = await fetch(`/api/pipeline/ideas?ids=${selectedIds.join(',')}`, { cache: 'no-store' })
    if (!res.ok) return

    const data = await res.json()
    const ideas = Array.isArray(data.ideas) ? data.ideas : []
    const ideaMap: Record<string, string> = Object.fromEntries(
      ideas.map((idea: { id: string; name: string }) => [idea.id, idea.name])
    )

    const newSession: RunSession = {
      id: makeId(),
      startedAt: Date.now(),
      isRunning: true,
      totalDone: 0,
      totalFailed: 0,
      ideas: selectedIds.map(id => ({
        ideaId: id,
        ideaName: ideaMap[id] ?? id,
        status: 'queued',
        progress: 0,
      })),
      logs: [
        makeLog('SYSTEM', 'system', `─── Session started · ${selectedIds.length} ideas · ${aiMode} ───`),
      ],
    }

    setSession(newSession)
    sessionRef.current = newSession

    for (const id of selectedIds) {
      if (abortRef.current?.signal.aborted) break
      await runIdea(id, ideaMap[id] ?? id)
      await new Promise(resolve => window.setTimeout(resolve, IDEA_PAUSE_MS))
    }

    const finalSession = sessionRef.current
    const duration = finalSession ? ((Date.now() - finalSession.startedAt) / 1000).toFixed(1) : '?'
    appendLog(makeLog(
      'SYSTEM',
      'system',
      `─── Session complete · ${finalSession?.totalDone ?? 0} done · ${finalSession?.totalFailed ?? 0} failed · ${duration}s ───`
    ))
    markSessionStopped()
    abortRef.current = null
  }

  function handleClear() {
    setSession(null)
    sessionRef.current = null
    setPreviewCode(null)
  }

  function handleAbort() {
    abortRef.current?.abort()
    appendLog(makeLog('SYSTEM', 'warning', 'Abort requested — finishing current idea...'))
  }

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const isRunning = session?.isRunning ?? false
  const runStates = session?.ideas ?? []
  const logs = session?.logs ?? []

  return (
    <div className="flex min-h-[600px] gap-4">
      <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-[24px] border border-[--border-default] bg-[--bg-surface]">
        <IdeaQueue
          runStates={runStates}
          isRunning={isRunning}
          onRun={handleRun}
          onRepair={handleRepair}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {session && (
          <div className="flex items-center gap-4 rounded-lg border border-[--border-subtle] bg-[--bg-elevated] px-4 py-2.5">
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[--text-tertiary]">Session</span>
              <span className="text-[--text-primary]">{runStates.length} ideas</span>
              <span className="text-[--dashboard-success]">{session.totalDone} done</span>
              {session.totalFailed > 0 && (
                <span className="text-[--dashboard-danger]">{session.totalFailed} failed</span>
              )}
              {!isRunning && (
                <span className="text-[--text-tertiary]">
                  {((Date.now() - session.startedAt) / 1000).toFixed(0)}s total
                </span>
              )}
            </div>

            {isRunning && (
              <button
                onClick={handleAbort}
                className="ml-auto h-6 rounded border border-[--dashboard-danger-border] px-2.5 font-mono text-[10px] text-[--dashboard-danger] transition-colors hover:bg-[--dashboard-danger-soft]"
              >
                abort
              </button>
            )}
          </div>
        )}

        <div className="flex-1">
          <LogTerminal
            logs={logs}
            isRunning={isRunning}
            onClear={handleClear}
            height="100%"
          />
        </div>

        {previewCode && (
          <div className="animate-fade-up">
            <p className="mb-3 text-sm text-[--text-secondary]">Latest preview</p>
            <AssetPreview slug="pipeline-preview" code={previewCode} height={320} showCode />
          </div>
        )}
      </div>
    </div>
  )
}
