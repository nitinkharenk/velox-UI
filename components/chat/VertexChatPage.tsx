'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Eraser, MessageSquare, Send, Sparkles } from 'lucide-react'
import DashboardPageFrame from '@/components/dashboard/DashboardPageFrame'
import { Button } from '@/components/ui/Button'
import Reveal from '@/components/ui/Reveal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/Toast'
import { cx } from '@/components/ui/cx'
import {
  accumulateVertexTokenUsage,
  appendAssistantToken,
  createEmptyVertexTokenUsage,
  createPendingAssistantMessage,
  createUserMessage,
  failAssistantMessage,
  finalizeAssistantMessage,
  getVertexChatModelDetails,
  getVertexChatModelOptions,
  type VertexChatMessage,
  type VertexTokenUsage,
} from '@/lib/ai/vertexChat'

const DEFAULT_PROMPT = 'Plan a premium hero animation for a dashboard landing page.'
const CODE_BLOCK_PATTERN = /```([\w-]+)?\n?([\s\S]*?)```/g

function splitMessageContent(content: string) {
  const segments: Array<
    | { type: 'text'; value: string }
    | { type: 'code'; language: string; value: string }
  > = []

  let lastIndex = 0
  for (const match of content.matchAll(CODE_BLOCK_PATTERN)) {
    const matchIndex = match.index ?? 0
    if (matchIndex > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, matchIndex) })
    }

    segments.push({
      type: 'code',
      language: match[1] || 'text',
      value: match[2] || '',
    })
    lastIndex = matchIndex + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text' as const, value: content }]
}

