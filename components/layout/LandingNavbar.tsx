'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const C = {
  fg: 'var(--text-primary)',
  fgSub: 'var(--text-secondary)',
  fgMuted: 'var(--text-tertiary)',
  border: 'var(--border-subtle)',
  accent: 'var(--accent)',
}

const FONT_MONO = 'var(--font-geist-mono, monospace)'
const FONT_DISPLAY = 'var(--font-bebas-neue, "Bebas Neue", sans-serif)'

const navLinks = [
  { href: '/components', label: 'Explore' },
  { href: '/templetes', label: 'Templates' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/components?sort=popular', label: 'Community' },
]

function isActive(href: string, pathname: string) {
  return pathname === href.split('?')[0]
}

export default function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    function onScroll() { setIsScrolled(window.scrollY > 24) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div
          style={isScrolled ? {
            borderBottom: `1px solid ${C.border}`,
            background: 'var(--glass-surface)',
            backdropFilter: 'blur(20px)',
          } : {}}
          className="flex items-center justify-between px-6 py-4 transition-all duration-500 lg:px-10"
        >
          {/* Logo */}
          <Link
            href="/"
            style={{ fontFamily: FONT_DISPLAY, color: C.fg, fontSize: 22, letterSpacing: '0.04em' }}
            className="transition-colors duration-200 hover:text-[--accent]"
          >
            VELOX UI
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => {
              const active = isActive(link.href, pathname)
              return (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    color: active ? C.accent : C.fgSub,
                  }}
                  className="transition-colors duration-200 hover:text-[--velox-cream]"
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-4 lg:flex">
            <Link
              href="/login"
              style={{ fontFamily: FONT_MONO, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.fgSub }}
              className="transition-colors duration-200 hover:text-[--velox-cream]"
            >
              Log in
            </Link>
            <ThemeToggle />
            <Link
              href="/dashboard"
              style={{ fontFamily: FONT_MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', background: C.accent, color: 'var(--accent-contrast)', padding: '10px 20px' }}
              className="transition-all duration-200 hover:bg-white hover:text-[--velox-ink]"
            >
              Open Pipeline
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-end gap-[5px] lg:hidden"
          >
            <span className="h-px w-6 transition-all duration-300" style={{ background: C.fg }} />
            <span className="h-px w-4 transition-all duration-300" style={{ background: C.fg }} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-[--velox-ink] lg:hidden"
          >
            <div className="flex h-full flex-col px-6 py-6">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  style={{ fontFamily: FONT_DISPLAY, color: C.fg, fontSize: 22, letterSpacing: '0.04em' }}
                >
                  VELOX UI
                </Link>
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setIsOpen(false)}
                    style={{ fontFamily: FONT_MONO, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.fgMuted }}
                  >
                    Close
                  </button>
                </div>
              </div>

              <nav className="mt-16 flex flex-col gap-2" aria-label="Mobile navigation">
                {[...navLinks, { href: '/login', label: 'Log in' }, { href: '/dashboard', label: 'Open Pipeline' }].map((link, i) => (
                  <motion.div
                    key={link.href + link.label}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      style={{
                        display: 'block',
                        borderBottom: `1px solid ${C.border}`,
                        padding: '20px 0',
                        fontFamily: FONT_DISPLAY,
                        fontSize: 'clamp(32px, 7vw, 56px)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: C.fg,
                      }}
                      className="transition-colors duration-200 hover:text-[--accent]"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="mt-auto">
                <p style={{ fontFamily: FONT_MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.fgMuted }}>
                  Motion-focused components
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
