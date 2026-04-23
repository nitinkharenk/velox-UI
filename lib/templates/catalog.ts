import type { Asset } from '@/types/asset'

export const TEMPLETES_FALLBACK_SAMPLE_SLUG = 'atelier-noir-studio'

export interface TemplateStory {
  eyebrow: string
  headline: string
  summary: string
  bullets: string[]
  sections: string[]
}

export interface TemplateDetailRecord {
  kind: 'asset' | 'fallback'
  slug: string
  name: string
  category: 'template'
  type: string
  description: string
  seoDescription?: string
  code: string
  tags: string[]
  tech: string[]
  complexity: Asset['complexity']
  isPro: boolean
  isPublished: boolean
  license: string
  createdAt: string
  upvotes: number
  previewMode: 'slug' | 'code'
  story: TemplateStory
}

const FALLBACK_TEMPLATE_CODE = `/**
 * @name Atelier Noir Studio
 */
export default function AtelierNoirStudio() {
  const services = ['Identity Systems', 'Motion Direction', 'Launch Films']
  const notes = ['Paris / Remote', '8 week launches', 'Brand + web']

  return (
    <div className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[12%] h-72 w-72 rounded-full bg-[#ff4d00]/18 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-6%] h-96 w-96 rounded-full bg-white/8 blur-3xl" />
      </div>

      <section className="relative flex min-h-screen flex-col px-6 py-8 md:px-10">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-white/55">
          <span>Atelier Noir</span>
          <span>Creative Studio Template</span>
        </div>

        <div className="mt-16 grid flex-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
          <div className="max-w-3xl self-end">
            <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-[#ff4d00]">Motion-first identities</p>
            <h1 className="max-w-[9ch] text-[clamp(56px,10vw,132px)] font-black uppercase leading-[0.9] tracking-[0.02em]">
              Digital worlds for restless brands.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/70 md:text-lg">
              A dramatic launch template for studios shaping campaigns, films, and visual systems with cinematic pacing.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <button className="border border-transparent bg-[#ff4d00] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                Start a project
              </button>
              <button className="border border-white/14 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78">
                View reel
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-sm">
            <div className="rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,77,0,0.24),rgba(255,77,0,0.02)_45%,transparent_70%),linear-gradient(180deg,#0d0d0d,#050505)] p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 text-[10px] uppercase tracking-[0.22em] text-white/48">
                <span>Selected launch</span>
                <span>Studio / 2026</span>
              </div>

              <div className="mt-8 grid gap-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">Offer</p>
                  <p className="mt-3 max-w-[18ch] text-3xl font-semibold leading-tight">Identity films, living systems, and launch sites.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {services.map((service) => (
                    <div key={service} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/44">Service</p>
                      <p className="mt-3 text-sm leading-6 text-white/78">{service}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-5">
                  {notes.map((note) => (
                    <span key={note} className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/54">
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}`

const FALLBACK_TEMPLATE_RECORD: TemplateDetailRecord = {
  kind: 'fallback',
  slug: TEMPLETES_FALLBACK_SAMPLE_SLUG,
  name: 'Atelier Noir Studio',
  category: 'template',
  type: 'creative studio',
  description: 'A cinematic launch template for studios presenting identity work, motion campaigns, and editorial case studies.',
  seoDescription: 'Cinematic creative studio template.',
  code: FALLBACK_TEMPLATE_CODE,
  tags: ['studio', 'editorial', 'dark'],
  tech: ['React', 'Tailwind CSS'],
  complexity: 'high',
  isPro: false,
  isPublished: true,
  license: 'MIT',
  createdAt: '2026-04-11T00:00:00.000Z',
  upvotes: 0,
  previewMode: 'code',
  story: {
    eyebrow: 'Fallback sample',
    headline: 'A moody studio launch page for brands that sell atmosphere as much as execution.',
    summary:
      'Use this built-in sample when the live template catalog is sparse. It proves the route, shows the intended art direction, and gives the marketplace a polished anchor from day one.',
    bullets: [
      'Poster-like opening frame with a calm text zone and dominant visual plane',
      'Editorial service strip and launch-story pacing instead of generic card rows',
      'A layout built for creative studios, direction-led agencies, and motion-heavy brand teams',
    ],
    sections: ['Full-bleed hero', 'Service narrative', 'Editorial project strip', 'Contact CTA'],
  },
}

