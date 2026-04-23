'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, Terminal, Activity, Layers, CheckCircle2, Search, Trash2, Filter, X } from 'lucide-react'
import type { Idea, LogEntry, LogLevel, LogStage, RunSession } from '@/types/pipeline'
import { toast } from '@/components/ui/Toast'

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function makeId(): string {
  return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}
function now(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}
function makeLog(stage: LogStage, level: LogLevel, message: string, ideaName?: string, detail?: string): LogEntry {
  return { id: makeId(), ts: now(), stage, level, message, ideaName, detail }
}

const STAGE_PROGRESS: Record<string, number> = {
  enriching: 20, enriched: 30, generating: 50, generated: 65, validating: 75, validated: 85, reviewing: 95, approved: 100,
}

const LOG_COLORS: Record<string, string> = {
  error: 'var(--dashboard-danger)',
  success: 'var(--dashboard-success)',
  warning: 'var(--dashboard-warning)',
  info: 'var(--dashboard-info)',
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'var(--dashboard-info)', bg: 'var(--dashboard-info-soft)' },
  enriched: { label: 'Enriched', color: 'var(--dashboard-info)', bg: 'var(--dashboard-info-soft)' },
  enriching: { label: 'Enriching', color: 'var(--dashboard-enrich)', bg: 'var(--dashboard-enrich-soft)' },
  generating: { label: 'Generating', color: 'var(--dashboard-warning)', bg: 'var(--dashboard-warning-soft)' },
  reviewing: { label: 'Review', color: 'var(--dashboard-accent)', bg: 'var(--dashboard-accent-soft)' },
  approved: { label: 'Published', color: 'var(--dashboard-success)', bg: 'var(--dashboard-success-soft)' },
  rejected: { label: 'Rejected', color: 'var(--dashboard-danger)', bg: 'var(--dashboard-danger-soft)' },
  failed: { label: 'Failed', color: 'var(--dashboard-danger)', bg: 'var(--dashboard-danger-soft)' },
}

