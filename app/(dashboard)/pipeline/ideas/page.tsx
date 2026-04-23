'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  Plus, Search, Lightbulb, ChevronRight, Trash2, Sparkles, 
  Code2, ArrowRight, Check, Filter, X, Play, Code, Zap, ExternalLink,
  ArrowUpRight, Info, Copy
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { collectStringFacetValues, filterQueueItems, paginateItems } from '@/lib/pipeline/queueCollections'
import StageStrip, { type PipelineStage, type StageState } from '@/components/pipeline/StageStrip'
import type { EnrichedSpec, Idea } from '@/types/pipeline'
import DashboardPageFrame from '@/components/dashboard/DashboardPageFrame'
import { Reveal } from '@/components/ui/Reveal'
import { cx } from '@/components/ui/cx'
import AssetPreview from '@/components/assets/AssetPreview'

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'var(--dashboard-info)', bg: 'var(--dashboard-info-soft)' },
  enriching: { label: 'Enriching', color: 'var(--dashboard-enrich)', bg: 'var(--dashboard-enrich-soft)' },
  enriched: { label: 'Enriched', color: 'var(--dashboard-info)', bg: 'var(--dashboard-info-soft)' },
  generating: { label: 'Generating', color: 'var(--dashboard-warning)', bg: 'var(--dashboard-warning-soft)' },
  reviewing: { label: 'Review', color: 'var(--dashboard-accent)', bg: 'var(--dashboard-accent-soft)' },
  approved: { label: 'Published', color: 'var(--dashboard-success)', bg: 'var(--dashboard-success-soft)' },
  rejected: { label: 'Rejected', color: 'var(--dashboard-danger)', bg: 'var(--dashboard-danger-soft)' },
  failed: { label: 'Failed', color: 'var(--dashboard-danger)', bg: 'var(--dashboard-danger-soft)' },
}

const ENRICH_STAGES: PipelineStage[] = [
  { key: 'enrich', label: 'Enrich', state: 'pending' },
  { key: 'done',   label: 'Done',   state: 'pending' },
]

const GENERATE_STAGES: PipelineStage[] = [
  { key: 'generate', label: 'Generate', state: 'pending' },
  { key: 'validate', label: 'Validate', state: 'pending' },
  { key: 'fix',      label: 'Fix',      state: 'pending' },
  { key: 'done',     label: 'Done',     state: 'pending' },
]

