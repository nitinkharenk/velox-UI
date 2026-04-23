'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, CheckCircle2, Play, Settings2, Terminal, ExternalLink, RefreshCcw, Loader2, XCircle, ClipboardCopy, Check, Box, Gauge, Wind, ScrollText, Cpu, Edit3, Layers, Code2, PenTool, Wand2, Zap } from 'lucide-react'
import DashboardPageFrame from '@/components/dashboard/DashboardPageFrame'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/Toast'
import LogTerminal from '@/components/pipeline/LogTerminal'
import type { LogEntry, PipelineEvent, LogStage, LogLevel } from '@/types/pipeline'

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

type StudioState = 'loading' | 'selecting_pipeline' | 'briefing' | 'executing' | 'completed'

interface Pipeline {
  id: string
  name: string
  is_default: boolean
  pipeline_stages: any[]
}

export default function ForgePage() {
  const [state, setState] = useState<StudioState>('loading')
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [showEngineSelector, setShowEngineSelector] = useState(false)

  // Idea Form State
  const [idea, setIdea] = useState({
    name: '',
    format: 'component' as 'component' | 'section' | 'template' | 'page',
    type: 'hover',
    category: 'animation',
    tech: ['Framer Motion', 'Tailwind CSS'],
    complexity: 'standard' as 'micro' | 'standard' | 'complex',
    feel: 'fluid' as string,
    theme: 'dark' as string,
    prompt: ''
  })

  // Execution State
  const [runningIdeaId, setRunningIdeaId] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [currentAttempt, setCurrentAttempt] = useState<number | undefined>(undefined)
  const [cumulativeUsage, setCumulativeUsage] = useState({ input: 0, output: 0 })
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [viewLog, setViewLog] = useState(false)
  const [copyingLog, setCopyingLog] = useState(false)

  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  useEffect(() => {
    // Fetch available pipelines
    fetch('/api/pipeline/workflows')
      .then(r => r.json())
      .then(d => {
        setPipelines(d.pipelines || [])
        const def = (d.pipelines || []).find((p: any) => p.is_default)
        if (def) {
          setSelectedPipeline(def)
          setState('briefing')
        } else {
          setState('briefing')
          setShowEngineSelector(true)
        }
      })
      .catch(() => {
        setState('briefing')
        setShowEngineSelector(true)
      })
  }, [])

  const startForge = () => {
    if (selectedPipeline) setState('briefing')
    else setState('selecting_pipeline')
  }

  const handleRunPipeline = async () => {
    if (!idea.name || !idea.prompt) {
      return toast.error('Missing Brief', 'Please provide a name and a prompt description.')
    }

    setLogs([makeLog('SYSTEM', 'system', 'Preparing Forge production line...')])
    setCurrentStageIndex(0)
    setCurrentAttempt(undefined)
    setCumulativeUsage({ input: 0, output: 0 })
    setState('executing')

    // Join personalities into a comma-separated string for the pipeline
    const payload = {
      ...idea,
      feel: idea.feel,
      theme: idea.theme,
      pipeline_id: selectedPipeline?.id
    }

    await runExecutionRail(null, null, payload)
  }

  const handleRerunStage = async (action: string) => {
    if (!runningIdeaId) return
    setState('executing')
    await runExecutionRail(runningIdeaId, action)
  }

  const handleCopyFullLog = async () => {
    if (logs.length === 0) return
    setCopyingLog(true)

    const ideaNameValue = idea.name || 'Pipeline Run'
    let report = `VELOX AI STUDIO - PIPELINE EXECUTION REPORT\n`
    report += `Idea: ${ideaNameValue}\n`
    report += `Date: ${new Date().toLocaleString()}\n`
    report += `Total Stages: ${logs.filter(l => l.level === 'success').length}\n`
    report += `Total Usage: ${cumulativeUsage.input.toLocaleString()} IN / ${cumulativeUsage.output.toLocaleString()} OUT\n`
    report += `================================================================================\n\n`

    logs.forEach((log, index) => {
      const stepLabel = `STEP ${index + 1}: [${log.stage}]`
      report += `${stepLabel}\n`
      report += `Time: ${log.ts}\n`
      report += `Level: ${log.level.toUpperCase()}\n`
      report += `Message: ${log.message}\n`

      if (log.detail) {
        report += `Detail: ${log.detail}\n`
      }

      if (log.input) {
        try {
          const parsed = JSON.parse(log.input)
          report += `Input Payload:\n${JSON.stringify(parsed, null, 2)}\n`
        } catch {
          report += `Input Payload: ${log.input}\n`
        }
      }

      if (log.output) {
        try {
          const parsed = JSON.parse(log.output)
          report += `Output Payload:\n${JSON.stringify(parsed, null, 2)}\n`
        } catch {
          report += `Output Payload: ${log.output}\n`
        }
      }

      report += `--------------------------------------------------------------------------------\n\n`
    })

    await navigator.clipboard.writeText(report)
    setTimeout(() => setCopyingLog(false), 2000)
    toast.success('Log Copied', 'Full pipeline flow copied to clipboard.')
  }

  const runExecutionRail = async (existingId: string | null, resumeFromAction: string | null, customPayload?: any) => {
    let currentId = existingId

    try {
      if (!currentId) {
        // 1. Create Idea
        const ideaRes = await fetch('/api/pipeline/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customPayload || { ...idea, pipeline_id: selectedPipeline?.id })
        })
        const ideaData = await ideaRes.json()
        if (!ideaRes.ok) throw new Error(ideaData.error || 'Failed to create idea')

        currentId = ideaData.ideas[0].id
        setRunningIdeaId(currentId)
      }

      // 2. Start SSE Stream
      const sseUrl = `/api/pipeline/generate?ideaId=${currentId}${resumeFromAction ? `&resumeFromAction=${resumeFromAction}` : ''}`
      const response = await fetch(sseUrl, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
      })

      if (!response.ok || !response.body) {
        throw new Error(`Failed to start pipeline stream (HTTP ${response.status})`)
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
            const data = JSON.parse(jsonStr) as PipelineEvent

            // Update cumulative usage tracking
            if (data.usage) {
              setCumulativeUsage(data.usage)
            }

            if (data.event === 'status') {
              const progressIdx = (selectedPipeline?.pipeline_stages || []).findIndex(s => s.action_type.includes(data.stage))
              if (progressIdx !== -1) setCurrentStageIndex(progressIdx)
              if (data.attempt) setCurrentAttempt(data.attempt)

              setLogs(prev => [...prev, {
                ...makeLog(stageFromStatus(data.stage), 'info', data.message, idea.name),
                input: (data as any).input,
                output: (data as any).output,
                attempt: data.attempt,
                isFatal: (data as any).isFatal,
                action: data.stage === 'validating' ? 'validate_code' : undefined
              }])
            } else if (data.event === 'enriched') {
              setCurrentStageIndex(1)
              setLogs(prev => [...prev, {
                ...makeLog('ENRICH', 'success', 'Spec enriched successfully', idea.name),
                input: (data as any).input,
                output: (data as any).output
              }])
            } else if (data.event === 'generated') {
              setCurrentStageIndex(2)
              setLogs(prev => [...prev, {
                ...makeLog('GEN', 'success', 'React code generated', idea.name),
                input: (data as any).input,
                output: (data as any).output
              }])
            } else if (data.event === 'validated') {
              setLogs(prev => [...prev, {
                ...makeLog(
                  (data as any).has_errors ? 'FIX' : 'VALID',
                  (data as any).has_errors ? 'warning' : 'success',
                  (data as any).has_errors ? 'Validation found issues - attempting fix' : 'Validation passed',
                  idea.name,
                  (data as any).validation_notes
                ),
                isFatal: (data as any).isFatal,
                action: (data as any).has_errors ? 'validate_code' : undefined,
                input: (data as any).input,
                output: (data as any).output
              }])
            } else if (data.event === 'ready') {
              setLogs(prev => [...prev, makeLog('DONE', 'success', 'Moved to review queue', idea.name)])
              setGeneratedCode((data as any).code)
              setState('completed')
              toast.success('Forging Complete', 'Component is ready for review.')
              // Close via loop break
            } else if (data.event === 'repair_required') {
              const errorMsg = (data as any).issues?.[0]?.message || 'Validation failed after maximum repair attempts'
              setLogs(prev => [...prev, makeLog('ERROR', 'error', 'Failed validation', idea.name, errorMsg)])
              toast.error('Pipeline Blocked', 'Component requires manual repair due to validation failures.')
              // We don't automatically exit executing state so user can read logs
            } else if (data.event === 'error') {
              setLogs(prev => [...prev, makeLog('ERROR', 'error', (data as any).message, idea.name)])
              toast.error('Pipeline Failed', (data as any).message)
              // We don't change state back to briefing automatically, user can inspect logs first
            }
          } catch (e) {
            console.warn('SSE Parse Error:', e, jsonStr)
          }
        }
      }

    } catch (err: any) {
      toast.error('Start Failed', err.message)
      setLogs(prev => [...prev, makeLog('ERROR', 'error', err.message)])
    }
  }

  const toggleTech = (t: string) => {
    setIdea(prev => ({
      ...prev,
      tech: prev.tech.includes(t)
        ? prev.tech.filter(item => item !== t)
        : [...prev.tech, t]
    }))
  }

  const toggleFeel = (f: string) => {
    // Single-select (radio) behavior — clicking a different value switches to it.
    // Clicking the same value keeps it selected (feel must always have a value).
    setIdea(prev => ({ ...prev, feel: f }))
  }

  return (
    <DashboardPageFrame
      title="The Forge"
      hideHeader
    >
      <div className="relative min-h-screen overflow-hidden bg-white dark:bg-black transition-colors duration-500">
        {/* ════════════════════════════════════════════════════════
            BENTO GRID BACKGROUND & DEPTH ELEMENTS
        ════════════════════════════════════════════════════════ */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Fine Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
          
          {/* Structural "Bento" Lines */}
          <div className="absolute inset-0">
            {/* Vertical Lines */}
            <div className="absolute top-0 left-[15%] w-px h-full bg-gray-200 dark:bg-white/10" />
            <div className="absolute top-0 left-[85%] w-px h-full bg-gray-200 dark:bg-white/10" />
            
            {/* Horizontal Lines */}
            <div className="absolute top-[25%] left-0 w-full h-px bg-gray-200 dark:bg-white/10" />
            <div className="absolute top-[75%] left-0 w-full h-px bg-gray-200 dark:bg-white/10" />

            {/* Glowing Intersections */}
            <div className="absolute top-[25%] left-[15%] w-[3px] h-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 shadow-[0_0_12px_2px_rgba(139,92,246,0.8)]" />
            <div className="absolute top-[25%] left-[85%] w-[3px] h-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 shadow-[0_0_12px_2px_rgba(139,92,246,0.8)]" />
            <div className="absolute top-[75%] left-[15%] w-[3px] h-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 shadow-[0_0_12px_2px_rgba(139,92,246,0.8)]" />
            <div className="absolute top-[75%] left-[85%] w-[3px] h-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 shadow-[0_0_12px_2px_rgba(139,92,246,0.8)]" />
          </div>

          {/* Depth Glows */}
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 dark:bg-violet-500/10 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative mx-auto max-w-[1200px] py-12 px-6">
        <AnimatePresence mode="wait">
          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-32"
            >
              <Loader2 className="h-8 w-8 animate-spin text-[--accent]" />
            </motion.div>
          )}



          {state === 'briefing' && (
            <motion.div
              key="brief"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-violet-500/10 text-[#8B5CF6] border border-violet-500/20">
                    <Box className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-[--text-primary]">Blueprint Studio</h3>
                    <p className="text-[--text-secondary] font-medium">Configure properties for: <span className="font-bold text-[#8B5CF6]">{selectedPipeline?.name}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3 relative">
                  <button
                    onClick={() => setShowEngineSelector(!showEngineSelector)}
                    className="rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5 px-6 h-11 text-[10px] font-mono font-black uppercase tracking-widest text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 transition-all"
                  >
                    {showEngineSelector ? 'Close Selector' : 'Change Engine'}
                  </button>

                  <AnimatePresence>
                    {showEngineSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-14 right-0 z-50 w-[350px] p-4 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black shadow-2xl backdrop-blur-3xl"
                      >
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                          {pipelines.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedPipeline(p)
                                setShowEngineSelector(false)
                              }}
                              className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${selectedPipeline?.id === p.id
                                  ? 'bg-violet-500/10 border border-violet-500/20'
                                  : 'hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                                }`}
                            >
                              <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border ${selectedPipeline?.id === p.id ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400'}`}>
                                <Cpu className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-xs text-gray-900 dark:text-white truncate">{p.name}</h4>
                                <p className="text-[9px] font-mono font-bold uppercase text-gray-400">{p.pipeline_stages.length} Stages</p>
                              </div>
                              {p.is_default && (
                                <div className="ml-auto h-2 w-2 rounded-full bg-violet-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative h-11"
                  >
                    <div className="absolute inset-0 bg-violet-600 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={handleRunPipeline}
                      className="relative h-full rounded-xl px-8 text-[10px] font-mono font-black uppercase tracking-[0.2em] bg-[#8B5CF6] shadow-lg group overflow-hidden border border-white/20 text-white"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                      <span className="relative z-10">Commit and Forge</span>
                      <ArrowRight className="relative z-10 ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </motion.div>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
                {/* ════════════════════════════════════════════════════════
                    LEFT — BLUEPRINT CONFIGURATION
                ════════════════════════════════════════════════════════ */}
                <div className="relative p-10 rounded-[3rem] space-y-12 overflow-hidden border border-gray-200/50 dark:border-white/10 bg-white/40 dark:bg-black/20 shadow-2xl backdrop-blur-3xl">
                  {/* Subtle inner glow and gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                  <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/20 to-transparent pointer-events-none" />

                  {/* Format Selector */}
                  <div className="relative space-y-5">
                    <div className="flex items-center gap-3">
                      <Box className="h-4 w-4 text-[#8B5CF6]" />
                      <label className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Asset Format</label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'component', label: 'Comp' },
                        { id: 'section', label: 'Section' },
                        { id: 'template', label: 'Templ' },
                        { id: 'page', label: 'Page' }
                      ].map(f => (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={f.id}
                          onClick={() => setIdea(prev => ({ ...prev, format: f.id as any }))}
                          className={`relative h-12 rounded-2xl text-[10px] font-mono font-black uppercase tracking-widest transition-all duration-300 overflow-hidden ${idea.format === f.id
                              ? 'text-white border-transparent'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/60 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                          {idea.format === f.id && (
                              <motion.div
                                layoutId="format-bg"
                                className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6] to-violet-600"
                                initial={false}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                              />
                          )}
                          <span className="relative z-10">{f.label}</span>
                        </motion.button>
                      ))}
                    </div>
                    {(idea.format === 'template' || idea.format === 'page') && (
                      <p className="text-xs text-orange-400 font-medium">
                        Templates generate more code and may take 2-3x longer
                      </p>
                    )}
                  </div>

                  {/* Complexity & Physics */}
                  <div className="relative space-y-12">
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <Gauge className="h-4 w-4 text-[#8B5CF6]" />
                        <label className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Logical Weight</label>
                      </div>
                      <div className="relative flex gap-2 rounded-2xl bg-gray-100 dark:bg-black/40 p-2 border border-gray-200 dark:border-white/10 shadow-inner">
                        {['micro', 'standard', 'complex'].map(c => (
                          <button
                            key={c}
                            onClick={() => setIdea(prev => ({ ...prev, complexity: c as any }))}
                            className={`relative flex-1 py-2.5 rounded-xl text-[9px] font-mono font-black uppercase tracking-widest transition-all z-10 ${idea.complexity === c
                                ? 'text-black'
                                : 'text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
                              }`}
                          >
                            {idea.complexity === c && (
                              <motion.div
                                layoutId="complexity-bg"
                                className="absolute inset-0 bg-white rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                initial={false}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                            <span className="relative z-10">{c}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <Wind className="h-4 w-4 text-[#8B5CF6]" />
                        <label className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Animation Personality</label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {['fluid', 'bouncy', 'magnetic', 'mechanical', 'minimal', 'elastic', 'smooth', 'instant'].map(f => (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={f}
                            onClick={() => toggleFeel(f)}
                            className={`relative h-10 rounded-xl px-4 text-[9px] font-mono font-black uppercase tracking-widest transition-all text-left overflow-hidden border ${idea.feel === f
                                ? 'border-transparent text-white shadow-[0_0_15px_rgba(4,101,237,0.3)]'
                                : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/60 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                              }`}
                          >
                            {idea.feel === f && (
                              <motion.div
                                layoutId={`feel-bg-${f}`}
                                className="absolute inset-0 bg-[#8B5CF6]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              />
                            )}
                            <span className="relative z-10">{f}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Visual Theme */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Layers className="h-4 w-4 text-[#8B5CF6]" />
                      <label className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Visual Theme</label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'dark',     label: 'Dark' },
                        { id: 'light',    label: 'Light' },
                        { id: 'glass',    label: 'Glass' },
                        { id: 'colorful', label: 'Colorful' },
                        { id: 'mono',     label: 'Mono' },
                      ].map(th => (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={th.id}
                          onClick={() => setIdea(prev => ({ ...prev, theme: th.id }))}
                          className={`relative h-10 rounded-xl px-4 text-[9px] font-mono font-black uppercase tracking-widest transition-all text-left overflow-hidden border ${idea.theme === th.id
                              ? 'border-transparent text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                              : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/60 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                          {idea.theme === th.id && (
                            <motion.div
                              layoutId={`theme-bg-${th.id}`}
                              className="absolute inset-0 bg-[#8B5CF6]"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                          <span className="relative z-10">{th.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Trigger (Type) */}
                  <div className="relative space-y-5">
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      <label className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Animation Trigger</label>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {['hover', 'click', 'scroll', 'load', 'drag'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setIdea(prev => ({ ...prev, type: t }))}
                          className={`relative h-12 rounded-2xl px-6 text-[10px] font-mono font-black uppercase tracking-widest transition-all duration-300 ${idea.type === t
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20'
                            }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Component Category */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Code2 className="h-4 w-4 text-[#8B5CF6]" />
                      <label className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Component Category</label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'button',    label: 'Button' },
                        { id: 'card',      label: 'Card' },
                        { id: 'hero',      label: 'Hero' },
                        { id: 'navbar',    label: 'Navbar' },
                        { id: 'input',     label: 'Input' },
                        { id: 'modal',     label: 'Modal' },
                        { id: 'loader',    label: 'Loader' },
                        { id: 'cursor',    label: 'Cursor' },
                        { id: 'chart',     label: 'Chart' },
                        { id: 'animation', label: 'Animation' },
                      ].map(cat => (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={cat.id}
                          onClick={() => setIdea(prev => ({ ...prev, category: cat.id }))}
                          className={`relative h-10 rounded-xl px-4 text-[9px] font-mono font-black uppercase tracking-widest transition-all text-left overflow-hidden border ${idea.category === cat.id
                              ? 'border-transparent text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                              : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/60 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                          {idea.category === cat.id && (
                            <motion.div
                              layoutId={`cat-bg-${cat.id}`}
                              className="absolute inset-0 bg-[#8B5CF6]"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                          <span className="relative z-10">{cat.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Tech Stack */}
                  <div className="relative space-y-5">
                    <div className="flex items-center gap-3">
                      <Terminal className="h-4 w-4 text-[#8B5CF6]" />
                      <label className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Tech Stack Matrix</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Framer Motion', 'GSAP', 'SVG Motion', 'Canvas', 'Three.js', 'Tailwind CSS'].map(t => (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          key={t}
                          onClick={() => toggleTech(t)}
                          className={`relative rounded-full px-5 py-2.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all border overflow-hidden ${idea.tech.includes(t)
                              ? 'border-transparent text-[#8B5CF6] dark:text-white shadow-md dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                              : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/70 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                          {idea.tech.includes(t) && (
                            <motion.div
                              layoutId={`tech-bg-${t}`}
                              className="absolute inset-0 bg-[#8B5CF6]/10 dark:bg-white/20 backdrop-blur-md"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                          <span className="relative z-10">{t}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ════════════════════════════════════════════════════════
                    RIGHT — CREATIVE INTENT & PROMPT
                ════════════════════════════════════════════════════════ */}
                <div className="space-y-8 flex flex-col h-full bg-[#ffffff] dark:bg-[#13131a] border-l border-[#e2e8f0] dark:border-[#1e1e2d] p-8 rounded-[3rem]">
                  <div className="space-y-3 relative group">
                    <div className="flex items-center gap-2 px-2">
                      <Edit3 className="h-3 w-3 text-gray-400 dark:text-white/60" />
                      <label className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-[#64748b] dark:text-[#6366f1] transition-colors">Concept Identity</label>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] to-purple-600 rounded-[2.5rem] blur-md opacity-0 group-focus-within:opacity-30 transition-opacity duration-500" />
                      <input
                        placeholder="e.g. Magnetic cursor button with particle burst on click"
                        value={idea.name}
                        onChange={e => setIdea(prev => ({ ...prev, name: e.target.value }))}
                        maxLength={160}
                        className="relative w-full rounded-[10px] border border-[#e2e8f0] dark:border-[#2d2d3d] bg-[#ffffff] dark:bg-[#1a1a27] px-[20px] py-[16px] text-[28px] font-[700] text-[#0f172a] dark:text-[#e2e8f0] placeholder-[#94a3b8] dark:placeholder-[#4a4a6a] focus:outline-none focus:border-[#7c3aed] dark:focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] dark:focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all"
                      />
                      <Sparkles className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-white/10 group-focus-within:text-[#8B5CF6] group-focus-within:animate-pulse transition-colors" />
                    </div>
                    {/* Character counter */}
                    <div className="flex justify-end px-3">
                      <span className={`text-[11px] text-right font-mono font-black tabular-nums transition-colors ${
                        idea.name.length >= 120 ? 'text-red-500' :
                        idea.name.length >= 100 ? 'text-orange-500' :
                        'text-[#94a3b8] dark:text-[#4a4a6a]'
                      }`}>
                        {idea.name.length} / 120
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 relative group flex flex-col">
                    <div className="flex items-center gap-2 px-2">
                      <ScrollText className="h-3 w-3 text-gray-400 dark:text-white/60" />
                      <label className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-[#64748b] dark:text-[#6366f1] transition-colors">Technical Context & Vision</label>
                    </div>
                    <div className="relative flex-1 flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-b from-[#8B5CF6]/20 to-transparent rounded-[3rem] blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-500 pointer-events-none" />
                      
                      {/* Grid background effect */}
                      <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none border border-gray-200 dark:border-white/10 group-focus-within:border-[#8B5CF6]/50 transition-colors z-0">
                        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                      </div>

                      <textarea
                        placeholder="Describe the aesthetic direction, behavioral logic, and specific interactions..."
                        value={idea.prompt}
                        onChange={e => setIdea(prev => ({ ...prev, prompt: e.target.value }))}
                        className="relative z-10 flex-1 w-full rounded-[10px] border border-[#e2e8f0] dark:border-[#2a2a3d] bg-[#f8f9fc] dark:bg-[#16161e] px-[18px] py-[14px] min-h-[120px] text-[14px] text-[#334155] dark:text-[#cbd5e1] placeholder-[#94a3b8] dark:placeholder-[#3d3d5c] focus:outline-none focus:border-[#7c3aed] dark:focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] dark:focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all custom-scrollbar resize-none"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {state === 'executing' && (
            <motion.div
              key="running"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-8">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" />
                    <div className="relative h-16 w-16 flex items-center justify-center rounded-2xl bg-violet-500/10 text-[#8B5CF6] border border-violet-500/20">
                      <RefreshCcw className="h-8 w-8 animate-spin" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-[--text-primary]">Production Line Active</h3>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[9px] font-mono font-black uppercase text-[#8B5CF6] border border-violet-500/10">{idea.format}</span>
                      <span className="text-[11px] font-medium text-[--text-secondary]">Assembling <span className="text-[#8B5CF6] font-bold">{idea.name}</span></span>
                    </div>
                  </div>
                </div>

                {/* Tokens Usage Pill */}
                <div className="flex flex-col items-end gap-1.5 translate-y-2">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/5 py-2.5 px-6 shadow-2xl">
                    <div className="flex flex-col items-start leading-none group cursor-help">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1 group-hover:text-blue-400 transition-colors">Input</span>
                      <span className="text-[13px] font-black font-mono text-[--text-primary] tabular-nums">
                        {cumulativeUsage.input > 999999 ? `${(cumulativeUsage.input / 1000000).toFixed(1)}M` : cumulativeUsage.input.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-white/10 mx-1" />
                    <div className="flex flex-col items-start leading-none group cursor-help">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1 group-hover:text-indigo-400 transition-colors">Output</span>
                      <span className="text-[13px] font-black font-mono text-[--text-primary] tabular-nums">
                        {cumulativeUsage.output > 999 
                          ? `${(cumulativeUsage.output / 1000).toFixed(1)}k` 
                          : cumulativeUsage.output.toLocaleString()}
                      </span>
                    </div>
                    <div className="ml-3 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                  </div>
                  <div className="w-full flex flex-col items-end gap-1 mt-1">
                    <div className="h-1.5 w-32 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${cumulativeUsage.input < 15000 ? 'bg-green-500' : cumulativeUsage.input < 25000 ? 'bg-orange-500' : 'bg-red-500'}`} 
                        style={{ width: `${Math.min(100, (cumulativeUsage.input / 30000) * 100)}%` }} 
                      />
                    </div>
                    <span className="text-[11px] font-mono font-black tracking-widest text-[#94a3b8] dark:text-[#4a4a6a] text-right">
                      {cumulativeUsage.input.toLocaleString()} / 30,000 tokens
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
                {/* Stages Execution Rail */}
                <aside className="space-y-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500 px-2 font-black">PHASE TRACKING</p>
                  {selectedPipeline?.pipeline_stages.map((stage, idx) => {
                    const isActive = idx === currentStageIndex
                    const isCompleted = idx < currentStageIndex
                    const lastLog = logs[logs.length - 1]
                    const hasError = isActive && (lastLog?.level === 'error' || lastLog?.isFatal)
                    const isRunningStage = isActive && !hasError

                    return (
                      <div
                        key={stage.id}
                        className={`flex items-center gap-5 rounded-[2rem] border p-5 transition-all duration-500 ${isActive 
                          ? hasError 
                            ? 'bg-red-500/5 border-red-500/40 shadow-xl scale-[1.05]' 
                            : 'bg-white/50 dark:bg-[#1e1a2e] border-violet-500/40 dark:border-[#4c1d95] shadow-xl scale-[1.05]' 
                          : 'bg-gray-50 dark:bg-[#1e1e2a] border-gray-200 dark:border-[#2d2d3d] opacity-60'
                          }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black font-mono text-[12px] shadow-sm transition-all ${isActive && !hasError
                          ? 'bg-[#8B5CF6] text-white shadow-violet-500/30' 
                          : isCompleted 
                            ? 'bg-[#22c55e] text-white shadow-green-500/20' 
                            : hasError
                              ? 'bg-[#ef4444] text-white shadow-red-500/20'
                              : 'bg-gray-200 dark:bg-[#1c1c28] text-gray-500 dark:text-gray-400 border border-transparent dark:border-[#2d2d3d]'
                          }`}>
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : hasError ? <XCircle className="h-5 w-5" /> : isRunningStage ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="h-2 w-2 rounded-full border-2 border-current opacity-40" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className={`truncate text-[13px] font-black uppercase tracking-wider ${isActive ? hasError ? 'text-red-500' : 'text-[--text-primary]' : 'text-gray-500'}`}>{stage.name}</h4>
                          <div className="flex flex-col gap-1 mt-0.5">
                            {isActive && currentAttempt && currentAttempt > 1 && !hasError && (
                              <span className="w-fit text-[9px] font-mono font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20">REPAIR #{currentAttempt}</span>
                            )}
                            {hasError && (
                              <span className="text-[10px] font-mono font-bold text-red-500 truncate w-full pr-2" title={lastLog?.message}>
                                {lastLog?.message?.slice(0, 60)}{lastLog?.message && lastLog.message.length > 60 ? '...' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div className="pt-10">
                    {(() => {
                      const lastLog = logs[logs.length - 1]
                      const isError = lastLog?.level === 'error' || lastLog?.isFatal
                      const isPassWithWarnings = logs.some(l => l.stage === 'VALID' && l.level === 'warning') && !isError

                      if (isError) {
                        return (
                          <button
                            onClick={() => handleRerunStage('generate_code')}
                            className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 py-3 font-mono text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <RefreshCcw className="h-4 w-4" /> Retry from Gen
                          </button>
                        )
                      }

                      if (isPassWithWarnings) {
                        return (
                          <button
                            onClick={async () => {
                              try {
                                await fetch('/api/pipeline/ingest', { method: 'POST', body: JSON.stringify({ ideaId: runningIdeaId, code: generatedCode, spec: idea }) })
                                toast.success('Published!')
                                window.location.href = '/pipeline/inventory'
                              } catch (e) {
                                toast.error('Failed to publish')
                              }
                            }}
                            className="w-full rounded-2xl border border-green-500/30 bg-green-500/10 py-3 font-mono text-[10px] font-black uppercase tracking-widest text-green-500 hover:bg-green-500/20 transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve & Publish
                          </button>
                        )
                      }

                      return (
                          <button
                            onClick={() => setState('briefing')}
                            className="w-full rounded-2xl border border-gray-200 dark:border-[#3f3f52] bg-gray-100 dark:bg-[#1e1e2a] py-3 font-mono text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300 hover:border-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <XCircle className="h-4 w-4" /> Abort
                          </button>
                      )
                    })()}
                  </div>
                </aside>

                {/* Technical Production Log */}
                <div className="min-h-[600px] overflow-hidden rounded-[3rem] border border-white/10 bg-black/20 shadow-2xl">
                  <LogTerminal
                    logs={logs}
                    isRunning={state === 'executing'}
                    onClear={() => setLogs([])}
                    onRerunStage={handleRerunStage}
                    height="100%"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {state === 'completed' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-12"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-[--success] text-white shadow-2xl shadow-green-500/20">
                <CheckCircle2 className="h-12 w-12" />
              </div>

              <div className="text-center space-y-4">
                <h3 className="text-5xl font-black tracking-tight text-[--text-primary]">Forging Optimized</h3>
                <p className="text-xl text-[--text-secondary] font-medium">Production cycle for <span className="font-bold text-[#8B5CF6]">{idea.name}</span> completed successfully.</p>
              </div>

              <div className="flex items-center gap-5">
                <button
                  onClick={() => setViewLog(!viewLog)}
                  className={`flex items-center gap-3 px-8 py-3 rounded-2xl border text-[11px] font-mono font-black uppercase tracking-widest transition-all ${viewLog
                      ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-xl'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Terminal className="h-4 w-4" />
                  {viewLog ? 'HIDE TRACE' : 'VIEW TRACE'}
                </button>
                <button
                  onClick={handleCopyFullLog}
                  className="flex items-center gap-3 px-8 py-3 rounded-2xl border bg-white/5 border-white/10 text-[11px] font-mono font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  {copyingLog ? <Check className="h-4 w-4 text-[--success]" /> : <ClipboardCopy className="h-4 w-4" />}
                  {copyingLog ? 'COPIED TO MASTER' : 'COPY MASTER LOG'}
                </button>
              </div>

              {viewLog ? (
                <div className="w-full min-h-[600px] overflow-hidden rounded-[3rem] border border-white/10 bg-black/20 shadow-2xl">
                  <LogTerminal
                    logs={logs}
                    isRunning={false}
                    onClear={() => setLogs([])}
                    height="100%"
                  />
                </div>
              ) : (
                /* Preview Iframe Placeholder */
                <div className="w-full aspect-video rounded-[3rem] border border-white/10 bg-black/40 overflow-hidden relative group shadow-2xl">
                  <iframe
                    src={`/api/preview/compile?slug=idea-${runningIdeaId}`}
                    className="w-full h-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent opacity-60 pointer-events-none" />
                </div>
              )}

              <div className="flex gap-6 w-full max-w-2xl">
                <Button
                  variant="secondary"
                  className="flex-1 h-20 rounded-[2.5rem] font-mono text-[11px] font-black uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                  onClick={() => {
                    setState('briefing')
                    setIdea(prev => ({ ...prev, name: `${prev.name} (v2)` }))
                  }}
                >
                  New Iteration
                </Button>
                <Button
                  variant="accent"
                  className="flex-1 h-20 rounded-[2.5rem] font-mono text-[11px] font-black uppercase tracking-[0.3em] bg-[#8B5CF6] shadow-2xl shadow-violet-500/30"
                  onClick={() => window.location.href = `/pipeline/review?ideaId=${runningIdeaId}`}
                >
                  Open in Review <ExternalLink className="ml-4 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </DashboardPageFrame>
  )
}
