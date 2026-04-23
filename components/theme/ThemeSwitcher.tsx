'use client'

import { PALETTES } from '@/lib/themes'
import { useTheme } from './ThemeProvider'

export default function ThemeSwitcher() {
  const { palette, mode, setPalette, toggleMode } = useTheme()

  return (
    <div className="flex items-center gap-2">
      {PALETTES.map((p) => (
        <button
          key={p.name}
          type="button"
          onClick={() => setPalette(p.name)}
          aria-label={`Switch to ${p.name} palette`}
          style={{ backgroundColor: p.colors[1] }}
          className={[
            'h-5 w-5 rounded-full transition-all duration-200',
            palette === p.name
              ? 'scale-110 ring-2 ring-offset-2 ring-[--velox-palette-base] ring-offset-[--velox-palette-bg]'
              : 'opacity-60 hover:opacity-100 hover:scale-105',
          ].join(' ')}
        />
      ))}

      <button
        type="button"
        onClick={toggleMode}
        aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[--velox-palette-muted] text-[--velox-palette-base] transition-all duration-200 hover:bg-[--velox-palette-surface]"
      >
        {mode === 'dark' ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </div>
  )
}
