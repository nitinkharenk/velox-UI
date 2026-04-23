import { Eye, Copy, ThumbsUp, Star } from 'lucide-react'
import { DASHBOARD_TONE } from '@/components/dashboard/dashboardTones'

interface AnalyticsWidgetProps {
  totalViews: number
  totalCopies: number
  totalUpvotes: number
  proCount: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function AnalyticsWidget({ totalViews, totalCopies, totalUpvotes, proCount }: AnalyticsWidgetProps) {
  const stats = [
    { icon: Eye,      label: 'Views',    value: fmt(totalViews),   tone: DASHBOARD_TONE.info },
    { icon: Copy,     label: 'Copies',   value: fmt(totalCopies),  tone: DASHBOARD_TONE.enrich },
    { icon: ThumbsUp, label: 'Upvotes',  value: fmt(totalUpvotes), tone: DASHBOARD_TONE.accent },
    { icon: Star,     label: 'Pro',      value: String(proCount),  tone: DASHBOARD_TONE.success },
  ]

  return (
    <div className="depth-card glass-panel p-6 rounded-[2rem]">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-500 font-bold">
        Performance
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        {stats.map(({ icon: Icon, label, value, tone }) => (
          <div
            key={label}
            className="flex flex-col gap-3 rounded-2xl depth-card p-5 group hover-glow-blue cursor-pointer"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.softBg} transition-transform duration-300 group-hover:scale-110`}>
              <Icon className={`h-4 w-4 ${tone.icon}`} />
            </div>
            <p className="font-extrabold text-2xl leading-none tracking-tight text-[--text-primary] accent-text">
              {value}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
