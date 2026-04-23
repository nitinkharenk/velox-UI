'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Check, Key, Workflow, Settings, Activity, Trash2, ShieldAlert, Plus, PlusCircle, Save, X as CloseIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/components/ui/Toast'
import PipelineConfigsEditor from '@/components/pipeline/PipelineConfigsEditor'

const STATIC_PROVIDERS = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    sub: 'Claude — primary generation',
    env: 'ANTHROPIC_API_KEY',
    iconClass: 'border-[var(--accent-soft-30)] bg-[var(--accent-soft-15)] text-[--accent]',
    saveClass: 'border-[var(--tone-accent-border)] bg-[var(--accent-soft-15)] text-[--accent] hover:bg-[var(--accent-soft-20)]',
    inputFocusClass: 'focus:border-[var(--tone-accent-border)]',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    sub: 'Embeddings — semantic search',
    env: 'OPENAI_API_KEY',
    iconClass: 'border-[--dashboard-success-border] bg-[--dashboard-success-soft] text-[--dashboard-success]',
    saveClass: 'border-[--dashboard-success-border] bg-[--dashboard-success-soft] text-[--dashboard-success] hover:bg-[--dashboard-success-soft]',
    inputFocusClass: 'focus:border-[--dashboard-success-border]',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    sub: 'Alternative generation',
    env: 'GEMINI_API_KEY',
    iconClass: 'border-[--dashboard-info-border] bg-[--dashboard-info-soft] text-[--dashboard-info]',
    saveClass: 'border-[--dashboard-info-border] bg-[--dashboard-info-soft] text-[--dashboard-info] hover:bg-[--dashboard-info-soft]',
    inputFocusClass: 'focus:border-[--dashboard-info-border]',
  },
  {
    id: 'groq',
    label: 'Groq',
    sub: 'Fast inference — free tier',
    env: 'GROQ_API_KEY',
    iconClass: 'border-[--dashboard-enrich-border] bg-[--dashboard-enrich-soft] text-[--dashboard-enrich]',
    saveClass: 'border-[--dashboard-enrich-border] bg-[--dashboard-enrich-soft] text-[--dashboard-enrich] hover:bg-[--dashboard-enrich-soft]',
    inputFocusClass: 'focus:border-[--dashboard-enrich-border]',
  },
] as const

type CustomAIProvider = {
  id: string
  name: string
  provider_id: string
  default_model: string
  base_url?: string | null
  env_key: string
}

