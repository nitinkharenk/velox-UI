import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { DASHBOARD_TONE } from '@/components/dashboard/dashboardTones'

interface ActivityEvent {
  name: string
  status: 'published' | 'review' | 'generating' | 'enriched'
  updatedAt: string
}

function rel(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return `${d}s`
  if (d < 3600) return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

const STATUS: Record<ActivityEvent['status'], { label: string; tone: typeof DASHBOARD_TONE[keyof typeof DASHBOARD_TONE] }> = {
  published:  { label: 'Live',       tone: DASHBOARD_TONE.success },
  review:     { label: 'Review',     tone: DASHBOARD_TONE.accent },
  generating: { label: 'Generating', tone: DASHBOARD_TONE.warning },
  enriched:   { label: 'Enriched',   tone: DASHBOARD_TONE.info },
}

export default function ActivityFeedWidget({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="flex flex-col depth-card glass-panel p-6 rounded-[2rem]">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-500 font-bold">
        Recent Activity
      </p>

      <div className="mt-5 flex-1">
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">No recent activity.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((evt, i) => {
              const meta = STATUS[evt.status]
              return (
                <li
                  key={i}
                  className="p-3 rounded-xl depth-card hover-glow-blue cursor-pointer flex justify-between items-center group transition-all duration-300"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <div 
                      className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]`}
                      style={{ color: meta.tone.var }}
                    ></div>
                    <span className="truncate text-[13px] font-semibold text-gray-700 dark:text-gray-200 accent-text">
                      {evt.name}
                    </span>
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`rounded-lg px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] ${meta.tone.softBg} ${meta.tone.text}`}>
                      {meta.label}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      {rel(evt.updatedAt)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Link
        href="/pipeline"
        className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#0465ED] font-bold transition-opacity hover:opacity-80"
      >
        View all activity
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
