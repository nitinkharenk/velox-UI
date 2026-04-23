'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { toggleMode } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleMode}
      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface] text-[--text-secondary] transition-all duration-300 hover:border-[--border-strong] hover:bg-[--bg-hover] hover:text-[--text-primary]"
      aria-label="Toggle theme"
    >
      <Sun className="absolute h-4 w-4 rotate-0 scale-100 opacity-100 transition-all duration-200 dark:rotate-90 dark:scale-50 dark:opacity-0" />
      <Moon className="absolute h-4 w-4 -rotate-90 scale-50 opacity-0 transition-all duration-200 dark:rotate-0 dark:scale-100 dark:opacity-100" />
    </button>
  )
}
