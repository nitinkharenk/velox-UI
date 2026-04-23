import test from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Asset } from '../types/asset'
import {
  TEMPLETES_FALLBACK_SAMPLE_SLUG,
  getTemplateAssets,
  getTempletesDetailRecord,
  getRelatedTemplateAssets,
} from '../lib/templates/catalog'
import TempletesHero from '../components/templetes/TempletesHero'

const assets: Asset[] = [
  {
    id: '1',
    slug: 'orbital-ui',
    name: 'Orbital UI',
    category: 'template',
    type: 'creative studio',
    code: 'export default function OrbitalUi() { return <section>Orbital UI</section> }',
    description: 'A moody template for motion-driven studios.',
    seo_description: 'Studio template',
    tags: ['studio', 'dark'],
    tech: ['React', 'Framer Motion'],
    complexity: 'high',
    animation_spec: undefined,
    visual_spec: undefined,
    is_pro: true,
    is_published: true,
    license: 'MIT',
    created_at: '2026-04-11T00:00:00.000Z',
    upvotes: 150,
  },
  {
    id: '2',
    slug: 'signal-board',
    name: 'Signal Board',
    category: 'template',
    type: 'saas',
    code: 'export default function SignalBoard() { return <section>Signal Board</section> }',
    description: 'A dense, product-led SaaS template.',
    seo_description: 'SaaS template',
    tags: ['dashboard', 'saas'],
    tech: ['React'],
    complexity: 'medium',
    animation_spec: undefined,
    visual_spec: undefined,
    is_pro: false,
    is_published: true,
    license: 'MIT',
    created_at: '2026-04-10T00:00:00.000Z',
    upvotes: 88,
  },
  {
    id: '3',
    slug: 'echo-button',
    name: 'Echo Button',
    category: 'component',
    type: 'button',
    code: 'export default function EchoButton() { return <button>Echo</button> }',
    description: 'A component, not a template.',
    seo_description: 'Button component',
    tags: ['hover'],
    tech: ['React'],
    complexity: 'low',
    animation_spec: undefined,
    visual_spec: undefined,
    is_pro: false,
    is_published: true,
    license: 'MIT',
    created_at: '2026-04-09T00:00:00.000Z',
    upvotes: 40,
  },
]

test('template catalog filters to published template assets only', () => {
  const templates = getTemplateAssets(assets)
  assert.deepEqual(templates.map((asset) => asset.slug), ['orbital-ui', 'signal-board'])
})

test('template detail record falls back to the built-in creative studio sample', () => {
  const fallback = getTempletesDetailRecord({
    slug: TEMPLETES_FALLBACK_SAMPLE_SLUG,
    templateAssets: [],
  })

  assert.equal(fallback?.kind, 'fallback')
  assert.equal(fallback?.slug, TEMPLETES_FALLBACK_SAMPLE_SLUG)
  assert.match(fallback?.name ?? '', /studio/i)
})

test('related content prefers other template assets for template detail pages', () => {
  const primary = getTempletesDetailRecord({
    slug: 'orbital-ui',
    templateAssets: getTemplateAssets(assets),
  })

  assert.ok(primary)
  const related = getRelatedTemplateAssets({
    record: primary!,
    templateAssets: getTemplateAssets(assets),
    fallbackAssets: assets,
  })

  assert.deepEqual(related.map((asset) => asset.slug), ['signal-board', 'echo-button'])
})

test('hero renders the fallback studio sample copy and route CTA', () => {
  const fallback = getTempletesDetailRecord({
    slug: TEMPLETES_FALLBACK_SAMPLE_SLUG,
    templateAssets: [],
  })

  const html = renderToStaticMarkup(
    <TempletesHero spotlight={fallback!} liveTemplateCount={0} />
  )

  assert.match(html, /Templetes/i)
  assert.match(html, /creative studio/i)
  assert.match(html, /Browse marketplace/i)
})
