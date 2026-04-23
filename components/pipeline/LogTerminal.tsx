'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import type { LogEntry, LogLevel, LogStage } from '@/types/pipeline'
import { ChevronDown, ChevronRight, Brackets, TerminalSquare, ClipboardCopy, Check, FileText, RefreshCcw, Loader2, Play } from 'lucide-react'

interface LogTerminalProps {
  logs: LogEntry[]
  isRunning: boolean
  onClear: () => void
  onRerunStage?: (action: string) => void
  height?: string
}

const STAGE_COLORS: Record<LogStage, string> = {
  SYSTEM: 'bg-[#e2e8f0] text-[#475569] dark:bg-[#0f172a] dark:text-[#94a3b8]',
  ENRICH: 'bg-[#dbeafe] text-[#1d4ed8] dark:bg-[#1e3a8a] dark:text-[#bfdbfe]',
  GEN:    'bg-[#dcfce7] text-[#166534] dark:bg-[#064e3b] dark:text-[#d1fae5]',
  VALID:  'bg-[#ede9fe] text-[#6d28d9] dark:bg-[#4c1d95] dark:text-[#ddd6fe]',
  FIX:    'bg-[#ffedd5] text-[#c2410c] dark:bg-[#7c2d12] dark:text-[#fed7aa]',
  REPAIR: 'bg-[#ffedd5] text-[#c2410c] dark:bg-[#7c2d12] dark:text-[#fed7aa]',
  INGEST: 'bg-[#dcfce7] text-[#166534] dark:bg-[#064e3b] dark:text-[#d1fae5]',
  DONE:   'bg-[#dcfce7] text-[#166534] dark:bg-[#064e3b] dark:text-[#d1fae5]',
  ERROR:  'bg-[#fee2e2] text-[#991b1b] dark:bg-[#7f1d1d] dark:text-[#fecaca]',
}

const LEVEL_MESSAGE_COLORS: Record<LogLevel, string> = {
  info: 'text-[#0f172a] dark:text-[#f8fafc]',
  success: 'text-[#166534] dark:text-[#4ade80]',
  warning: 'text-[#c2410c] dark:text-[#fb923c]',
  error: 'text-[#991b1b] dark:text-[#f87171]',
  system: 'text-[#475569] dark:text-[#94a3b8]',
}

interface StageGroup {
  id: string
  stage: LogStage
  logs: LogEntry[]
  status: 'DONE' | 'ACTIVE' | 'ERROR' | 'PENDING'
  inputTokens: number
  outputTokens: number
}

