'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applyTheme, type PaletteName, type ThemeMode, type ThemeConfig } from '@/lib/themes'
import { THEME_STORAGE_KEY, LEGACY_THEME_STORAGE_KEY } from './theme-config'

const DEFAULT: ThemeConfig = { palette: 'blue', mode: 'dark' }

interface ThemeContextValue {
  palette: PaletteName
  mode: ThemeMode
  setPalette: (name: PaletteName) => void
  toggleMode: () => void
  setTheme: (palette: PaletteName, mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readSavedTheme(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw =
      localStorage.getItem(THEME_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeConfig>
      if (parsed.palette && parsed.mode) {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          localStorage.setItem(THEME_STORAGE_KEY, raw)
          localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
        }
        return parsed as ThemeConfig
      }
    }
  } catch {}
  return DEFAULT
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT)

  useEffect(() => {
    const saved = readSavedTheme()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(saved)
    applyTheme(saved.palette, saved.mode)
  }, [])

  const setTheme = useCallback((palette: PaletteName, mode: ThemeMode) => {
    setConfig({ palette, mode })
    applyTheme(palette, mode)
  }, [])

  const setPalette = useCallback((name: PaletteName) => {
    setConfig(prev => {
      applyTheme(name, prev.mode)
      return { palette: name, mode: prev.mode }
    })
  }, [])

  const toggleMode = useCallback(() => {
    setConfig(prev => {
      const next: ThemeMode = prev.mode === 'dark' ? 'light' : 'dark'
      applyTheme(prev.palette, next)
      return { palette: prev.palette, mode: next }
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ palette: config.palette, mode: config.mode, setPalette, toggleMode, setTheme }),
    [config, setPalette, toggleMode, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
