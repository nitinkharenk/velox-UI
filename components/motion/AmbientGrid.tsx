'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface AmbientGridProps {
  className?: string
  dotColor?: string
  dotSize?: number
  gap?: number
  /** Max parallax drift in px */
  drift?: number
}

export default function AmbientGrid({
  className,
  dotColor = 'var(--editorial-white-16)',
  dotSize = 1,
  gap = 32,
  drift = 20,
}: AmbientGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let mouseX = 0
    let mouseY = 0
    let currentX = 0
    let currentY = 0

    function resize() {
      if (!canvas || !container) return
      canvas.width = container.offsetWidth
      canvas.height = container.offsetHeight
      draw(0, 0)
    }

    function draw(offsetX: number, offsetY: number) {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const startX = (offsetX % gap) - gap
      const startY = (offsetY % gap) - gap

      for (let x = startX; x < canvas.width + gap; x += gap) {
        for (let y = startY; y < canvas.height + gap; y += gap) {
          ctx.beginPath()
          ctx.arc(x, y, dotSize, 0, Math.PI * 2)
          ctx.fillStyle = dotColor
          ctx.fill()
        }
      }
    }

    function onMouseMove(e: MouseEvent) {
      const rect = container!.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * drift * 2
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * drift * 2
    }

    function tick() {
      currentX += (mouseX - currentX) * 0.05
      currentY += (mouseY - currentY) * 0.05
      draw(currentX, currentY)
      raf = requestAnimationFrame(tick)
    }

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      window.addEventListener('mousemove', onMouseMove)
      raf = requestAnimationFrame(tick)
    })

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouseMove)
      ro.disconnect()
      mm.revert()
    }
  }, [dotColor, dotSize, gap, drift])

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ''}`} aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
    </div>
  )
}
