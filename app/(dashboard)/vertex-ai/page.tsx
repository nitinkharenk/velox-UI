'use client'

import { useMemo, useState, useTransition } from 'react'
import { Bot, FolderCog, MapPinned, Play, Sparkles, TerminalSquare } from 'lucide-react'
import DashboardPageFrame from '@/components/dashboard/DashboardPageFrame'
import Reveal from '@/components/ui/Reveal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { PROVIDER_CATALOG, getProviderModelTokenLimits } from '@/lib/pipeline/providerModels'

const DEFAULT_MODEL = 'gemini-2.5-flash'
const DEFAULT_LOCATION = 'us-central1'
const DEFAULT_PROMPT = 'Write a short summary of why deliberate UI motion can improve perceived product quality.'

type VertexAiResult = {
  project?: string
  location?: string
  model?: string
  outputText?: string
  rawResponse?: unknown
  error?: string
  endpoint?: string
  authMode?: string
}

function formatJson(value: unknown) {
  if (value == null) return 'No response yet.'
  return JSON.stringify(value, null, 2)
}

export default function VertexAiPage() {
  const modelOptions = useMemo(
    () => PROVIDER_CATALOG.vertex.models.map((entry) => ({ id: entry.id, label: entry.label })),
    [],
  )
  const [project, setProject] = useState('')
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [model, setModel] = useState(modelOptions.find((entry) => entry.id === DEFAULT_MODEL)?.id ?? modelOptions[0]?.id ?? DEFAULT_MODEL)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [response, setResponse] = useState<VertexAiResult | null>(null)
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const selectedModelTokenLimits = useMemo(
    () => getProviderModelTokenLimits('vertex', model),
    [model],
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/vertex-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project,
            location,
            model,
            prompt,
          }),
        })

        const payload = (await res.json()) as VertexAiResult

        if (!res.ok) {
          setResponse(payload)
          setError(payload.error ?? 'Vertex AI request failed.')
          return
        }

        setResponse(payload)
        setError('')
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Request failed.'
        setResponse(null)
        setError(message)
      }
    })
  }

  return (
    <DashboardPageFrame
      eyebrow="AI Testing"
      title="Vertex AI API Tester"
      description="Run prompt tests through the installed Vertex AI SDK, inspect the generated output, and keep raw response or credential errors visible on the same page."
      className="pb-24"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Reveal
          as="section"
          className="depth-card glass-panel overflow-hidden rounded-[2rem]"
        >
          <div className="border-b border-[--border-subtle] px-6 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[--border-default] bg-[--bg-soft] text-[--accent] shadow-[var(--shadow-soft)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-[--text-primary]">Prompt Playground</h2>
                <p className="max-w-[56ch] text-sm leading-6 text-[--text-secondary]">
                  This tester uses `@google-cloud/vertexai` with `GOOGLE_APPLICATION_CREDENTIALS` or application default credentials on the server.
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-5 px-6 py-6 sm:px-8" onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Input
                label="Project ID"
                placeholder="my-gcp-project"
                value={project}
                onChange={(event) => setProject(event.target.value)}
                autoComplete="off"
                icon={<FolderCog className="h-4 w-4" />}
              />

              <Input
                label="Location"
                placeholder={DEFAULT_LOCATION}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                autoComplete="off"
                icon={<MapPinned className="h-4 w-4" />}
              />
            </div>

            <div className="space-y-4">
              <Select
                label="Model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              >
                {modelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.25rem] border border-[--border-default] bg-[--bg-soft] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[--text-tertiary]">
                    Context window
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold leading-6 text-[--text-primary]">
                    <Bot className="h-4 w-4 text-[--accent]" />
                    {selectedModelTokenLimits.contextWindow}
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-[--border-default] bg-[--bg-soft] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[--text-tertiary]">
                    Max output
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[--text-primary]">
                    {selectedModelTokenLimits.maxOutputTokens}
                  </p>
                </div>
              </div>
            </div>

            <Textarea
              label="Prompt"
              placeholder="Give the model something to do..."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-h-[240px]"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="accent" size="lg" loading={isPending}>
                <Play className="h-4 w-4" />
                Run Vertex AI Test
              </Button>
              <p className="text-xs leading-5 text-[--text-tertiary]">
                Auth: `GOOGLE_APPLICATION_CREDENTIALS` or `gcloud auth application-default login`
              </p>
            </div>
          </form>
        </Reveal>

        <div className="grid gap-6">
          <Reveal
            as="section"
            className="depth-card glass-panel overflow-hidden rounded-[2rem]"
          >
            <div className="border-b border-[--border-subtle] px-6 py-6 sm:px-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[--border-default] bg-[--bg-soft] text-[--accent] shadow-[var(--shadow-soft)]">
                  <TerminalSquare className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight text-[--text-primary]">Response</h2>
                  <p className="text-sm leading-6 text-[--text-secondary]">
                    Generated text, endpoint metadata, and raw payload stay visible together so failures are easier to diagnose.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6 sm:px-8">
              <div className="rounded-[1.5rem] border border-[--border-default] bg-[--bg-soft] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[--text-tertiary]">Output</p>
                <div className="mt-3 min-h-[180px] whitespace-pre-wrap rounded-[1.2rem] bg-[--bg-base] px-4 py-4 text-sm leading-7 text-[--text-primary] shadow-[var(--shadow-soft)]">
                  {response?.outputText?.trim() || 'Response output will appear here after a successful request.'}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[--border-default] bg-[--bg-soft] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[--text-tertiary]">Model</p>
                  <p className="mt-3 text-sm leading-6 text-[--text-primary]">
                    {response?.model || model || DEFAULT_MODEL}
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-[--border-default] bg-[--bg-soft] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[--text-tertiary]">Error</p>
                  <p className="mt-3 min-h-[48px] text-sm leading-6 text-[--text-primary]">
                    {error || response?.error || 'No error returned.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[--border-default] bg-[--bg-soft] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[--text-tertiary]">Project ID</p>
                  <p className="mt-3 text-sm leading-6 text-[--text-primary]">
                    {response?.project || project || 'Provide a project ID or set GCP_PROJECT_ID.'}
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-[--border-default] bg-[--bg-soft] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[--text-tertiary]">Location</p>
                  <p className="mt-3 text-sm leading-6 text-[--text-primary]">
                    {response?.location || location || DEFAULT_LOCATION}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[--border-default] bg-[--bg-soft] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[--text-tertiary]">Endpoint</p>
                <p className="mt-3 break-all text-sm leading-6 text-[--text-primary]">
                  {response?.endpoint || 'Endpoint details will appear after the first request.'}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[--border-default] bg-[--bg-soft] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[--text-tertiary]">Auth Mode</p>
                <p className="mt-3 break-all text-sm leading-6 text-[--text-primary]">
                  {response?.authMode || 'The route will use server-side Google Cloud credentials when you run a request.'}
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal
            as="section"
            className="depth-card glass-panel overflow-hidden rounded-[2rem]"
          >
            <div className="border-b border-[--border-subtle] px-6 py-6 sm:px-8">
              <h2 className="text-xl font-semibold tracking-tight text-[--text-primary]">Raw Response</h2>
              <p className="mt-1 text-sm leading-6 text-[--text-secondary]">
                Use the full JSON body when you need to inspect candidates, usage metadata, or provider-side errors.
              </p>
            </div>
            <div className="px-6 py-6 sm:px-8">
              <pre className="max-h-[420px] overflow-auto rounded-[1.5rem] border border-[--border-default] bg-[--bg-base] p-4 text-xs leading-6 text-[--text-secondary] shadow-[var(--shadow-soft)]">
                {formatJson(response?.rawResponse)}
              </pre>
            </div>
          </Reveal>
        </div>
      </div>
    </DashboardPageFrame>
  )
}