function Section({ label, children, action }: { label: string; children: React.ReactNode, action?: React.ReactNode }) {
  return (
    <section
      className="depth-card glass-panel p-6 sm:p-8 rounded-[2rem]"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-500 font-bold">{label}</p>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'keys' | 'pipelines' | 'system'>('keys')
  const [show, setShow] = useState<Record<string, boolean>>({})
  const [values, setValues] = useState<Record<string, string>>({})
  const [configured, setConfigured] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [autoPublish, setAutoPublish] = useState(false)
  
  // Custom Provider State
  const [customProviders, setCustomProviders] = useState<CustomAIProvider[]>([])
  const [isAddingProvider, setIsAddingProvider] = useState(false)
  const [newProvider, setNewProvider] = useState({
    name: '',
    provider_id: '',
    default_model: '',
    base_url: '',
    env_key: ''
  })

  // Merge static and custom providers for the UI
  const allProviders = [
    ...STATIC_PROVIDERS,
    ...customProviders.map(cp => ({
      id: cp.provider_id,
      label: cp.name,
      sub: `Custom — ${cp.default_model}`,
      env: cp.env_key,
      iconClass: 'border-[--dashboard-accent-border] bg-[--dashboard-accent-soft] text-[#0465ED]',
      saveClass: 'border-[--dashboard-accent-border] bg-[--dashboard-accent-soft] text-[#0465ED] hover:bg-[#0465ED] hover:text-white',
      inputFocusClass: 'focus:border-[--dashboard-accent-border]',
      isCustom: true,
      dbId: cp.id
    }))
  ]

  useEffect(() => {
    // Fetch configured keys
    fetch('/api/settings/keys')
      .then(r => r.json())
      .then(d => setConfigured(d))
      .catch(() => {})

    // Fetch custom providers
    fetch('/api/settings/providers')
      .then(r => r.json())
      .then(d => d.providers && setCustomProviders(d.providers))
      .catch(() => {})
  }, [])

  const handleCreateProvider = async () => {
    if (!newProvider.name || !newProvider.provider_id || !newProvider.env_key) {
      return toast.error('Required fields', 'Please fill in Name, Slug, and Env Key.')
    }

    try {
      const res = await fetch('/api/settings/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider),
      })
      const data = await res.json()
      if (res.ok) {
        setCustomProviders(prev => [...prev, data.provider])
        setIsAddingProvider(false)
        setNewProvider({ name: '', provider_id: '', default_model: '', env_key: '', base_url: '' })
        toast.success('Provider Added', `${newProvider.name} is now available.`)
      } else {
        toast.error('Failed to add provider', data.error)
      }
    } catch (err) {
      toast.error('Network Error', 'Could not save the provider config.')
    }
  }

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return
    try {
      const res = await fetch('/api/settings/providers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setCustomProviders(prev => prev.filter(p => p.id !== id))
        toast.success('Provider Removed')
      }
    } catch (err) {
      toast.error('Failed to remove provider')
    }
  }

  const handleSave = async (env: string) => {
    const val = values[env]
    if (!val) return
    setSaving(env)
    try {
      const r = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envKey: env, value: val }),
      })
      if (r.ok) {
        setConfigured(prev => ({ ...prev, [env]: true }))
        setValues(prev => ({ ...prev, [env]: '' }))
        setSaved(env)
        setTimeout(() => setSaved(null), 2000)
      }
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 pb-20">
      {/* Tab Navigation */}
      <nav className="flex items-center gap-1.5 rounded-[1.8rem] depth-card glass-panel p-1.5 self-start">
        {[
          { id: 'keys', label: 'API Keys', icon: Key },
          { id: 'pipelines', label: 'Pipelines', icon: Workflow },
          { id: 'system', label: 'System', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`group relative flex items-center gap-2.5 rounded-[1.3rem] px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-300
              ${activeTab === tab.id 
                ? 'text-[#0465ED] depth-card bg-white dark:bg-white/5' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <tab.icon className={`h-3.5 w-3.5 transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab-glow"
                className="absolute inset-0 -z-10 rounded-[1.3rem] bg-[#0465ED]/5 border border-[#0465ED]/10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </nav>

      <main className="relative min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeTab === 'keys' && (
            <motion.div
              key="keys"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-6"
            >
              <Section 
                label="Provider Authentication"
                action={
                  <button 
                    onClick={() => setIsAddingProvider(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#0465ED]/10 px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#0465ED] hover:bg-[#0465ED] hover:text-white transition-all shadow-sm border border-[#0465ED]/20"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Provider
                  </button>
                }
              >
                <div className="space-y-3">
                  <AnimatePresence>
                    {isAddingProvider && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-4 rounded-2xl depth-card p-6 border-2 border-dashed border-[#0465ED]/30 bg-[#0465ED]/5 mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#0465ED]">Configure New Provider</h4>
                            <button onClick={() => setIsAddingProvider(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <CloseIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                              <label className="font-mono text-[9px] font-bold uppercase text-gray-400">Name</label>
                              <input 
                                placeholder="e.g. DeepSeek"
                                value={newProvider.name}
                                onChange={e => setNewProvider(p => ({ ...p, name: e.target.value }))}
                                className="h-10 w-full rounded-lg depth-card glass-panel px-3 font-mono text-[11px] focus:ring-1 focus:ring-[#0465ED]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-mono text-[9px] font-bold uppercase text-gray-400">Slug (id)</label>
                              <input 
                                placeholder="e.g. deepseek"
                                value={newProvider.provider_id}
                                onChange={e => setNewProvider(p => ({ ...p, provider_id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                                className="h-10 w-full rounded-lg depth-card glass-panel px-3 font-mono text-[11px] focus:ring-1 focus:ring-[#0465ED]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-mono text-[9px] font-bold uppercase text-gray-400">Default Model</label>
                              <input 
                                placeholder="e.g. deepseek-chat"
                                value={newProvider.default_model}
                                onChange={e => setNewProvider(p => ({ ...p, default_model: e.target.value }))}
                                className="h-10 w-full rounded-lg depth-card glass-panel px-3 font-mono text-[11px] focus:ring-1 focus:ring-[#0465ED]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-mono text-[9px] font-bold uppercase text-gray-400">Base URL (Optional)</label>
                              <input 
                                placeholder="https://api.deepseek.com/v1"
                                value={newProvider.base_url}
                                onChange={e => setNewProvider(p => ({ ...p, base_url: e.target.value }))}
                                className="h-10 w-full rounded-lg depth-card glass-panel px-3 font-mono text-[11px] focus:ring-1 focus:ring-[#0465ED]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-mono text-[9px] font-bold uppercase text-gray-400">Env Key</label>
                              <input 
                                placeholder="DEEPSEEK_API_KEY"
                                value={newProvider.env_key}
                                onChange={e => setNewProvider(p => ({ ...p, env_key: e.target.value.toUpperCase() }))}
                                className="h-10 w-full rounded-lg depth-card glass-panel px-3 font-mono text-[11px] focus:ring-1 focus:ring-[#0465ED]"
                              />
                            </div>
                          </div>
                          <button 
                            onClick={handleCreateProvider}
                            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#0465ED] px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-lg hover:shadow-[#0465ED]/40 transition-all active:scale-95"
                          >
                            <Save className="h-3.5 w-3.5" /> Save Provider Definition
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {allProviders.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-4 rounded-2xl depth-card p-5 sm:flex-row sm:items-center hover-glow-blue transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4 sm:w-60 sm:shrink-0">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/5 font-mono text-[12px] font-extrabold shadow-sm ${p.iconClass}`}>
                          {p.label[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold text-[--text-primary] accent-text">{p.label}</p>
                          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">{p.sub}</p>
                        </div>
                      </div>

                      <div className="relative flex-1">
                        <input
                          type={show[p.id] ? 'text' : 'password'}
                          placeholder={configured[p.env] ? '••••••••••••••••' : 'Not configured'}
                          value={values[p.env] || ''}
                          onChange={(e) => setValues(prev => ({ ...prev, [p.env]: e.target.value }))}
                          className={`h-12 w-full rounded-xl depth-card glass-panel px-4 pr-12 font-mono text-[12px] text-[--text-primary] placeholder:text-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-[#0465ED]/20 ${p.inputFocusClass}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShow(s => ({ ...s, [p.id]: !s[p.id] }))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-[#0465ED]"
                        >
                          {show[p.id] ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-3 sm:shrink-0">
                        {configured[p.env] && (
                          <span className="flex items-center gap-1.5 rounded-lg bg-green-100/50 dark:bg-green-900/10 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-green-600 shadow-sm border border-green-500/10">
                            <Check className="h-3 w-3" strokeWidth={3} /> Verified
                          </span>
                        )}
                        <button
                          onClick={() => handleSave(p.env)}
                          disabled={!values[p.env] || saving === p.env}
                          className={`h-11 rounded-xl px-6 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-30 shadow-sm
                            ${saved === p.env
                              ? 'bg-green-500 text-white'
                              : 'depth-card hover:bg-[#0465ED] hover:text-white active:scale-95'}`}
                        >
                          {saving === p.env ? 'Linking…' : saved === p.env ? 'Success ✓' : 'Connect'}
                        </button>
                        
                        {(p as any).isCustom && (
                          <button
                            onClick={() => handleDeleteProvider((p as any).dbId, p.label)}
                            className="h-11 w-11 flex items-center justify-center rounded-xl border border-red-500/10 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {activeTab === 'pipelines' && (
            <motion.div
              key="pipelines"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Section label="Workflow Architecture">
                <PipelineConfigsEditor />
              </Section>
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div
              key="system"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="grid gap-6 lg:grid-cols-2"
            >
              <div className="flex flex-col gap-6">
                <Section label="Automation Behavior">
                  <div className="flex items-center justify-between gap-6 rounded-[1.5rem] depth-card p-6 border border-white/5">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[--dashboard-accent-soft] text-[#0465ED] border border-[--dashboard-accent-border]">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-[--text-primary]">Auto-publish approved</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-[--text-tertiary] max-w-[280px]">
                          Automatically propagate validated components to the public showcase library.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAutoPublish(p => !p)}
                      className={`relative h-7 w-12 shrink-0 rounded-full border transition-all duration-300 ${autoPublish ? 'border-[--dashboard-accent-border] bg-[#0465ED] shadow-[0_0_15px_rgba(4,101,237,0.4)]' : 'border-[--dashboard-toggle-off-border] bg-gray-200/50 dark:bg-white/5'}`}
                      aria-checked={autoPublish}
                      role="switch"
                    >
                      <span
                        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300"
                        style={{ left: autoPublish ? 'calc(100% - 1.5rem)' : '4px' }}
                      />
                    </button>
                  </div>
                </Section>
                
                <section className="rounded-[2rem] depth-card glass-panel p-8 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldAlert className="h-32 w-32" />
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#F93E39] font-bold mb-6">Danger Zone</p>
                  <div className="space-y-4">
                    {[
                      { label: 'Clear Pipeline Database', desc: 'Destroy all ideas and generated code history.', icon: Trash2 },
                      { label: 'Factory Reset', desc: 'Restore all settings to original production defaults.', icon: ShieldAlert },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-red-500/10 bg-red-500/5 p-5 hover:bg-red-500/10 transition-colors group cursor-pointer"
                      >
                        <div className="flex gap-4">
                          <item.icon className="h-5 w-5 text-[#F93E39] mt-0.5" />
                          <div>
                            <p className="text-[14px] font-bold text-[#F93E39]">{item.label}</p>
                            <p className="mt-0.5 text-[11px] text-gray-500 font-medium">{item.desc}</p>
                          </div>
                        </div>
                        <button className="h-9 shrink-0 rounded-xl bg-red-500/10 px-5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#F93E39] border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95">
                          Nuclear Reset
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <Section label="Platform Status">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Environment', value: 'Production', color: 'text-green-500' },
                    { label: 'Pipeline v1.2', value: 'Operational', color: 'text-blue-500' },
                    { label: 'DB Latency', value: '14ms', color: 'text-purple-500' },
                    { label: 'Auth mode', value: 'Local Dev', color: 'text-orange-500' },
                  ].map(stat => (
                    <div key={stat.label} className="depth-card rounded-2xl p-5 border border-white/5 bg-white/2 dark:bg-white/2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-gray-500 font-bold mb-2">{stat.label}</p>
                      <p className={`text-[15px] font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
