'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { ArrowLeft, Wand2, Layers, Cpu } from 'lucide-react'
import BrandWordmark from '@/components/layout/BrandWordmark'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[--bg-base] text-[--text-primary] transition-colors duration-300">
      {/* ── Mobile top bar ── */}
      <div className="flex items-center justify-between border-b border-[--border-subtle] px-6 py-4 lg:hidden">
        <BrandWordmark />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[--text-secondary] transition hover:text-[--text-primary]"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-57px)] lg:min-h-screen">
        {/* ── Left brand panel (desktop only) ── */}
        <aside
          aria-hidden="true"
          className="relative hidden overflow-hidden bg-[--velox-ink] lg:flex lg:w-[46%] xl:w-[42%]"
        >
          {/* Decorative background orbs */}
          <div className="pointer-events-none absolute left-[-12%] top-[-14%] h-[55%] w-[72%] rounded-full bg-[radial-gradient(ellipse,var(--velox-rose)_0%,transparent_68%)] opacity-[0.22] blur-[90px]" />
          <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[48%] w-[62%] rounded-full bg-[radial-gradient(ellipse,var(--velox-sage)_0%,transparent_70%)] opacity-[0.28] blur-[80px]" />

          <div className="relative z-10 flex flex-col justify-between px-12 py-10 xl:px-16 xl:py-14">
            {/* Brand */}
            <BrandWordmark dark />

            {/* Headline */}
            <div>
              <p className="font-heading text-[clamp(2rem,3.2vw,3.2rem)] font-medium leading-[1.05] tracking-[-0.04em] text-white">
                Production-ready motion, generated with AI.
              </p>
              <p className="mt-5 max-w-sm text-[15px] leading-[1.75] text-white/55">
                Access the pipeline dashboard to generate, review, and publish motion components at scale.
              </p>

              {/* Feature chips */}
              <div className="mt-10 flex flex-col gap-4">
                {([
                  { icon: <Wand2 className="h-4 w-4" />, label: 'AI-powered motion generation' },
                  { icon: <Layers className="h-4 w-4" />, label: 'Production-ready React + Framer code' },
                  { icon: <Cpu className="h-4 w-4" />, label: 'Sonnet-backed pipeline engine' },
                ] as const).map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/10">
                      {item.icon}
                    </span>
                    <span className="text-[14px] font-medium text-white/60">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-white/25">© 2026 Velox UI</p>
          </div>
        </aside>

        {/* ── Right form panel ── */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 xl:px-20">
          {/* Desktop back + theme row */}
          <div className="mb-10 hidden w-full max-w-md items-center justify-between lg:flex">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-[--text-secondary] transition hover:text-[--text-primary]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <ThemeToggle />
          </div>

          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="font-heading text-[2rem] font-medium tracking-[-0.03em] text-[--text-primary]">
                Sign in to Velox
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-[--text-secondary]">
                Access the pipeline dashboard and component tools.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-semibold text-[--text-primary]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] px-4 py-3 text-[15px] text-[--text-primary] placeholder:text-[--text-tertiary] outline-none transition focus:border-[--velox-rose] focus:ring-2 focus:ring-[var(--login-focus-ring)]"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-semibold text-[--text-primary]"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] px-4 py-3 text-[15px] text-[--text-primary] placeholder:text-[--text-tertiary] outline-none transition focus:border-[--velox-rose] focus:ring-2 focus:ring-[var(--login-focus-ring)]"
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-[--danger] bg-[--danger-dim] px-4 py-3 text-sm font-medium text-[--danger]"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-full bg-[--velox-rose] py-3.5 text-[15px] font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[--accent-hover] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[--velox-rose] focus:ring-offset-2 focus:ring-offset-[--bg-base] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-[--text-tertiary]">
              Don&apos;t have access?{' '}
              <Link href="/components" className="font-medium text-[--text-secondary] underline underline-offset-2 transition hover:text-[--text-primary]">
                Browse the public library
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
