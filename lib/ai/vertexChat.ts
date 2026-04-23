import { PROVIDER_CATALOG, getProviderModelDetails, getProviderModelTokenLimits } from '@/lib/pipeline/providerModels'

export type VertexChatRole = 'user' | 'assistant' | 'system'
export type VertexChatStatus = 'streaming' | 'done' | 'error'

export interface VertexChatMessage {
  id: string
  role: VertexChatRole
  content: string
  status?: VertexChatStatus
}

export interface VertexTokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export function getVertexChatModelOptions() {
  return PROVIDER_CATALOG.vertex.models.map((model) => ({
    id: model.id,
    label: model.label,
  }))
}

export function getVertexChatModelDetails(modelId: string) {
  return {
    ...(getProviderModelDetails('vertex', modelId) ?? {}),
    ...getProviderModelTokenLimits('vertex', modelId),
  }
}

export function createEmptyVertexTokenUsage(): VertexTokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  }
}

export function accumulateVertexTokenUsage(
  current: VertexTokenUsage,
  next: VertexTokenUsage,
): VertexTokenUsage {
  return {
    inputTokens: current.inputTokens + next.inputTokens,
    outputTokens: current.outputTokens + next.outputTokens,
    totalTokens: current.totalTokens + next.totalTokens,
  }
}

export function makeVertexChatMessageId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

export function createUserMessage(content: string): VertexChatMessage {
  return {
    id: makeVertexChatMessageId(),
    role: 'user',
    content,
    status: 'done',
  }
}

export function createPendingAssistantMessage(): VertexChatMessage {
  return {
    id: makeVertexChatMessageId(),
    role: 'assistant',
    content: '',
    status: 'streaming',
  }
}

export function appendAssistantToken(message: VertexChatMessage, text: string): VertexChatMessage {
  return {
    ...message,
    content: `${message.content}${text}`,
    status: 'streaming',
  }
}

export function finalizeAssistantMessage(message: VertexChatMessage): VertexChatMessage {
  return {
    ...message,
    status: 'done',
  }
}

export function failAssistantMessage(message: VertexChatMessage, error: string): VertexChatMessage {
  return {
    ...message,
    content: message.content || error,
    status: 'error',
  }
}
