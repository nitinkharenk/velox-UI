import { NextResponse } from 'next/server'
import {
  buildVertexGenerateContentRequest,
  createVertexClient,
  extractVertexText,
  type VertexGenerateContentResponse,
} from '@/lib/ai/vertex'

const DEFAULT_VERTEX_MODEL = 'gemini-2.5-flash'
const DEFAULT_VERTEX_LOCATION = 'us-central1'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { project, location, prompt, model } = await request.json()

    const selectedProject =
      typeof project === 'string' && project.trim()
        ? project.trim()
        : process.env.GCP_PROJECT_ID?.trim() || ''
    const selectedLocation =
      typeof location === 'string' && location.trim()
        ? location.trim()
        : process.env.GCP_LOCATION?.trim() || DEFAULT_VERTEX_LOCATION
    const selectedModel = typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_VERTEX_MODEL

    if (!selectedProject) {
      return NextResponse.json({ error: 'Missing project ID', outputText: '', rawResponse: null }, { status: 400 })
    }

    if (!selectedLocation) {
      return NextResponse.json({ error: 'Missing location', outputText: '', rawResponse: null }, { status: 400 })
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt', outputText: '', rawResponse: null }, { status: 400 })
    }

    const client = createVertexClient({
      project: selectedProject,
      location: selectedLocation,
    })

    const result = await client.models.generateContent({
      model: selectedModel,
      ...buildVertexGenerateContentRequest(prompt, selectedModel),
    })

    const payload = result as unknown as VertexGenerateContentResponse
    const outputText = extractVertexText(payload)

    return NextResponse.json({
      project: selectedProject,
      location: selectedLocation,
      model: selectedModel,
      outputText,
      rawResponse: payload,
      endpoint: 'VertexAI SDK generateContent',
      authMode: 'GOOGLE_APPLICATION_CREDENTIALS / Application Default Credentials',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Vertex AI test failure'

    return NextResponse.json(
      {
        error: message,
        outputText: '',
        rawResponse: null,
      },
      { status: 500 },
    )
  }
}
