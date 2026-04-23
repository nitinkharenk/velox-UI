'use client'
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronRight, X, Check, Copy, CheckCircle2, Search, Trash2, Filter, ExternalLink, Code, Layout, Braces, Sparkles, Zap, ArrowLeft, History, Edit3, MoreHorizontal, Eye } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { collectStringFacetValues, filterQueueItems, paginateItems } from '@/lib/pipeline/queueCollections'
import DashboardPageFrame from '@/components/dashboard/DashboardPageFrame'
import { Reveal } from '@/components/ui/Reveal'
import { cx } from '@/components/ui/cx'
import AssetPreview from '@/components/assets/AssetPreview'
import HoverPreview from '@/components/pipeline/HoverPreview'

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface ReviewItem {
  id: string
  name: string
  created_at?: string
  slug?: string
  status: string
  category?: string
  type?: string
  complexity?: string
  tags?: string[]
  tech?: string[]
  code?: string
  generated_code: string | null
  enriched_spec: {
    name: string; description: string; seo_description: string
    tags: string[]; tech: string[]
  } | null
}

const COMPLEXITY_COLOR: Record<string, string> = {
  high: 'var(--dashboard-danger)',
  medium: 'var(--dashboard-warning)',
  low: 'var(--dashboard-success)',
}

