interface KbdProps {
  children: React.ReactNode
}

export default function Kbd({ children }: KbdProps) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-[--border-default] bg-[--bg-soft] px-1.5 text-[10px] leading-none font-mono text-[--text-tertiary]">
      {children}
    </kbd>
  )
}