export default function GeneratePage() {
  const [pendingIdeas, setPendingIdeas]     = useState<Idea[]>([])
  const [searchQuery, setSearchQuery]       = useState('')
  const [showFilters, setShowFilters]       = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType]         = useState('all')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage]       = useState(1)
  const [itemsPerPage, setItemsPerPage]     = useState(10)
  const [session, setSession]               = useState<RunSession | null>(null)
  const sessionRef  = useRef<RunSession | null>(null)
  const abortRef    = useRef<AbortController | null>(null)
  const logRef      = useRef<HTMLDivElement>(null)

  const isRunning = session?.isRunning ?? false
  const logs      = session?.logs ?? []

  const updateSession = useCallback((updater: (prev: RunSession | null) => RunSession | null) => {
    setSession(prev => { const next = updater(prev); sessionRef.current = next; return next })
  }, [])

  const appendLog = useCallback((log: LogEntry) => {
    updateSession(prev => prev ? { ...prev, logs: [...prev.logs, log] } : prev)
  }, [updateSession])

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/ideas?status=pending,enriched', { cache: 'no-store' })
      const data = await res.json()
      if (data.ideas) setPendingIdeas(data.ideas as Idea[])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => { void loadPending() }, 0)
    return () => window.clearTimeout(t)
  }, [loadPending])

  useEffect(() => { return () => { abortRef.current?.abort() } }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [session?.logs])

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [searchQuery, filterCategory, filterType, filterStatus, itemsPerPage])

  const filteredIdeas = pendingIdeas.filter(idea => {
    const q = searchQuery.toLowerCase()
    const matchQ = !q || (idea.name||'').toLowerCase().includes(q) || (idea.category||'').toLowerCase().includes(q) || (idea.type||'').toLowerCase().includes(q)
    const matchC = filterCategory === 'all' || (idea.category||'') === filterCategory
    const matchT = filterType === 'all' || (idea.type||'') === filterType
    const matchS = filterStatus === 'all' || (idea.status||'') === filterStatus
    return matchQ && matchC && matchT && matchS
  })

  const categories    = Array.from(new Set(pendingIdeas.map(i => i.category))).filter(Boolean).sort()
  const types         = Array.from(new Set(pendingIdeas.map(i => i.type))).filter(Boolean).sort()
  const statuses      = Array.from(new Set(pendingIdeas.map(i => i.status))).filter(Boolean).sort()
  const totalPages    = Math.max(1, Math.ceil(filteredIdeas.length / itemsPerPage))
  const paginatedIdeas = filteredIdeas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const isAllSelected  = paginatedIdeas.length > 0 && paginatedIdeas.every(i => selectedIds.has(i.id))

  const ideaProgress: Record<string, number> = {}
  session?.ideas?.forEach(i => { if (i.progress > 0) ideaProgress[i.ideaId] = i.progress })

  function toggleRow(id: string) {
    if (isRunning) return
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }
  function toggleAll() {
    if (isRunning) return
    if (isAllSelected) {
      const next = new Set(selectedIds); paginatedIdeas.forEach(i => next.delete(i.id)); setSelectedIds(next)
    } else {
      const next = new Set(selectedIds); paginatedIdeas.forEach(i => next.add(i.id)); setSelectedIds(next)
    }
  }

  async function handleDeleteSingle(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (isRunning) return
    await fetch('/api/pipeline/ideas', { method: 'DELETE', body: JSON.stringify({ id }) })
    toast.success('Idea deleted')
    await loadPending()
  }

  async function handleRunSelected() {
    if (selectedIds.size === 0 || isRunning) return
    const selectedArray = Array.from(selectedIds)

    const newSession: RunSession = {
      id: makeId(), startedAt: Date.now(), isRunning: true, totalDone: 0, totalFailed: 0,
      ideas: selectedArray.map(id => ({ ideaId: id, ideaName: pendingIdeas.find(i => i.id === id)?.name ?? id, status: 'queued' as const, progress: 0 })),
      logs: [makeLog('SYSTEM', 'system', `─── Session started · ${selectedArray.length} units ───`)],
    }
    setSession(newSession)
    sessionRef.current = newSession

    for (const id of selectedArray) {
      if (abortRef.current?.signal.aborted) break
      const ideaName = pendingIdeas.find(i => i.id === id)?.name ?? id
      updateSession(prev => prev ? { ...prev, ideas: prev.ideas.map(i => i.ideaId === id ? { ...i, status: 'running', startedAt: Date.now(), progress: 5 } : i) } : prev)
      appendLog(makeLog('SYSTEM', 'info', `Compiling "${ideaName}"`, ideaName))
      const abort = new AbortController()
      abortRef.current = abort
      try {
        const response = await fetch('/api/pipeline/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId: id, mode: 'claude' }), signal: abort.signal,
        })
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
        const reader  = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer    = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            let payload: Record<string, unknown>
            try { payload = JSON.parse(line.slice(6)) as Record<string, unknown> } catch { continue }
            if (payload.event === 'status') {
              const p = STAGE_PROGRESS[String(payload.stage ?? '')] ?? 50
              updateSession(prev => prev ? { ...prev, ideas: prev.ideas.map(i => i.ideaId === id ? { ...i, progress: p } : i) } : prev)
              appendLog(makeLog(String(payload.stage ?? 'SYSTEM').toUpperCase() as LogStage, 'info', String(payload.message ?? 'Working...'), ideaName))
            }
            if (payload.event === 'ready') {
              const startedAt = sessionRef.current?.ideas.find(i => i.ideaId === id)?.startedAt ?? Date.now()
              const dur = Date.now() - startedAt
              updateSession(prev => prev ? { ...prev, totalDone: prev.totalDone + 1, ideas: prev.ideas.map(i => i.ideaId === id ? { ...i, status: 'done', progress: 100, durationMs: dur } : i) } : prev)
              appendLog(makeLog('DONE', 'success', `"${ideaName}" generated · ${(dur/1000).toFixed(1)}s`, ideaName))
            }
            if (payload.event === 'repair_required') {
              const startedAt = sessionRef.current?.ideas.find(i => i.ideaId === id)?.startedAt ?? Date.now()
              const dur = Date.now() - startedAt
              const issues = Array.isArray(payload.issues)
                ? payload.issues
                    .map(issue => {
                      if (!issue || typeof issue !== 'object') return null
                      const message = 'message' in issue ? String(issue.message) : null
                      return message
                    })
                    .filter(Boolean)
                    .join(' | ')
                : undefined

              updateSession(prev => prev ? { ...prev, totalFailed: prev.totalFailed + 1, ideas: prev.ideas.map(i => i.ideaId === id ? { ...i, status: 'failed', progress: 100, durationMs: dur } : i) } : prev)
              const msg = issues || String(payload.message ?? 'Requires manual repair')
              appendLog(
                makeLog(
                  'REPAIR',
                  'error',
                  `"${ideaName}" blocked by validation`,
                  ideaName,
                  msg,
                ),
              )
              toast.error('Pipeline Blocked', `Validation failed for ${ideaName}`)
            }
            if (payload.event === 'error') {
              updateSession(prev => prev ? { ...prev, totalFailed: prev.totalFailed + 1, ideas: prev.ideas.map(i => i.ideaId === id ? { ...i, status: 'failed', progress: 0 } : i) } : prev)
              appendLog(makeLog('ERROR', 'error', `"${ideaName}" failed: ${payload.message}`, ideaName))
            }
          }
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        if (error.name !== 'AbortError') {
          updateSession(prev => prev ? { ...prev, totalFailed: prev.totalFailed + 1, ideas: prev.ideas.map(i => i.ideaId === id ? { ...i, status: 'failed' } : i) } : prev)
          appendLog(makeLog('ERROR', 'error', error.message, ideaName))
        }
      }
      await new Promise(r => setTimeout(r, 800))
    }
    const final = sessionRef.current
    appendLog(makeLog('SYSTEM', 'system', `─── Build Completed · ${final?.totalDone ?? 0} ok · ${final?.totalFailed ?? 0} failed ───`))
    updateSession(prev => prev ? { ...prev, isRunning: false } : prev)
  }

  function clearLogs() { setSession(null); sessionRef.current = null }
  function abortRun()  { abortRef.current?.abort() }

  const completedCount = session?.totalDone ?? 0
  const totalCount     = session?.ideas?.length ?? 0
  const errorCount     = session?.totalFailed ?? 0
  const elapsedTime    = session ? `${((Date.now() - session.startedAt) / 1000).toFixed(0)}s` : null

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4">

      {/* Page header */}
      <header
        className="relative overflow-hidden rounded-[1.6rem] border border-[--border-default] bg-[var(--surface-panel)] px-6 py-7 sm:px-8"
      >
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--tone-warning)_4%,transparent)] blur-3xl" />
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--tone-warning)]">Pipeline</p>
        <h1 className="mt-2 font-heading text-[clamp(1.8rem,4vw,3rem)] leading-none tracking-[-0.03em] text-[--text-primary]">Generate</h1>
        <p className="mt-2.5 max-w-[520px] text-sm leading-7 text-[--text-tertiary]">
          Queue enriched concepts and monitor long-running compilation with live logs.
        </p>
      </header>

      {/* Stats + Launch row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Run button */}
        <div className="col-span-2 flex items-center rounded-[1.6rem] border border-[--border-default] bg-[var(--surface-panel)] p-5 lg:col-span-1">
          <button
            onClick={isRunning ? abortRun : handleRunSelected}
            disabled={!isRunning && selectedIds.size === 0}
            className="w-full rounded-xl py-4 font-mono text-[12px] uppercase tracking-[0.14em] transition-all hover:opacity-90 disabled:opacity-30"
            style={{
              background: isRunning ? 'var(--dashboard-danger)' : 'var(--dashboard-accent)',
              color: isRunning ? 'var(--dashboard-danger-contrast)' : 'var(--dashboard-accent-contrast)',
            }}
          >
            {isRunning ? (
              'Abort'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generate {selectedIds.size > 0 ? selectedIds.size : ''}
              </span>
            )}
          </button>
        </div>

        {/* Queued */}
        <div className="flex flex-col justify-between rounded-[1.6rem] border border-[--border-default] bg-[var(--surface-panel)] p-5">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-[--text-disabled]" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Queued</span>
          </div>
          <p className="mt-3 text-right font-heading text-4xl leading-none tracking-tight text-[--text-primary]">
            {String(totalCount).padStart(2, '0')}
          </p>
        </div>

        {/* Compiled */}
        <div className="flex flex-col justify-between rounded-[1.6rem] border border-[--border-default] bg-[var(--surface-panel)] p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[--dashboard-success]" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Compiled</span>
          </div>
          <p className="mt-3 text-right font-heading text-4xl leading-none tracking-tight" style={{ color: completedCount > 0 ? 'var(--dashboard-success)' : 'var(--dashboard-text-soft)' }}>
            {String(completedCount).padStart(2, '0')}
          </p>
        </div>

        {/* Elapsed */}
        <div className="flex flex-col justify-between rounded-[1.6rem] border border-[--border-default] bg-[var(--surface-panel)] p-5">
          <div className="flex items-center gap-2">
            <Activity className={`h-3.5 w-3.5 ${isRunning ? 'animate-pulse' : ''}`} style={{ color: isRunning ? 'var(--dashboard-accent)' : 'var(--dashboard-text-disabled)' }} />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Elapsed</span>
          </div>
          <p className="mt-3 text-right font-heading text-4xl leading-none tracking-tight" style={{ color: isRunning ? 'var(--dashboard-accent)' : 'var(--dashboard-text-soft)' }}>
            {elapsedTime ?? '00s'}
          </p>
        </div>
      </div>

      {/* Main workspace */}
      <div className="overflow-hidden rounded-[1.6rem] border border-[--border-default] bg-[var(--surface-panel)]">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[--border-subtle] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--text-disabled]" />
            <input
              placeholder="Search queue…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-[--border-default] bg-[--bg-surface] pl-9 pr-3 font-mono text-[12px] text-[--text-primary] placeholder:text-[--text-disabled] focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex h-9 items-center gap-2 rounded-xl px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors"
            style={{
              background: showFilters ? 'var(--dashboard-warning-soft)' : 'var(--dashboard-chip-muted)',
              border: showFilters ? '1px solid var(--dashboard-warning-border)' : '1px solid var(--dashboard-border-subtle)',
              color: showFilters ? 'var(--dashboard-warning)' : 'var(--dashboard-text-muted)',
            }}
          >
            <Filter className="h-3.5 w-3.5" /> Filters
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 border-b border-[--border-subtle] bg-[--bg-soft] px-5 py-4">
            {[
              { label: 'Category', value: filterCategory, set: setFilterCategory, opts: categories },
              { label: 'Type',     value: filterType,     set: setFilterType,     opts: types },
              { label: 'Status',   value: filterStatus,   set: setFilterStatus,   opts: statuses },
            ].map(({ label, value, set, opts }) => (
              <div key={label} className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-tertiary]">{label}</label>
                <select value={value} onChange={e => set(e.target.value)} className="h-8 rounded-lg border border-[--border-default] bg-[--bg-surface] px-2 font-mono text-[11px] text-[--text-secondary] focus:outline-none capitalize">
                  <option value="all">All {label}s</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="flex items-end">
              <button onClick={() => { setFilterCategory('all'); setFilterType('all'); setFilterStatus('all'); setSearchQuery('') }}
                className="flex h-8 items-center gap-1.5 rounded-lg px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[--text-tertiary] hover:text-[--text-secondary]">
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
          </div>
        )}

        {/* Queue table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--dashboard-border-subtle)' }}>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" disabled={isRunning} checked={isAllSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded disabled:opacity-40" />
                </th>
                <th className="w-10 px-2 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">No.</th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Specification</th>
                <th className="w-24 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Type</th>
                <th className="w-48 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Progress</th>
                <th className="w-36 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Created</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {paginatedIdeas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Layers className="mx-auto mb-3 h-8 w-8 text-[--text-disabled]" />
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[--text-disabled]">Queue empty</p>
                  </td>
                </tr>
              ) : paginatedIdeas.map((idea, idx) => {
                const isSel = selectedIds.has(idea.id)
                const p = ideaProgress[idea.id]
                const meta = STATUS_META[idea.status] ?? { label: idea.status, color: 'var(--dashboard-text-muted)', bg: 'var(--dashboard-chip)' }
                return (
                  <QueueRow
                    key={idea.id}
                    idea={idea}
                    idx={(currentPage - 1) * itemsPerPage + idx + 1}
                    isSel={isSel}
                    isRunning={isRunning}
                    progress={p}
                    meta={meta}
                    onToggle={() => toggleRow(idea.id)}
                    onDelete={(e) => handleDeleteSingle(idea.id, e)}
                  />
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[--border-subtle] px-5 py-3">
            <span className="font-mono text-[10px] text-[--text-disabled]">
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredIdeas.length)} of {filteredIdeas.length}
            </span>
            <div className="flex items-center gap-3">
              <select value={itemsPerPage} disabled={isRunning} onChange={e => setItemsPerPage(Number(e.target.value))}
                className="h-7 rounded-lg border border-[--border-default] bg-[--bg-surface] px-2 font-mono text-[10px] text-[--text-secondary] focus:outline-none disabled:opacity-40">
                {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v} rows</option>)}
              </select>
              <div className="flex gap-1">
                <button disabled={currentPage === 1 || isRunning} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-7 rounded-lg border border-[--border-default] bg-[--bg-surface] px-3 font-mono text-[10px] text-[--text-tertiary] disabled:opacity-20">Prev</button>
                <button disabled={currentPage === totalPages || isRunning} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 rounded-lg border border-[--border-default] bg-[--bg-surface] px-3 font-mono text-[10px] text-[--text-tertiary] disabled:opacity-20">Next</button>
              </div>
            </div>
          </div>
        )}

        {/* Terminal */}
        <div className="flex flex-col border-t border-[--border-subtle]">
          <div className="flex items-center justify-between border-b border-[--border-subtle] bg-[--bg-soft] px-5 py-3">
              <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-[--text-disabled]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-tertiary]">Build Logs</span>
              {isRunning && (
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--tone-success)]">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[var(--tone-success)]" /> Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {errorCount > 0 && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--tone-danger)]">{errorCount} failed</span>}
              <button onClick={clearLogs} disabled={isRunning || logs.length === 0}
                className="h-6 rounded-lg border border-[--border-subtle] bg-[--bg-surface] px-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[--text-tertiary] transition-colors hover:text-[--text-secondary] disabled:opacity-20">
                Clear
              </button>
            </div>
          </div>

          <div ref={logRef} className="h-[360px] overflow-y-auto bg-[--dashboard-code-bg] p-5 font-mono text-[11px] text-[--dashboard-code-text] space-y-2.5 scroll-smooth">
            {logs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 opacity-25">
                <Terminal className="h-8 w-8 text-[--dashboard-code-soft]" />
                <p className="text-[11px] text-[--dashboard-code-soft]">Awaiting build sequence.</p>
              </div>
            ) : logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 leading-relaxed">
                <span className="w-14 shrink-0 text-[--dashboard-code-disabled]">{log.ts}</span>
                <span className="w-20 shrink-0 font-bold uppercase tracking-widest" style={{ color: LOG_COLORS[log.level] ?? 'var(--dashboard-text-muted)' }}>{log.stage}</span>
                <span className="flex-1 break-all text-[--dashboard-code-muted] whitespace-pre-wrap">{log.message}</span>
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-4 py-1">
                <span className="w-14 text-[--dashboard-code-disabled]">{new Date().toLocaleTimeString('en', { hour12: false })}</span>
                <span className="animate-pulse text-[--dashboard-accent]">█</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* QueueRow — client sub-component for hover state                     */
