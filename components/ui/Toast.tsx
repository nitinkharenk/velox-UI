'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Copy, Info, X } from 'lucide-react'
import { cx } from './cx'

type T = 'success' | 'error' | 'info'
interface Toast {
  id: string
  type: T
  title: string
  msg?: string
}

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

let listeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

export const toast = {
  success: (title: string, msg?: string) => push('success', title, msg),
  error: (title: string, msg?: string) => push('error', title, msg),
  info: (title: string, msg?: string) => push('info', title, msg),
}

function notify() {
  listeners.forEach(listener => listener(toasts))
}

function dismiss(id: string) {
  toasts = toasts.filter(toast => toast.id !== id)
  notify()
}

function playToastSound(type: T) {
  if (typeof window === 'undefined') return;
  try {
    const audioWindow = window as AudioWindow
    const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    }
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Ignore autoplay errors
  }
}

function push(type: T, title: string, msg?: string) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { id, type, title, msg }]
  notify()
  playToastSound(type)
}

const icons = { success: CheckCircle, error: AlertCircle, info: Info }
const accents = {
  success: 'border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-[--success]',
  error: 'border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[--danger]',
  info: 'border-[color-mix(in_srgb,var(--info)_30%,transparent)] text-[--info]',
}

export function useToast() {
  return {
    addToast: ({ type, title, description }: { type: T; title: string; description?: string }) => {
      toast[type](title, description)
    },
  }
}

export function ToastProvider() {
  const [items, setItems] = useState<Toast[]>([])
  const [copiedIds, setCopiedIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    listeners.push(setItems)
    return () => {
      listeners = listeners.filter(listener => listener !== setItems)
    }
  }, [])

  async function handleCopy(toast: Toast) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return

    const text = toast.msg ? `${toast.title}\n${toast.msg}` : toast.title
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIds(prev => ({ ...prev, [toast.id]: true }))
      window.setTimeout(() => {
        setCopiedIds(prev => {
          const next = { ...prev }
          delete next[toast.id]
          return next
        })
      }, 1500)
    } catch {
      // Ignore clipboard failures
    }
  }

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-50 flex max-w-[calc(100vw-2rem)] flex-col gap-3">
      {items.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-[min(420px,calc(100vw-2rem))] animate-fade-up rounded-[1.35rem] border border-[--border-default] bg-[--glass-surface] px-4 py-3 shadow-[var(--shadow-lift)] backdrop-blur-xl"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className={cx('mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border bg-[--bg-soft]', accents[toast.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="break-words text-sm font-medium text-[--text-primary] [overflow-wrap:anywhere]">
                  {toast.title}
                </p>
                {toast.msg && (
                  <p className="mt-1 break-words text-xs leading-6 text-[--text-secondary] [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {toast.msg}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleCopy(toast)}
                  aria-label="Copy notification"
                  className="rounded-lg p-1 text-[--text-tertiary] transition-colors hover:bg-[--bg-soft] hover:text-[--text-primary]"
                  title={copiedIds[toast.id] ? 'Copied' : 'Copy'}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Close notification"
                  className="rounded-lg p-1 text-[--text-tertiary] transition-colors hover:bg-[--bg-soft] hover:text-[--text-primary]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {copiedIds[toast.id] && (
              <p className="mt-2 pl-11 text-[10px] uppercase tracking-[0.14em] text-[--text-tertiary]">
                Copied
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
