import Link from 'next/link'
import { DASHBOARD_TONE } from '@/components/dashboard/dashboardTones'

interface HeroWidgetProps {
  publishedCount: number
  weeklyDelta: number
  inReviewCount: number
  totalViews: number
  totalCopies: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function HeroWidget({
  publishedCount,
  weeklyDelta,
  inReviewCount,
  totalViews,
  totalCopies,
}: HeroWidgetProps) {
  const pct = Math.min(publishedCount / Math.max(publishedCount + inReviewCount, 1), 1)
  const r = 34
  const circ = 2 * Math.PI * r
  const dashOffset = circ * (1 - pct * 0.82)

  const stats = [
    { label: 'In review', value: inReviewCount, href: '/pipeline/review', tone: DASHBOARD_TONE.accent },
    { label: 'Total views', value: fmt(totalViews), href: null, tone: DASHBOARD_TONE.info },
    { label: 'Code copies', value: fmt(totalCopies), href: null, tone: DASHBOARD_TONE.success },
  ]

  return (
    <div className="relative overflow-hidden depth-card glass-panel p-6 sm:p-10 rounded-[2rem] hover-glow-blue group">
      {/* Background number watermark */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -bottom-4 select-none font-extrabold leading-none text-[#0465ED] opacity-[0.05] transition-opacity group-hover:opacity-[0.08]"
        style={{ fontSize: '10rem' }}
      >
        {publishedCount}
      </span>

      <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">

        {/* Primary stat */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#0465ED] font-bold">
            Published Inventory
          </p>
          <p
            className="mt-3 font-extrabold leading-none tracking-tight text-[--text-primary] accent-text"
            style={{ fontSize: 'clamp(3rem, 7vw, 5rem)' }}
          >
            {publishedCount.toLocaleString()}
          </p>
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">active components in library</p>

          {weeklyDelta > 0 && (
            <span
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#0465ED] font-bold"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                <path d="M5 8.5V1.5M5 1.5L2 4.5M5 1.5L8 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              +{weeklyDelta} since last week
            </span>
          )}
        </div>

        {/* Right: progress indicator + breakout stats */}
        <div className="flex flex-col items-start gap-6 sm:items-end">
          <div className="relative flex items-center justify-center">
            <svg width="90" height="90" viewBox="0 0 80 80" aria-hidden className="hidden sm:block">
              <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" className="text-gray-200 dark:text-white/5" strokeWidth="6" />
              <circle
                cx="40" cy="40" r={r}
                fill="none"
                stroke="#0465ED"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)', filter: 'drop-shadow(0 0 4px rgba(4, 101, 237, 0.3))' }}
              />
            </svg>
            <span className="absolute hidden sm:block font-bold text-xs text-[--text-primary]">
               {Math.round(pct * 100)}%
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {stats.map(({ label, value, href, tone }) => {
              const cls = "p-3 rounded-xl depth-card cursor-pointer flex items-center gap-3 transition-all duration-300"
              const content = (
                <>
                  <div className={`w-2 h-2 rounded-full ${tone.dot} shadow-[0_0_8px_currentColor] transition-all`} style={{ color: tone.var }}></div>
                  <span className="text-xs font-bold text-[--text-primary] whitespace-nowrap">{value} <span className="text-gray-500 font-medium">{label}</span></span>
                </>
              )

              return href ? (
                <Link key={label} href={href} className={cls}>{content}</Link>
              ) : (
                <div key={label} className={cls}>{content}</div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