/* ------------------------------------------------------------------ */
function QueueRow({ idea, idx, isSel, isRunning, progress, meta, onToggle, onDelete }: {
  idea: Idea
  idx: number
  isSel: boolean
  isRunning: boolean
  progress: number | undefined
  meta: { label: string; color: string; bg: string }
  onToggle: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      onClick={() => !isRunning && onToggle()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={isRunning ? 'cursor-not-allowed' : 'cursor-pointer'}
      style={{
        background: isSel ? 'var(--dashboard-selected)' : hovered ? 'var(--dashboard-hover)' : 'transparent',
        borderBottom: '1px solid var(--dashboard-border-subtle)',
      }}
    >
      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
        <input type="checkbox" disabled={isRunning} checked={isSel} onChange={onToggle} className="h-3.5 w-3.5 rounded disabled:opacity-40" />
      </td>
      <td className="px-2 py-4 font-mono text-[10px] text-[--text-disabled]">{idx}</td>
      <td className="px-4 py-4">
        <p className="truncate text-[13px] font-semibold text-[--text-primary]">{idea.name || 'Untitled Concept'}</p>
        <p className="mt-0.5 font-mono text-[10px] capitalize text-[--text-tertiary]">{idea.category} · {idea.complexity}</p>
      </td>
      <td className="px-4 py-4 font-mono text-[11px] capitalize text-[--text-tertiary]">{idea.type}</td>
      <td className="px-4 py-4">
        {progress !== undefined ? (
          <div className="flex items-center gap-2.5">
            <span className="w-8 text-right font-mono text-[10px]" style={{ color: progress === 100 ? 'var(--dashboard-success)' : 'var(--dashboard-accent)' }}>{progress}%</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--dashboard-chip)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: progress === 100 ? 'var(--dashboard-success)' : 'var(--dashboard-accent)' }} />
            </div>
          </div>
        ) : (
          <span className="rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]"
            style={{ background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
        )}
      </td>
      <td className="px-4 py-4 font-mono text-[10px] text-[--text-disabled]">{formatDate(idea.created_at)}</td>
      <td className="px-4 py-4">
        <div className={`flex justify-end transition-opacity ${hovered && !isRunning ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={onDelete} disabled={isRunning}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[--border-subtle] bg-[--bg-surface] text-[--text-tertiary] transition-colors hover:border-[--dashboard-danger-border] hover:bg-[--dashboard-danger-soft] hover:text-[--dashboard-danger] disabled:opacity-40">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  )
}
