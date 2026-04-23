import { getDashboardData } from '@/lib/db/assets'
import PipelineFunnelWidget from '@/components/dashboard/widgets/PipelineFunnelWidget'
import AnalyticsWidget from '@/components/dashboard/widgets/AnalyticsWidget'
import ActivityFeedWidget from '@/components/dashboard/widgets/ActivityFeedWidget'
import OverviewSection from '@/components/dashboard/OverviewSection'
import { Boxes, Clock3, Copy, Eye } from 'lucide-react'

function formatMetric(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const metrics = [
    {
      label: "Published",
      value: data.publishedCount.toLocaleString(),
      trend: data.weeklyDelta > 0 ? `+${data.weeklyDelta} this week` : 'No weekly change',
      icon: Boxes,
      tone: 'accent' as const,
    },
    {
      label: "In Review",
      value: data.inReviewCount.toLocaleString(),
      trend: "Awaiting approval",
      icon: Clock3,
      tone: 'info' as const,
    },
    {
      label: "Total Views",
      value: formatMetric(data.totalViews),
      trend: "Library traffic",
      icon: Eye,
      tone: 'info' as const,
    },
    {
      label: "Code Copies",
      value: formatMetric(data.totalCopies),
      trend: "Reuse signal",
      icon: Copy,
      tone: 'success' as const,
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4">
      <OverviewSection metrics={metrics} />

      {/* 3fr / 2fr split */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PipelineFunnelWidget stages={data.stages} />

        <div className="flex flex-col gap-4">
          <AnalyticsWidget
            totalViews={data.totalViews}
            totalCopies={data.totalCopies}
            totalUpvotes={data.totalUpvotes}
            proCount={data.proCount}
          />
          <ActivityFeedWidget events={data.recentActivity} />
        </div>
      </div>

    </div>
  )
}
