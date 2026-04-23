'use client'

import { useMemo, useSyncExternalStore, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getLivePreviewStorageKey } from '@/lib/preview/live'

function LivePreviewContent() {
  const searchParams = useSearchParams()
  const previewId = searchParams.get('id') ?? ''
  const title = searchParams.get('title') ?? 'Live Preview'

  const storageKey = useMemo(
    () => (previewId ? getLivePreviewStorageKey(previewId) : null),
    [previewId],
  )
  const resolvedSrcDoc = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('storage', onStoreChange)
      return () => window.removeEventListener('storage', onStoreChange)
    },
    () => (storageKey ? window.localStorage.getItem(storageKey) : null),
    () => null,
  )

  return (
    <main className="min-h-screen bg-[--velox-ink] text-[--text-primary]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <header className="surface-panel flex flex-col gap-3 rounded-[1.75rem] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-disabled]">
              Live Preview
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-[--text-primary]">
              {title}
            </h1>
          </div>
          <p className="font-mono text-[11px] text-[--text-tertiary]">
            Runtime sandbox
          </p>
        </header>

        <section className="surface-panel flex-1 overflow-hidden rounded-[1.75rem] p-3 sm:p-4">
          {resolvedSrcDoc ? (
            <iframe
              srcDoc={resolvedSrcDoc}
              sandbox="allow-scripts"
              className="h-[calc(100vh-11rem)] w-full rounded-[1.15rem] border border-[--border-default] bg-[--surface-canvas]"
              title={`${title} live preview`}
            />
          ) : (
            <div className="flex h-[calc(100vh-11rem)] items-center justify-center rounded-[1.15rem] border border-[--border-default] bg-[--surface-canvas]">
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-disabled]">
                  Preview unavailable
                </p>
                <p className="mt-2 text-sm text-[--text-tertiary]">
                  The preview payload was not found in local storage.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default function LivePreviewPage() {
  return (
    <Suspense fallback={null}>
      <LivePreviewContent />
    </Suspense>
  )
}
