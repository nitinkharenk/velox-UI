'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Eye, Lightbulb, Sparkles, Wand2, Zap, MoveRight } from 'lucide-react'

/* ─── Stage color palette ────────────────────────────────────── */
const STAGES = [
  {
    n: '01',
    label: 'Ideas',
    verb: 'Capture',
    desc: 'Log rough concepts — motion feel, category, complexity, and tech stack — in one clean intake form.',
    href: '/pipeline/ideas',
    icon: Lightbulb,
    color: 'var(--tone-info)',
    colorLight: 'var(--tone-info-light)',
    colorBorder: 'var(--tone-info-border)',
    colorGlow: 'var(--tone-info-glow)',
    colorBg: 'var(--tone-info-bg)',
  },
  {
    n: '02',
    label: 'Enrich',
    verb: 'Specify',
    desc: 'AI expands each idea into a full animation spec — entry, active, exit, easing, visual treatment.',
    href: '/pipeline/ideas',
    icon: Sparkles,
    color: 'var(--tone-enrich)',
    colorLight: 'var(--tone-enrich-light)',
    colorBorder: 'var(--tone-enrich-border)',
    colorGlow: 'var(--tone-enrich-glow)',
    colorBg: 'var(--tone-enrich-bg)',
  },
  {
    n: '03',
    label: 'Generate',
    verb: 'Compile',
    desc: 'Run the code-generation pipeline. Live SSE logs, per-idea progress, abort at any point.',
    href: '/pipeline/generate',
    icon: Zap,
    color: 'var(--accent)',
    colorLight: 'var(--tone-accent-light)',
    colorBorder: 'var(--tone-accent-border)',
    colorGlow: 'var(--tone-accent-glow)',
    colorBg: 'var(--accent-soft-15)',
  },
  {
    n: '04',
    label: 'Review',
    verb: 'Ship',
    desc: 'Inspect output in a live sandbox preview. Approve to publish, reject to discard.',
    href: '/pipeline/review',
    icon: Eye,
    color: 'var(--tone-success)',
    colorLight: 'var(--tone-success-light)',
    colorBorder: 'var(--tone-success-border)',
    colorGlow: 'var(--tone-success-glow)',
    colorBg: 'var(--tone-success-bg)',
  },
]

function StageCard({ stage }: { stage: typeof STAGES[0] }) {
  const [hovered, setHovered] = useState(false)
  const Icon = stage.icon

  return (
    <Link href={stage.href} className="group">
      <article
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex h-full flex-col overflow-hidden rounded-[1.8rem] transition-all duration-300"
        style={{
          background: 'var(--surface-panel)',
          border: `1px solid ${hovered ? stage.colorBorder : 'var(--border-default)'}`,
          boxShadow: hovered ? stage.colorGlow : 'none',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        }}
      >
        {/* Colored top band — always visible */}
        <div
          className="h-1.5 w-full shrink-0"
          style={{ background: stage.color }}
        />

        {/* Colored wash behind content */}
        <div
          className="absolute inset-0 top-1.5 transition-opacity duration-300"
          style={{
            background: `linear-gradient(160deg, ${stage.colorLight} 0%, transparent 55%)`,
            opacity: hovered ? 1 : 0.6,
          }}
        />

        <div className="relative flex flex-col gap-0 p-6">
          {/* Stage number + icon row */}
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{ color: stage.color }}
            >
              Stage {stage.n}
            </span>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110"
              style={{ background: stage.color }}
            >
              <Icon className="h-4 w-4 text-[--dashboard-accent-contrast]" strokeWidth={2} />
            </div>
          </div>

          {/* Large watermark number */}
          <div className="relative mt-6">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-2 -top-6 select-none font-heading leading-none"
              style={{
                fontSize: '7rem',
                color: stage.color,
                opacity: hovered ? 0.15 : 0.08,
                transition: 'opacity 0.3s ease',
              }}
            >
              {stage.n}
            </span>

            <p
              className="relative font-mono text-[9px] uppercase tracking-[0.24em]"
              style={{ color: stage.color, opacity: 0.8 }}
            >
              {stage.verb}
            </p>
            <h2
              className="relative mt-1 font-heading text-[2.2rem] leading-none tracking-tight text-[--text-primary]"
            >
              {stage.label}
            </h2>
            <p className="relative mt-3 text-[13px] leading-6 text-[--text-secondary]">
              {stage.desc}
            </p>
          </div>

          {/* CTA */}
          <div
            className="mt-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-all duration-200"
            style={{
              color: stage.color,
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'translateX(4px)' : 'translateX(0)',
            }}
          >
            Open stage <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </article>
    </Link>
  )
}

