import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('inventory and review open valid preview routes', async () => {
  const [inventorySource, reviewSource] = await Promise.all([
    readFile(path.join(process.cwd(), 'app/(dashboard)/pipeline/inventory/page.tsx'), 'utf8'),
    readFile(path.join(process.cwd(), 'app/(dashboard)/pipeline/review/page.tsx'), 'utf8'),
  ])

  assert.match(inventorySource, /window\.open\(`\/preview\/\$\{asset\.slug\}`/)
  assert.match(reviewSource, /window\.open\(`\/preview\/\$\{selected\.slug \?\? `idea-\$\{selected\.id\}`\}`/)
})

test('preview pages exist for saved assets and live inline previews', async () => {
  const [slugPreviewSource, livePreviewSource, assetPreviewSource] = await Promise.all([
    readFile(path.join(process.cwd(), 'app/preview/[slug]/page.tsx'), 'utf8'),
    readFile(path.join(process.cwd(), 'app/preview/live/page.tsx'), 'utf8'),
    readFile(path.join(process.cwd(), 'components/assets/AssetPreview.tsx'), 'utf8'),
  ])

  assert.match(slugPreviewSource, /api\/preview\/compile\?slug=/)
  assert.match(livePreviewSource, /getLivePreviewStorageKey/)
  assert.match(assetPreviewSource, /const previewPageHref = `\/preview\/\$\{slug\}`/)
  assert.match(assetPreviewSource, /const previewHref = `\/preview\/live\?id=/)
})
