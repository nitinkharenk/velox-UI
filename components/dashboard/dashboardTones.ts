export type DashboardTone =
  | 'info'
  | 'enrich'
  | 'warning'
  | 'accent'
  | 'success'
  | 'danger'

export const DASHBOARD_TONE = {
  info: {
    text: 'text-[--dashboard-info]',
    mutedText: 'text-[--dashboard-info]',
    icon: 'text-[--dashboard-info]',
    dot: 'bg-[--dashboard-info]',
    softBg: 'bg-[--dashboard-info-soft]',
    panelBg: 'bg-[--dashboard-info-soft]',
    border: 'border-[--dashboard-info-border]',
    strongBorder: 'border-[--dashboard-info-border]',
    var: 'var(--dashboard-info)',
    lightVar: 'var(--dashboard-info-soft)',
    borderVar: 'var(--dashboard-info-border)',
    glowVar: 'var(--tone-info-glow)',
    bgVar: 'var(--dashboard-info-soft)',
  },
  enrich: {
    text: 'text-[--dashboard-enrich]',
    mutedText: 'text-[--dashboard-enrich]',
    icon: 'text-[--dashboard-enrich]',
    dot: 'bg-[--dashboard-enrich]',
    softBg: 'bg-[--dashboard-enrich-soft]',
    panelBg: 'bg-[--dashboard-enrich-soft]',
    border: 'border-[--dashboard-enrich-border]',
    strongBorder: 'border-[--dashboard-enrich-border]',
    var: 'var(--dashboard-enrich)',
    lightVar: 'var(--dashboard-enrich-soft)',
    borderVar: 'var(--dashboard-enrich-border)',
    glowVar: 'var(--tone-enrich-glow)',
    bgVar: 'var(--dashboard-enrich-soft)',
  },
  warning: {
    text: 'text-[--dashboard-warning]',
    mutedText: 'text-[--dashboard-warning]',
    icon: 'text-[--dashboard-warning]',
    dot: 'bg-[--dashboard-warning]',
    softBg: 'bg-[--dashboard-warning-soft]',
    panelBg: 'bg-[--dashboard-warning-soft]',
    border: 'border-[--dashboard-warning-border]',
    strongBorder: 'border-[--dashboard-warning-border]',
    var: 'var(--dashboard-warning)',
    lightVar: 'var(--dashboard-warning-soft)',
    borderVar: 'var(--dashboard-warning-border)',
    glowVar: '',
    bgVar: 'var(--dashboard-warning-soft)',
  },
  accent: {
    text: 'text-[--dashboard-accent]',
    mutedText: 'text-[--dashboard-accent]',
    icon: 'text-[--dashboard-accent]',
    dot: 'bg-[--dashboard-accent]',
    softBg: 'bg-[--dashboard-accent-soft]',
    panelBg: 'bg-[--dashboard-accent-soft]',
    border: 'border-[--dashboard-accent-border]',
    strongBorder: 'border-[--dashboard-accent-border]',
    var: 'var(--dashboard-accent)',
    lightVar: 'var(--dashboard-accent-soft)',
    borderVar: 'var(--dashboard-accent-border)',
    glowVar: 'var(--tone-accent-glow)',
    bgVar: 'var(--dashboard-accent-soft)',
  },
  success: {
    text: 'text-[--dashboard-success]',
    mutedText: 'text-[--dashboard-success]',
    icon: 'text-[--dashboard-success]',
    dot: 'bg-[--dashboard-success]',
    softBg: 'bg-[--dashboard-success-soft]',
    panelBg: 'bg-[--dashboard-success-soft]',
    border: 'border-[--dashboard-success-border]',
    strongBorder: 'border-[--dashboard-success-border]',
    var: 'var(--dashboard-success)',
    lightVar: 'var(--dashboard-success-soft)',
    borderVar: 'var(--dashboard-success-border)',
    glowVar: 'var(--tone-success-glow)',
    bgVar: 'var(--dashboard-success-soft)',
  },
  danger: {
    text: 'text-[--dashboard-danger]',
    mutedText: 'text-[--dashboard-danger]',
    icon: 'text-[--dashboard-danger]',
    dot: 'bg-[--dashboard-danger]',
    softBg: 'bg-[--dashboard-danger-soft]',
    panelBg: 'bg-[--dashboard-danger-soft]',
    border: 'border-[--dashboard-danger-border]',
    strongBorder: 'border-[--dashboard-danger-border]',
    var: 'var(--dashboard-danger)',
    lightVar: '',
    borderVar: 'var(--dashboard-danger-border)',
    glowVar: '',
    bgVar: 'var(--dashboard-danger-soft)',
  },
} as const satisfies Record<
  DashboardTone,
  {
    text: string
    mutedText: string
    icon: string
    dot: string
    softBg: string
    panelBg: string
    border: string
    strongBorder: string
    var: string
    lightVar: string
    borderVar: string
    glowVar: string
    bgVar: string
  }
>
