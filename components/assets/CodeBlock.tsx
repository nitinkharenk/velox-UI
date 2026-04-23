'use client'
import { useState } from 'react'
import { Clipboard, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  slug?: string
}

export default function CodeBlock({ code, slug }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    if (slug) {
      fetch(`/api/assets/${slug}/copy`, { method: 'POST' }).catch(() => {})
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-4 right-4 z-10 flex h-8 items-center gap-1.5 rounded-xl border border-transparent
                   bg-[--text-primary] px-4 text-xs font-bold tracking-widest uppercase text-[--bg-deep] shadow-md
                   hover:scale-105 active:scale-95 transition-all duration-200
                   opacity-0 group-hover:opacity-100"
      >
        {copied
          ? <><Check className="w-3 h-3 text-[--success]" /> Copied</>
          : <><Clipboard className="w-3 h-3" /> Copy</>
        }
      </button>
      <pre className="surface-panel-elevated max-h-[600px] overflow-auto rounded-[24px] p-5 text-[13px] leading-relaxed font-mono text-[--text-secondary]">
        <code>{code}</code>
      </pre>
    </div>
  )
}
