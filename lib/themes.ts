import { THEME_STORAGE_KEY } from '@/components/theme/theme-config'

export type PaletteName =
  | 'blue' | 'red' | 'green' | 'purple' | 'yellow'
  | 'cyan' | 'orange' | 'beige' | 'pure_red' | 'monochrome'

export type ThemeMode = 'light' | 'dark'

export interface ThemeConfig {
  palette: PaletteName
  mode: ThemeMode
}

export interface PaletteEntry {
  name: PaletteName
  colors: [string, string, string, string, string]
}

export const PALETTES: PaletteEntry[] = [
  { name: 'blue',       colors: ['#F9F9FA', '#0465ED', '#03354E', '#808180', '#131314'] },
  { name: 'red',        colors: ['#F9F9FA', '#F93E39', '#131314', '#808180', '#000000'] },
  { name: 'green',      colors: ['#F9F9FA', '#07AA73', '#03354E', '#808180', '#131314'] },
  { name: 'purple',     colors: ['#F9F9FA', '#642EF6', '#1A103F', '#808180', '#131314'] },
  { name: 'yellow',     colors: ['#F9F9FA', '#FACA06', '#131314', '#808180', '#000000'] },
  { name: 'cyan',       colors: ['#F9F9FA', '#15CBFD', '#0A4F63', '#808180', '#131314'] },
  { name: 'orange',     colors: ['#F9F9FA', '#FF5A1F', '#3A1F2D', '#808180', '#131314'] },
  { name: 'beige',      colors: ['#F9F9FA', '#D3C6C2', '#6E6A67', '#131314', '#000000'] },
  { name: 'pure_red',   colors: ['#F9F9FA', '#FF2A2A', '#131314', '#808180', '#000000'] },
  { name: 'monochrome', colors: ['#FFFFFF', '#CFCFCF', '#808080', '#333333', '#000000'] },
]

export function getCssVars(
  palette: PaletteName,
  mode: ThemeMode,
): Record<string, string> {
  const p = PALETTES.find(p => p.name === palette)!
  const [c0, c1, c2, c3, c4] = p.colors

  if (mode === 'light') {
    return {
      '--velox-palette-bg':      c0,
      '--velox-palette-accent':  c1,
      '--velox-palette-surface': c2,
      '--velox-palette-muted':   c3,
      '--velox-palette-base':    c4,
    }
  }

  return {
    '--velox-palette-bg':      c4,
    '--velox-palette-accent':  c1,
    '--velox-palette-surface': c2,
    '--velox-palette-muted':   c3,
    '--velox-palette-base':    c0,
  }
}

export function applyTheme(palette: PaletteName, mode: ThemeMode): void {
  if (typeof window === 'undefined') return
  const vars = getCssVars(palette, mode)
  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value)
  }
  document.documentElement.dataset.theme = mode
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ palette, mode }))
}