export default function LogTerminal({
  logs,
  isRunning,
  onClear,
  onRerunStage,
  height = '420px',
}: LogTerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)
  const [copyingFull, setCopyingFull] = useState(false)
  const [startTime] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isRunning) return
    const int = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(int)
  }, [isRunning, startTime])

  // Group logs sequentially by stage
  const groups = useMemo(() => {
    const result: StageGroup[] = []
    let currentGroup: StageGroup | null = null

    logs.forEach(log => {
      if (!currentGroup || currentGroup.stage !== log.stage) {
        if (currentGroup) {
          currentGroup.status = currentGroup.logs.some(l => l.isFatal || l.level === 'error') ? 'ERROR' : 'DONE'
        }
        currentGroup = {
          id: `group-${result.length}-${log.stage}`,
          stage: log.stage,
          logs: [],
          status: 'ACTIVE',
          inputTokens: 0,
          outputTokens: 0
        }
        result.push(currentGroup)
      }
      currentGroup.logs.push(log)
      if (log.usage) {
        currentGroup.inputTokens += log.usage.input || 0
        currentGroup.outputTokens += log.usage.output || 0
      }
      if (log.isFatal || log.level === 'error') {
        currentGroup.status = 'ERROR'
      }
    })

    if (!isRunning && currentGroup && (currentGroup as StageGroup).status === 'ACTIVE') {
      (currentGroup as StageGroup).status = 'DONE'
    }

    return result
  }, [logs, isRunning])

  useEffect(() => {
    if (!userScrolledUp.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs.length])

  useEffect(() => {
    if (isRunning) userScrolledUp.current = false
  }, [isRunning])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    userScrolledUp.current = !isAtBottom
  }

  const handleCopyFullLog = async () => {
    if (logs.length === 0) return
    setCopyingFull(true)
    const report = logs.map(l => `[${l.ts}] [${l.stage}] ${l.level.toUpperCase()}: ${l.message}`).join('\\n')
    await navigator.clipboard.writeText(report)
    setTimeout(() => setCopyingFull(false), 2000)
  }

  const activeGroup = groups.find(g => g.status === 'ACTIVE')
  const fatalLog = logs.find(l => l.isFatal)
  const errorAction = fatalLog?.action
  const totalInput = groups.reduce((acc, g) => acc + g.inputTokens, 0)
  const totalOutput = groups.reduce((acc, g) => acc + g.outputTokens, 0)

  return (
    <div className="flex flex-col overflow-hidden rounded-[24px] border border-[#e2e8f0] dark:border-[#2d2d3d] bg-[#ffffff] dark:bg-[#16161e] shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-none relative" style={{ height }}>
      
      {/* 1. TOP BAR */}
      <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-[#2d2d3d] bg-[#f8f9fc] dark:bg-[#1a1a24] px-4 py-2.5 z-20">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="select-none font-mono text-[11px] font-bold tracking-wider text-[--text-tertiary] uppercase">
            forge.core.log
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isRunning && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[--dashboard-success-dim] border border-[--dashboard-success]/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--dashboard-success] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[--dashboard-success]" />
              </span>
              <span className="font-mono text-[9px] font-bold text-[--dashboard-success] tracking-widest">LIVE</span>
            </div>
          )}

          <div className="h-4 w-px bg-[--border-subtle]" />

          <button
            onClick={handleCopyFullLog}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-tight
                       text-[--text-tertiary] transition-all hover:text-[--accent] disabled:opacity-30"
          >
            {copyingFull ? <Check className="h-3 w-3 text-[--dashboard-success]" /> : <FileText className="h-3 w-3" />}
            {copyingFull ? 'COPIED' : 'COPY FLOW'}
          </button>

          <button
            onClick={onClear}
            disabled={isRunning || logs.length === 0}
            title="Clear all logs"
            className="rounded bg-[--dashboard-danger-dim] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-tighter
                       text-[--dashboard-danger] transition-all hover:bg-[--dashboard-danger] hover:text-white
                       disabled:cursor-not-allowed disabled:opacity-20"
          >
            purge
          </button>
        </div>
      </div>

      {/* 2. ACTIVE STAGE STRIP */}
      {isRunning && activeGroup && (
        <div className="z-10 bg-[#f5f3ff] dark:bg-[#1e1a2e] border-b border-[#ddd6fe] dark:border-[#3b2f6e]">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-[#6d28d9] dark:text-[#a78bfa]" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#6d28d9] dark:text-[#a78bfa]">
                {activeGroup.stage}
              </span>
              {activeGroup.logs.some(l => l.attempt && l.attempt > 1) && (
                <span className="px-2 py-0.5 rounded-full bg-[#ffedd5] text-[9px] font-mono font-bold uppercase text-[#c2410c] border border-[#fed7aa] dark:bg-[#7c2d12] dark:text-[#fed7aa] dark:border-[#7c2d12]">
                  Repair Cycle Active
                </span>
              )}
            </div>
            <span className="font-mono text-[11px] text-[#6d28d9] dark:text-[#a78bfa] opacity-70">
              {elapsed}s elapsed
            </span>
          </div>
          {/* Animated progress bar */}
          <div className="w-full h-[2px] bg-[#e2e8f0] dark:bg-[#2d2d3d] overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-[#7c3aed] animate-[slide_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* 3. LOG BODY (Stage Groups) */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[#ffffff] dark:bg-[#16161e] p-4 text-[#0f172a] dark:text-[#f8fafc] scroll-smooth pb-20"
      >
        {groups.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs font-mono text-[--dashboard-code-soft]">
              {isRunning ? 'Waiting for telemetry...' : 'No logs yet. Select ideas and click Run.'}
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <GroupBlock key={group.id} group={group} />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 4. FOOTER STATS BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-[#e2e8f0] dark:border-[#2d2d3d] bg-[#f8f9fc] dark:bg-[#13131a] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#64748b] dark:text-[#94a3b8]">Input</span>
            <span className="text-[11px] font-mono font-bold text-[#0f172a] dark:text-[#f8fafc]">{(totalInput / 1000).toFixed(1)}k</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#64748b] dark:text-[#94a3b8]">Output</span>
            <span className="text-[11px] font-mono font-bold text-[#0f172a] dark:text-[#f8fafc]">{(totalOutput / 1000).toFixed(1)}k</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#64748b] dark:text-[#94a3b8]">Elapsed</span>
            <span className="text-[11px] font-mono font-bold text-[#0f172a] dark:text-[#f8fafc]">{elapsed}s</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#64748b] dark:text-[#94a3b8]">Stages</span>
            <span className="text-[11px] font-mono font-bold text-[#0f172a] dark:text-[#f8fafc]">{groups.filter(g => g.status === 'DONE').length}/{groups.length}</span>
          </div>
        </div>

        {errorAction && onRerunStage && !isRunning && (
          <button
            onClick={() => onRerunStage(errorAction)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#991b1b] px-4 py-1.5 font-mono text-[10px] font-black uppercase text-white transition-all
                       hover:bg-[#ef4444] hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Resume Stage
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}} />
    </div>
  )
}

function GroupBlock({ group }: { group: StageGroup }) {
  const [isOpen, setIsOpen] = useState(() => group.status !== 'DONE')

  useEffect(() => {
    if (group.status === 'DONE') setIsOpen(false)
    if (group.status === 'ACTIVE' || group.status === 'ERROR') setIsOpen(true)
  }, [group.status])

  return (
    <div className={`flex flex-col rounded-xl border border-[#e2e8f0] dark:border-[#2d2d3d] bg-[#ffffff] dark:bg-[#16161e] overflow-hidden border-l-[3px] ${
      group.stage === 'SYSTEM' ? 'border-l-slate-400' :
      group.stage === 'ENRICH' ? 'border-l-blue-500' :
      group.stage === 'GEN'    ? 'border-l-green-500' :
      group.stage === 'VALID'  ? 'border-l-purple-500' :
      group.stage === 'FIX'    ? 'border-l-orange-500' :
      group.stage === 'ERROR'  ? 'border-l-red-500' :
      'border-l-slate-400'
    }`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-2 bg-[#f3f4f8] dark:bg-[#1c1c28] hover:bg-[#e2e8f0] dark:hover:bg-[#2d2d3d] border-b border-[#e2e8f0] dark:border-[#2d2d3d] transition-colors"
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-[#64748b]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#64748b]" />}
          
          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase tracking-wider ${
            group.status === 'DONE' ? 'bg-[#dcfce7] text-[#166534] dark:bg-[#064e3b] dark:text-[#d1fae5]' :
            group.status === 'ACTIVE' ? 'bg-[#ede9fe] text-[#6d28d9] dark:bg-[#4c1d95] dark:text-[#ddd6fe]' :
            group.status === 'ERROR' ? 'bg-[#fee2e2] text-[#991b1b] dark:bg-[#7f1d1d] dark:text-[#fecaca]' :
            'bg-[#f1f5f9] text-[#64748b] dark:bg-[#0f172a] dark:text-[#94a3b8]'
          }`}>
            <span className="flex items-center gap-1.5">
              {group.status === 'ACTIVE' && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
              {group.status}
            </span>
          </span>
          
          <span className="font-mono text-[11px] font-black uppercase tracking-wider text-[#0f172a] dark:text-[#f8fafc]">
            {group.stage}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-[--text-disabled]">
            {group.logs.length} events
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col bg-[#ffffff] dark:bg-[#16161e]">
          {group.logs.map((log) => (
            <LogLine key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}

function LogLine({ log }: { log: LogEntry }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasData = !!(log.input || log.output)
  const isErrorRow = log.isFatal || log.level === 'error'

  return (
    <div className={`group flex flex-col gap-1.5 py-2 transition-all duration-200 
      ${isOpen ? 'bg-[#f1f3f8] dark:bg-[#252535] px-8 py-4 border-y border-[#e2e8f0] dark:border-[#2d2d3d]' : 
        isErrorRow ? 'bg-[#fff1f1] dark:bg-[#2a1a1a] hover:bg-[#ffe4e4] dark:hover:bg-[#351f1f] px-4' : 
        'bg-[#f8f9fc] dark:bg-[#1e1e2a] hover:bg-[#f1f3f8] dark:hover:bg-[#252535] px-4'}
      border-l-2 ${isErrorRow ? 'border-l-[#ef4444]' : 'border-l-transparent'}
    `}>
      <div className="flex items-start gap-3 leading-6">
        <span className="w-[50px] shrink-0 select-none pt-0.5 text-[10px] font-mono text-[--dashboard-code-disabled]">
          {log.ts}
        </span>

        <span className={`w-[64px] shrink-0 select-none px-[6px] py-[2px] rounded-md text-center text-[10px] font-semibold tracking-[0.05em] uppercase ${STAGE_COLORS[log.stage] || 'bg-slate-100 text-slate-500'}`}>
          {log.stage}
        </span>

        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
          <span className={`break-words text-[11px] font-medium tracking-tight ${isErrorRow ? 'text-[--dashboard-danger]' : LEVEL_MESSAGE_COLORS[log.level]}`}>
            {log.message}
          </span>
          
          {log.usage && (log.usage.input > 0 || log.usage.output > 0) && (
            <span className="text-[10px] font-mono text-[--dashboard-code-disabled] italic">
              (+${log.usage.input} in / +${log.usage.output} out)
            </span>
          )}

          {hasData && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[--dashboard-code-disabled]/5 px-2.5 py-1 font-mono text-[9px] font-bold uppercase text-[--text-tertiary] transition-all
                         hover:bg-[--accent-soft-20] hover:text-[--accent] border border-transparent hover:border-[--accent-soft-30]"
            >
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Trace Data
            </button>
          )}
        </div>
      </div>

      {log.detail && !isOpen && (
        <span className="ml-[120px] block break-words text-[10px] leading-relaxed text-[--dashboard-code-soft] opacity-80 italic">
          ↳ {log.detail}
        </span>
      )}

      {isOpen && (
        <div className="ml-[60px] mt-2 space-y-3 rounded-xl border border-[--border-subtle] bg-[--surface-code] p-4 shadow-xl">
          {log.input && <JsonSection title="Input Payload" data={log.input} icon={<TerminalSquare className="h-3.5 w-3.5" />} />}
          {log.output && <JsonSection title="Output Trace" data={log.output} icon={<Brackets className="h-3.5 w-3.5" />} />}
        </div>
      )}
    </div>
  )
}

function JsonSection({ title, data, icon }: { title: string; data: string; icon: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  let formatted = data
  try {
    const parsed = JSON.parse(data)
    formatted = JSON.stringify(parsed, null, 2)
  } catch {
    // Keep raw
  }

  const handleCopy = () => {
    void navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group/section space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] opacity-80">
          {icon}
          {title}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider transition-all
                     ${copied 
                       ? 'bg-[--dashboard-success-dim] text-[--dashboard-success]' 
                       : 'bg-white/5 text-[--text-disabled] hover:bg-[--accent-soft-20] hover:text-[--accent]'}`}
        >
          {copied ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="relative">
        <pre className="max-h-[300px] overflow-auto rounded-lg bg-black/50 p-3 text-[10px] leading-relaxed text-[--dashboard-code-muted] 
                       scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-accent/30 transition-all border border-white/5">
          {formatted}
        </pre>
      </div>
    </div>
  )
}
