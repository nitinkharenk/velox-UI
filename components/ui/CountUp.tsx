'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
}

export default function CountUp({ end, duration = 1800, suffix = '', prefix = '' }: CountUpProps) {
  const [value, setValue] = useState(0)
  const hasAnimatedRef = useRef(false)
  const elementRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const node = elementRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasAnimatedRef.current) return
        hasAnimatedRef.current = true

        const start = performance.now()
        const initialValue = 0

        function tick(now: number) {
          const elapsed = now - start
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          const nextValue = Math.round(initialValue + (end - initialValue) * eased)
          setValue(nextValue)

          if (progress < 1) {
            window.requestAnimationFrame(tick)
          }
        }

        window.requestAnimationFrame(tick)
        observer.disconnect()
      },
      { threshold: 0.35 }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [duration, end])

  const formatted = useMemo(() => value.toLocaleString('en-US'), [value])

  return (
    <span ref={elementRef}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
