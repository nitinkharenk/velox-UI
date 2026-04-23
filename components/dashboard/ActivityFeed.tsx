export interface ActivityItem {
  id: string
  title: string
  description: string
}

export function ActivityFeed({
  title,
  items,
  className = '',
}: {
  title: string
  items: ActivityItem[]
  className?: string
}) {
  return (
    <article className={`surface-panel rounded-[1.8rem] p-5 sm:p-6 ${className}`}>
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-[--text-primary]">{title}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="group flex items-start gap-3 rounded-2xl border border-[--border-subtle] bg-[--bg-elevated] p-4 transition-all duration-200 hover:translate-x-1 hover:border-[--accent-border] hover:bg-[--bg-hover]"
          >
            <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[--accent]" />
            <div>
              <h3 className="text-sm font-semibold text-[--text-primary]">{item.title}</h3>
              <p className="mt-1 text-xs leading-6 text-[--text-secondary]">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}

export default ActivityFeed
