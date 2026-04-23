import Link from 'next/link'

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { href: '/components', label: 'All components' },
      { href: '/components?q=animation', label: 'Animation library' },
      { href: '/components?q=hero', label: 'Hero sections' },
      { href: '/components?q=button', label: 'Buttons & triggers' },
    ],
  },
  {
    title: 'Pipeline',
    links: [
      { href: '/pipeline', label: 'Pipeline overview' },
      { href: '/pipeline/ideas', label: 'Ideas backlog' },
      { href: '/pipeline/generate', label: 'Generate' },
      { href: '/pipeline/review', label: 'Review queue' },
    ],
  },
  {
    title: 'Workspace',
    links: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/login', label: 'Log in' },
      { href: '/components?sort=popular', label: 'Popular picks' },
      { href: '/components?tag=experimental', label: 'Experimental' },
    ],
  },
]

export default function LandingFooter() {
  return (
    <footer className="relative overflow-hidden bg-[--bg-base] px-6 pb-10 pt-20 lg:px-10" style={{ borderTop: '1px solid var(--border-subtle)' }}>

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 10% 0%, var(--accent-soft-06), transparent)' }}
      />

      <div className="relative mx-auto max-w-[1440px]">
        {/* Top */}
        <div className="mb-16 grid gap-16 lg:grid-cols-[1.2fr_1fr]">

          {/* Brand */}
          <div>
            <div
              className="mb-1 uppercase leading-[0.88] tracking-[0.02em] text-[--text-primary]"
              style={{
                fontFamily: 'var(--font-bebas-neue, "Bebas Neue", sans-serif)',
                fontSize: 'clamp(48px,6vw,80px)',
              }}
            >
              Velox{' '}
              <span style={{ color: 'var(--accent)' }}>UI</span>
            </div>
            <p
              className="mb-8 max-w-[380px] text-[14px] leading-[1.75] text-[--text-secondary]"
              style={{ fontFamily: 'var(--font-space-grotesk, "Space Grotesk", sans-serif)' }}
            >
              Motion-focused components, ready for production. Browse the public library, explore the pipeline, and move from inspiration to implementation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/components"
                className="group flex items-center gap-2 bg-[--accent] px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[--accent-contrast] transition-all duration-300 hover:bg-[--text-primary] hover:text-[--bg-base]"
              >
                Browse library
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[--text-secondary] transition-all duration-300 hover:text-[--text-primary]"
                style={{ border: '1px solid var(--border-default)' }}
              >
                Open dashboard
              </Link>
            </div>
          </div>

          {/* Links */}
          <div className="grid gap-8 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.26em] text-[--accent]">
                  {group.title}
                </p>
                <div className="space-y-3">
                  {group.links.map((link) => (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      className="group flex items-center font-mono text-[11px] uppercase tracking-[0.12em] text-[--text-secondary] transition-all duration-300 hover:text-[--accent]"
                    >
                      <span className="mr-0 h-[1px] w-0 bg-[--accent] transition-all duration-300 group-hover:mr-2 group-hover:w-3" />
                      <span className="transition-transform duration-300 group-hover:translate-x-1">{link.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[--text-tertiary]">
            © 2026 <span style={{ color: 'var(--accent)' }}>Velox UI</span>. Built for developers who care about motion.
          </p>
          <div className="flex flex-wrap gap-6">
            {[
              { href: '/', label: 'Home' },
              { href: '/components', label: 'Components' },
              { href: '/pipeline', label: 'Pipeline' },
              { href: '/dashboard', label: 'Dashboard' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative font-mono text-[11px] uppercase tracking-[0.14em] text-[--text-secondary] transition-colors duration-300 hover:text-[--accent]"
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[--accent] transition-all duration-300 ease-out group-hover:w-full" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
