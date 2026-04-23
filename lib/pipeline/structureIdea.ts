import Anthropic from '@anthropic-ai/sdk'
import { callVertexPrompt, parseVertexJson } from '@/lib/ai/vertexPipeline'
import type { StructuredIdeaInput, WorkflowPipeline } from '@/types/pipeline'

interface StructureIdeaOptions {
  variationIndex?: number
  totalCount?: number
  existingIdeas?: StructuredIdeaInput[]
  /** The resolved workflow to use for provider/model selection */
  workflow?: WorkflowPipeline | null
  /** Optional tactical overrides for the structured idea */
  idea?: any
}

const STRUCTURE_PROMPT = `You are a UI component analyst. Parse the given component idea into a structured JSON object.

Return ONLY a valid JSON object with exactly these fields:
- "name": short punchy component name (string)
- "type": one of exactly: hover, click, scroll, entrance, loop
- "category": one of exactly: animation, component, template
- "format": one of exactly: component, section, template, page
- "tech": array containing any of: Tailwind, "Framer Motion", GSAP, CSS
- "complexity": one of exactly: micro, standard, complex
- "feel": one of exactly: fluid, bouncy, magnetic, mechanical, minimal, elastic, smooth, instant
- "vision": detailed description of the vibe, look, and animation feel (string)

No markdown. No extra keys. Valid JSON only.`

function buildVariationMessage(prompt: string, options: StructureIdeaOptions) {
  const variationIndex = options.variationIndex ?? 0
  const totalCount = options.totalCount ?? 1
  const priorIdeas = options.existingIdeas ?? []

  const variationInstruction =
    totalCount > 1
      ? `You are creating variation ${variationIndex + 1} of ${totalCount}. Make this concept meaningfully distinct from the others while staying faithful to the original prompt.`
      : 'Create a single high-quality structured idea from the prompt.'

  const priorContext = priorIdeas.length
    ? `Avoid overlapping too closely with these previous concepts:\n${priorIdeas
        .map((idea, index) => `${index + 1}. ${idea.name} · ${idea.type} · ${idea.category} · ${idea.format} · ${idea.feel}`)
        .join('\n')}`
    : 'There are no previous concept variants yet.'

  return [
    'Please map this component idea into the structured fields.',
    '',
    `Idea: "${prompt}"`,
    '',
    variationInstruction,
    priorContext,
    '',
    'Default to Framer Motion + Tailwind if not specified. Complexity should reflect how hard the animation is.',
  ].join('\n')
}

/** Extract provider + model from the workflow's first stage or top-level fallback */
function resolveProviderConfig(workflow?: WorkflowPipeline | null) {
  const firstStage = workflow?.pipeline_stages?.[0]
  return {
    provider: firstStage?.provider ?? workflow?.provider ?? 'anthropic',
    model: firstStage?.model ?? workflow?.model ?? 'claude-3-5-sonnet-20240620',
  }
}

function escapeControlCharsInStrings(jsonString: string): string {
  // Matches valid JSON strings: starts with ", contains any non-quote/backslash 
  // OR an escaped character (\.), and ends with "
  return jsonString.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
    return match
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  })
}

function parseStructuredJson(text: string): StructuredIdeaInput {
  // 1. Strip markdown fences if present
  let cleaned = text.replace(/^```(?:json)?\s*/mi, '').replace(/\s*```$/mi, '').trim()
  
  // 2. Escape literal newlines within strings safely (prevents breaking structural JSON)
  cleaned = escapeControlCharsInStrings(cleaned)

  try {
    return JSON.parse(cleaned) as StructuredIdeaInput
  } catch (e) {
    console.error('[structure] Primary JSON parse failed, attempting surgical extraction...', e)
    
    // 3. Fallback: Surgical extraction of the JSON object
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const sliced = cleaned.slice(start, end + 1)
        return JSON.parse(sliced) as StructuredIdeaInput
      } catch (e2) {
        console.error('[structure] Surgical extraction failed:', e2)
      }
    }

    // 4. Ultimate Fallback: Return a partial object if we can't parse anything
    return {
      name: 'Unstructured Idea',
      type: 'hover',
      category: 'component',
      format: 'component',
      tech: ['Tailwind', 'Framer Motion'],
      complexity: 'standard',
      feel: 'fluid',
      vision: 'AI returned malformed structure. Review logs.'
    }
  }
}

