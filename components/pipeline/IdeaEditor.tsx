'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Lightbulb, Plus, ArrowRight, Copy, Check, ClipboardPaste } from 'lucide-react'
import { buildEnrichPrompt, buildGenPrompt, CODE_GEN_SYSTEM_PROMPT } from '@/lib/pipeline/prompts'
import AssetPreview from '@/components/assets/AssetPreview'
import StatusDot from '@/components/ui/StatusDot'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import StageStrip, { type PipelineStage, type StageState } from './StageStrip'
import type { Idea } from '@/types/pipeline'
import clsx from 'clsx'

const IDEA_TEMPLATES = {
  animation: {
    name: '',
    type: 'hover',
    category: 'animation',
    tech: ['Tailwind', 'Framer Motion'],
    complexity: 'medium',
    feel: '',
  },
  component: {
    name: '',
    type: 'ui',
    category: 'component',
    tech: ['Tailwind', 'React'],
    complexity: 'medium',
    feel: '',
  },
  template: {
    name: '',
    type: 'landing-page',
    category: 'template',
    tech: ['Tailwind', 'React'],
    complexity: 'medium',
    feel: '',
  },
} as const

type IdeaTemplateKey = keyof typeof IDEA_TEMPLATES

function formatIdeaTemplate(template: IdeaTemplateKey) {
  return JSON.stringify(IDEA_TEMPLATES[template], null, 2)
}

const ENRICH_STAGES: PipelineStage[] = [
  { key: 'enrich', label: 'Enrich', state: 'pending' },
  { key: 'done', label: 'Done', state: 'pending' },
]

const GENERATE_STAGES: PipelineStage[] = [
  { key: 'generate', label: 'Generate', state: 'pending' },
  { key: 'validate', label: 'Validate', state: 'pending' },
  { key: 'fix', label: 'Fix', state: 'pending' },
  { key: 'done', label: 'Done', state: 'pending' },
]

interface IdeaEditorProps {
  aiMode?: 'claude' | 'gemini' | 'groq' | 'ollama' | 'manual'
}

