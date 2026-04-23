'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { 
  Trash2, Check, Plus, Save, ChevronRight, Edit3, ArrowLeft,
  FileBox, ChevronDown, ChevronUp, BadgeDollarSign, ExternalLink, X
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import {
  DEFAULT_PIPELINE_MODEL,
  PROVIDER_CATALOG,
  PROVIDER_MODELS,
  getDefaultProviderModel,
  getProviderModelTokenLimits,
} from '@/lib/pipeline/providerModels'

// --- Types ---
type PipelineStage = {
  id: string
  pipeline_id: string
  step_order: number
  name: string
  action_type: string
  provider: string
  model: string
  system_prompt: string | null
}

type Pipeline = {
  id: string
  name: string
  description: string
  is_default: boolean
  created_at?: string
  pipeline_stages: PipelineStage[]
}

const PROVIDER_COLORS: Record<string, string> = {
  'anthropic': 'bg-[--dashboard-enrich-soft] text-[--dashboard-enrich] border-[--dashboard-enrich-border]',
  'groq': 'bg-[--dashboard-warning-soft] text-[--dashboard-warning] border-[--dashboard-warning-border]',
  'gemini': 'bg-[--dashboard-info-soft] text-[--dashboard-info] border-[--dashboard-info-border]',
  'vertex': 'bg-[--dashboard-info-soft] text-[--dashboard-info] border-[--dashboard-info-border]',
  'openai': 'bg-[--dashboard-success-soft] text-[--dashboard-success] border-[--dashboard-success-border]',
  'ollama': 'bg-[--dashboard-chip] text-[--dashboard-text-muted] border-[--dashboard-border]'
}

const PROVIDER_INITIALS: Record<string, string> = {
  'anthropic': 'An',
  'groq': 'Gr',
  'gemini': 'Ge',
  'vertex': 'Ve',
  'openai': 'Op',
  'ollama': 'Ol'
}

function getProviderColor(provider: string) {
  return PROVIDER_COLORS[provider] || 'bg-[--dashboard-accent-soft] text-[#0465ED] border-[--dashboard-accent-border]'
}

function getProviderInitials(provider: string) {
  if (PROVIDER_INITIALS[provider]) return PROVIDER_INITIALS[provider]
  return provider.substring(0, 2).toUpperCase()
}