export default function IdeasPage() {
  const [ideas, setIdeas]                 = useState<Idea[]>([])
  const [selectedIdea, setSelectedIdea]   = useState<Idea | null>(null)
  const [searchQuery, setSearchQuery]     = useState('')
  const [showFilters, setShowFilters]     = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType]       = useState('all')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [chatQuery, setChatQuery]         = useState('')
  const [isChatting, setIsChatting]       = useState(false)
  const [isRunning, setIsRunning]         = useState(false)
  const [stages, setStages]               = useState<PipelineStage[]>([])
  const [statusMsg, setStatusMsg]         = useState('')
  const [errorMsg, setErrorMsg]           = useState('')
  const [logs, setLogs]                   = useState<string[]>([])
  const [activeTabGroup, setActiveTabGroup] = useState(0)
  const [activePipeline, setActivePipeline] = useState<any | null>(null)
  const [currentPage, setCurrentPage]     = useState(1)
  const [itemsPerPage, setItemsPerPage]   = useState(10)
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const abortRef      = useRef<AbortController | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)

  const loadActivePipeline = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/db/supabase')
      const { data } = await supabase
        .from('pipelines')
        .select('id, name, model')
        .eq('is_default', true)
        .maybeSingle()
      if (data) setActivePipeline(data)
    } catch {}
  }, [])

  useEffect(() => { loadActivePipeline() }, [loadActivePipeline])

  const refreshIdeas = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/ideas', { cache: 'no-store' })
      const data = await res.json()
      const nextIdeas = Array.isArray(data.ideas) ? data.ideas as Idea[] : []
      setIdeas(nextIdeas.filter((i: Idea) => i.status !== 'approved'))
      setSelectedIdea(prev => prev ? nextIdeas.find(idea => idea.id === prev.id) ?? prev : prev)
    } catch {
      toast.error('Load failed', 'Could not refresh ideas')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => { void refreshIdeas() }, 0)
    return () => window.clearTimeout(t)
  }, [refreshIdeas])

  useEffect(() => { return () => { abortRef.current?.abort() } }, [])

  const filteredIdeas = filterQueueItems(ideas, {
    query: searchQuery,
    category: filterCategory,
    type: filterType,
    status: filterStatus,
  })

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [searchQuery, filterCategory, filterType, filterStatus, itemsPerPage])

  const categories  = collectStringFacetValues(ideas, 'category')
  const types       = collectStringFacetValues(ideas, 'type')
  const statuses    = collectStringFacetValues(ideas, 'status')
  const { totalPages, items: paginatedIdeas } = paginateItems(filteredIdeas, currentPage, itemsPerPage)
  const isAllSelected  = paginatedIdeas.length > 0 && paginatedIdeas.every(i => selectedIds.has(i.id))

  function toggleRow(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }
  function toggleAll() {
    if (isAllSelected) {
      const next = new Set(selectedIds)
      paginatedIdeas.forEach(i => next.delete(i.id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      paginatedIdeas.forEach(i => next.add(i.id))
      setSelectedIds(next)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    await Promise.all(Array.from(selectedIds).map(id =>
      fetch('/api/pipeline/ideas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    ))
    toast.success(`Deleted ${selectedIds.size} ideas`)
    setSelectedIds(new Set())
    if (selectedIdea && selectedIds.has(selectedIdea.id)) setSelectedIdea(null)
    await refreshIdeas()
  }

  async function handleDeleteSingle(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch('/api/pipeline/ideas', { method: 'DELETE', body: JSON.stringify({ id }) })
    toast.success('Idea deleted')
    if (selectedIdea?.id === id) setSelectedIdea(null)
    await refreshIdeas()
  }

  async function handleDeleteIdea(id: string) {
    try {
      await fetch('/api/pipeline/ideas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      toast.info('Deleted')
      if (selectedIdea?.id === id) setSelectedIdea(null)
      await refreshIdeas()
    } catch { toast.error('Error', 'Failed to delete') }
  }

  function setStageState(key: string, state: StageState) {
    setStages(prev => prev.map(s => s.key === key ? { ...s, state } : s))
  }

  function updateSelectedIdea(patch: Partial<Idea>) {
    setSelectedIdea(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      setIdeas(ideas => ideas.map(i => i.id === next.id ? next : i))
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = window.setTimeout(() => {
        fetch('/api/pipeline/ideas', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: next.id, ...patch })
        }).catch(console.error)
      }, 500)
      return next
    })
  }

  function toggleTech(t: string) {
    if (!selectedIdea) return
    const tech = selectedIdea.tech ?? []
    updateSelectedIdea({ tech: tech.includes(t) ? tech.filter(x => x !== t) : [...tech, t] })
  }

  async function handleAddIdea() {
    try {
      const res = await fetch('/api/pipeline/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Idea', format: 'component', type: 'hover', category: 'animation', tech: ['Tailwind'], complexity: 'medium', feel: '' })
      })
      const data = await res.json()
      if (data.error) { toast.error('Error', data.error); return }
      const newIdea = data.ideas?.[0]
      if (newIdea) {
        setIdeas(prev => [newIdea, ...prev])
        setSelectedIdea(newIdea)
        setStages([]); setStatusMsg(''); setErrorMsg('')
        toast.success('Idea created', 'Edit the concept details.')
      }
      await refreshIdeas()
    } catch { toast.error('Error', 'Failed to add idea') }
  }

  async function handleChatSubmit() {
    if (!chatQuery.trim()) return
    setIsChatting(true)
    try {
      const chatRes = await fetch('/api/pipeline/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chatQuery })
      })
      const chatData = await chatRes.json()
      if (chatData.error) throw new Error(chatData.error)
      const payload = chatData.idea
      const res = await fetch('/api/pipeline/ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success('Drafted', `Created idea: ${payload.name}`)
      setChatQuery('')
      await refreshIdeas()
    } catch (err: unknown) {
      toast.error('Chat failed', err instanceof Error ? err.message : 'Error parsing idea')
    } finally { setIsChatting(false) }
  }

  async function handleEnrich() {
    if (!selectedIdea || isRunning) return
    setIsRunning(true); setErrorMsg(''); setStatusMsg('Connecting...'); setLogs([])
    setStages(ENRICH_STAGES.map(s => ({ ...s, state: 'pending' as StageState })))
    abortRef.current = new AbortController()
    window.setTimeout(() => setStageState('enrich', 'active'), 0)
    try {
      const response = await fetch('/api/pipeline/enrich', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: selectedIdea.id }),
        signal: abortRef.current.signal,
      })
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
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
          if (line.trim()) setLogs(prev => [...prev, line])
          if (!line.startsWith('data: ')) continue
          let payload: Record<string, unknown>
          try { payload = JSON.parse(line.slice(6)) as Record<string, unknown> } catch { continue }
          if (payload.event === 'status') setStatusMsg(String(payload.message ?? 'Working...'))
          if (payload.event === 'enriched') {
            setStageState('enrich', 'complete'); setStageState('done', 'complete')
            setStatusMsg(String(payload.message ?? 'Spec complete'))
            const spec = payload.spec as EnrichedSpec | undefined
            if (!spec) continue
            updateSelectedIdea({ name: spec.name && spec.name !== 'Untitled Idea' ? spec.name : selectedIdea.name, enriched_spec: spec, status: 'enriched' })
            await refreshIdeas()
            toast.success('Enriched', `${spec.name || selectedIdea.name} spec ready`)
          }
          if (payload.event === 'error') {
            setStageState('enrich', 'error')
            setErrorMsg(String(payload.message ?? 'Enrich failed'))
            toast.error('Enrich failed', String(payload.message ?? 'Unknown error'))
          }
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      if (error.name !== 'AbortError') { setStageState('enrich', 'error'); setErrorMsg(error.message); toast.error('Error', error.message) }
    } finally { setIsRunning(false); abortRef.current = null }
  }

  async function handleGenerate() {
    if (!selectedIdea || isRunning) return
    let usedFixStage = false
    setIsRunning(true); setErrorMsg(''); setStatusMsg('Connecting...'); setLogs([])
    setStages(GENERATE_STAGES.map(s => ({ ...s, state: 'pending' as StageState })))
    abortRef.current = new AbortController()
    window.setTimeout(() => setStageState('generate', 'active'), 0)
    try {
      const response = await fetch('/api/pipeline/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: selectedIdea.id }),
        signal: abortRef.current.signal,
      })
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
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
          if (line.trim()) setLogs(prev => [...prev, line])
          if (!line.startsWith('data: ')) continue
          let payload: Record<string, unknown>
          try { payload = JSON.parse(line.slice(6)) as Record<string, unknown> } catch { continue }
          if (payload.event === 'status') {
            setStatusMsg(String(payload.message ?? 'Working...'))
            if (payload.stage === 'validating') { setStageState('generate', 'complete'); setStageState('validate', 'active') }
          }
          if (payload.event === 'validated') {
            if (payload.has_errors) { usedFixStage = true; setStageState('validate', 'complete'); setStageState('fix', 'active'); setStatusMsg('Auto-fixing...') }
            else { setStageState('validate', 'complete') }
          }
          if (payload.event === 'ready') {
            if (usedFixStage) setStageState('fix', 'complete')
            setStageState('done', 'complete')
            setStatusMsg('Ready for review')
            updateSelectedIdea({ status: 'reviewing' })
            await refreshIdeas()
            toast.success('Generated', `${selectedIdea.name} ready for review`)
          }
          if (payload.event === 'repair_required') {
            if (usedFixStage) setStageState('fix', 'error')
            setStatusMsg('Validation failed')
            updateSelectedIdea({ status: 'repair_required' })
            await refreshIdeas()
            toast.error('Pipeline Blocked', 'Validation failed after max repair attempts.')
          }
          if (payload.event === 'error') {
            setStages(prev => prev.map(s => s.state === 'active' ? { ...s, state: 'error' as StageState } : s))
            setErrorMsg(String(payload.message ?? 'Generation failed'))
            toast.error('Generation failed', String(payload.message ?? 'Unknown error'))
          }
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      if (error.name !== 'AbortError') {
        setStages(prev => prev.map(s => s.state === 'active' ? { ...s, state: 'error' as StageState } : s))
        setErrorMsg(error.message); toast.error('Error', error.message)
      }
    } finally { setIsRunning(false); abortRef.current = null }
  }

  const handleCopyLogs = () => {
    if (logs.length === 0) return
    const text = logs.join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Logs copied to clipboard')
  }

  const currentStage = stages.find(s => s.state === 'active')?.key
  let maxReachedIdx = 0
  if (['enriched', 'generating'].includes(selectedIdea?.status ?? '')) maxReachedIdx = 1
  if (['reviewing', 'approved', 'rejected'].includes(selectedIdea?.status ?? '')) maxReachedIdx = 2

  useEffect(() => { setActiveTabGroup(maxReachedIdx) }, [maxReachedIdx, selectedIdea?.id])

  /* ------------------------------------------------------------------ */
  /* LIST VIEW                                                            */
  /* ------------------------------------------------------------------ */
  if (!selectedIdea) {
    return (
      <DashboardPageFrame
        eyebrow="BACKLOG & PIPELINE"
        title="Idea Inventory"
        description="Capture digital artifacts and describe component behavior. Refine concepts here before pushing into the production pipeline."
        actions={
          <div className="flex gap-3">
             <button
              onClick={() => setShowFilters(f => !f)}
              className={cx(
                "flex h-10 items-center gap-2 rounded-2xl px-5 font-mono text-[11px] font-black uppercase tracking-[0.15em] transition-all",
                showFilters ? "bg-[--dashboard-accent-soft] text-[--dashboard-accent] shadow-lg shadow-[--dashboard-accent-soft]" : "bg-white/5 border border-white/10 text-gray-500 hover:text-white"
              )}
            >
              <Filter className="h-4 w-4" /> Filters
            </button>
            <button
              onClick={handleAddIdea}
              className="flex h-10 items-center gap-2 rounded-2xl bg-[#0465ED] px-6 font-mono text-[11px] font-black uppercase tracking-[0.15em] text-white transition-all hover:scale-105 active:scale-95 shadow-[0_8px_24px_rgba(4,101,237,0.3)] hover-glow-blue"
            >
              <Plus className="h-4 w-4" /> New Blueprint
            </button>
          </div>
        }
      >
        <Reveal className="space-y-10">
          {/* Main Inventory Panel — Forge Aesthetic */}
          <div className="overflow-hidden depth-card glass-panel rounded-[3rem] border-white/5">
            {/* Toolbar: Search & Laboratory Context */}
            <div className="flex flex-col gap-6 border-b border-white/5 px-10 pt-10 pb-8 sm:flex-row sm:items-center sm:justify-between bg-black/10">
              <div className="flex items-center gap-6 group flex-1 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600 group-focus-within:text-[--dashboard-accent] transition-colors" />
                  <input
                    placeholder="Search Laboratory Backlog..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-white/5 bg-black/40 pl-14 pr-6 font-mono text-[13px] font-bold text-[--text-primary] placeholder:text-gray-700 focus:outline-none focus:border-[--dashboard-accent]/40 focus:ring-4 focus:ring-[--dashboard-accent]/10 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 rounded-2xl bg-black/20 p-2 border border-white/5 shadow-inner">
                    <Sparkles className="h-5 w-5 ml-2 text-[--dashboard-accent] animate-pulse" />
                    <input
                      placeholder="Draft from specific intent..."
                      value={chatQuery}
                      onChange={e => setChatQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleChatSubmit()}
                      className="w-48 xl:w-72 bg-transparent font-mono text-[12px] font-bold text-[--text-secondary] placeholder:text-gray-700 focus:outline-none px-2"
                    />
                    <button
                      onClick={handleChatSubmit}
                      disabled={isChatting || !chatQuery.trim()}
                      className="px-6 py-2.5 rounded-xl bg-[--dashboard-accent] text-white font-mono text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale shadow-lg shadow-[--dashboard-accent-soft]"
                    >
                      {isChatting ? '...' : 'COMMIT'}
                    </button>
                 </div>
              </div>
            </div>

            {/* Filters Tray — Forge Style Selects */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-white/5 bg-black/5"
                >
                  <div className="flex flex-wrap gap-10 px-10 py-8">
                    {[
                      { label: 'Category', value: filterCategory, set: setFilterCategory, opts: categories },
                      { label: 'Type',     value: filterType,     set: setFilterType,     opts: types },
                      { label: 'Status',   value: filterStatus,   set: setFilterStatus,   opts: statuses },
                    ].map(({ label, value, set, opts }) => (
                      <div key={label} className="relative group min-w-[200px]">
                        <span className="absolute -top-5 left-1 font-mono text-[9px] font-black uppercase tracking-[0.25em] text-gray-600">ORBITAL {label}</span>
                        <div className="relative">
                          <select
                            value={value}
                            onChange={e => set(e.target.value)}
                            className="h-12 w-full appearance-none rounded-2xl border border-white/5 bg-white/5 px-6 font-mono text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white focus:outline-none focus:border-[--dashboard-accent]/30 transition-all cursor-pointer"
                          >
                            <option value="all" className="bg-zinc-900">All Nodes</option>
                            {opts.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                          </select>
                          <ChevronRight className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 rotate-90 text-gray-700 group-hover:text-[--dashboard-accent] transition-colors" />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-end">
                      <button
                        onClick={() => { setFilterCategory('all'); setFilterType('all'); setFilterStatus('all'); setSearchQuery('') }}
                        className="flex h-12 items-center gap-2 rounded-2xl px-6 font-mono text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all hover:bg-white/5 border border-transparent hover:border-white/5"
                      >
                        <X className="h-4 w-4" /> Reset Filters
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bulk Actions Interface */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-red-500/10 bg-red-500/5 px-10 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                       <span className="font-mono text-[11px] font-black uppercase tracking-widest text-red-500">{selectedIds.size} CONCEPT LAYERS TAGGED FOR PURGE</span>
                    </div>
                    <button
                      onClick={handleBulkDelete}
                      className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-6 font-mono text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" /> Execute Batch Deletion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table Core Layout */}
            <div className="overflow-x-auto p-6 sm:p-10">
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 transition-opacity opacity-40">
                    <th className="w-12 px-6 py-4">
                      <div 
                        className={cx(
                          "h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer",
                          isAllSelected ? "bg-[--dashboard-accent] border-[--dashboard-accent]" : "border-white/10 bg-black/40 hover:border-white/20"
                        )}
                        onClick={toggleAll}
                      >
                         {isAllSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </th>
                    <th className="p-4">#</th>
                    <th className="p-4">Blueprint Identity</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Stability Index</th>
                    <th className="p-4">Primitive</th>
                    <th className="p-4">Chronology</th>
                    <th className="p-4 text-right">Laboratory</th>
                  </tr>
                </thead>
                <tbody className="relative">
                  <AnimatePresence mode="popLayout">
                    {paginatedIdeas.length === 0 ? (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={8} className="py-40 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4 opacity-20">
                            <Code2 className="h-16 w-16 text-gray-600 mb-2" />
                            <p className="font-mono text-[11px] font-black uppercase tracking-[0.4em] text-gray-600">No architectural data found in current quadrant</p>
                          </div>
                        </td>
                      </motion.tr>
                    ) : paginatedIdeas.map((idea, idx) => {
                      const meta = STATUS_META[idea.status] ?? { label: idea.status, color: 'var(--dashboard-text-muted)', bg: 'var(--dashboard-chip)' }
                      return (
                        <IdeaRow
                          key={idea.id}
                          idea={idea}
                          idx={(currentPage - 1) * itemsPerPage + idx + 1}
                          meta={meta}
                          selected={selectedIds.has(idea.id)}
                          onToggle={() => toggleRow(idea.id)}
                          onOpen={() => { setSelectedIdea(idea); setStages([]); setStatusMsg(''); setErrorMsg(''); setLogs([]) }}
                          onDelete={(e) => handleDeleteSingle(idea.id, e)}
                        />
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination Controls — Forge Aesthetic */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 bg-black/10 px-10 py-10">
                <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
                  QUADRANT <span className="text-[--text-primary]">{currentPage}</span> / {totalPages}
                </div>
                
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-3 pr-6 border-r border-white/5">
                      <span className="font-mono text-[9px] font-black uppercase text-gray-700 tracking-widest">DENSITY</span>
                      <select
                        value={itemsPerPage}
                        onChange={e => setItemsPerPage(Number(e.target.value))}
                        className="h-8 rounded-xl bg-white/5 border border-white/5 px-3 font-mono text-[10px] font-bold text-gray-500 transition-all focus:outline-none focus:text-[--dashboard-accent]"
                      >
                        {[10, 25, 50, 100].map(v => <option key={v} value={v} className="bg-zinc-900">{v}</option>)}
                      </select>
                   </div>
                   
                   <div className="flex gap-4">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-12 px-10 rounded-2xl bg-white/5 border border-white/10 font-mono text-[10px] font-black uppercase tracking-widest text-gray-400 disabled:opacity-30 disabled:grayscale transition-all hover:text-white hover:bg-white/10 active:scale-95 shadow-lg"
                    >Prev Phase</button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-12 px-10 rounded-2xl bg-white/5 border border-white/10 font-mono text-[10px] font-black uppercase tracking-widest text-gray-400 disabled:opacity-30 disabled:grayscale transition-all hover:text-white hover:bg-white/10 active:scale-95 shadow-lg"
                    >Next Phase</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </DashboardPageFrame>
    )
  }

  /* ------------------------------------------------------------------ */
  /* DETAIL VIEW                                                          */
  /* ------------------------------------------------------------------ */
  return (
    <DashboardPageFrame
      eyebrow={`STUDIO — ID:${selectedIdea.id.slice(0, 8)}`}
      title={selectedIdea.name || 'Untitled Artifact'}
      description="Refine the concept outline, technical specs, and design language before initiating the production pipeline."
      actions={
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedIdea(null)}
            className="flex h-10 items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400 hover:text-white transition-all"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Back
          </button>
          <button
             onClick={() => handleDeleteIdea(selectedIdea.id)}
             className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-[#F93E39] hover:border-[#F93E39]/30 transition-all shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Outline Studio */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-8">
           <Reveal className="depth-card glass-panel rounded-[2.5rem] border-white/5 p-10">
              <div className="mb-10 flex items-center justify-between border-b border-white/5 pb-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[--dashboard-accent-soft] text-[--dashboard-accent] shadow-[0_8px_24px_rgba(var(--dashboard-accent-rgb),0.15)] border border-[--dashboard-accent-border]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-mono text-[14px] font-black uppercase tracking-[0.25em] text-[--text-primary]">Component Outline</h3>
                    <p className="font-mono text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 opacity-60">Metadata & Implementation Design</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={cx(
                    "rounded-xl px-5 py-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2.5 border backdrop-blur-md",
                    selectedIdea.status === 'pending' ? "bg-white/5 text-gray-500 border-white/10" : "bg-[--dashboard-accent-soft] text-[--dashboard-accent] border-[--dashboard-accent-border]"
                  )}>
                    <div className="relative flex h-2 w-2">
                      <div className={cx("absolute inset-0 rounded-full", selectedIdea.status === 'pending' ? "bg-gray-600" : "bg-[--dashboard-accent] animate-ping opacity-75")} />
                      <div className={cx("relative h-2 w-2 rounded-full", selectedIdea.status === 'pending' ? "bg-gray-700" : "bg-[--dashboard-accent]")} />
                    </div>
                    {selectedIdea.status}
                  </div>

                  {/* Active Pipeline Name */}
                  {activePipeline && (
                    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-5 py-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      <span className="opacity-40 mr-2">Pipeline:</span>
                      {activePipeline.name}
                      <span className="mx-2 opacity-20">|</span>
                      <span className="text-[--dashboard-accent]/80">{activePipeline.model}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Categorization */}
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 ml-1 opacity-70">Artifact Name</label>
                    <input
                      value={selectedIdea.name}
                      onChange={e => updateSelectedIdea({ name: e.target.value })}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl px-6 font-mono text-[14px] font-bold text-[--text-primary] focus:outline-none focus:border-[--dashboard-accent]/50 focus:ring-4 focus:ring-[--dashboard-accent]/10 transition-all shadow-inner placeholder:text-gray-700"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 ml-1 opacity-70">Format</label>
                      <div className="relative group">
                        <select
                          value={selectedIdea.format || 'component'}
                          onChange={e => updateSelectedIdea({ format: e.target.value as any })}
                          className="h-14 w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl px-6 font-mono text-[11px] font-black uppercase tracking-widest text-gray-400 focus:outline-none focus:text-[--dashboard-accent] focus:border-[--dashboard-accent]/50 appearance-none transition-all cursor-pointer"
                        >
                          {['component', 'section', 'template', 'page'].map(f => <option key={f} value={f} className="bg-zinc-900">{f}</option>)}
                        </select>
                        <ChevronRight className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 rotate-90 text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 ml-1 opacity-70">Category</label>
                      <div className="relative group">
                        <select
                          value={selectedIdea.category}
                          onChange={e => updateSelectedIdea({ category: e.target.value })}
                          className="h-14 w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl px-6 font-mono text-[11px] font-black uppercase tracking-widest text-gray-400 focus:outline-none focus:text-[--dashboard-accent] focus:border-[--dashboard-accent]/50 appearance-none transition-all cursor-pointer"
                        >
                          {['animation', 'layout', 'visual', 'experiment'].map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                        </select>
                        <ChevronRight className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 rotate-90 text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 ml-1 opacity-70">Complexity Index</label>
                      <div className="relative group">
                        <select
                          value={selectedIdea.complexity}
                          onChange={e => updateSelectedIdea({ complexity: e.target.value as any })}
                          className="h-14 w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl px-6 font-mono text-[11px] font-black uppercase tracking-widest text-gray-400 focus:outline-none focus:text-[--dashboard-accent] focus:border-[--dashboard-accent]/50 appearance-none transition-all cursor-pointer"
                        >
                          {['low', 'medium', 'high'].map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                        </select>
                        <ChevronRight className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 rotate-90 text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 ml-1 opacity-70">Tech Stack</label>
                    <div className="flex flex-wrap gap-2.5">
                      {['React', 'Tailwind', 'Framer Motion', 'GSAP', 'Three.js'].map(tech => {
                        const isSelected = (selectedIdea.tech ?? []).includes(tech)
                        return (
                          <button
                            key={tech}
                            onClick={() => toggleTech(tech)}
                            className={cx(
                              "px-4 py-2 rounded-xl font-mono text-[9px] font-black uppercase tracking-widest transition-all border",
                              isSelected 
                                ? "bg-[--dashboard-accent-soft] text-[--dashboard-accent] border-[--dashboard-accent-border] shadow-[0_4px_12px_rgba(var(--dashboard-accent-rgb),0.2)]" 
                                : "bg-white/5 text-gray-500 border-white/5 hover:border-white/10 hover:bg-white/10"
                            )}
                          >
                            {tech}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Conceptual Detail */}
                <div className="space-y-8">
                   <div className="space-y-3">
                    <label className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 ml-1 opacity-70">Movement Philosophy</label>
                    <textarea
                      value={selectedIdea.feel}
                      onChange={e => updateSelectedIdea({ feel: e.target.value as any })}
                      placeholder="Describe the motion physics — e.g. fluid elastic bounds, heavy cinematic easing..."
                      className="h-32 w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 font-mono text-[13px] font-bold text-[--text-primary] placeholder:text-gray-700 focus:outline-none focus:border-[--dashboard-accent]/50 focus:ring-4 focus:ring-[--dashboard-accent]/10 transition-all shadow-inner resize-none leading-relaxed"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 ml-1 opacity-70">Briefing Prompt</label>
                    <textarea
                      value={selectedIdea.prompt}
                      onChange={e => updateSelectedIdea({ prompt: e.target.value })}
                      placeholder="Explain the component's behavior to the AI..."
                      className="h-32 w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 font-mono text-[13px] font-bold text-[--text-primary] placeholder:text-gray-700 focus:outline-none focus:border-[--dashboard-accent]/50 focus:ring-4 focus:ring-[--dashboard-accent]/10 transition-all shadow-inner resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
           </Reveal>

           {/* Results Preview Section - Restructured to Vertical Stack */}
           <div className="flex flex-col gap-8">
              <Reveal delay={0.1} className="depth-card glass-panel rounded-[2.5rem] border-white/5 p-8 overflow-hidden">
                <div className="mb-6 flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--dashboard-info-soft] text-[--dashboard-info] shadow-sm">
                      <Code className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[--text-primary]">Enriched Artifact Spec</h4>
                      <p className="font-mono text-[9px] text-gray-500 font-bold">Structural implementation definition</p>
                    </div>
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 border border-white/10 shadow-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-[--dashboard-info] opacity-50" />
                  </div>
                </div>
                <div className="group relative">
                  <pre className="max-h-[520px] overflow-auto rounded-2xl bg-black/40 p-8 font-mono text-[12px] leading-relaxed text-[#f5f5f5]/80 scrollbar-hide shadow-inner border border-white/5 selection:bg-[--dashboard-accent]/30">
                    <code>{selectedIdea.enriched_spec ? JSON.stringify(selectedIdea.enriched_spec, null, 2) : '// Specification extraction pending...'}</code>
                  </pre>
                </div>
              </Reveal>

              <Reveal delay={0.2} className="depth-card glass-panel rounded-[2.5rem] border-white/5 p-1 overflow-hidden">
                 <div className="flex flex-col h-full bg-black/20 rounded-[2.4rem] overflow-hidden">
                    <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/10">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--dashboard-success-soft] text-[--dashboard-success] shadow-sm">
                          <Play className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[--text-primary]">Sandbox Preview</h4>
                          <p className="font-mono text-[9px] text-gray-500 font-bold">Live rendering environment</p>
                        </div>
                      </div>
                      <div className="flex h-6 items-center gap-2 px-4 rounded-full bg-black/20 border border-white/5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-mono text-[9px] font-black uppercase tracking-widest text-emerald-500/80">LIVE RENDER</span>
                      </div>
                    </div>
                    <div className="flex-1 p-8">
                      {selectedIdea.generated_code ? (
                        <div className="h-[600px] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl relative bg-zinc-950">
                           <AssetPreview
                            slug={`idea-${selectedIdea.id}`}
                            code={selectedIdea.generated_code}
                            height={600}
                            showCode={false}
                           />
                        </div>
                      ) : (
                        <div className="flex h-[440px] flex-col items-center justify-center rounded-2xl bg-black/10 border border-dashed border-white/10 text-center px-12 transition-all">
                          <Zap className="h-10 w-10 text-gray-700 mb-4 animate-pulse" />
                          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-600">Renderer Initializing</p>
                          <p className="mt-2 text-[11px] text-gray-500 max-w-[200px] leading-relaxed">Generated component will appear here once the pipeline stream completes.</p>
                        </div>
                      )}
                    </div>
                 </div>
              </Reveal>
           </div>
        </div>

        {/* Right: Pipeline Controller */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-6">
           <Reveal delay={0.3} className="depth-card glass-panel rounded-[2.5rem] border-white/5 p-8 sticky top-6">
              <div className="mb-8">
                <h3 className="font-mono text-[13px] font-black uppercase tracking-[0.2em] text-[--text-primary]">Pipeline Strategy</h3>
                <p className="font-mono text-[10px] text-gray-500 font-bold mt-1">Multi-stage Generative Flow</p>
              </div>

              <div className="space-y-10">
                 <StageStrip
                  stages={stages}
                  currentMessage={statusMsg}
                  isRunning={isRunning}
                  errorMessage={errorMsg}
                 />

                 <div className="space-y-3 pt-6 border-t border-white/5">
                    <button
                      onClick={handleGenerate}
                      disabled={isRunning}
                      className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl bg-[#0465ED] px-6 py-5 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:scale-100 shadow-[#0465ED]/30"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                          <Play className={cx("h-5 w-5 text-white", isRunning && "animate-spin")} />
                        </div>
                        <div className="text-left">
                          <p className="font-mono text-[11px] font-black uppercase tracking-widest text-white">Initiate Pipeline</p>
                          <p className="font-mono text-[9px] font-bold text-white/60">Extraction → Build → Audit</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                       <button
                        onClick={handleEnrich}
                        disabled={isRunning}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/5 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#0465ED] transition-all hover:bg-[#0465ED]/5 hover:border-[#0465ED]/30"
                       >
                         <Sparkles className="h-3.5 w-3.5" /> Re-Enrich
                       </button>
                       <button
                         onClick={() => window.open(`/preview/idea-${selectedIdea.id}`, '_blank')}
                         className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/5 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all hover:bg-white/10"
                       >
                         <ExternalLink className="h-3.5 w-3.5" /> Sandbox
                       </button>
                    </div>
                 </div>

                 {logs.length > 0 && (
                   <div className="animate-fade-in pt-8 border-t border-white/5">
                      <div className="mb-4 flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Live Telemetry</span>
                          <div className="flex items-center gap-1.5">
                             <div className="h-1 w-1 rounded-full bg-[--dashboard-accent] animate-ping" />
                             <span className="font-mono text-[8px] font-bold text-[--dashboard-accent]">STREAM FEED</span>
                          </div>
                        </div>
                        <button 
                          onClick={handleCopyLogs}
                          title="Copy logs to clipboard"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="max-h-[240px] overflow-auto rounded-xl bg-black/40 p-5 font-mono text-[10px] text-gray-400 scrollbar-hide space-y-1.5 border border-white/5 shadow-inner">
                        {logs.slice().reverse().map((line, i) => (
                          <div key={i} className="flex gap-3 leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                            <span className="shrink-0 text-gray-600 font-medium">[{logs.length - i}]</span>
                            <span className={cx(
                              "font-medium",
                              line.toLowerCase().includes('error') ? 'text-[#F93E39]' : 
                              line.toLowerCase().includes('complete') ? 'text-[#10b981]' : 
                              'text-gray-400'
                            )}>{line}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                 )}
              </div>
           </Reveal>
        </div>
      </div>
    </DashboardPageFrame>
  )
}

/* ------------------------------------------------------------------ */
/* IdeaRow — client sub-component for hover state                      */
/* ------------------------------------------------------------------ */
function IdeaRow({
  idea, idx, meta, selected, onToggle, onOpen, onDelete,
}: {
  idea: Idea
  idx: number
  meta: { label: string; color: string; bg: string }
  selected: boolean
  onToggle: () => void
  onOpen: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
  
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cx(
        "group cursor-pointer transition-all duration-500 rounded-[2rem]",
        selected ? 'bg-[--dashboard-accent-soft] shadow-[inset_0_0_20px_rgba(var(--dashboard-accent-rgb),0.05)]' : 'hover:bg-white/5'
      )}
    >
      <td className="px-6 py-6" onClick={e => { e.stopPropagation(); onToggle() }}>
        <div className={cx(
          "h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
          selected ? "bg-[--dashboard-accent] border-[--dashboard-accent] text-white" : "border-white/10 bg-black/40 group-hover:border-white/20"
        )}>
          {selected && <Check className="h-3 w-3" />}
        </div>
      </td>
      <td className="px-2 py-6 font-mono text-[11px] text-gray-700 font-bold group-hover:text-gray-500 transition-colors">{idx.toString().padStart(2, '0')}</td>
      <td className="px-4 py-6">
        <div className="flex flex-col">
          <span className="font-bold text-[14px] text-[--text-primary] tracking-tight group-hover:text-[--dashboard-accent] transition-colors">
            {idea.name || 'Untitled Blueprint'}
          </span>
          <span className="font-mono text-[9px] text-gray-600 font-black uppercase tracking-widest mt-0.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0">
             Open Metadata Rail
          </span>
        </div>
      </td>
      <td className="px-4 py-6">
         <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">{idea.category}</span>
         </div>
      </td>
      <td className="px-4 py-6">
        <span
          className="rounded-xl px-4 py-1.5 font-mono text-[9px] font-black uppercase tracking-[0.2em] shadow-lg border border-white/5 backdrop-blur-md"
          style={{ background: `${meta.bg}20`, color: meta.color, borderColor: `${meta.color}20` }}
        >
          {meta.label}
        </span>
      </td>
      <td className="px-4 py-6">
         <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">
               {idea.type}
            </span>
         </div>
      </td>
      <td className="px-4 py-6">
         <div className="flex flex-col opacity-60 group-hover:opacity-100 transition-opacity">
            <span className="font-mono text-[10px] text-gray-500 font-black">{formatDate(idea.created_at).split(',')[0]}</span>
            <span className="font-mono text-[8px] text-gray-700 font-bold">{formatDate(idea.created_at).split(',')[1]}</span>
         </div>
      </td>
      <td className="px-6 py-6 text-right">
        <div className={`flex items-center justify-end gap-2 transition-all duration-500 ${hovered ? 'opacity-100' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
          <button
            onClick={onDelete}
            title="Purge Record"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-600 hover:text-[#F93E39] hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-90"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            className="flex h-10 items-center gap-2 rounded-xl bg-[--dashboard-accent-soft] border border-[--dashboard-accent-border] px-5 font-mono text-[10px] font-black uppercase tracking-widest text-[--dashboard-accent] hover:bg-[--dashboard-accent] hover:text-white transition-all active:scale-95 shadow-lg shadow-[--dashboard-accent-soft]"
          >
            Refine <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </motion.tr>
  )
}
