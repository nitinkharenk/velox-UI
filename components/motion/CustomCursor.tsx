'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    // QuickSetters for performance
    const setDotX = gsap.quickSetter(dot, 'x', 'px')
    const setDotY = gsap.quickSetter(dot, 'y', 'px')

    // Ring follows with spring lag
    let ringX = 0
    let ringY = 0
    let mouseX = 0
    let mouseY = 0

    function onMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      setDotX(mouseX)
      setDotY(mouseY)
    }

    // Smooth ring follow on ticker
    gsap.ticker.add(() => {
      ringX += (mouseX - ringX) * 0.12
      ringY += (mouseY - ringY) * 0.12
      gsap.set(ring, { x: ringX, y: ringY })
    })

    window.addEventListener('mousemove', onMove)

    // Scale ring on hoverable elements
    function onEnter() {
      gsap.to(ring, { scale: 2.2, opacity: 0.6, duration: 0.3, ease: 'power2.out' })
      gsap.to(dot, { scale: 0.4, duration: 0.3, ease: 'power2.out' })
    }
    function onLeave() {
      gsap.to(ring, { scale: 1, opacity: 0.5, duration: 0.35, ease: 'power2.out' })
      gsap.to(dot, { scale: 1, duration: 0.35, ease: 'power2.out' })
    }

    const targets = document.querySelectorAll('a, button, [data-cursor-hover]')
    targets.forEach((el) => {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    })

    // MutationObserver to catch dynamically added elements
    const observer = new MutationObserver(() => {
      document.querySelectorAll('a, button, [data-cursor-hover]').forEach((el) => {
        el.removeEventListener('mouseenter', onEnter)
        el.removeEventListener('mouseleave', onLeave)
        el.addEventListener('mouseenter', onEnter)
        el.addEventListener('mouseleave', onLeave)
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      observer.disconnect()
      gsap.ticker.remove(() => {})
    }
  }, [])

  return (
    <>
      {/* Dot — instant follow */}
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[--accent]"
        style={{ willChange: 'transform' }}
      />
      {/* Ring — spring lag */}
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[--accent] opacity-50"
        style={{ willChange: 'transform' }}
      />
    </>
  )
}