export default function IdeaEditor({ aiMode = 'claude' }: IdeaEditorProps) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [newIdeaPreset, setNewIdeaPreset] = useState<IdeaTemplateKey>('animation')
  const [newIdea, setNewIdea] = useState(formatIdeaTemplate('animation'))
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [manualStep, setManualStep] = useState<'idle' | 'enrich' | 'generate'>('idle')
  const [manualPrompt, setManualPrompt] = useState('')
  const [manualPaste, setManualPaste] = useState('')
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { addToast } = useToast()

  const isManual = aiMode === 'manual'

  function applyIdeaTemplate(template: IdeaTemplateKey) {
    setNewIdeaPreset(template)
    setNewIdea(formatIdeaTemplate(template))
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    addToast({ type: 'success', title: 'Copied!', description: 'Prompt copied to clipboard. Paste it into any AI.' })
    setTimeout(() => setCopied(false), 2000)
  }

  function handleManualEnrich() {
    if (!selectedIdea) return
    const input = JSON.stringify({
      name: selectedIdea.name, type: selectedIdea.type, category: selectedIdea.category,
      tech: selectedIdea.tech, complexity: selectedIdea.complexity, feel: selectedIdea.feel
    })
    const prompt = buildEnrichPrompt(input)
    setManualStep('enrich')
    setManualPrompt(prompt)
    setManualPaste('')
    copyToClipboard(prompt)
  }

  function handleManualGenerate() {
    if (!selectedIdea) return
    const spec = selectedIdea.enriched_spec
    if (!spec) {
      addToast({ type: 'error', title: 'No spec', description: 'Enrich the idea first' })
      return
    }
    const prompt = CODE_GEN_SYSTEM_PROMPT + '\n\n' + buildGenPrompt(JSON.stringify(spec, null, 2))
    setManualStep('generate')
    setManualPrompt(prompt)
    setManualPaste('')
    copyToClipboard(prompt)
  }

  async function handleManualSave() {
    if (!selectedIdea || !manualPaste.trim()) return
    setLoading(true)

    if (manualStep === 'enrich') {
      // Parse the enriched spec and save it
      try {
        const cleaned = manualPaste.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        const json = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned
        const spec = JSON.parse(json)

        const res = await fetch('/api/pipeline/ideas', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedIdea.id, status: 'enriched', enriched_spec: spec })
        })
        const data = await res.json()
        if (data.ok) {
          addToast({ type: 'success', title: 'Enriched', description: 'Spec saved successfully' })
          setManualStep('idle')
          setManualPrompt('')
          setManualPaste('')
          await refreshIdeas()
        } else {
          addToast({ type: 'error', title: 'Save failed', description: data.error })
        }
      } catch {
        addToast({ type: 'error', title: 'Invalid JSON', description: 'The pasted response is not valid JSON' })
      }
    } else if (manualStep === 'generate') {
      // Clean and save the generated code
      const code = manualPaste
        .replace(/^```(?:tsx?|jsx?|javascript|typescript)?\n?/m, '')
        .replace(/```$/m, '')
        .trim()

      // Save to DB
      const res = await fetch('/api/pipeline/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedIdea.id, status: 'reviewing', generated_code: code })
      })
      const data = await res.json()
      if (data.ok) {
        setGeneratedCode(code)
        addToast({ type: 'success', title: 'Saved', description: 'Code saved — check the preview below or go to Review tab' })
        setManualStep('idle')
        setManualPrompt('')
        setManualPaste('')
        await refreshIdeas()
      } else {
        addToast({ type: 'error', title: 'Save failed', description: data.error })
      }
    }
    setLoading(false)
  }

  const refreshIdeas = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/ideas', { cache: 'no-store' })
      const data = await res.json()
      const nextIdeas = Array.isArray(data.ideas) ? data.ideas as Idea[] : []
      setIdeas(nextIdeas)
      setSelectedIdea(prev => prev ? nextIdeas.find(idea => idea.id === prev.id) ?? prev : prev)
    } catch {
      addToast({ type: 'error', title: 'Load failed', description: 'Could not refresh ideas' })
    }
  }, [addToast])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshIdeas()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [refreshIdeas])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  function setStageState(key: string, state: StageState) {
    setStages(prev => prev.map(stage => stage.key === key ? { ...stage, state } : stage))
  }

  function markActiveStageAsError(message: string) {
    setStages(prev => prev.map(stage =>
      stage.state === 'active' ? { ...stage, state: 'error' as StageState } : stage
    ))
    setErrorMsg(message)
  }

  function clearStageFeedback() {
    setStages([])
    setStatusMsg('')
    setErrorMsg('')
  }

  async function addIdea() {
    setLoading(true)
    try {
      const parsed = JSON.parse(newIdea)
      const res = await fetch('/api/pipeline/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      const data = await res.json()
      if (data.error) {
        addToast({ type: 'error', title: 'Error', description: data.error })
      } else {
        addToast({ type: 'success', title: 'Added', description: `${data.ideas?.length ?? 1} idea(s) added` })
        setNewIdea(formatIdeaTemplate(newIdeaPreset))
        setShowAdd(false)
        await refreshIdeas()
      }
    } catch {
      addToast({ type: 'error', title: 'Invalid JSON', description: 'Check your JSON syntax' })
    }
    setLoading(false)
  }

  async function handleEnrich() {
    if (!selectedIdea || isRunning) return

    setIsRunning(true)
    setErrorMsg('')
    setStatusMsg('Connecting...')
    setStages(ENRICH_STAGES.map(stage => ({ ...stage, state: 'pending' as StageState })))
    setGeneratedCode('')
    abortRef.current = new AbortController()

    window.setTimeout(() => setStageState('enrich', 'active'), 0)

    try {
      const response = await fetch('/api/pipeline/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: selectedIdea.id, mode: aiMode }),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
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
          if (!line.startsWith('data: ')) continue

          let payload: Record<string, unknown>
          try {
            payload = JSON.parse(line.slice(6)) as Record<string, unknown>
          } catch {
            continue
          }

          if (payload.event === 'status') {
            setStatusMsg(String(payload.message ?? 'Working...'))
          }

          if (payload.event === 'enriched') {
            setStageState('enrich', 'complete')
            setStageState('done', 'complete')
            setStatusMsg(String(payload.message ?? 'Spec complete'))

            const nextSpec = payload.spec as Idea['enriched_spec']
            setSelectedIdea(prev => prev
              ? { ...prev, enriched_spec: nextSpec, status: 'enriched' }
              : prev
            )
            await refreshIdeas()
            addToast({ type: 'success', title: 'Enriched', description: `${selectedIdea.name} spec ready` })
          }

          if (payload.event === 'error') {
            setStageState('enrich', 'error')
            setErrorMsg(String(payload.message ?? 'Enrich failed'))
            addToast({ type: 'error', title: 'Enrich failed', description: String(payload.message ?? 'Unknown error') })
          }
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      if (error.name !== 'AbortError') {
        setStageState('enrich', 'error')
        setErrorMsg(error.message)
        addToast({ type: 'error', title: 'Error', description: error.message })
      }
    } finally {
      setIsRunning(false)
      abortRef.current = null
    }
  }

  async function handleGenerate() {
    if (!selectedIdea || isRunning) return

    let usedFixStage = false

    setIsRunning(true)
    setErrorMsg('')
    setStatusMsg('Connecting...')
    setStages(GENERATE_STAGES.map(stage => ({ ...stage, state: 'pending' as StageState })))
    setGeneratedCode('')
    abortRef.current = new AbortController()

    window.setTimeout(() => setStageState('generate', 'active'), 0)

    try {
      const response = await fetch('/api/pipeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: selectedIdea.id, mode: aiMode }),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
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
          if (!line.startsWith('data: ')) continue

          let payload: Record<string, unknown>
          try {
            payload = JSON.parse(line.slice(6)) as Record<string, unknown>
          } catch {
            continue
          }

          if (payload.event === 'status') {
            setStatusMsg(String(payload.message ?? 'Working...'))

            if (payload.stage === 'generating') {
              setStageState('generate', 'active')
            }

            if (payload.stage === 'validating') {
              setStageState('generate', 'complete')
              setStageState('validate', 'active')
            }
          }

          if (payload.event === 'generated') {
            const code = String(payload.code ?? '')
            if (code) setGeneratedCode(code)
            setStatusMsg(`Code generated — ${code.split('\n').length} lines`)
          }

          if (payload.event === 'validated') {
            const code = String(payload.code ?? '')
            if (code) setGeneratedCode(code)

            if (payload.has_errors) {
              usedFixStage = true
              setStageState('validate', 'complete')
              setStageState('fix', 'active')
              setStatusMsg('Auto-fixing validation errors...')
            } else {
              setStageState('validate', 'complete')
              setStatusMsg('Validation passed')
            }
          }

          if (payload.event === 'ready') {
            if (usedFixStage) {
              setStageState('fix', 'complete')
            }
            setStageState('done', 'complete')
            setStatusMsg('Ready for review — check the Review tab')

            const code = String(payload.code ?? '')
            if (code) setGeneratedCode(code)

            setSelectedIdea(prev => prev
              ? { ...prev, status: 'reviewing' }
              : prev
            )
            await refreshIdeas()
            addToast({ type: 'success', title: 'Generated', description: `${selectedIdea.name} ready for review` })
          }

          if (payload.event === 'error') {
            const message = String(payload.message ?? 'Generation failed')
            markActiveStageAsError(message)
            addToast({ type: 'error', title: 'Generation failed', description: message })
          }
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      if (error.name !== 'AbortError') {
        markActiveStageAsError(error.message)
        addToast({ type: 'error', title: 'Error', description: error.message })
      }
    } finally {
      setIsRunning(false)
      abortRef.current = null
    }
  }

  return (
    <div className="grid min-h-[520px] grid-cols-5 gap-8">
      <div className="col-span-2 flex flex-col gap-3">
        <input
          type="text"
          placeholder="Filter ideas..."
          className="surface-panel-muted h-10 rounded-2xl px-4 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--accent-border] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
        />

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {ideas.map(idea => (
            <button
              key={idea.id}
              onClick={() => { setSelectedIdea(idea); setShowAdd(false); setGeneratedCode((idea as Idea & { generated_code?: string }).generated_code ?? ''); clearStageFeedback() }}
              className={clsx(
                'flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition-all duration-200',
                selectedIdea?.id === idea.id
                  ? 'border-[--accent-border] bg-[--accent-dim] shadow-[var(--shadow-soft)]'
                  : 'border-transparent bg-[--bg-soft] hover:border-[--border-default] hover:bg-[--bg-hover]'
              )}
            >
              <StatusDot status={idea.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[--text-primary]">{idea.name}</p>
                <p className="text-[11px] text-[--text-tertiary]">{idea.category}</p>
              </div>
              {idea.status === 'pending' && (
                <ArrowRight className="h-3.5 w-3.5 text-[--text-disabled]" />
              )}
            </button>
          ))}
          {ideas.length === 0 && !showAdd && (
            <EmptyState
              icon={<Lightbulb className="h-6 w-6" />}
              title="Ideas backlog is empty"
              description="Add ideas to get started. A name and feel is enough."
            />
          )}
        </div>

        <Button variant="accent" className="w-full" onClick={() => { setShowAdd(true); setSelectedIdea(null); setGeneratedCode(''); clearStageFeedback() }}>
          <Plus className="h-4 w-4" />
          Add ideas
        </Button>
      </div>

      <div className="col-span-3">
        {showAdd ? (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--text-secondary]">Add ideas (JSON object or array)</p>
                <p className="mt-1 text-xs text-[--text-tertiary]">
                  Pick a starter for animation, component, or template.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(IDEA_TEMPLATES) as IdeaTemplateKey[]).map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => applyIdeaTemplate(template)}
                  className={clsx(
                    'rounded-full border px-3 py-2 text-xs capitalize transition-colors',
                    newIdeaPreset === template
                      ? 'border-[--accent-border] bg-[--accent-dim] text-[--accent-text]'
                      : 'border-[--border-default] bg-[--bg-soft] text-[--text-secondary] hover:text-[--text-primary]'
                  )}
                >
                  {template}
                </button>
              ))}
            </div>
            <textarea
              value={newIdea}
              onChange={e => setNewIdea(e.target.value)}
              className="surface-panel-muted h-72 w-full resize-y rounded-[28px] p-5 font-mono text-sm leading-relaxed text-[--text-primary] focus:border-[--accent-border] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
            />
            <Button variant="accent" loading={loading} onClick={addIdea}>
              Add to backlog
            </Button>
          </div>
        ) : selectedIdea ? (
          <div className="animate-fade-in space-y-6">
            <div className="surface-panel rounded-[28px] p-6">
              <h2 className="text-xl font-semibold text-[--text-primary]">{selectedIdea.name}</h2>
              <div className="mt-2 flex items-center gap-3">
                <StatusDot status={selectedIdea.status} />
                <span className="text-sm capitalize text-[--text-tertiary]">{selectedIdea.status}</span>
                <span className="text-sm text-[--text-disabled]">&middot;</span>
                <span className="text-sm text-[--text-tertiary]">{selectedIdea.category}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Category', value: selectedIdea.category },
                { label: 'Status', value: selectedIdea.status },
                { label: 'Type', value: selectedIdea.type },
                { label: 'Complexity', value: selectedIdea.complexity },
              ].map(item => (
                <div key={item.label} className="surface-panel-muted rounded-[22px] p-4">
                  <p className="mb-1 text-xs text-[--text-tertiary]">{item.label}</p>
                  <p className="text-sm capitalize text-[--text-primary]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {isManual ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={handleManualEnrich}
                    disabled={!selectedIdea}
                    className="h-9 flex-1 flex items-center justify-center gap-2 rounded-lg border border-[--border-default] bg-[--bg-soft] px-4 text-xs font-mono text-[--text-secondary] transition-all duration-150 hover:border-[--accent-border] hover:text-[--text-primary] active:scale-[0.98]"
                  >
                    {copied && manualStep === 'enrich' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy Enrich Prompt
                  </button>
                  <button
                    onClick={handleManualGenerate}
                    disabled={!selectedIdea?.enriched_spec}
                    className="h-9 flex-1 flex items-center justify-center gap-2 rounded-lg border border-[--dashboard-success-border] bg-[--dashboard-success] px-4 text-xs font-mono font-semibold text-[--dashboard-success-contrast] transition-all duration-150 hover:bg-[--dashboard-success] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {copied && manualStep === 'generate' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy Generate Prompt
                  </button>
                </div>

                {manualStep !== 'idle' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-[--dashboard-success]">
                        {manualStep === 'enrich' ? '1. Prompt copied → paste into any AI → paste response below' : '2. Prompt copied → paste into any AI → paste code below'}
                      </p>
                      <button
                        onClick={() => copyToClipboard(manualPrompt)}
                        className="text-[10px] font-mono text-[--text-tertiary] hover:text-[--text-primary] transition-colors"
                      >
                        re-copy
                      </button>
                    </div>
                      <textarea
                        value={manualPaste}
                      onChange={e => setManualPaste(e.target.value)}
                      placeholder={manualStep === 'enrich'
                        ? 'Paste the AI\'s JSON response here...'
                        : 'Paste the AI\'s generated code here...'
                      }
                        className="surface-panel-muted h-48 w-full resize-y rounded-[22px] p-4 text-[13px] font-mono text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--dashboard-success-border] focus:outline-none focus:shadow-[0_0_0_3px_var(--tone-success-ring)]"
                      />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setManualStep('idle'); setManualPrompt(''); setManualPaste('') }}
                        className="h-9 rounded-lg border border-[--border-default] bg-[--bg-soft] px-4 text-xs font-mono text-[--text-secondary] hover:border-[--accent-border] hover:text-[--text-primary] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleManualSave}
                        disabled={!manualPaste.trim() || loading}
                        className="h-9 flex-1 flex items-center justify-center gap-2 rounded-lg border border-[--dashboard-success-border] bg-[--dashboard-success] px-4 text-xs font-mono font-semibold text-[--dashboard-success-contrast] transition-all duration-150 hover:bg-[--dashboard-success] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ClipboardPaste className="h-3 w-3" />
                        {loading ? 'Saving...' : manualStep === 'enrich' ? 'Save Spec' : 'Save Code & Preview'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={handleEnrich}
                    disabled={isRunning || !selectedIdea}
                    className={`
                      h-9 flex-1 rounded-lg border px-4 text-xs font-mono transition-all duration-150 active:scale-[0.98]
                      ${isRunning
                        ? 'cursor-not-allowed border-[--border-subtle] bg-[--bg-soft] text-[--text-disabled]'
                        : 'border-[--border-default] bg-[--bg-soft] text-[--text-secondary] hover:border-[--accent-border] hover:text-[--text-primary]'
                      }
                    `}
                  >
                    {isRunning && stages[0]?.key === 'enrich' && stages[0]?.state === 'active'
                      ? 'Enriching…'
                      : 'Enrich with AI'
                    }
                  </button>

                  <button
                    onClick={handleGenerate}
                    disabled={isRunning || !selectedIdea}
                    className={`
                      h-9 flex-1 rounded-lg px-4 text-xs font-mono font-semibold transition-all duration-150 active:scale-[0.98]
                      ${isRunning
                        ? 'cursor-not-allowed bg-[--accent-dim] text-[color-mix(in_srgb,var(--accent)_45%,transparent)]'
                        : 'bg-[--accent] text-[--accent-contrast] hover:bg-[--accent-hover]'
                      }
                    `}
                  >
                    {isRunning && stages.some(stage => stage.state === 'active')
                      ? 'Running…'
                      : 'Generate code'
                    }
                  </button>
                </div>

                {stages.length > 0 && (
                  <div className="pt-1">
                    <StageStrip
                      stages={stages}
                      currentMessage={statusMsg}
                      isRunning={isRunning}
                      errorMessage={errorMsg}
                    />
                  </div>
                )}

                {!isRunning && stages.length > 0 && (
                  <button
                    onClick={clearStageFeedback}
                    className="w-full py-1 text-[10px] font-mono text-[--text-tertiary] transition-colors hover:text-[--accent]"
                  >
                    clear
                  </button>
                )}
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="surface-panel-muted rounded-[24px] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[--text-tertiary]">Enriched spec</p>
                  {selectedIdea.enriched_spec && (
                    <span className="text-[10px] font-mono text-[--accent-secondary-text]">inline preview</span>
                  )}
                </div>
                {selectedIdea.enriched_spec ? (
                  <pre className="max-h-[360px] overflow-auto rounded-[18px] bg-[--bg-elevated] p-4 text-[11px] leading-relaxed text-[--text-secondary]">
                    <code>{JSON.stringify(selectedIdea.enriched_spec, null, 2)}</code>
                  </pre>
                ) : (
                  <p className="text-sm text-[--text-tertiary]">Enriched spec will appear here after the Enrich stage completes.</p>
                )}
              </div>

              <div className="surface-panel-muted rounded-[24px] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[--text-tertiary]">Generated code</p>
                  {generatedCode && (
                    <span className="text-[10px] font-mono text-[--accent-secondary-text]">{generatedCode.split('\n').length} lines</span>
                  )}
                </div>
                {generatedCode ? (
                  <AssetPreview slug={`idea-${selectedIdea.id}`} code={generatedCode} height={280} showCode />
                ) : (
                  <p className="text-sm text-[--text-tertiary]">Generated component code will appear here after the pipeline reaches Done.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[--text-tertiary]">Select an idea to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
