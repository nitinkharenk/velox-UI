'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ClipRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  /** Trigger scroll position, e.g. 'top 85%' */
  start?: string
  /** Direction: 'up' (default) clips from bottom, 'left' clips from right */
  direction?: 'up' | 'left'
}

export default function ClipReveal({
  children,
  className,
  delay = 0,
  duration = 0.9,
  start = 'top 85%',
  direction = 'up',
}: ClipRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const fromClip = direction === 'up'
        ? 'inset(0 0 100% 0)'
        : 'inset(0 100% 0 0)'
      const toClip = 'inset(0 0 0% 0)'

      gsap.fromTo(
        el,
        { clipPath: fromClip, opacity: 0 },
        {
          clipPath: toClip,
          opacity: 1,
          duration,
          delay,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: el,
            start,
            once: true,
          },
        }
      )
    })

    return () => mm.revert()
  }, [delay, duration, start, direction])

  return (
    <div ref={ref} className={className} style={{ willChange: 'clip-path, opacity' }}>
      {children}
    </div>
  )
}
