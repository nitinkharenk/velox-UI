import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PublicDiscoverGallery, * as discover from '../components/assets/PublicDiscoverGallery'
import type { Asset } from '../types/asset'

const assets: Asset[] = [
  {
    id: '1',
    slug: 'orbit-button',
    name: 'Orbit Button',
    category: 'component',
    type: 'button',
    code: 'export default function OrbitButton() { return <button>Orbit</button> }',
    description: 'A magnetic button with halo motion.',
    seo_description: 'A magnetic button.',
    tags: ['hover', 'magnetic'],
    tech: ['React', 'Framer Motion'],
    complexity: 'medium',
    animation_spec: undefined,
    visual_spec: undefined,
    is_pro: true,
    is_published: true,
    license: 'MIT',
    created_at: '2026-04-09T00:00:00.000Z',
    upvotes: 220,
  },
  {
    id: '2',
    slug: 'signal-hero',
    name: 'Signal Hero',
    category: 'template',
    type: 'hero',
    code: 'export default function SignalHero() { return <section>Signal</section> }',
    description: 'A layered hero with motion-aware typography.',
    seo_description: 'A layered hero.',
    tags: ['hero', 'editorial'],
    tech: ['React', 'GSAP'],
    complexity: 'high',
    animation_spec: undefined,
    visual_spec: undefined,
    is_pro: false,
    is_published: true,
    license: 'MIT',
    created_at: '2026-04-08T00:00:00.000Z',
    upvotes: 180,
  },
  {
    id: '3',
    slug: 'ripple-tabs',
    name: 'Ripple Tabs',
    category: 'component',
    type: 'tabs',
    code: 'export default function RippleTabs() { return <div>Tabs</div> }',
    description: 'Animated tabs with liquid ink transitions.',
    seo_description: 'Animated tabs.',
    tags: ['navigation', 'hover'],
    tech: ['React'],
    complexity: 'low',
    animation_spec: undefined,
    visual_spec: undefined,
    is_pro: false,
    is_published: true,
    license: 'MIT',
    created_at: '2026-04-07T00:00:00.000Z',
    upvotes: 75,
  },
  {
    id: '4',
    slug: 'echo-card',
    name: 'Echo Card',
    category: 'component',
    type: 'card',
    code: 'export default function EchoCard() { return <article>Card</article> }',
    description: 'A card stack with soft parallax.',
    seo_description: 'Parallax card stack.',
    tags: ['card', 'stack'],
    tech: ['React'],
    complexity: 'medium',
    animation_spec: undefined,
    visual_spec: undefined,
    is_pro: false,
    is_published: true,
    license: 'MIT',
    created_at: '2026-04-06T00:00:00.000Z',
    upvotes: 24,
  },
]

test('exports tested discovery helpers for featured assets and filtering', () => {
  assert.equal(typeof discover.getFeaturedAssets, 'function')
  assert.equal(typeof discover.getDiscoverTabs, 'function')
  assert.equal(typeof discover.filterAndSortAssets, 'function')

  const featured = discover.getFeaturedAssets(assets)
  assert.deepEqual(
    featured.map((asset) => asset.slug),
    ['orbit-button', 'signal-hero', 'ripple-tabs', 'echo-card']
  )

  const filtered = discover.filterAndSortAssets({
    assets,
    activeTab: 'hover',
    query: 'button',
    sortMode: 'popular',
  })

  assert.deepEqual(filtered.map((asset) => asset.slug), ['orbit-button'])
})

test('renders a featured picks rail for populated libraries', () => {
  const html = renderToStaticMarkup(
    <PublicDiscoverGallery assets={assets} initialQuery="" />
  )

  assert.match(html, /Featured picks/i)
  assert.match(html, /Orbit Button/i)
  assert.match(html, /Signal Hero/i)
})

test('offers a clear-search action when nothing matches', () => {
  const html = renderToStaticMarkup(
    <PublicDiscoverGallery assets={assets} initialQuery="no such component" />
  )

  assert.match(html, /Clear search/i)
  assert.match(html, /No components matched this search/i)
})
