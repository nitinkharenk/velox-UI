import { notFound } from 'next/navigation'
import { getAssetBySlug } from '@/lib/db/assets'

interface PreviewPageProps {
  params: Promise<{ slug: string }>
}

function formatTitle(slug: string) {
  return slug
    .replace(/^idea-/, 'Idea ')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { slug } = await params

  if (!slug) {
    notFound()
  }

  const asset = slug.startsWith('idea-') ? null : await getAssetBySlug(slug)

  if (!slug.startsWith('idea-') && !asset) {
    notFound()
  }

  const title = asset?.name ?? formatTitle(slug)

  return (
    <main className="min-h-screen bg-[--velox-ink] text-[--text-primary]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <header className="surface-panel flex flex-col gap-3 rounded-[1.75rem] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-disabled]">
              Preview
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-[--text-primary]">
              {title}
            </h1>
          </div>
          <p className="font-mono text-[11px] text-[--text-tertiary]">
            /preview/{slug}
          </p>
        </header>

        <section className="surface-panel flex-1 overflow-hidden rounded-[1.75rem] p-3 sm:p-4">
          <iframe
            src={`/api/preview/compile?slug=${slug}`}
            sandbox="allow-scripts allow-same-origin"
            className="h-[calc(100vh-11rem)] w-full rounded-[1.15rem] border border-[--border-default] bg-[--surface-canvas]"
            title={`${title} preview`}
          />
        </section>
      </div>
    </main>
  )
}