function FeatureCard({
  href,
  eyebrow,
  title,
  desc,
  icon: Icon,
  color,
  colorLight,
  colorBorder,
  colorGlow,
  extra,
}: {
  href: string
  eyebrow: string
  title: string
  desc: string
  icon: React.ElementType
  color: string
  colorLight: string
  colorBorder: string
  colorGlow: string
  extra?: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={href} className="group">
      <article
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex h-full flex-col overflow-hidden rounded-[1.8rem] p-8 transition-all duration-300"
        style={{
          background: 'var(--surface-panel)',
          border: `1px solid ${hovered ? colorBorder : 'var(--border-default)'}`,
          boxShadow: hovered ? colorGlow : 'none',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        }}
      >
        {/* Left border accent — always visible */}
        <div
          className="absolute left-0 top-6 bottom-6 w-1 rounded-full"
          style={{ background: color }}
        />

        {/* Diagonal color wash */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${colorLight} 0%, transparent 50%)`,
            opacity: hovered ? 1 : 0.5,
          }}
        />

        <div className="relative flex items-start justify-between gap-4 pl-5">
          <div>
            <p
              className="font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{ color }}
            >
              {eyebrow}
            </p>
            <h3 className="mt-2 font-heading text-[2.2rem] leading-none tracking-tight text-[--text-primary]">
              {title}
            </h3>
          </div>
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110"
            style={{ background: color }}
          >
            <Icon className="h-5 w-5 text-[--dashboard-accent-contrast]" strokeWidth={2} />
          </div>
        </div>

        <p className="relative mt-4 max-w-[420px] pl-5 text-sm leading-7 text-[--text-secondary]">
          {desc}
        </p>

        {extra && <div className="relative pl-5">{extra}</div>}

        <div
          className="relative mt-6 flex items-center gap-2 pl-5 font-mono text-[11px] uppercase tracking-[0.16em] transition-all duration-200"
          style={{
            color,
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(4px)' : 'translateX(0)',
          }}
        >
          Open <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </article>
    </Link>
  )
}

export default function PipelinePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6">

      {/* ── Hero header ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-[2rem] border border-[--border-default] bg-[var(--surface-panel)] px-8 py-10"
        style={{
        }}
      >
        {/* Dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--border-default) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Four colored corner orbs */}
        <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--tone-info)_20%,transparent)] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--tone-enrich)_15%,transparent)] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-8 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--tone-success)_18%,transparent)] blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]">
              Velox UI · Production Pipeline
            </p>
            {/* 4-color gradient title */}
            <h1
              className="mt-3 font-heading leading-none tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                background: 'linear-gradient(90deg, var(--tone-info) 0%, var(--tone-enrich) 36%, var(--accent) 60%, var(--tone-success) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Generation<br />Pipeline
            </h1>
            <p className="mt-4 max-w-[520px] text-sm leading-7 text-[--text-secondary]">
              A four-stage operator workflow — from rough idea to published,
              sandbox-validated animated React component.
            </p>
          </div>

          {/* Stage flow pill */}
          <div
            className="flex items-center rounded-2xl border border-[--border-default] bg-[--bg-surface] p-1 lg:self-end"
          >
            {STAGES.map((s, i) => (
              <div key={s.n} className="flex items-center">
                <Link
                  href={s.href}
                  className="group flex flex-col items-center gap-1.5 rounded-xl px-4 py-2.5 transition-all duration-200 hover:bg-[--bg-hover]"
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[--text-tertiary] transition-colors group-hover:text-[--text-secondary]">
                    {s.n}
                  </span>
                  <span
                    className="h-2 w-2 rounded-full transition-all duration-200 group-hover:scale-125"
                    style={{ background: s.color }}
                  />
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[--text-tertiary] transition-colors group-hover:text-[--text-primary]">
                    {s.label}
                  </span>
                </Link>
                {i < STAGES.length - 1 && (
                  <MoveRight className="mx-1 h-3 w-3 shrink-0 text-[--text-disabled]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stage Cards ─────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage) => (
          <StageCard key={stage.n} stage={stage} />
        ))}
      </section>

      {/* ── Feature cards ───────────────────────────────────────── */}
      <section className="grid gap-4 xl:grid-cols-3">
        <FeatureCard
          href="/pipeline/ideas"
          eyebrow="Feature · Ideas"
          title="Idea Backlog"
          desc="Refine type, category, complexity, and feel in a clean editorial workspace. Shape ideas before they enter the generation queue."
          icon={Wand2}
          color="var(--tone-info)"
          colorLight="var(--tone-info-light)"
          colorBorder="var(--tone-info-border)"
          colorGlow="var(--tone-info-glow)"
        />

        <FeatureCard
          href="/pipeline/generate"
          eyebrow="Automation · Generate"
          title="Control Room"
          desc="Queue selection, live SSE log stream, and per-idea progress monitoring. Full abort control in one premium interface."
          icon={Zap}
          color="var(--accent)"
          colorLight="var(--tone-accent-light)"
          colorBorder="var(--tone-accent-border)"
          colorGlow="var(--tone-accent-glow)"
          extra={
            <div
              className="mt-5 inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5"
              style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                Ready to compile
              </span>
            </div>
          }
        />

        <FeatureCard
          href="/velox-ai-studio"
          eyebrow="Automation · Velox AI"
          title="Prompt to Review"
          desc="Run the full idea-to-review pipeline from one prompt. Velox AI structures concepts, enriches them, compiles code, validates output, and moves good results straight into review."
          icon={Sparkles}
          color="var(--tone-success)"
          colorLight="var(--tone-success-light)"
          colorBorder="var(--tone-success-border)"
          colorGlow="var(--tone-success-glow)"
          extra={
            <div
              className="mt-5 inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5"
              style={{ background: 'color-mix(in srgb, var(--tone-success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--tone-success) 30%, transparent)' }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--tone-success)]">
                One prompt, full pipeline
              </span>
            </div>
          }
        />
      </section>

      {/* ── Quick nav ────────────────────────────────────────────── */}
      <nav className="flex flex-wrap items-center gap-2 pb-2">
        {[
          { label: 'Velox AI Studio', href: '/velox-ai-studio', color: 'var(--accent)' },
          { label: 'Review Queue', href: '/pipeline/review', color: 'var(--tone-success)' },
          { label: 'Published Inventory', href: '/pipeline/inventory', color: 'var(--tone-info)' },
          { label: 'Settings', href: '/settings', color: 'var(--tone-enrich)' },
        ].map(({ label, href, color }) => (
          <NavPill key={href} href={href} label={label} color={color} />
        ))}
      </nav>

    </div>
  )
}

function NavPill({ href, label, color }: { href: string; label: string; color: string }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-all duration-200"
      style={{
        background: hovered ? `color-mix(in srgb, ${color} 12%, transparent)` : 'var(--bg-surface)',
        border: `1px solid ${hovered ? color : 'var(--border-default)'}`,
        color: hovered ? color : 'var(--text-tertiary)',
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full transition-transform duration-200"
        style={{ background: color, transform: hovered ? 'scale(1.4)' : 'scale(1)' }}
      />
      {label}
      <ArrowRight
        className="h-3 w-3 transition-all duration-200"
        style={{ opacity: hovered ? 1 : 0, transform: hovered ? 'translateX(2px)' : 'translateX(0)' }}
      />
    </Link>
  )
}
