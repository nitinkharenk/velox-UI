import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialThemeScript } from '../../lib/getInitialTheme.js'
import { PALETTES } from '../../lib/themes.js'

test('initialThemeScript is a non-empty string', () => {
  assert.equal(typeof initialThemeScript, 'string')
  assert.ok(initialThemeScript.length > 100)
})

test('initialThemeScript sets all 5 palette CSS vars', () => {
  assert.ok(initialThemeScript.includes('--velox-palette-bg'))
  assert.ok(initialThemeScript.includes('--velox-palette-accent'))
  assert.ok(initialThemeScript.includes('--velox-palette-surface'))
  assert.ok(initialThemeScript.includes('--velox-palette-muted'))
  assert.ok(initialThemeScript.includes('--velox-palette-base'))
})

test('initialThemeScript reads velox-theme storage key', () => {
  assert.ok(initialThemeScript.includes('"velox-theme"') || initialThemeScript.includes("'velox-theme'"))
})

test('initialThemeScript reads legacy veloxui-theme key as fallback', () => {
  assert.ok(initialThemeScript.includes('"veloxui-theme"') || initialThemeScript.includes("'veloxui-theme'"))
})

test('initialThemeScript sets dataset.theme attribute', () => {
  assert.ok(initialThemeScript.includes('dataset.theme'))
})

test('initialThemeScript contains all 10 palette names', () => {
  for (const name of ['blue', 'red', 'green', 'purple', 'yellow', 'cyan', 'orange', 'beige', 'pure_red', 'monochrome']) {
    assert.ok(initialThemeScript.includes(name), `missing palette: ${name}`)
  }
})

test('palette color data in script matches lib/themes.ts (drift check)', () => {
  for (const p of PALETTES) {
    const colorsJson = JSON.stringify(p.colors)
    assert.ok(
      initialThemeScript.includes(colorsJson),
      `palette "${p.name}" colors in script do not match lib/themes.ts: expected ${colorsJson}`,
    )
  }
})
