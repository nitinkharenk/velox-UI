import React from 'react'

interface LogoProps {
  size?: number
  variant?: 'default' | 'dark' | 'sage' | 'mono'
  showWordmark?: boolean
  showTagline?: boolean
  className?: string
}

export function VeloxLogo({
  size = 40,
  variant = 'default',
  showWordmark = true,
  showTagline = false,
  className,
}: LogoProps) {
  const markColor = variant === 'dark' ? 'rgba(232,71,63,0.9)' : '#E8473F'
  const secondaryColor = variant === 'dark' ? 'rgba(168,196,180,0.7)' : '#A8C4B4'
  const bgFill = variant === 'dark' ? 'rgba(232,71,63,0.12)' : '#FDF0EF'
  // Text will inherit from active theme unless manually forced
  const wordmarkColor = variant === 'dark' ? '#ffffff' : 'inherit'
  const accentColor = '#E8473F'

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className="shrink-0">
        <ellipse cx="26" cy="26" rx="26" ry="26" fill={bgFill} />
        <path
          d="M14 32 C16 24, 20 20, 24 24 C26 26, 27 28, 29 24 C31 20, 34 18, 37 22"
          stroke={markColor} strokeWidth="2.5" strokeLinecap="round" fill="none"
        />
        <path
          d="M14 32 C16 26, 19 23, 22 26 C24 28, 25 30, 27 27"
          stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round"
          fill="none" opacity="0.8"
        />
        <circle cx="37" cy="22" r="3.5" fill={markColor} opacity="0.9" />
        <circle cx="37" cy="22" r="6" fill={markColor} opacity="0.15" />
      </svg>
      {showWordmark && (
        <div className="flex flex-col gap-0.5">
          <span style={{ color: wordmarkColor }} className="text-xl font-bold tracking-tight leading-none text-gray-900 dark:text-white">
            velox<span style={{ color: accentColor }}>ui</span>
          </span>
          {showTagline && (
            <span style={{ color: '#6B6560' }} className="text-[10px] font-mono tracking-widest uppercase">
              animated components
            </span>
          )}
        </div>
      )}
    </div>
  )
}