function ProviderPricingPanel({ onClose }: { onClose: () => void }) {
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('all')
  const providers = Object.values(PROVIDER_CATALOG)
  const visibleProviders =
    selectedProviderFilter === 'all'
      ? providers
      : providers.filter((provider) => provider.id === selectedProviderFilter)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="dashboard-modal-overlay"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-pricing-title"
        className="dashboard-modal-frame"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-modal-header px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">Pricing reference</Badge>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--dashboard-text-soft]">
                  Hosted pricing is shown as $ / 1M tokens
                </span>
              </div>
              <h3 id="provider-pricing-title" className="text-xl font-bold text-[--dashboard-text-strong]">
                All provider pricing and model limits
              </h3>
              <p className="dashboard-modal-copy max-w-4xl text-sm leading-6">
                This panel is informational only. It keeps provider model pricing, context, output limits, and docs links in one place so workflow stage selection stays grounded in current provider metadata.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="self-start font-semibold text-[--dashboard-text-muted] hover:bg-[--dashboard-surface] hover:text-[--dashboard-text-strong]">
              <X className="w-4 h-4 mr-1.5" /> Close
            </Button>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--dashboard-text-soft]">
                Filter by provider
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={selectedProviderFilter === 'all'}
                  data-active={selectedProviderFilter === 'all'}
                  onClick={() => setSelectedProviderFilter('all')}
                  className="dashboard-modal-filter-chip inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--dashboard-accent] focus-visible:ring-offset-2 focus-visible:ring-offset-[--dashboard-card-elevated]"
                >
                  All providers
                </button>
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    aria-pressed={selectedProviderFilter === provider.id}
                    data-active={selectedProviderFilter === provider.id}
                    onClick={() => setSelectedProviderFilter(provider.id)}
                    className="dashboard-modal-filter-chip inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--dashboard-accent] focus-visible:ring-offset-2 focus-visible:ring-offset-[--dashboard-card-elevated]"
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--dashboard-text-soft]">
              Showing {visibleProviders.length} of {providers.length} providers
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
        {visibleProviders.map((provider) => (
          <section
            key={provider.id}
            className="dashboard-modal-provider-card"
          >
            <div className="dashboard-modal-provider-head flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{provider.label}</Badge>
                  {provider.lastVerifiedAt && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--dashboard-text-soft]">
                      Verified {provider.lastVerifiedAt}
                    </span>
                  )}
                </div>
                {provider.runtimeNote && (
                  <p className="dashboard-modal-copy max-w-3xl text-sm font-medium leading-6">
                    {provider.runtimeNote}
                  </p>
                )}
              </div>
              {provider.docsUrl && (
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[--dashboard-accent] transition-colors hover:text-[--accent-hover]"
                >
                  Docs <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="hidden grid-cols-[minmax(180px,1.4fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(220px,1.4fr)_minmax(88px,0.55fr)] gap-4 border-b border-[--dashboard-border-subtle] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[--dashboard-text-soft] lg:grid">
              <span>Model</span>
              <span>Input price</span>
              <span>Output price</span>
              <span>Context window</span>
              <span>Max output</span>
              <span>Notes</span>
              <span>Docs</span>
            </div>

            <div className="divide-y divide-[--dashboard-border-subtle]">
              {provider.models.map((model) => {
                const modelDocsUrl = model.docsUrl ?? provider.docsUrl

                return (
                  <div key={model.id} className="px-5 py-4">
                    <div className="hidden grid-cols-[minmax(180px,1.4fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(220px,1.4fr)_minmax(88px,0.55fr)] gap-4 lg:grid">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[--dashboard-text-strong]">{model.label}</p>
                        <p className="mt-1 font-mono text-[11px] text-[--dashboard-text-soft]">{model.id}</p>
                      </div>
                      <p className="dashboard-modal-copy text-sm">{model.inputPrice}</p>
                      <p className="dashboard-modal-copy text-sm">{model.outputPrice}</p>
                      <p className="dashboard-modal-copy text-sm">{model.contextWindow}</p>
                      <p className="dashboard-modal-copy text-sm">{model.maxOutputTokens}</p>
                      <p className="dashboard-modal-copy text-sm leading-6">{model.notes}</p>
                      <div>
                        {modelDocsUrl ? (
                          <a
                            href={modelDocsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[--dashboard-accent] transition-colors hover:text-[--accent-hover]"
                          >
                            Open <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-sm text-[--dashboard-text-soft]">—</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 lg:hidden">
                      <div>
                        <p className="text-sm font-semibold text-[--dashboard-text-strong]">{model.label}</p>
                        <p className="mt-1 font-mono text-[11px] text-[--dashboard-text-soft]">{model.id}</p>
                      </div>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[--dashboard-text-soft]">Input price</dt>
                          <dd className="dashboard-modal-copy mt-1 text-sm">{model.inputPrice}</dd>
                        </div>
                        <div>
                          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[--dashboard-text-soft]">Output price</dt>
                          <dd className="dashboard-modal-copy mt-1 text-sm">{model.outputPrice}</dd>
                        </div>
                        <div>
                          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[--dashboard-text-soft]">Context window</dt>
                          <dd className="dashboard-modal-copy mt-1 text-sm">{model.contextWindow}</dd>
                        </div>
                        <div>
                          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[--dashboard-text-soft]">Max output</dt>
                          <dd className="dashboard-modal-copy mt-1 text-sm">{model.maxOutputTokens}</dd>
                        </div>
                      </dl>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[--dashboard-text-soft]">Notes</p>
                        <p className="dashboard-modal-copy mt-1 text-sm leading-6">{model.notes}</p>
                      </div>
                      {modelDocsUrl && (
                        <a
                          href={modelDocsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[--dashboard-accent] transition-colors hover:text-[--accent-hover]"
                        >
                          Open docs <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
          </div>
      </div>
      </section>
    </div>
  )
}

export default function PipelineConfigsEditor() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [customProviders, setCustomProviders] = useState<{ id: string, name: string, provider_id: string, default_model: string }[]>([])
  const [loading, setLoading] = useState(true)

  // Navigation & UI State
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showPricingCatalog, setShowPricingCatalog] = useState(false)

  async function readApiPayload<T>(res: Response): Promise<T & { error?: string; message?: string }> {
    const text = await res.text()
    if (!text) return {} as T & { error?: string; message?: string }

    try {
      return JSON.parse(text) as T & { error?: string; message?: string }
    } catch {
      return { error: text } as T & { error?: string; message?: string }
    }
  }

  function getApiErrorMessage(
    payload: { error?: string; message?: string } | null | undefined,
    fallback: string,
    status?: number,
  ) {
    const base = payload?.error ?? payload?.message ?? fallback
    return status && !payload?.error && !payload?.message ? `${base} (${status})` : base
  }

  const fetchPipelines = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/workflows')
      const data = await readApiPayload<{ pipelines?: Pipeline[] }>(res)

      if (!res.ok || !data.pipelines) {
        toast.error('Failed to load workflows', getApiErrorMessage(data, 'Could not load workflows.', res.status))
        setPipelines([])
        return
      }

      setPipelines(data.pipelines)
    } catch (error) {
      toast.error('Failed to load workflows', error instanceof Error ? error.message : 'Unexpected error')
    }
  }, [])

  const fetchCustomProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/providers')
      const data = await res.json()
      if (res.ok && data.providers) {
        setCustomProviders(data.providers)
      }
    } catch (err) {
      console.warn('Failed to fetch custom providers for editor:', err)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchPipelines(), fetchCustomProviders()]).finally(() => {
      setLoading(false)
    })
  }, [fetchPipelines, fetchCustomProviders])

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- API Handlers ---
  async function createPipeline() {
    try {
      const res = await fetch('/api/pipeline/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Custom Workflow',
          description: 'Describe this workflow...',
          is_default: pipelines.length === 0,
        }),
      })
      const data = await readApiPayload<{ pipeline?: Pipeline }>(res)
      if (!res.ok || !data.pipeline) {
        return toast.error('Failed to create workflow', getApiErrorMessage(data, 'Could not create the workflow.', res.status))
      }

      setPipelines([...pipelines, data.pipeline])
      setEditingPipelineId(data.pipeline.id)
      toast.success('Pipeline created')
    } catch (error) {
      toast.error('Failed to create workflow', error instanceof Error ? error.message : 'Unexpected error')
    }
  }

  async function updatePipeline(id: string, updates: Partial<Pipeline>) {
    setPipelines(prev => prev.map(p => p.id === id ? { ...p, ...updates } : 
      (updates.is_default ? { ...p, is_default: false } : p)
    ))
    try {
      const res = await fetch('/api/pipeline/workflows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      const data = await readApiPayload<{ pipeline?: Pipeline }>(res)
      if (!res.ok || data.error) toast.error('Update failed', getApiErrorMessage(data, 'Could not update the workflow.', res.status))
      else toast.success('Saved workflow settings')
    } catch (error) {
      toast.error('Update failed', error instanceof Error ? error.message : 'Unexpected error')
    }
  }

  async function deletePipeline(id: string) {
    try {
      const res = await fetch('/api/pipeline/workflows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await readApiPayload<{ ok?: boolean }>(res)
      if (!res.ok || data.error) toast.error('Delete failed', getApiErrorMessage(data, 'Could not delete the workflow.', res.status))
      else {
        setPipelines(prev => prev.filter(p => p.id !== id))
        if (editingPipelineId === id) setEditingPipelineId(null)
        toast.info('Deleted pipeline')
      }
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : 'Unexpected error')
    }
  }

  const activePipeline = pipelines.find(p => p.id === editingPipelineId)
  const activeStage = activePipeline?.pipeline_stages?.find(s => s.id === editingStageId) || activePipeline?.pipeline_stages?.[0]
  const activeStageTokenLimits = activeStage
    ? getProviderModelTokenLimits(activeStage.provider, activeStage.model)
    : null

  async function addStage() {
    if (!activePipeline) return
    const order = (activePipeline.pipeline_stages?.length || 0) + 1
    try {
      const res = await fetch('/api/pipeline/workflows/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline_id: activePipeline.id,
          step_order: order,
          name: `Stage ${order}`,
          action_type: 'generate_code',
          provider: 'anthropic',
          model: DEFAULT_PIPELINE_MODEL,
        }),
      })
      const data = await readApiPayload<{ stage?: PipelineStage }>(res)
      if (!res.ok || !data.stage) {
        return toast.error('Failed to add stage', getApiErrorMessage(data, 'Could not add the workflow stage.', res.status))
      }
      
      setPipelines(prev => prev.map(p => {
        if (p.id !== activePipeline.id) return p
        return { ...p, pipeline_stages: [...p.pipeline_stages, data.stage!] }
      }))
      setEditingStageId(data.stage.id)
    } catch (error) {
      toast.error('Failed to add stage', error instanceof Error ? error.message : 'Unexpected error')
    }
  }

  function updateLocalStage(stageId: string, updates: Partial<PipelineStage>) {
    if (!activePipeline) return
    // Auto correct model if provider changes
    if (updates.provider && !updates.model) {
      updates.model = getDefaultProviderModel(updates.provider)
    }

    setPipelines(prev => prev.map(p => {
      if (p.id !== activePipeline.id) return p
      return {
        ...p,
        pipeline_stages: p.pipeline_stages.map(s => s.id === stageId ? { ...s, ...updates } : s)
      }
    }))
  }

  async function saveStageToDB(stage: PipelineStage) {
    try {
      const res = await fetch('/api/pipeline/workflows/stages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stage),
      })
      const data = await readApiPayload<{ stage?: PipelineStage }>(res)
      if (!res.ok || data.error) toast.error('Failed to save stage', getApiErrorMessage(data, 'Could not save the workflow stage.', res.status))
      else toast.success('Stage details saved')
    } catch (error) {
      toast.error('Failed to save stage', error instanceof Error ? error.message : 'Unexpected error')
    }
  }

  async function deleteStage(stageId: string) {
    if (!activePipeline) return
    try {
      const res = await fetch('/api/pipeline/workflows/stages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stageId }),
      })
      const data = await readApiPayload<{ ok?: boolean }>(res)
      if (!res.ok || data.error) toast.error('Delete failed', getApiErrorMessage(data, 'Could not delete the workflow stage.', res.status))
      else {
        setPipelines(prev => prev.map(p => {
          if (p.id !== activePipeline.id) return p
          return { ...p, pipeline_stages: p.pipeline_stages.filter(s => s.id !== stageId) }
        }))
        if (editingStageId === stageId) setEditingStageId(null)
        toast.info('Deleted stage')
      }
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : 'Unexpected error')
    }
  }

  // Visual Helper component for waterfall graphs
  const WaterfallGraph = ({ stages }: { stages: PipelineStage[] }) => {
    if (!stages || stages.length === 0) return <p className="text-sm font-medium text-[--text-tertiary] italic">No stages configured.</p>
    return (
      <div className="flex flex-wrap items-center gap-3 overflow-x-auto py-2 px-1">
        {stages.sort((a,b) => a.step_order - b.step_order).map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <div className="relative flex min-w-[150px] flex-col overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-base] p-4 text-left shadow-sm">
              <span className="mb-2 text-xs font-mono font-extrabold tracking-widest text-[--text-tertiary] uppercase">Step {idx + 1}</span>
              <span className="text-sm font-bold text-[--text-primary] truncate pr-2" title={stage.name}>{stage.name}</span>
              <div className="flex items-center gap-2 mt-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${getProviderColor(stage.provider)}`}>
                  {getProviderInitials(stage.provider)}
                </span>
                <span className="text-xs font-medium text-[--text-secondary] truncate" title={stage.model}>{stage.model}</span>
              </div>
            </div>
            {idx < stages.length - 1 && (
              <ChevronRight className="w-5 h-5 text-[--text-tertiary] shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  const pricingButton = (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setShowPricingCatalog(prev => !prev)}
      className="font-semibold"
    >
      {showPricingCatalog ? <X className="w-4 h-4 mr-1.5" /> : <BadgeDollarSign className="w-4 h-4 mr-1.5" />}
      Model pricing
    </Button>
  )

  if (loading) return <div className="animate-pulse h-64 bg-[--bg-soft] rounded-[2rem]" />

  // --- EDIT MODE VIEW ---
  if (activePipeline) {
    return (
      <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => setEditingPipelineId(null)} className="-ml-3 text-sm font-semibold text-[--text-secondary] hover:text-[--text-primary]">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Workflows
          </Button>
          <div className="flex items-center gap-3">
            {pricingButton}
            {!activePipeline.is_default && <Button size="sm" variant="secondary" onClick={() => updatePipeline(activePipeline.id, { is_default: true })} className="font-semibold"><Check className="w-4 h-4 mr-1.5" /> Make Default</Button>}
            {activePipeline.is_default && <span className="inline-flex items-center rounded-full border border-[--dashboard-success-border] bg-[--dashboard-success-soft] px-3 py-1 text-sm font-bold text-[--dashboard-success]">Active Setup</span>}
            <Button size="sm" variant="danger" className="bg-[--danger] bg-opacity-10 text-[--danger] hover:bg-opacity-20 border-none font-semibold" onClick={() => { deletePipeline(activePipeline.id) }}>
              Delete Workflow
            </Button>
          </div>
        </div>

        {showPricingCatalog && <ProviderPricingPanel onClose={() => setShowPricingCatalog(false)} />}
        
        {/* Pipeline Details Card */}
        <div className="bg-[--bg-base] rounded-[1.5rem] p-7 shadow-sm border border-[--border-default] space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-4 flex-1 pr-10">
              <input 
                value={activePipeline.name}
                onChange={e => setPipelines(pipelines.map(p => p.id === activePipeline.id ? { ...p, name: e.target.value } : p))}
                onBlur={() => updatePipeline(activePipeline.id, { name: activePipeline.name })}
                className="text-3xl font-extrabold bg-transparent border-none focus-visible:ring-0 p-0 text-[--text-primary] w-full"
                placeholder="Workflow Name"
              />
              <input 
                value={activePipeline.description || ''}
                onChange={e => setPipelines(pipelines.map(p => p.id === activePipeline.id ? { ...p, description: e.target.value } : p))}
                onBlur={() => updatePipeline(activePipeline.id, { description: activePipeline.description })}
                className="text-base font-medium bg-transparent border-none focus-visible:ring-0 p-0 text-[--text-secondary] w-full max-w-3xl"
                placeholder="Add a detailed description for this workflow's purpose..."
              />
            </div>
          </div>
        </div>

        {/* Stages Manager Card */}
        <div className="bg-[--bg-base] rounded-[1.5rem] p-7 shadow-sm border border-[--border-default] space-y-8">
          <div className="flex items-center justify-between border-b border-[--border-default] pb-5">
            <h3 className="text-xl font-bold text-[--text-primary]">Agent Sub-Stages</h3>
            <Button size="sm" variant="primary" onClick={addStage} className="font-semibold">
              <Plus className="w-5 h-5 mr-2" /> Add Stage
            </Button>
          </div>

          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-10">
            {/* Left Column: Waterfall List */}
            <div className="flex-1 space-y-4 min-w-[320px]">
              {activePipeline.pipeline_stages.length === 0 && (
                <div className="p-8 border-2 border-dashed border-[--border-default] rounded-xl text-center text-sm font-medium text-[--text-tertiary]">
                  No stages defined. Add a stage to begin building your pipeline.
                </div>
              )}
              {activePipeline.pipeline_stages.sort((a,b) => a.step_order - b.step_order).map((stage, idx) => {
                const isActive = activeStage?.id === stage.id
                return (
                  <div key={stage.id} className="relative">
                    <button 
                      onClick={() => setEditingStageId(stage.id)}
                      className={`w-full relative flex items-center justify-between overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                        isActive 
                          ? 'border-[--accent] shadow-[0_0_0_2px_var(--accent)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]' 
                          : 'border-[--border-default] bg-[--bg-base] hover:border-[--text-tertiary]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full font-extrabold text-sm shadow-sm ${isActive ? 'bg-[--dashboard-accent] text-[--dashboard-accent-contrast]' : 'bg-[--dashboard-chip-muted] text-[--dashboard-text-muted]'}`}>
                          {stage.step_order}
                        </div>
                        <div>
                          <div className="text-base font-bold text-[--text-primary] flex items-center gap-2">
                             {stage.name}
                          </div>
                          <div className="text-sm font-medium text-[--text-secondary] mt-1 max-w-[200px] truncate">
                            {stage.action_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${getProviderColor(stage.provider)}`}>
                          {getProviderInitials(stage.provider)}
                        </span>
                      </div>
                    </button>
                    {idx < activePipeline.pipeline_stages.length - 1 && (
                      <div className="absolute -bottom-4 left-9 w-0.5 h-4 bg-[--border-default]" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right Column: Stage Configuration Form */}
            {activeStage && (
              <div className="flex-[2] bg-[--bg-soft] shadow-inner border border-[--border-default] rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center rounded-full bg-[--dashboard-accent] px-3 py-1 text-sm font-bold text-[--dashboard-accent-contrast] shadow-sm">Step {activeStage.step_order}</span>
                    <h4 className="text-lg font-extrabold text-[--text-primary]">Stage Properties</h4>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteStage(activeStage.id)} className="h-10 w-10 hover:bg-[--dashboard-danger-soft] hover:text-[--dashboard-danger] transition-colors">
                     <Trash2 className="w-5 h-5 text-[--danger]" />
                  </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-[--text-secondary] uppercase tracking-wide">Stage Name</label>
                    <Input 
                      value={activeStage.name} 
                      onChange={(e) => updateLocalStage(activeStage.id, { name: e.target.value })} 
                      className="bg-[--bg-base] h-12 text-base font-medium shadow-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-[--text-secondary] uppercase tracking-wide">Action Process</label>
                    <Select 
                      value={activeStage.action_type}
                      onChange={(e) => updateLocalStage(activeStage.id, { action_type: e.target.value })}
                      className="bg-[--bg-base] h-12 text-base font-medium shadow-sm"
                    >
                      <option value="enrich_spec">Research & Spec (Input: Idea)</option>
                      <option value="generate_code">Code Generation (Input: Spec)</option>
                      <option value="validate_code">Self-Correction (Input: Code)</option>
                      <option value="custom_prompt">Custom Pass (Input: Code)</option>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-[--text-secondary] uppercase tracking-wide">AI Provider Engine</label>
                    <Select 
                      value={activeStage.provider}
                      onChange={(e) => updateLocalStage(activeStage.id, { provider: e.target.value })}
                      className="bg-[--bg-base] h-12 text-base font-medium shadow-sm"
                    >
                      <option value="anthropic">Anthropic</option>
                      <option value="groq">Groq</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="vertex">Vertex AI</option>
                      <option value="openai">OpenAI</option>
                      <option value="ollama">Ollama (Local)</option>
                      {customProviders.map(cp => (
                        <option key={cp.id} value={cp.provider_id}>{cp.name}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-[--text-secondary] uppercase tracking-wide">Model Identifier</label>
                    <Select 
                      value={activeStage.model}
                      onChange={(e) => updateLocalStage(activeStage.id, { model: e.target.value })}
                      className="bg-[--bg-base] h-12 text-base font-medium shadow-sm"
                    >
                      {PROVIDER_MODELS[activeStage.provider]?.map(m => (
                         <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                      {customProviders.find(cp => cp.provider_id === activeStage.provider) && (
                        <option value={customProviders.find(cp => cp.provider_id === activeStage.provider)!.default_model}>
                          {customProviders.find(cp => cp.provider_id === activeStage.provider)!.default_model}
                        </option>
                      )}
                      {!PROVIDER_MODELS[activeStage.provider]?.find(m => m.id === activeStage.model) && 
                       !customProviders.find(cp => cp.provider_id === activeStage.provider && cp.default_model === activeStage.model) && (
                         <option value={activeStage.model}>{activeStage.model} (Custom)</option>
                      )}
                    </Select>
                    {activeStage.provider === 'ollama' && (
                      <Input 
                        value={activeStage.model}
                        onChange={(e) => updateLocalStage(activeStage.id, { model: e.target.value })}
                        placeholder="e.g. qwen2.5-coder:32b"
                        className="mt-3 bg-[--bg-base] h-12 text-base shadow-sm"
                      />
                    )}
                    <div className="grid gap-3 pt-1 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[--border-default] bg-[--bg-base] px-4 py-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-tertiary]">
                          Context window
                        </p>
                        <p className="mt-1.5 text-sm font-semibold text-[--text-primary]">
                          {activeStageTokenLimits?.contextWindow ?? '—'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[--border-default] bg-[--bg-base] px-4 py-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-tertiary]">
                          Max output
                        </p>
                        <p className="mt-1.5 text-sm font-semibold text-[--text-primary]">
                          {activeStageTokenLimits?.maxOutputTokens ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 col-span-1 lg:col-span-2">
                    <label className="text-sm font-bold text-[--text-secondary] uppercase tracking-wide">Custom System Prompt</label>
                    <Textarea 
                      value={activeStage.system_prompt || ''} 
                      onChange={(e) => updateLocalStage(activeStage.id, { system_prompt: e.target.value })}
                      placeholder="Insert special rules for this specific execution node (e.g. 'Use Tailwind V4 syntax and write detailed comments.')"
                      className="min-h-[140px] text-base font-mono bg-[--bg-base] shadow-inner p-4"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end pb-2">
                   <Button variant="primary" className="h-12 border-transparent bg-[--dashboard-accent] px-6 text-base font-bold text-[--dashboard-accent-contrast] shadow-md hover:bg-[--accent-hover]" onClick={() => saveStageToDB(activeStage)}>
                      <Save className="w-5 h-5 mr-2" /> Save Stage Defaults
                   </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- LIST MODE VIEW (Administration Table) ---
  const filteredPipelines = pipelines.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header Area */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between mb-2">
        <h2 className="text-3xl font-extrabold text-[--text-primary] tracking-tight">My Pipelines</h2>
        <div className="flex items-center gap-3">
          {pricingButton}
          <Button variant="primary" onClick={createPipeline} className="h-11 border-transparent bg-[--dashboard-accent] px-5 font-bold text-[--dashboard-accent-contrast] shadow-md hover:bg-[--accent-hover]">
            <Plus className="w-5 h-5 mr-2" /> New Pipeline
          </Button>
        </div>
      </div>

      {showPricingCatalog && <ProviderPricingPanel onClose={() => setShowPricingCatalog(false)} />}

      {/* Filter / Search Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 mb-2">
        <div className="flex items-center gap-3 w-full sm:w-[500px]">
          <Input 
            placeholder="Search workflows by name or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[--bg-base] w-full shadow-sm h-12 text-base font-medium"
          />
        </div>
      </div>

      {/* Main Table Layout */}
      <div className="w-full overflow-hidden rounded-[1.5rem] border border-[--border-default] bg-[--bg-base] shadow-[var(--surface-table-shadow)]">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b-2 border-[--border-default] bg-[var(--surface-plain)] dark:bg-[--bg-soft]">
                <th className="px-6 py-5 font-bold text-xs text-[--text-tertiary] uppercase tracking-widest">Name</th>
                <th className="px-6 py-5 font-bold text-xs text-[--text-tertiary] uppercase tracking-widest">Description</th>
                <th className="px-6 py-5 font-bold text-xs text-[--text-tertiary] uppercase tracking-widest">Agents / Models</th>
                <th className="px-6 py-5 font-bold text-xs text-[--text-tertiary] uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-right font-bold text-xs text-[--text-tertiary] uppercase tracking-widest min-w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPipelines.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-[--text-tertiary]">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <FileBox className="w-10 h-10 opacity-20" />
                      <p className="text-base font-medium">{searchQuery ? 'No workflows match your search query.' : 'No workflows found. Please create one.'}</p>
                      {!searchQuery && <Button variant="secondary" size="lg" className="mt-2 font-semibold" onClick={createPipeline}>Create your first Pipeline</Button>}
                    </div>
                  </td>
                </tr>
              )}
              {filteredPipelines.map((pipeline) => {
                const isExpanded = expandedRows.has(pipeline.id)

                return (
                  <React.Fragment key={pipeline.id}>
                    <tr className={`border-bottom transition-colors hover:bg-[color-mix(in_srgb,var(--bg-soft)_50%,transparent)] ${isExpanded ? 'bg-[color-mix(in_srgb,var(--bg-soft)_70%,transparent)]' : 'border-b border-[--border-default]'}`}>
                      <td className="px-6 py-5 max-w-[300px] truncate">
                        <div className="flex items-start gap-4">
                          <button onClick={() => toggleRow(pipeline.id)} className="mt-1 rounded-xl bg-[--dashboard-chip-muted] p-2 text-[--text-tertiary] transition-colors hover:text-[--dashboard-accent]">
                            <FileBox className="w-5 h-5" />
                          </button>
                          <div className="flex flex-col cursor-pointer mt-1" onClick={() => setEditingPipelineId(pipeline.id)}>
                            <span className="truncate text-base font-bold text-[--text-primary] transition-colors hover:text-[--dashboard-accent]">{pipeline.name}</span>
                            <span className="text-xs font-semibold text-[--text-tertiary] truncate mt-1 uppercase tracking-wide">
                              {pipeline.pipeline_stages?.length || 0} Stages Node
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-[--text-secondary] max-w-[280px] truncate">
                         {pipeline.description || 'No description provided.'}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center -space-x-2">
                          {pipeline.pipeline_stages?.slice(0, 4).map((stage, i) => (
                            <span key={i} title={`${stage.provider} / ${stage.model}`} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[--bg-base] text-[10px] font-extrabold z-[${10-i}] shadow-sm ${PROVIDER_COLORS[stage.provider] || PROVIDER_COLORS['ollama']}`}>
                              {PROVIDER_INITIALS[stage.provider] || 'Ol'}
                            </span>
                          ))}
                          {pipeline.pipeline_stages?.length > 4 && (
                            <span className="z-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[--bg-base] bg-[--dashboard-chip] text-[11px] font-extrabold text-[--dashboard-text-muted] shadow-sm">
                              +{pipeline.pipeline_stages.length - 4}
                            </span>
                          )}
                          {!pipeline.pipeline_stages?.length && (
                            <span className="text-sm font-medium text-[--text-tertiary] italic whitespace-nowrap pl-2">No active agents</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {pipeline.is_default ? (
                          <span className="inline-flex items-center rounded-full border border-[--dashboard-success-border] bg-[--dashboard-success-soft] px-3 py-1 text-xs font-bold text-[--dashboard-success] shadow-sm">Active Setup</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[--bg-soft] text-[--text-secondary] border border-[--border-default] font-bold px-3 py-1 text-xs">Idle Mode</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          {!pipeline.is_default && (
                            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-[--text-tertiary] hover:bg-[--dashboard-success-soft] hover:text-[--dashboard-success]" title="Set Active" onClick={() => updatePipeline(pipeline.id, { is_default: true })}>
                              <Check className="w-5 h-5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className={`h-10 w-10 rounded-xl ${isExpanded ? 'bg-[--dashboard-accent-soft] text-[--dashboard-accent]' : 'text-[--text-tertiary] hover:bg-[--dashboard-accent-soft] hover:text-[--dashboard-accent]'}`} title="Preview Stages" onClick={() => toggleRow(pipeline.id)}>
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-[--text-tertiary] hover:bg-[--bg-elevated] hover:text-[--text-primary] rounded-xl" title="Edit Properties" onClick={() => setEditingPipelineId(pipeline.id)}>
                            <Edit3 className="w-5 h-5" />
                          </Button>
                          <Button size="icon" variant="ghost" disabled={pipeline.is_default} className="h-10 w-10 rounded-xl text-[--text-tertiary] hover:bg-[--dashboard-danger-soft] hover:text-[--dashboard-danger] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[--text-tertiary]" title="Delete" onClick={() => deletePipeline(pipeline.id)}>
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expandable Waterfall Preview Row */}
                    {isExpanded && (
                       <tr className="border-b-2 border-[--border-default] bg-[var(--surface-plain)] shadow-inner dark:bg-[color-mix(in_srgb,var(--bg-soft)_90%,transparent)]">
                         <td colSpan={5} className="px-8 py-8">
                            <div className="flex flex-col gap-5">
                              <h5 className="text-sm font-extrabold uppercase tracking-widest text-[--text-tertiary]">Workflow Path:</h5>
                              <WaterfallGraph stages={pipeline.pipeline_stages} />
                              <div className="mt-2">
                                <Button size="sm" variant="secondary" onClick={() => setEditingPipelineId(pipeline.id)} className="h-10 border-[--border-default] bg-[--dashboard-chip] px-4 text-sm font-bold shadow-sm hover:border-[--dashboard-accent-border] hover:bg-[--dashboard-accent-soft] hover:text-[--dashboard-accent]">
                                  Configure This Logic <ChevronRight className="w-4 h-4 ml-1.5" />
                                </Button>
                              </div>
                            </div>
                         </td>
                       </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
