'use client'

import { useEffect, useRef, CSSProperties } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'

interface ScrambleTextProps {
  text: string
  className?: string
  style?: CSSProperties
  delay?: number
  duration?: number
  trigger?: boolean
}

export default function ScrambleText({
  text,
  className,
  style,
  delay = 0,
  duration = 1.2,
  trigger = true,
}: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const frameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!trigger || !ref.current) return

    const el = ref.current
    const original = text.toUpperCase()
    const totalDuration = duration * 1000
    const delayMs = delay * 1000
    startTimeRef.current = null

    function scramble(timestamp: number) {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current - delayMs

      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(scramble)
        return
      }

      const progress = Math.min(elapsed / totalDuration, 1)
      const resolvedCount = Math.floor(progress * original.length)

      let result = ''
      for (let i = 0; i < original.length; i++) {
        if (i < resolvedCount) {
          result += original[i]
        } else {
          result += original[i] === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]
        }
      }

      el.textContent = result

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(scramble)
      } else {
        el.textContent = original
      }
    }

    frameRef.current = requestAnimationFrame(scramble)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [text, delay, duration, trigger])

  return (
    <span ref={ref} className={className} style={style}>
      {text.toUpperCase()}
    </span>
  )
}
