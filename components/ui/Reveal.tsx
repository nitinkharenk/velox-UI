'use client'

import { motion } from 'framer-motion'
import { cx } from './cx'

type RevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'details'
  id?: string
}

export function Reveal({ children, className, delay = 0, as = 'div', id }: RevealProps) {
  const Component = as === 'section' ? motion.section : as === 'details' ? motion.details : motion.div

  return (
    <Component
      id={id}
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className={cx(className)}
    >
      {children}
    </Component>
  )
}

export default Reveal
