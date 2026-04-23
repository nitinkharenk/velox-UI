'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Loader2, Monitor } from 'lucide-react'

interface HoverPreviewProps {
  slug: string | null
  visible: boolean
  x: number
  y: number
}

export default function HoverPreview({ slug, visible, x, y }: HoverPreviewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !slug) return null

  // Calculate position (offset from cursor to avoid covering it)
  // We place it to the right and slightly above/below
  const offsetSide = 20
  const width = 380
  const height = 480

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: x + offsetSide,
            top: y - height / 2,
            width,
            height,
          }}
        >
          <div className="w-full h-full overflow-hidden rounded-[2rem] border border-white/10 bg-black/60 backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.5)] flex flex-col">
            {/* Header */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <div className="flex items-center gap-2">
                 <Monitor className="h-3 w-3 text-[--accent]" />
                 <span className="font-mono text-[9px] font-black uppercase tracking-widest text-gray-400">Live Preview</span>
               </div>
               <span className="font-mono text-[8px] text-gray-600 uppercase">/{slug}</span>
            </div>

            {/* Iframe Area */}
            <div className="flex-1 relative bg-[--bg-surface]">
               <div className="absolute inset-0 flex items-center justify-center opacity-20">
                 <Loader2 className="h-6 w-6 animate-spin text-[--accent]" />
               </div>
               <iframe
                 src={`/api/preview/compile?slug=${slug}`}
                 className="absolute inset-0 w-full h-full border-none"
                 title="Peek Preview"
                 sandbox="allow-scripts allow-same-origin"
               />
            </div>
            
            {/* Footer Tip */}
            <div className="px-5 py-2 border-t border-white/5 bg-black/40">
               <p className="text-[9px] font-medium text-gray-500 italic">Component peek view • Sandbox environment</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