function compareByRecency(left: Asset, right: Asset) {
  return right.created_at.localeCompare(left.created_at)
}

function normalizeTypeLabel(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getTemplateAssets(assets: Asset[]) {
  return assets
    .filter((asset) => asset.category === 'template' && asset.is_published)
    .sort(compareByRecency)
}

export function toTemplateDetailRecord(asset: Asset): TemplateDetailRecord {
  const typeLabel = normalizeTypeLabel(asset.type)
  const headline = `${asset.name} gives ${typeLabel.toLowerCase() || 'template'} launches a more cinematic starting point.`

  return {
    kind: 'asset',
    slug: asset.slug,
    name: asset.name,
    category: 'template',
    type: asset.type,
    description: asset.description,
    seoDescription: asset.seo_description,
    code: asset.code,
    tags: asset.tags ?? [],
    tech: asset.tech ?? [],
    complexity: asset.complexity,
    isPro: asset.is_pro,
    isPublished: asset.is_published,
    license: asset.license,
    createdAt: asset.created_at,
    upvotes: asset.upvotes ?? 0,
    previewMode: 'slug',
    story: {
      eyebrow: typeLabel || 'Template',
      headline,
      summary:
        asset.seo_description ?? asset.description,
      bullets: [
        `Built around a ${typeLabel.toLowerCase() || 'template'} composition instead of isolated snippets`,
        `Tags in focus: ${(asset.tags ?? []).slice(0, 3).join(', ') || 'motion, layout, launch'}`,
        `Ready for teams using ${(asset.tech ?? []).slice(0, 2).join(' + ') || 'React + Tailwind CSS'}`,
      ],
      sections: [
        `${typeLabel || 'Template'} hero`,
        'Responsive content flow',
        'Motion-aware interactions',
        asset.is_pro ? 'Pro-ready refinement' : 'Production-ready starting point',
      ],
    },
  }
}

export function getTempletesDetailRecord({
  slug,
  templateAssets,
}: {
  slug: string
  templateAssets: Asset[]
}) {
  const asset = templateAssets.find((item) => item.slug === slug)
  if (asset) return toTemplateDetailRecord(asset)
  if (slug === TEMPLETES_FALLBACK_SAMPLE_SLUG) return FALLBACK_TEMPLATE_RECORD
  return null
}

export function getTempletesSpotlightRecord(templateAssets: Asset[]) {
  const featured = [...templateAssets].sort((left, right) => {
    const voteDelta = (right.upvotes ?? 0) - (left.upvotes ?? 0)
    if (voteDelta !== 0) return voteDelta
    return compareByRecency(left, right)
  })[0]

  return featured ? toTemplateDetailRecord(featured) : FALLBACK_TEMPLATE_RECORD
}

export function getRelatedTemplateAssets({
  record,
  templateAssets,
  fallbackAssets,
  limit = 3,
}: {
  record: TemplateDetailRecord
  templateAssets: Asset[]
  fallbackAssets: Asset[]
  limit?: number
}) {
  const primary = templateAssets
    .filter((asset) => asset.slug !== record.slug)
    .sort((left, right) => {
      const voteDelta = (right.upvotes ?? 0) - (left.upvotes ?? 0)
      if (voteDelta !== 0) return voteDelta
      return compareByRecency(left, right)
    })

  if (primary.length >= limit) return primary.slice(0, limit)

  const seen = new Set(primary.map((asset) => asset.slug))
  seen.add(record.slug)

  const secondary = fallbackAssets.filter((asset) => !seen.has(asset.slug))

  return [...primary, ...secondary].slice(0, limit)
}

export function getFallbackTemplateRecord() {
  return FALLBACK_TEMPLATE_RECORD
}
