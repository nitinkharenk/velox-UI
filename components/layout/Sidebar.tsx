'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Moon, Sun } from 'lucide-react'
import { DASHBOARD_NAV_SECTIONS } from './dashboardConfig'
import type { DashboardNavSection } from './dashboardConfig'
import { useTheme } from '@/components/theme/ThemeProvider'

interface SidebarProps {
  onNavigate?: () => void
  sections?: DashboardNavSection[]
}

function subscribe() { return () => undefined }

export function Sidebar({ onNavigate, sections = DASHBOARD_NAV_SECTIONS }: SidebarProps) {
  const path = usePathname()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const { mode, toggleMode } = useTheme()
  const current = mounted ? path : ''

  return (
    <aside
      className="glass-panel flex h-full w-[220px] shrink-0 flex-col border-r border-white/10 z-40 relative shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]"
    >
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-8">
        {sections.map((section) => (
          <div key={section.label} className="space-y-3">
            <p className="px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-500 font-bold">
              {section.label}
            </p>
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = item.match.test(current)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    data-active={active}
                    className={`block p-3 rounded-lg cursor-pointer transition-all duration-300 flex items-center justify-between group
                      ${active 
                        ? 'depth-card hover-glow-blue text-[#0465ED]' 
                        : 'hover:bg-gray-200/50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-[#0465ED]' : 'group-hover:text-gray-900 dark:group-hover:text-white'}`}
                      />
                      <span className="truncate font-semibold text-sm accent-text">{item.label}</span>
                    </div>
                    {item.badge != null && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                          active
                            ? 'bg-blue-100/50 dark:bg-blue-900/20 text-[#0465ED]'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 px-4 py-4">
        <button
          type="button"
          onClick={toggleMode}
          aria-label="Toggle theme"
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/40 px-3 py-3 text-left text-sm font-semibold text-[--dashboard-text] transition-colors hover:border-[--dashboard-accent-border] hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <span>{mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[--dashboard-surface-muted] text-[--dashboard-accent]">
            {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
        </button>
      </div>

      {/* Footer Branding */}
      <div className="flex items-center gap-3 border-t border-white/5 px-6 py-6">
        <div className="h-2 w-2 rounded-full bg-[--dashboard-accent] shadow-[0_0_8px_var(--dashboard-accent)]"></div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Live Status</span>
      </div>
    </aside>
  )
}

export default Sidebar