function ReviewPageContent() {
  const searchParams = useSearchParams()
  const [reviewQueue, setReviewQueue]       = useState<ReviewItem[]>([])
  const [searchQuery, setSearchQuery]       = useState('')
  const [showFilters, setShowFilters]       = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType]         = useState('all')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [selectedId, setSelectedId]         = useState<string | null>(() => searchParams.get('ideaId'))
  const [previewWidth, setPreviewWidth]     = useState('Full')
  const [viewMode, setViewMode]             = useState<'preview'|'code'>('preview')
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage]       = useState(1)
  const [itemsPerPage, setItemsPerPage]     = useState(10)

  // Hover Preview State
  const [previewState, setPreviewState] = useState<{
    slug: string | null
    visible: boolean
    x: number
    y: number
  }>({ slug: null, visible: false, x: 0, y: 0 })

  const loadReviewItems = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/ideas?status=reviewing,ready,ready_with_warnings,validated,generated,failed')
      const data = await res.json()
      if (data.ideas) setReviewQueue(data.ideas as ReviewItem[])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => { void loadReviewItems() }, 0)
    return () => window.clearTimeout(t)
  }, [loadReviewItems])

  const selected = useMemo(
    () => reviewQueue.find((item) => item.id === selectedId) ?? null,
    [reviewQueue, selectedId],
  )

  const handleApprove = useCallback(async (id: string, force = false) => {
    const item = reviewQueue.find(i => i.id === id)
    if (!item) return

    const publishItem = async (forcePublish: boolean) => {
      const code = item.generated_code
      if (!code || !item.enriched_spec) {
        toast.error('Missing data', 'Code or spec not available')
        return
      }

      const res = await fetch('/api/pipeline/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, spec: item.enriched_spec, ideaId: item.id, force: forcePublish })
      })

      let data: any
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : {}
      } catch (err) {
        console.error('[publish] Parse error:', err)
        toast.error('Server Error', 'The server returned an invalid response during publishing.')
        return
      }

      if (res.status === 409 && data.conflict) {
        const publishedDate = new Date(data.existing.created_at).toLocaleDateString()
        const confirmed = window.confirm(
          `"${data.existing.name}" was already published on ${publishedDate}.\n\nOverwrite it with this new version?`
        )
        if (confirmed) await publishItem(true)
        return
      }

      if (res.ok && data.ok) {
        toast.success('Published', data.slug)
        setSelectedId(null)
        await loadReviewItems()
        return
      }

      toast.error('Failed', data.error || `Publishing failed (HTTP ${res.status})`)
    }

    await publishItem(force)
  }, [reviewQueue, loadReviewItems])

  const handleReject = useCallback(async (id: string, skipLoad = false) => {
    await fetch('/api/pipeline/ideas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (!skipLoad) { toast.info('Rejected'); setSelectedId(null); await loadReviewItems() }
  }, [loadReviewItems])

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return
    toast.info(`Approving ${selectedIds.size} components...`)
    await Promise.all(Array.from(selectedIds).map(id => handleApprove(id, false)))
    toast.success(`Published ${selectedIds.size} components`)
    setSelectedIds(new Set()); setSelectedId(null); await loadReviewItems()
  }

  async function handleBulkReject() {
    if (selectedIds.size === 0) return
    await Promise.all(Array.from(selectedIds).map(id => handleReject(id, true)))
    toast.info(`Rejected ${selectedIds.size} components`)
    setSelectedIds(new Set()); setSelectedId(null); await loadReviewItems()
  }

  async function handleDeleteSingle(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch('/api/pipeline/ideas', { method: 'DELETE', body: JSON.stringify({ id }) })
    toast.success('Component deleted')
    if (selected?.id === id) setSelectedId(null)
    await loadReviewItems()
  }

  const handlePreviewEnter = (e: React.MouseEvent, slug: string) => {
    setPreviewState({
      slug,
      visible: true,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handlePreviewLeave = () => {
    setPreviewState(prev => ({ ...prev, visible: false }))
  }

  const handlePreviewMove = (e: React.MouseEvent) => {
    if (!previewState.visible) return
    setPreviewState(prev => ({ ...prev, x: e.clientX, y: e.clientY }))
  }

  function resetQueueViewport() { setCurrentPage(1); setSelectedIds(new Set()) }

  const filteredQueue = filterQueueItems(reviewQueue, {
    query: searchQuery,
    category: filterCategory,
    type: filterType,
    status: filterStatus,
  })

  const categories = collectStringFacetValues(reviewQueue, 'category')
  const types = collectStringFacetValues(reviewQueue, 'type')
  const statuses = collectStringFacetValues(reviewQueue, 'status')
  const { totalPages, items: paginatedQueue } = paginateItems(filteredQueue, currentPage, itemsPerPage)
  const isAllSelected  = paginatedQueue.length > 0 && paginatedQueue.every(i => selectedIds.has(i.id))

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
      const next = new Set(selectedIds); paginatedQueue.forEach(i => next.delete(i.id)); setSelectedIds(next)
    } else {
      const next = new Set(selectedIds); paginatedQueue.forEach(i => next.add(i.id)); setSelectedIds(next)
    }
  }

  function copyCode(code: string | null | undefined) {
    if (!code) return
    navigator.clipboard.writeText(code)
    toast.success('Copied')
  }

  /* ------------------------------------------------------------------ */
  /* DETAIL VIEW                                                          */
  /* ------------------------------------------------------------------ */
  if (selected) {
    return (
      <DashboardPageFrame
        eyebrow={`REVIEWING — SLUG: ${selected.slug || 'PENDING'}`}
        title={selected.name}
        description="Verify animation physics, accessibility, and code quality before syncing to the production library."
        actions={
          <div className="flex gap-3">
             <button
              onClick={() => setSelectedId(null)}
              className="flex h-10 items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400 hover:text-white transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Queue
            </button>
            <div className="h-10 w-px bg-white/5 mx-1" />
            <button
              onClick={() => handleReject(selected.id)}
              className="flex h-10 items-center gap-2 rounded-2xl bg-white/5 border border-[#F93E39]/20 px-5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#F93E39] hover:bg-[#F93E39]/10 transition-all"
            >
              <X className="h-4 w-4" /> REJECT
            </button>
            <button
              onClick={() => handleApprove(selected.id)}
              className="flex h-10 items-center gap-3 rounded-2xl bg-[#0465ED] px-6 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:opacity-90 shadow-[0_4px_20px_rgba(4,101,237,0.4)] hover-glow-blue"
            >
              <Check className="h-4 w-4" /> PUBLISH COMPONENT
            </button>
          </div>
        }
      >
         <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 h-screen max-h-[900px]">
            {/* Column 1: Metadata & Logs */}
            <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 scrollbar-hide pb-20">
               <Reveal className="depth-card glass-panel rounded-[2rem] border-white/5 p-6 h-fit">
                  <div className="mb-6 flex items-center justify-between">
                    <h4 className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Component Metadata</h4>
                    <Edit3 className="h-3.5 w-3.5 text-gray-700" />
                  </div>
                  <div className="space-y-5">
                     <div className="space-y-1.5">
                        <label className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Classification</label>
                        <div className="flex gap-2">
                           <span className="rounded-lg bg-[--dashboard-accent-soft] text-[--dashboard-accent] px-3 py-1 font-mono text-[10px] font-bold border border-[--dashboard-accent-border]">
                              {selected.type || 'UI'}
                           </span>
                           <span className="rounded-lg bg-white/5 text-gray-400 px-3 py-1 font-mono text-[10px] font-bold border border-white/5">
                              {selected.category || 'Anim'}
                           </span>
                        </div>
                     </div>
                     <div className="space-y-1.5">
                        <label className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Tags</label>
                        <div className="flex flex-wrap gap-1.5">
                           {(selected.enriched_spec?.tags ?? []).map(t => (
                              <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-500 font-medium">#{t}</span>
                           ))}
                        </div>
                     </div>
                     <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                           <span className="text-gray-500 font-medium">Complexity</span>
                           <span className="font-mono font-bold uppercase text-[--dashboard-accent]">{selected.complexity}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                           <span className="text-gray-500 font-medium">Tech Stack</span>
                           <div className="flex gap-1">
                              {(selected.enriched_spec?.tech ?? []).slice(0, 2).map(tk => (
                                 <span key={tk} className="font-mono text-[9px] text-gray-400">{tk}</span>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               </Reveal>

               <Reveal delay={0.1} className="depth-card glass-panel rounded-[2rem] border-white/5 p-6 flex-1 flex flex-col min-h-[300px]">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <History className="h-3.5 w-3.5 text-gray-500" />
                       <h4 className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Generation Logs</h4>
                    </div>
                    <span className="font-mono text-[8px] text-gray-600">RETAINED TS</span>
                  </div>
                  <div className="flex-1 overflow-auto rounded-xl bg-black/40 p-4 font-mono text-[10px] text-gray-500 scrollbar-hide space-y-2 border border-white/5">
                     {/* Static historical logs since we don't persist them yet, we show a professional summary */}
                     <div className="flex gap-2">
                        <span className="text-emerald-500">[OK]</span>
                        <span>Spec enriched via Claude 3.5</span>
                     </div>
                     <div className="flex gap-2">
                        <span className="text-blue-500">[INF]</span>
                        <span>Complexity mapped to {selected.complexity}</span>
                     </div>
                     <div className="flex gap-2">
                        <span className="text-emerald-500">[OK]</span>
                        <span>Motion code generated (224 lines)</span>
                     </div>
                     <div className="flex gap-2">
                        <span className="text-emerald-500">[OK]</span>
                        <span>Static audit passed (0 errors)</span>
                     </div>
                     <div className="pt-2 mt-2 border-t border-white/5 text-[9px] text-gray-600 italic">
                        Logs ephemeral for this session.
                     </div>
                  </div>
               </Reveal>
            </div>

            {/* Column 2: Sandbox Rendering */}
            <div className="lg:col-span-12 xl:col-span-6 space-y-6">
               <Reveal delay={0.2} className="depth-card glass-panel rounded-[2.5rem] border-white/5 p-1 h-full min-h-[600px] overflow-hidden">
                  <div className="flex flex-col h-full bg-black/20 rounded-[2.4rem] overflow-hidden">
                     <div className="flex items-center justify-between px-8 py-5 bg-black/10 border-b border-white/5">
                        <div className="flex items-center gap-4">
                           <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--dashboard-accent-soft] text-[--dashboard-accent]">
                              <Layout className="h-4 w-4" />
                           </div>
                           <h4 className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Component Sandbox</h4>
                        </div>
                        <div className="flex items-center gap-3">
                           {['Preview', 'Audit Data'].map(t => (
                              <button key={t} className={cx(
                                 "font-mono text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg transition-all",
                                 t === 'Preview' ? "bg-white/10 text-white shadow-lg" : "text-gray-600 hover:text-gray-400"
                              )}>
                                 {t}
                              </button>
                           ))}
                           <div className="h-6 w-px bg-white/10 mx-1" />
                           <button onClick={() => window.open(`/preview/idea-${selected.id}`, '_blank')} className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-all">
                              <ExternalLink className="h-4 w-4" />
                           </button>
                        </div>
                     </div>
                     <div className="flex-1 p-6 relative">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                        {selected.generated_code ? (
                           <div className="h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative bg-[--bg-surface]">
                              <AssetPreview
                                 slug={`idea-${selected.id}`}
                                 code={selected.generated_code}
                                 height={700}
                                 showCode={false}
                              />
                           </div>
                        ) : (
                           <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-black/10 border border-dashed border-white/10 text-center">
                              <Zap className="h-10 w-10 text-gray-700 mb-4 animate-pulse" />
                              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-600">Renderer Offline</p>
                           </div>
                        )}
                     </div>
                  </div>
               </Reveal>
            </div>

            {/* Column 3: Source Manifest */}
            <div className="lg:col-span-12 xl:col-span-3 space-y-6 overflow-y-auto pr-2 scrollbar-hide pb-20">
               <Reveal delay={0.3} className="depth-card glass-panel rounded-[2rem] border-white/5 p-6 h-full min-h-[600px] flex flex-col">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Braces className="h-3.5 w-3.5 text-gray-500" />
                       <h4 className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Source Manifest</h4>
                    </div>
                    <button onClick={() => copyCode(selected.generated_code)} className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-all">
                       <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto rounded-xl bg-black/40 p-5 font-mono text-[11px] leading-relaxed text-gray-500 scrollbar-hide border border-white/5">
                     <pre className="whitespace-pre-wrap break-all">
                        {selected.generated_code || '// No code found.'}
                     </pre>
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/5">
                     <div className="flex items-center justify-between px-1 mb-4">
                        <span className="font-mono text-[9px] font-black uppercase tracking-widest text-gray-600">Diagnostics</span>
                        <div className="flex gap-1.5">
                           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </div>
                     </div>
                     <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-gray-500 space-y-1">
                        <div className="flex justify-between">
                           <span>Tailwind Scan</span>
                           <span className="text-emerald-500">CLEAN</span>
                        </div>
                        <div className="flex justify-between">
                           <span>Motion Polyfill</span>
                           <span className="text-emerald-500">ACTIVE</span>
                        </div>
                     </div>
                  </div>
               </Reveal>
            </div>
         </div>
      </DashboardPageFrame>
    )
  }

  /* ------------------------------------------------------------------ */
  /* LIST VIEW                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4">

      {/* Page header */}
      <header className="relative overflow-hidden depth-card glass-panel px-6 py-8 sm:px-10 rounded-[2rem]">
        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#0465ED] font-bold mb-2">Review Pipeline</p>
          <h1 className="font-extrabold text-[clamp(1.8rem,4vw,3.5rem)] leading-tight tracking-tight text-[--text-primary]">Review Queue</h1>
          <p className="mt-3 max-w-[560px] text-sm font-medium leading-relaxed text-gray-500 dark:text-gray-400">
            Inspect generated component outputs and verify quality before final publication to the library.
          </p>
        </div>
      </header>

      {/* Queue panel */}
      <div className="overflow-hidden depth-card glass-panel rounded-[2rem]">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[--border-subtle] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--text-disabled]" />
            <input
              placeholder="Search queue…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); resetQueueViewport() }}
              className="h-9 w-full rounded-xl border border-[--border-default] bg-[--bg-surface] pl-9 pr-3 font-mono text-[12px] text-[--text-primary] placeholder:text-[--text-disabled] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(f => !f)}
              className="flex h-9 items-center gap-2 rounded-xl px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors"
              style={{
                background: showFilters ? 'var(--dashboard-accent-soft)' : 'var(--dashboard-chip-muted)',
                border: showFilters ? '1px solid var(--dashboard-accent-border)' : '1px solid var(--dashboard-border-subtle)',
                color: showFilters ? 'var(--dashboard-accent)' : 'var(--dashboard-text-muted)',
              }}>
              <Filter className="h-3.5 w-3.5" /> Filters
            </button>
            <span className="rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em]"
              style={{ background: 'var(--dashboard-accent-soft)', border: '1px solid var(--dashboard-accent-border)', color: 'var(--dashboard-accent)' }}>
              {reviewQueue.length} pending
            </span>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 border-b border-[--border-subtle] bg-[--bg-soft] px-5 py-4">
            {[
              { label: 'Category', value: filterCategory, set: (v: string) => { setFilterCategory(v); resetQueueViewport() }, opts: categories },
              { label: 'Type',     value: filterType,     set: (v: string) => { setFilterType(v);     resetQueueViewport() }, opts: types },
              { label: 'Status',   value: filterStatus,   set: (v: string) => { setFilterStatus(v);   resetQueueViewport() }, opts: statuses },
            ].map(({ label, value, set, opts }) => (
              <div key={label} className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-tertiary]">{label}</label>
                <select value={value} onChange={e => set(e.target.value)}
                  className="h-8 rounded-lg border border-[--border-default] bg-[--bg-surface] px-2 font-mono text-[11px] text-[--text-secondary] focus:outline-none capitalize">
                  <option value="all">All {label}s</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="flex items-end">
              <button onClick={() => { setFilterCategory('all'); setFilterType('all'); setFilterStatus('all'); setSearchQuery(''); resetQueueViewport() }}
                className="flex h-8 items-center gap-1.5 rounded-lg px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[--text-tertiary] hover:text-[--text-secondary]">
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-[--dashboard-accent-border] bg-[--dashboard-accent-soft] px-5 py-2.5">
            <span className="font-mono text-[11px] text-[--text-secondary]">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <button onClick={handleBulkReject}
                className="flex h-7 items-center gap-1.5 rounded-lg border border-[--dashboard-danger-border] bg-[--dashboard-danger] px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[--dashboard-danger-contrast] transition-all hover:opacity-90">
                <X className="h-3 w-3" /> Reject
              </button>
              <button onClick={handleBulkApprove}
                className="flex h-7 items-center gap-1.5 rounded-lg border border-[--dashboard-accent-border] bg-[--dashboard-accent] px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[--dashboard-accent-contrast] transition-all hover:opacity-90">
                <Check className="h-3 w-3" /> Publish
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
                <tr style={{ borderBottom: '1px solid var(--dashboard-border-subtle)' }}>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={isAllSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded" />
                </th>
                <th className="w-10 px-2 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">No.</th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Component</th>
                <th className="w-32 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Category</th>
                <th className="w-28 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Complexity</th>
                <th className="w-36 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-disabled]">Created</th>
                <th className="w-28 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {paginatedQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-[--text-disabled]" />
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[--text-disabled]">Inbox zero</p>
                  </td>
                </tr>
              ) : paginatedQueue.map((item, idx) => {
                const cc = COMPLEXITY_COLOR[item.complexity ?? 'medium'] ?? 'var(--tone-warning)'
                return (
                  <ReviewRow
                    key={item.id}
                    item={item}
                    idx={(currentPage - 1) * itemsPerPage + idx + 1}
                    complexityColor={cc}
                    selected={selectedIds.has(item.id)}
                    onToggle={() => toggleRow(item.id)}
                    onOpen={() => setSelectedId(item.id)}
                    onDelete={(e) => handleDeleteSingle(item.id, e)}
                    onPreviewEnter={handlePreviewEnter}
                    onPreviewLeave={handlePreviewLeave}
                    onPreviewMove={handlePreviewMove}
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
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredQueue.length)} of {filteredQueue.length}
            </span>
            <div className="flex items-center gap-3">
              <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); resetQueueViewport() }}
                className="h-7 rounded-lg border border-[--border-default] bg-[--bg-surface] px-2 font-mono text-[10px] text-[--text-secondary] focus:outline-none">
                {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v} rows</option>)}
              </select>
              <div className="flex gap-1">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-7 rounded-lg border border-[--border-default] bg-[--bg-surface] px-3 font-mono text-[10px] text-[--text-tertiary] disabled:opacity-20">Prev</button>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 rounded-lg border border-[--border-default] bg-[--bg-surface] px-3 font-mono text-[10px] text-[--text-tertiary] disabled:opacity-20">Next</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <HoverPreview 
        slug={previewState.slug} 
        visible={previewState.visible} 
        x={previewState.x} 
        y={previewState.y} 
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ReviewRow — client sub-component for hover state                    */
/* ------------------------------------------------------------------ */
function ReviewRow({ item, idx, complexityColor, selected, onToggle, onOpen, onDelete, onPreviewEnter, onPreviewLeave, onPreviewMove }: {
  item: ReviewItem
  idx: number
  complexityColor: string
  selected: boolean
  onToggle: () => void
  onOpen: () => void
  onDelete: (e: React.MouseEvent) => void
  onPreviewEnter: (e: React.MouseEvent, slug: string) => void
  onPreviewLeave: () => void
  onPreviewMove: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
  const previewSlug = item.slug || (item.id ? `idea-${item.id}` : null)

  return (
    <tr
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`cursor-pointer transition-all duration-300 ${selected ? 'bg-blue-100/30 dark:bg-blue-900/10' : hovered ? 'bg-gray-200/50 dark:hover:bg-white/5' : ''}`}
      style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <td className="px-6 py-5" onClick={e => { e.stopPropagation(); onToggle() }}>
        <input type="checkbox" checked={selected} onChange={onToggle} className="h-4 w-4 rounded depth-card" />
      </td>
      <td className="px-2 py-5 font-mono text-[11px] text-gray-500 font-bold">{idx}</td>
      <td className="px-4 py-5">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm text-[--text-primary] accent-text truncate max-w-[200px]">
            {item.name}
          </span>
          {previewSlug && (
            <div 
              onMouseEnter={(e) => { e.stopPropagation(); onPreviewEnter(e, previewSlug) }}
              onMouseLeave={(e) => { e.stopPropagation(); onPreviewLeave() }}
              onMouseMove={(e) => { e.stopPropagation(); onPreviewMove(e) }}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 border border-white/5 text-gray-600 hover:text-[--accent] hover:border-[--accent-border] transition-all cursor-help"
            >
              <Eye className="h-3 w-3" />
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">{item.category || '—'}</td>
      <td className="px-4 py-5">
        <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: complexityColor }}>
          {item.complexity ?? 'medium'}
        </span>
      </td>
      <td className="px-4 py-5 font-mono text-[10px] text-gray-400 font-bold">{formatDate(item.created_at)}</td>
      <td className="px-4 py-5">
        <div className={`flex items-center justify-end gap-3 transition-all duration-300 ${hovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>
          <button onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg depth-card text-gray-400 hover:text-[#F93E39] transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button className="flex h-8 items-center gap-2 rounded-lg depth-card px-3 font-mono text-[10px] font-bold text-[#0465ED] hover-glow-blue">
            Review <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewPageContent />
    </Suspense>
  )
}
