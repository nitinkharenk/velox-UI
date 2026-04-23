'use client'
import { useState } from 'react'
import { ExternalLink, Check, Copy } from 'lucide-react'
import AssetPreview from '@/components/assets/AssetPreview'
import Button from '@/components/ui/Button'
import { buildEnrichPrompt, buildGenPrompt, CODE_GEN_SYSTEM_PROMPT } from '@/lib/pipeline/prompts'
import clsx from 'clsx'

const FREE_AI_LINKS: Record<string, { name: string; url: string }> = {
  gemini: { name: 'Gemini', url: 'https://aistudio.google.com/prompts/new_chat' },
  groq: { name: 'Groq', url: 'https://console.groq.com/playground' },
  chatgpt: { name: 'ChatGPT', url: 'https://chat.openai.com' },
  claude: { name: 'Claude', url: 'https://claude.ai' },
}

const steps = ['Input idea', 'Enrich', 'Generate', 'Review']

export default function ManualPipeline({ aiMode }: { aiMode: string }) {
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1)
  const [ideaJson, setIdeaJson] = useState('')
  const [enrichedJson, setEnrichedJson] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [isApproving, setIsApproving] = useState(false)

  const enrichPrompt = ideaJson ? buildEnrichPrompt(ideaJson) : ''
  const genPrompt = enrichedJson ? buildGenPrompt(enrichedJson) : ''

  async function handleApprove() {
    setIsApproving(true)
    const res = await fetch('/api/pipeline/ingest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: generatedCode, spec: JSON.parse(enrichedJson) })
    })
    const data = await res.json()
    if (data.ok) {
      alert(`Published: ${data.slug}`)
      setStage(1); setIdeaJson(''); setEnrichedJson(''); setGeneratedCode('')
    }
    setIsApproving(false)
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center gap-0">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-initial">
            <div className="flex items-center gap-2.5">
              <div className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-all duration-300',
                stage > i + 1
                  ? 'bg-[--success-dim] text-[--success]'
                  : stage === i + 1
                    ? 'bg-[--dashboard-accent] text-[--dashboard-accent-contrast] shadow-[var(--shadow-soft)]'
                    : 'border border-[--border-subtle] bg-[--bg-soft] text-[--text-disabled]'
              )}>
                {stage > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={clsx('hidden text-xs sm:inline',
                stage === i + 1 ? 'text-[--text-primary]' : 'text-[--text-tertiary]'
              )}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={clsx('mx-4 h-px flex-1 transition-colors',
                stage > i + 1 ? 'bg-[--success]/20' : 'bg-[--border-subtle]'
              )} />
            )}
          </div>
        ))}
      </div>

      {stage === 1 && (
        <div className="animate-fade-in space-y-4">
          <p className="text-sm text-[--text-secondary]">Paste your idea as JSON</p>
          <textarea value={ideaJson} onChange={e => setIdeaJson(e.target.value)}
            placeholder={'{\n  "name": "Magnetic button",\n  "type": "hover",\n  "category": "buttons",\n  "tech": ["GSAP"],\n  "feel": "springy"\n}'}
            className="surface-panel-muted h-56 w-full resize-y rounded-[28px] p-5 font-mono text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--accent-border] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]" />
          <Button variant="accent" onClick={() => setStage(2)} disabled={!ideaJson.trim()}>
            Next: Enrich
          </Button>
        </div>
      )}

      {stage === 2 && (
        <div className="animate-fade-in space-y-5">
          <div className="grid grid-cols-5 gap-5">
            <div className="surface-panel col-span-3 space-y-3 rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[--text-secondary]">Enrich prompt</p>
                <Button variant="ghost" size="sm" onClick={() => copyText(enrichPrompt)}>
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
              <pre className="max-h-48 overflow-auto text-[11px] leading-relaxed font-mono text-[--text-tertiary]">{enrichPrompt}</pre>
            </div>
            <div className="col-span-2 space-y-2">
              <p className="mb-1 text-sm text-[--text-secondary]">Open in</p>
              {Object.entries(FREE_AI_LINKS).map(([key, { name, url }]) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                  className="surface-panel-muted flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[--text-primary] transition-all hover:border-[--border-default] hover:bg-[--bg-hover]">
                  <span className="flex-1">{name}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[--text-tertiary]" />
                </a>
              ))}
            </div>
          </div>
          <p className="text-sm text-[--text-secondary]">Paste the response from {aiMode}</p>
          <textarea value={enrichedJson} onChange={e => setEnrichedJson(e.target.value)}
            placeholder="Paste enriched spec JSON..."
            className="surface-panel-muted h-48 w-full resize-y rounded-[28px] p-5 font-mono text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--accent-border] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]" />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStage(1)}>Back</Button>
            <Button variant="accent" onClick={() => setStage(3)} disabled={!enrichedJson.trim()}>Next: Generate</Button>
          </div>
        </div>
      )}

      {stage === 3 && (
        <div className="animate-fade-in space-y-5">
          <div className="surface-panel flex items-center justify-between rounded-[28px] p-5">
            <p className="text-sm text-[--text-secondary]">Generation prompt ready</p>
            <Button variant="ghost" size="sm" onClick={() => copyText(`${CODE_GEN_SYSTEM_PROMPT}\n\n${genPrompt}`)}>
              <Copy className="h-3 w-3" /> Copy full prompt
            </Button>
          </div>
          <p className="text-sm text-[--text-secondary]">Paste generated code</p>
          <textarea value={generatedCode} onChange={e => setGeneratedCode(e.target.value)}
            placeholder="Paste component code..."
            className="surface-panel-muted h-64 w-full resize-y rounded-[28px] p-5 font-mono text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--accent-border] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]" />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStage(2)}>Back</Button>
            <Button variant="accent" onClick={() => setStage(4)} disabled={!generatedCode.trim()}>Preview</Button>
          </div>
        </div>
      )}

      {stage === 4 && (
        <div className="animate-fade-in space-y-5">
          <AssetPreview slug="preview" code={generatedCode} height={420} showCode />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStage(3)}>Edit</Button>
            <Button variant="danger" onClick={() => setStage(3)}>Reject</Button>
            <Button variant="accent" loading={isApproving} onClick={handleApprove}>Approve + Publish</Button>
          </div>
        </div>
      )}
    </div>
  )
}
