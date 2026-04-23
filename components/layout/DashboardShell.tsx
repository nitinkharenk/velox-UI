'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { DASHBOARD_NAV_SECTIONS } from './dashboardConfig'
import { STUDIO_NAV_SECTIONS } from './studioConfig'

interface DashboardShellProps {
  children: React.ReactNode
  navVariant?: 'dashboard' | 'studio'
}

export default function DashboardShell({
  children,
  navVariant = 'dashboard',
}: DashboardShellProps) {
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const currentPath = pathname ?? ''
  const mobileOpen = mobileOpenPath === currentPath
  const navSections = navVariant === 'studio' ? STUDIO_NAV_SECTIONS : DASHBOARD_NAV_SECTIONS

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  return (
    <div className="dashboard-shell dashboard-theme flex h-screen w-full flex-col overflow-hidden bg-[--dashboard-background] text-[--dashboard-text]">
      <button
        type="button"
        onClick={() => setMobileOpenPath(currentPath)}
        aria-label="Open navigation"
        className="fixed left-4 top-4 z-[80] inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[--dashboard-border] bg-[--dashboard-panel]/90 text-[--dashboard-text] shadow-[var(--shadow-lift)] backdrop-blur-xl transition-colors hover:border-[--dashboard-accent-border] hover:text-[--dashboard-accent] md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Desktop sidebar ───────────────────────────────────── */}
        <div className="hidden md:flex md:shrink-0">
          <Sidebar sections={navSections} />
        </div>

        {/* ── Mobile sidebar overlay ───────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[70] bg-[var(--surface-scrim)] backdrop-blur-[4px] md:hidden"
            onClick={() => setMobileOpenPath(null)}
          >
            <div
              className="h-full w-[240px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar sections={navSections} onNavigate={() => setMobileOpenPath(null)} />
            </div>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────── */}
        <main
          ref={mainRef}
          className="dashboard-main relative z-0 flex-1 overflow-y-auto bg-[--dashboard-surface] px-4 pb-16 pt-20 sm:px-6 md:pt-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
