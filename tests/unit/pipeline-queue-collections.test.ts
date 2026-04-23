import test from 'node:test'
import assert from 'node:assert/strict'

import {
  collectStringFacetValues,
  filterQueueItems,
  paginateItems,
} from '@/lib/pipeline/queueCollections'

const ITEMS = [
  { id: '1', name: 'Alpha Card', category: 'cards', type: 'motion', status: 'ready' },
  { id: '2', name: 'Beta Modal', category: 'modals', type: 'overlay', status: 'failed' },
  { id: '3', name: 'Gamma Card', category: 'cards', type: 'overlay', status: 'ready' },
]

test('filterQueueItems matches query, category, type, and optional status filters', () => {
  assert.deepEqual(
    filterQueueItems(ITEMS, {
      query: 'card',
      category: 'cards',
      type: 'all',
      status: 'ready',
    }).map((item) => item.id),
    ['1', '3'],
  )

  assert.deepEqual(
    filterQueueItems(ITEMS, {
      query: '',
      category: 'all',
      type: 'overlay',
    }).map((item) => item.id),
    ['2', '3'],
  )
})

test('collectStringFacetValues returns sorted unique non-empty values', () => {
  assert.deepEqual(collectStringFacetValues(ITEMS, 'category'), ['cards', 'modals'])
  assert.deepEqual(collectStringFacetValues(ITEMS, 'type'), ['motion', 'overlay'])
})

test('paginateItems returns bounded page counts and visible slices', () => {
  const pageOne = paginateItems(ITEMS, 1, 2)
  assert.equal(pageOne.totalPages, 2)
  assert.deepEqual(pageOne.items.map((item) => item.id), ['1', '2'])

  const pageTwo = paginateItems(ITEMS, 2, 2)
  assert.equal(pageTwo.totalPages, 2)
  assert.deepEqual(pageTwo.items.map((item) => item.id), ['3'])

  const empty = paginateItems([], 4, 10)
  assert.equal(empty.totalPages, 1)
  assert.deepEqual(empty.items, [])
})
