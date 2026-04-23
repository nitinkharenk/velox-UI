'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface MarqueeTrackProps {
  items: React.ReactNode[]
  speed?: number
  reverse?: boolean
  className?: string
  gap?: number
  pauseOnHover?: boolean
}

export default function MarqueeTrack({
  items,
  speed = 60,
  reverse = false,
  className,
  gap = 48,
  pauseOnHover = true,
}: MarqueeTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const totalWidth = track.scrollWidth / 2

      tweenRef.current = gsap.to(track, {
        x: reverse ? totalWidth : -totalWidth,
        duration: totalWidth / speed,
        ease: 'none',
        repeat: -1,
        modifiers: {
          x: gsap.utils.unitize((x) => {
            const w = totalWidth
            return reverse
              ? ((parseFloat(x) % w) + w) % w
              : ((parseFloat(x) % -w) - w) % -w
          }),
        },
      })
    })

    return () => {
      tweenRef.current?.kill()
      mm.revert()
    }
  }, [speed, reverse])

  const handleEnter = () => { if (pauseOnHover) tweenRef.current?.pause() }
  const handleLeave = () => { if (pauseOnHover) tweenRef.current?.play() }

  const doubled = [...items, ...items]

  return (
    <div
      className={`flex overflow-hidden ${className ?? ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        ref={trackRef}
        className="flex shrink-0 min-w-max"
        style={{ gap, willChange: 'transform' }}
      >
        {doubled.map((item, i) => (
          <div key={i} className="flex shrink-0 items-center">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
