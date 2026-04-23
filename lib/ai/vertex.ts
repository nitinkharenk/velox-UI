import { GoogleGenAI, type GenerateContentResponse } from '@google/genai'
import { getProviderModelTokenLimits } from '@/lib/pipeline/providerModels'

export interface VertexGenerateContentPart {
  text?: string
}

export { type GenerateContentResponse as VertexGenerateContentResponse }

type VertexModelGenerationConfig = {
  maxOutputTokens?: number
  temperature?: number
  responseMimeType?: string
}

export function createVertexClient({
  project,
  location,
}: {
  project: string
  location: string
}) {
  return new GoogleGenAI({
    vertexai: true,
    project,
    location,
  })
}

export function buildVertexGenerateContentRequest(
  prompt: string,
  model = 'gemini-2.5-flash',
) {
  const tokenLimits = getProviderModelTokenLimits('vertex', model)

  return {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 64000,
      temperature: 0.3,
    },
  }
}

export function extractVertexText(payload: GenerateContentResponse) {
  const parts = payload.candidates?.[0]?.content?.parts ?? []

  return parts
    .map((part) => part.text?.trim())
    .filter((text): text is string => Boolean(text))
    .join('\n\n')
}

export function extractVertexUsage(payload: GenerateContentResponse) {
  const usage = payload.usageMetadata

  return {
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount ?? 0,
    finishReason: payload.candidates?.[0]?.finishReason,
  }
}
