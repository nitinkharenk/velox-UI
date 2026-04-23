'use client'
import { useState, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { CheckCircle, Code2, X } from 'lucide-react'
import AssetPreview from '@/components/assets/AssetPreview'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Kbd from '@/components/ui/Kbd'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import clsx from 'clsx'

interface ReviewItem {
  id: string
  name: string
  status: string
  generated_code: string | null
  enriched_spec: {
    name: string; description: string; seo_description: string
    tags: string[]; tech: string[]
  } | null
}

const filters = ['all', 'reviewing', 'failed'] as const

export default function ReviewQueue() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [filter, setFilter] = useState<typeof filters[number]>('all')
  const [focusedIdx, setFocusedIdx] = useState(0)
  const [editingCode, setEditingCode] = useState<Record<string, string>>({})
  const [expandedCode, setExpandedCode] = useState<Record<string, boolean>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const { addToast } = useToast()

  const loadReviewItems = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/ideas?status=reviewing,validated,generated,failed')
      const data = await res.json()
      if (data.ideas) {
        const loaded = data.ideas as ReviewItem[]
        setItems(loaded)
        // Auto-populate code from DB for items that have generated_code
        setEditingCode(prev => {
          const next = { ...prev }
          for (const item of loaded) {
            if (item.generated_code && !next[item.id]) {
              next[item.id] = item.generated_code
            }
          }
          return next
        })
      }
    } catch { /* ignore */ }
  }, [])

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true
    if (filter === 'reviewing') return ['reviewing', 'validated', 'generated'].includes(item.status)
    return item.status === filter
  })

  const handleApprove = useCallback(async (item: ReviewItem) => {
    const code = editingCode[item.id]
    if (!code || !item.enriched_spec) {
      addToast({ type: 'error', title: 'Missing data', description: 'Enter code and ensure spec exists' }); return
    }
    setProcessing(item.id)
    const res = await fetch('/api/pipeline/ingest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, spec: item.enriched_spec, ideaId: item.id })
    })
    const data = await res.json()
    if (data.ok) { addToast({ type: 'success', title: 'Published', description: data.slug }); await loadReviewItems() }
    else addToast({ type: 'error', title: 'Failed', description: data.error })
    setProcessing(null)
  }, [editingCode, addToast, loadReviewItems])

  const handleReject = useCallback(async (item: ReviewItem) => {
    await fetch('/api/pipeline/ideas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: 'rejected' })
    })
    addToast({ type: 'info', title: 'Rejected', description: item.name })
    await loadReviewItems()
  }, [addToast, loadReviewItems])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReviewItems()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadReviewItems])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === 'j') setFocusedIdx(prev => Math.min(prev + 1, filteredItems.length - 1))
      if (e.key === 'k') setFocusedIdx(prev => Math.max(prev - 1, 0))
      if (e.key === 'a' && filteredItems[focusedIdx]) handleApprove(filteredItems[focusedIdx])
      if (e.key === 'r' && filteredItems[focusedIdx]) handleReject(filteredItems[focusedIdx])
      if (e.key === 'e' && filteredItems[focusedIdx]) {
        const id = filteredItems[focusedIdx].id
        setExpandedCode(prev => ({ ...prev, [id]: !prev[id] }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filteredItems, focusedIdx, handleApprove, handleReject])

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx(
              'rounded-full border px-4 py-2 text-xs capitalize transition-all duration-200',
              filter === f
                ? 'border-[--accent-border] bg-[--accent-dim] text-[--accent-text] shadow-[var(--shadow-soft)]'
                : 'border-[--border-subtle] bg-[--bg-soft] text-[--text-tertiary] hover:border-[--border-default] hover:bg-[--bg-hover] hover:text-[--text-secondary]'
            )}>
            {f}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState icon={<CheckCircle className="h-6 w-6" />}
          title="All caught up" description="No assets waiting for review." />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredItems.map((item, idx) => (
            <div key={item.id}
              className={clsx(
                'surface-panel overflow-hidden rounded-[28px] transition-all duration-300',
                idx === focusedIdx
                  ? 'border-[--accent-border] shadow-[var(--shadow-lift)]'
                  : 'hover:border-[--border-default]'
              )}>
              {editingCode[item.id] && (
                <AssetPreview slug={`review-${item.id}`} code={editingCode[item.id]} height={240} showCode />
              )}

              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[--text-primary]">{item.name}</h3>
                  <Badge variant={item.status === 'failed' ? 'danger' : 'accent'} size="sm">{item.status}</Badge>
                </div>

                {item.enriched_spec && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.enriched_spec.tags?.slice(0, 4).map(tag => (
                      <span key={tag} className="rounded-full bg-[--bg-soft] px-2 py-0.5 text-[10px] text-[--text-tertiary]">{tag}</span>
                    ))}
                  </div>
                )}

                {!editingCode[item.id] && (
                  <p className="text-xs text-[--text-tertiary]">No generated code available for this item.</p>
                )}

                <button onClick={() => setExpandedCode(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className="flex items-center gap-1.5 text-xs text-[--text-tertiary] transition-colors hover:text-[--accent]">
                  <Code2 className="h-3 w-3" />
                  {expandedCode[item.id] ? 'Hide editor' : 'Edit code'}
                </button>

                {expandedCode[item.id] && (
                  <div className="surface-panel-muted h-64 w-full overflow-hidden rounded-[22px] border border-[--border-subtle]">
                    <Editor
                      height="100%"
                      defaultLanguage="typescript"
                      theme="vs-dark"
                      value={editingCode[item.id] ?? ''}
                      onChange={(value) => setEditingCode(prev => ({ ...prev, [item.id]: value ?? '' }))}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 },
                        lineNumbers: 'off',
                        folding: false
                      }}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="danger" size="sm" onClick={() => handleReject(item)}>
                    <X className="h-3 w-3" /> Reject
                  </Button>
                  <Button variant="accent" size="sm" loading={processing === item.id}
                    onClick={() => handleApprove(item)} disabled={!editingCode[item.id]}>
                    <CheckCircle className="h-3 w-3" /> Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="glass fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 gap-5 rounded-full border border-[--border-default] px-5 py-2.5 text-[11px] text-[--text-tertiary] shadow-[var(--shadow-lift)]">
          <span><Kbd>J</Kbd>/<Kbd>K</Kbd> navigate</span>
          <span><Kbd>A</Kbd> approve</span>
          <span><Kbd>R</Kbd> reject</span>
          <span><Kbd>E</Kbd> code</span>
        </div>
      )}
    </div>
  )
}
