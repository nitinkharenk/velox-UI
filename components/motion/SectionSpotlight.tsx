'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

interface SectionSpotlightProps {
  color?: string
  size?: number
}

/**
 * Drop inside any `position: relative` section.
 * Attaches to the parent element's mouse events.
 *
 * Uses z-index: 20 + mix-blend-mode: screen so the glow is visible
 * THROUGH solid dark card backgrounds, where screen blending keeps the glow visible.
 */
export default function SectionSpotlight({
  color = 'var(--accent-soft-35)',
  size = 700,
}: SectionSpotlightProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, { stiffness: 80, damping: 20 })
  const y = useSpring(rawY, { stiffness: 80, damping: 20 })

  useEffect(() => {
    const zone = ref.current?.parentElement
    if (!zone) return
    const zoneEl: HTMLElement = zone
    function onEnter() { setActive(true) }
    function onLeave() { setActive(false) }
    function onMove(e: MouseEvent) {
      const rect = zoneEl.getBoundingClientRect()
      rawX.set(e.clientX - rect.left)
      rawY.set(e.clientY - rect.top)
    }
    zoneEl.addEventListener('mouseenter', onEnter)
    zoneEl.addEventListener('mouseleave', onLeave)
    zoneEl.addEventListener('mousemove', onMove)
    return () => {
      zoneEl.removeEventListener('mouseenter', onEnter)
      zoneEl.removeEventListener('mouseleave', onLeave)
      zoneEl.removeEventListener('mousemove', onMove)
    }
  }, [rawX, rawY])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 20 }}
    >
      <motion.div
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          x,
          y,
          translateX: '-50%',
          translateY: '-50%',
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at center, ${color} 0%, transparent 68%)`,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  )
}
