export function Divider({ label }: { label?: string }) {
  if (!label) {
    return <div className="h-px w-full bg-[--border-subtle]" />
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-[--border-subtle]" />
      <span className="font-body text-[10px] uppercase tracking-[0.18em] text-[--text-tertiary]">{label}</span>
      <div className="h-px flex-1 bg-[--border-subtle]" />
    </div>
  )
}
