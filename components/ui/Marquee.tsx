import clsx from 'clsx'

interface MarqueeProps {
  items: string[]
  className?: string
  itemClassName?: string
}

export default function Marquee({ items, className, itemClassName }: MarqueeProps) {
  const loopItems = [...items, ...items]

  return (
    <div className={clsx('overflow-hidden', className)}>
      <div className="marquee-track flex min-w-max items-center gap-8">
        {loopItems.map((item, index) => (
          <span key={`${item}-${index}`} className={clsx('shrink-0', itemClassName)}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
