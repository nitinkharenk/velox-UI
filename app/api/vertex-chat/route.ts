import { NextResponse } from 'next/server'
import {
  createVertexClient,
  extractVertexText,
  extractVertexUsage,
  type VertexGenerateContentResponse,
} from '@/lib/ai/vertex'
import { getVertexChatModelOptions } from '@/lib/ai/vertexChat'

const DEFAULT_VERTEX_LOCATION = 'us-central1'

type VertexChatInputMessage = {
  role: 'user' | 'assistant'
  content: string
}

const VALID_VERTEX_MODELS = new Set(getVertexChatModelOptions().map((model) => model.id))

function normalizeHistory(messages: VertexChatInputMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }))
}

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendToken = (text: string) => {
        controller.enqueue(
          encoder.encode(`data: {"event":"token","text":${JSON.stringify(text)}}\n\n`),
        )
      }

      const sendDone = (payload: { model: string; rawResponse: unknown; usage: unknown }) => {
        controller.enqueue(
          encoder.encode(
            `data: {"event":"done","model":${JSON.stringify(payload.model)},"usage":${JSON.stringify(payload.usage)},"rawResponse":${JSON.stringify(payload.rawResponse)}}\n\n`,
          ),
        )
      }

      const sendError = (message: string) => {
        controller.enqueue(
          encoder.encode(`data: {"event":"error","message":${JSON.stringify(message)}}\n\n`),
        )
      }

      try {
        const { messages, model } = await request.json() as {
          messages?: VertexChatInputMessage[]
          model?: string
        }

        if (!Array.isArray(messages) || messages.length === 0) {
          sendError('Missing messages')
          return
        }

        if (!model || typeof model !== 'string' || !model.trim()) {
          sendError('Missing model')
          return
        }

        const selectedProject = process.env.GCP_PROJECT_ID?.trim() || ''
        const selectedLocation = process.env.GCP_LOCATION?.trim() || DEFAULT_VERTEX_LOCATION
        const selectedModel = model.trim()

        if (!selectedProject) {
          sendError('Missing project ID')
          return
        }

        if (!selectedLocation) {
          sendError('Missing location')
          return
        }

        if (!VALID_VERTEX_MODELS.has(selectedModel)) {
          sendError(`Unsupported model: ${selectedModel}`)
          return
        }

        const latestMessage = messages[messages.length - 1]
        const latestPrompt = latestMessage?.role === 'user' ? latestMessage.content.trim() : ''

        if (!latestPrompt) {
          sendError('Latest user message is required.')
          return
        }

        const history = normalizeHistory(
          messages
            .slice(0, -1)
            .filter((message) => (message.role === 'user' || message.role === 'assistant') && message.content.trim()),
        )

        const client = createVertexClient({
          project: selectedProject,
          location: selectedLocation,
        })


        // New unified SDK: chat history is just passed in contents
        const result = await client.models.generateContentStream({
          model: selectedModel,
          contents: [
            ...history,
            { role: 'user', parts: [{ text: latestPrompt }] }
          ]
        })

        let finalResponse: VertexGenerateContentResponse | null = null

        for await (const item of result) {
          const payload = item as unknown as VertexGenerateContentResponse
          finalResponse = payload
          const text = extractVertexText(payload)
          if (text) {
            sendToken(text)
          }
        }

        if (finalResponse) {
          sendDone({
            model: selectedModel,
            usage: extractVertexUsage(finalResponse),
            rawResponse: finalResponse,
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected Vertex chat failure'
        sendError(message)
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
