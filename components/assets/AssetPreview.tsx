'use client'
import { useState, useRef } from 'react'
import { Monitor, Code2, ExternalLink, Moon, Sun } from 'lucide-react'
import { buildSandboxHTML } from '@/lib/preview/sandbox'
import { toSandboxCode } from '@/lib/transform'
import { getLivePreviewStorageKey } from '@/lib/preview/live'
import CodeBlock from './CodeBlock'

interface AssetPreviewProps {
  slug: string
  height?: number
  showCode?: boolean
  code?: string
  componentProps?: Record<string, unknown> | null
}

export default function AssetPreview({ slug, height = 400, showCode, code, componentProps }: AssetPreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [isDark, setIsDark] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  function toggleTheme() {
    setIsDark(!isDark)
    iframeRef.current?.contentWindow?.postMessage('toggle-theme', '*')
  }

  const srcDoc = code ? buildSandboxHTML(toSandboxCode(code), { componentProps }) : undefined
  const src = code ? undefined : `/api/preview/compile?slug=${slug}`
  const previewPageHref = `/preview/${slug}`

  function handleOpenPreview() {
    if (srcDoc) {
      const previewId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${slug}-${Date.now()}`

      window.localStorage.setItem(getLivePreviewStorageKey(previewId), srcDoc)
      const previewHref = `/preview/live?id=${encodeURIComponent(previewId)}&title=${encodeURIComponent(slug)}`
      const previewTab = window.open(previewHref, '_blank', 'noopener,noreferrer')
      if (!previewTab) return

      previewTab.focus()
      return
    }

    const previewTab = window.open(previewPageHref, '_blank', 'noopener,noreferrer')
    previewTab?.focus()
  }

  return (
    <div className="surface-panel overflow-hidden rounded-[28px]">
      <div className="flex items-center gap-1 px-3 pt-3">
        {showCode && (
          <>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition-all duration-200 ${
                activeTab === 'preview'
                  ? 'bg-[--bg-overlay] text-[--text-primary]'
                  : 'text-[--text-tertiary] hover:bg-[--bg-soft] hover:text-[--text-secondary]'
              }`}
            >
              <Monitor className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition-all duration-200 ${
                activeTab === 'code'
                  ? 'bg-[--bg-overlay] text-[--text-primary]'
                  : 'text-[--text-tertiary] hover:bg-[--bg-soft] hover:text-[--text-secondary]'
              }`}
            >
              <Code2 className="w-3 h-3" />
              Code
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {activeTab === 'preview' && (
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-[--text-tertiary] transition-all duration-200 hover:bg-[--bg-soft] hover:text-[--text-primary]"
              title="Toggle dark/light mode"
            >
              {isDark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-[--text-tertiary] transition-all duration-200 hover:bg-[--bg-soft] hover:text-[--text-primary]"
            title="Open preview in a new tab"
          >
            <ExternalLink className="h-3 w-3" />
            Open in new tab
          </button>
        </div>
      </div>
      {activeTab === 'preview' ? (
        <div className="p-3">
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            src={src}
            style={{ width: '100%', height, border: 'none', borderRadius: 12, background: 'var(--velox-ink)' }}
            sandbox={src ? 'allow-scripts allow-same-origin' : 'allow-scripts'}
            title={`Preview of ${slug}`}
          />
        </div>
      ) : (
        <CodeBlock code={code ?? ''} />
      )}
    </div>
  )
}
