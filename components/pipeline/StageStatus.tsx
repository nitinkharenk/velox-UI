import StatusDot from '@/components/ui/StatusDot'

interface StageStatusProps {
  status: string
}

export default function StageStatus({ status }: StageStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <StatusDot status={status} />
      <span className="text-xs text-[--text-tertiary] capitalize">{status}</span>
    </div>
  )
}
