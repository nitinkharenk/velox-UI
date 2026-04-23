import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getCssVars, PALETTES } from '../../lib/themes.js'

test('PALETTES has exactly 10 entries', () => {
  assert.equal(PALETTES.length, 10)
})

test('PALETTES contains expected names', () => {
  const names = PALETTES.map(p => p.name)
  assert.deepEqual(names, [
    'blue', 'red', 'green', 'purple', 'yellow',
    'cyan', 'orange', 'beige', 'pure_red', 'monochrome',
  ])
})

test('getCssVars - blue light mode returns correct values', () => {
  const vars = getCssVars('blue', 'light')
  assert.equal(vars['--velox-palette-bg'],      '#F9F9FA')
  assert.equal(vars['--velox-palette-accent'],  '#0465ED')
  assert.equal(vars['--velox-palette-surface'], '#03354E')
  assert.equal(vars['--velox-palette-muted'],   '#808180')
  assert.equal(vars['--velox-palette-base'],    '#131314')
})

test('getCssVars - blue dark mode inverts bg and base, keeps others', () => {
  const vars = getCssVars('blue', 'dark')
  assert.equal(vars['--velox-palette-bg'],      '#131314')
  assert.equal(vars['--velox-palette-accent'],  '#0465ED')
  assert.equal(vars['--velox-palette-surface'], '#03354E')
  assert.equal(vars['--velox-palette-muted'],   '#808180')
  assert.equal(vars['--velox-palette-base'],    '#F9F9FA')
})

test('getCssVars - returns exactly 5 keys', () => {
  const vars = getCssVars('purple', 'light')
  assert.deepEqual(Object.keys(vars).sort(), [
    '--velox-palette-accent',
    '--velox-palette-base',
    '--velox-palette-bg',
    '--velox-palette-muted',
    '--velox-palette-surface',
  ])
})

test('getCssVars - monochrome light mode', () => {
  const vars = getCssVars('monochrome', 'light')
  assert.equal(vars['--velox-palette-bg'],      '#FFFFFF')
  assert.equal(vars['--velox-palette-accent'],  '#CFCFCF')
  assert.equal(vars['--velox-palette-surface'], '#808080')
  assert.equal(vars['--velox-palette-muted'],   '#333333')
  assert.equal(vars['--velox-palette-base'],    '#000000')
})

test('applyTheme - does not throw in non-DOM environment (Node.js)', async () => {
  const { applyTheme } = await import('../../lib/themes.js')
  // In Node.js, typeof window === 'undefined', so applyTheme should return silently
  assert.doesNotThrow(() => applyTheme('blue', 'light'))
})