async function structureViaAnthropic(userMessage: string, model: string): Promise<StructuredIdeaInput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const res = await client.messages.create({
    model,
    max_tokens: 1000,
    tools: [
      {
        name: 'structure_idea',
        description: 'Parses the user prompt into structured idea fields.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'A short, punchy name for the component.' },
            type: { type: 'string', enum: ['hover', 'click', 'scroll', 'entrance', 'loop'] },
            category: { type: 'string', enum: ['animation', 'component', 'template'] },
            format: { type: 'string', enum: ['component', 'section', 'template', 'page'] },
            tech: { type: 'array', items: { type: 'string', enum: ['Tailwind', 'Framer Motion', 'GSAP', 'CSS'] } },
            complexity: { type: 'string', enum: ['micro', 'standard', 'complex'] },
            feel: { type: 'string', enum: ['fluid', 'bouncy', 'magnetic', 'mechanical', 'minimal', 'elastic', 'smooth', 'instant'] },
            vision: { type: 'string', description: 'Technical context and architectural vision.' },
          },
          required: ['name', 'type', 'category', 'format', 'tech', 'complexity', 'feel', 'vision'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'structure_idea' },
    messages: [{ role: 'user', content: userMessage }],
  })

  const toolCall = res.content.find((item) => item.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
  if (!toolCall) throw new Error('Failed to structure idea via Anthropic')
  return toolCall.input as StructuredIdeaInput
}

async function structureViaGroq(userMessage: string, model: string): Promise<StructuredIdeaInput> {
  const Groq = (await import('groq-sdk')).default
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const res = await groq.chat.completions.create({
    model: model || 'llama-3.3-70b-versatile',
    max_tokens: 800,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: STRUCTURE_PROMPT },
      { role: 'user', content: userMessage },
    ],
  })
  const text = res.choices[0]?.message?.content ?? ''
  return parseStructuredJson(text)
}

async function structureViaGemini(userMessage: string, model: string): Promise<StructuredIdeaInput> {
  const geminiModel = model || 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${STRUCTURE_PROMPT}\n\n${userMessage}` }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.1, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API Error (${res.status}): ${errText}`)
  }
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return parseStructuredJson(text)
}

async function structureViaVertex(userMessage: string, model: string): Promise<StructuredIdeaInput> {
  const { text: rawText } = await callVertexPrompt(`${STRUCTURE_PROMPT}\n\n${userMessage}`, {
    config: {
      id: 'structure-vertex',
      name: 'Structure Prompt',
      provider: 'vertex',
      model,
      system_prompt: null,
      is_default: false,
    },
    maxOutputTokens: 800,
    temperature: 0.1,
    responseMimeType: 'application/json',
  })

  try {
    return parseStructuredJson(rawText)
  } catch {
    return parseVertexJson(rawText, {
      name: 'Untitled Vertex Idea',
      type: 'hover',
      category: 'component',
      format: 'component',
      tech: ['Tailwind', 'Framer Motion'],
      complexity: 'standard',
      feel: 'fluid',
    })
  }
}

async function structureViaOllama(userMessage: string, model: string): Promise<StructuredIdeaInput> {
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434'
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'qwen2.5-coder:32b',
      prompt: `${STRUCTURE_PROMPT}\n\n${userMessage}\n\nReturn ONLY valid JSON.`,
      stream: false,
      format: 'json',
    }),
  })
  const data = await res.json() as { response?: string }
  return parseStructuredJson(data.response ?? '{}')
}

export async function structureIdeaFromPrompt(
  prompt: string,
  options: StructureIdeaOptions = {},
): Promise<StructuredIdeaInput> {
  const normalizedPrompt = prompt.trim()
  if (!normalizedPrompt) throw new Error('Missing prompt')

  const userMessage = buildVariationMessage(normalizedPrompt, options)
  const { provider, model } = resolveProviderConfig(options.workflow)

  if (provider === 'gemini') {
    return structureViaGemini(userMessage, model)
  }

  if (provider === 'vertex') {
    return structureViaVertex(userMessage, model)
  }

  if (provider === 'groq') {
    return structureViaGroq(userMessage, model)
  }

  if (provider === 'ollama') {
    return structureViaOllama(userMessage, model)
  }

  // Default: anthropic (or any unknown provider falls back to anthropic)
  const structured = await structureViaAnthropic(userMessage, model)

  // Apply tactical overrides if provided in the idea (from the frontend Blueprint Options)
  const ideaData = (options as any).idea || {}
  
  return {
    ...structured,
    ...(ideaData.format ? { format: ideaData.format } : {}),
    ...(ideaData.complexity ? { complexity: ideaData.complexity } : {}),
    ...(ideaData.feel ? { feel: ideaData.feel } : {}),
    ...(ideaData.type ? { type: ideaData.type } : {}),
  }
}