function ChatBubble({ message }: { message: VertexChatMessage }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const segments = splitMessageContent(message.content)

  return (
    <article
      className={cx(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cx(
          'max-w-[min(100%,56rem)] rounded-[1.75rem] border px-4 py-4 shadow-[var(--shadow-soft)] sm:px-5',
          isUser
            ? 'border-transparent bg-[image:var(--card-gradient)] text-white'
            : isSystem
              ? 'border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[--danger-dim] text-[--text-primary]'
              : 'border-[--border-default] bg-[--bg-surface] text-[--text-primary]',
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <div
            className={cx(
              'flex h-8 w-8 items-center justify-center rounded-xl border text-[10px] font-bold uppercase tracking-[0.14em]',
              isUser
                ? 'border-white/20 bg-white/10 text-white'
                : isSystem
                  ? 'border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[--bg-base] text-[--danger]'
                  : 'border-[--border-default] bg-[--bg-soft] text-[--accent]',
            )}
          >
            {isUser ? 'You' : isSystem ? 'Err' : 'AI'}
          </div>
          <p className={cx('text-[11px] font-semibold uppercase tracking-[0.16em]', isUser ? 'text-white/80' : 'text-[--text-tertiary]')}>
            {message.role}
            {message.status === 'streaming' ? ' · streaming' : ''}
          </p>
        </div>

        <div className="space-y-3">
          {segments.map((segment, index) => {
            if (segment.type === 'code') {
              return (
                <div key={`${message.id}-code-${index}`} className="overflow-hidden rounded-[1.2rem] border border-[--border-default] bg-[--bg-base]">
                  <div className="border-b border-[--border-default] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-tertiary]">
                    {segment.language}
                  </div>
                  <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-[--text-primary]">
                    <code>{segment.value.trim()}</code>
                  </pre>
                </div>
              )
            }

            if (!segment.value.trim()) return null

            return (
              <p
                key={`${message.id}-text-${index}`}
                className={cx(
                  'whitespace-pre-wrap text-sm leading-7',
                  isUser ? 'text-white' : 'text-[--text-primary]',
                )}
              >
                {segment.value}
              </p>
            )
          })}
        </div>
      </div>
    </article>
  )
}

function TokenStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="depth-card glass-panel w-full max-w-[11rem] rounded-[1.2rem] border border-[--border-default] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[--text-tertiary]">{label}</p>
      <p className="mt-1.5 text-[1.35rem] font-semibold tracking-tight text-[--text-primary]">
        {value.toLocaleString('en-US')}
      </p>
    </div>
  )
}

export default function VertexChatPage() {
  const modelOptions = useMemo(
    () => getVertexChatModelOptions(),
    [],
  )
  const [model, setModel] = useState(modelOptions[1]?.id ?? modelOptions[0]?.id ?? '')
  const [draft, setDraft] = useState(DEFAULT_PROMPT)
  const [messages, setMessages] = useState<VertexChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [usage, setUsage] = useState<VertexTokenUsage>(() => createEmptyVertexTokenUsage())
  const transcriptRef = useRef<HTMLDivElement>(null)
  const selectedModelDetails = useMemo(() => getVertexChatModelDetails(model), [model])

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    const trimmedDraft = draft.trim()
    if (!trimmedDraft || !model || isStreaming) return

    const userMessage = createUserMessage(trimmedDraft)
    const assistantMessage = createPendingAssistantMessage()
    const requestMessages = [...messages, userMessage]

    setDraft('')
    setMessages([...requestMessages, assistantMessage])
    setIsStreaming(true)

    try {
      const response = await fetch('/api/vertex-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          messages: requestMessages.map(({ role, content }) => ({ role, content })),
          model,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Vertex chat stream could not be opened.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          const dataLine = chunk
            .split('\n')
            .find((line) => line.startsWith('data: '))

          if (!dataLine) continue

          const payload = JSON.parse(dataLine.slice(6)) as {
            event: 'token' | 'done' | 'error'
            text?: string
            message?: string
            usage?: VertexTokenUsage
          }

          if (payload.event === 'token' && payload.text) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? appendAssistantToken(message, payload.text ?? '')
                  : message,
              ),
            )
            continue
          }

          if (payload.event === 'done') {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? finalizeAssistantMessage(message)
                  : message,
              ),
            )
            if (payload.usage) {
              setUsage((current) => accumulateVertexTokenUsage(current, payload.usage ?? createEmptyVertexTokenUsage()))
            }
            continue
          }

          if (payload.event === 'error') {
            const message = payload.message ?? 'Vertex chat failed.'
            setMessages((current) =>
              current.map((entry) =>
                entry.id === assistantMessage.id
                  ? failAssistantMessage(entry, message)
                  : entry,
              ),
            )
            toast.error('Vertex chat failed', message)
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Vertex chat failed.'
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantMessage.id
            ? failAssistantMessage(entry, message)
            : entry,
        ),
      )
      toast.error('Vertex chat failed', message)
    } finally {
      setIsStreaming(false)
    }
  }

  function clearChat() {
    if (isStreaming) return
    setMessages([])
    setDraft(DEFAULT_PROMPT)
    setUsage(createEmptyVertexTokenUsage())
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <DashboardPageFrame
      title="Vertex Chat"
      className="pb-24"
      hideHeader
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 lg:flex-1">
          <TokenStat label="Input Tokens" value={usage.inputTokens} />
          <TokenStat label="Output Tokens" value={usage.outputTokens} />
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} disabled={isStreaming || messages.length === 0}>
          <Eraser className="h-4 w-4" />
          Clear Chat
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <Reveal as="section" className="depth-card glass-panel overflow-hidden rounded-[2rem]">
          <div className="border-b border-[--border-subtle] px-6 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[--border-default] bg-[--bg-soft] text-[--accent] shadow-[var(--shadow-soft)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-[--text-primary]">Session Controls</h2>
                <p className="max-w-[46ch] text-sm leading-6 text-[--text-secondary]">
                  This page uses the existing server-side Vertex credentials and streams one assistant reply at a time like a lightweight ChatGPT-style workspace.
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-5 px-6 py-6 sm:px-8" onSubmit={handleSubmit}>
            <Select label="Model" value={model} onChange={(event) => setModel(event.target.value)} disabled={isStreaming}>
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-[--border-default] bg-[--bg-soft] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-tertiary]">
                  Context window
                </p>
                <p className="mt-1 text-sm font-semibold text-[--text-primary]">
                  {selectedModelDetails.contextWindow}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-[--border-default] bg-[--bg-soft] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-tertiary]">
                  Max output
                </p>
                <p className="mt-1 text-sm font-semibold text-[--text-primary]">
                  {selectedModelDetails.maxOutputTokens}
                </p>
              </div>
            </div>

            <Textarea
              label="Message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              className="min-h-[220px]"
              placeholder="Ask Vertex to design, write, explain, or debug something..."
              disabled={isStreaming}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="accent" size="lg" loading={isStreaming} disabled={!draft.trim()}>
                <Send className="h-4 w-4" />
                Send Message
              </Button>
              <p className="text-xs leading-5 text-[--text-tertiary]">
                Press Enter to send. Use Shift+Enter for a new line.
              </p>
            </div>
          </form>
        </Reveal>

        <Reveal as="section" className="depth-card glass-panel flex h-[min(78vh,56rem)] flex-col overflow-hidden rounded-[2rem]">
          <div className="border-b border-[--border-subtle] px-6 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[--border-default] bg-[--bg-soft] text-[--accent] shadow-[var(--shadow-soft)]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-[--text-primary]">Transcript</h2>
                <p className="max-w-[48ch] text-sm leading-6 text-[--text-secondary]">
                  User and assistant messages stay in local page memory only for this first version. Code fences like ```tsx stay visually separated.
                </p>
              </div>
            </div>
          </div>

          <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            <div className="flex flex-col min-h-full gap-4">
              {messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-[1.75rem] border border-dashed border-[--border-default] bg-[--bg-soft] p-8 text-center">
                  <div className="max-w-[32rem] space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[--border-default] bg-[--bg-base] text-[--accent] shadow-[var(--shadow-soft)]">
                      <Bot className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-[--text-primary]">Start a Vertex conversation</h3>
                    <p className="text-sm leading-6 text-[--text-secondary]">
                      Pick a Gemini model, send a message, and the assistant will stream back token-by-token on this page.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => <ChatBubble key={message.id} message={message} />)
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </DashboardPageFrame>
  )
}
