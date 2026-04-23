import Anthropic from '@anthropic-ai/sdk'
import { buildEnrichPrompt, buildGenPrompt, CODE_GEN_SYSTEM_PROMPT, buildValidationPrompt, buildFixPrompt } from '@/lib/pipeline/prompts'
import type { PipelineConfig, ValidationIssue, ValidationReport } from '@/types/pipeline'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getAnthropicModel(config?: PipelineConfig) {
  const model = config?.model || 'claude-sonnet-4-6'

  if (model.includes('haiku') && model.includes('3')) return 'claude-haiku-4-5-20251001'
  if (model.includes('sonnet') && model.includes('3')) return 'claude-sonnet-4-6'
  if (model.includes('opus') && model.includes('3')) return 'claude-opus-4-6'

  return model
}

export async function enrichWithClaude(ideaJson: string, config?: PipelineConfig): Promise<{ content: string; usage: { input: number; output: number } }> {
  const res = await client.messages.create({
    model: getAnthropicModel(config),
    max_tokens: 8192, // enriched spec can be large, especially for Templates
    tools: [
      {
        name: 'output_enriched_spec',
        description: 'Outputs the final enriched specification as structured JSON.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            format: { type: 'string', enum: ['component', 'section', 'template', 'page'] },
            description: { type: 'string' },
            seo_description: { type: 'string' },
            animation_spec: {
              type: 'object',
              properties: {
                trigger: { type: 'string', enum: ['hover', 'click', 'scroll', 'mount', 'continuous'] },
                entry: { type: 'string' },
                active: { type: 'string' },
                exit: { type: 'string' },
                easing: { type: 'string' },
                duration_ms: { type: 'number' },
                spring: {
                  type: 'object',
                  properties: { stiffness: { type: 'number' }, damping: { type: 'number' } }
                }
              },
              required: ['trigger', 'entry', 'active', 'exit', 'easing', 'duration_ms']
            },
            visual_spec: {
              type: 'object',
              properties: {
                dark_mode: { type: 'boolean' },
                surfaces: {
                  type: 'object',
                  properties: {
                    base: { type: 'string' },
                    elevated: { type: 'string' },
                    overlay: { type: 'string' }
                  },
                  required: ['base', 'elevated']
                },
                border: { type: 'string' },
                border_radius: { type: 'string' },
                shadow: { type: 'string' },
                accent: { type: 'string' },
                accent_hex: { type: 'string' },
                muted: { type: 'string' },
                typography: {
                  type: 'object',
                  properties: {
                    display: { type: 'string' },
                    heading: { type: 'string' },
                    subheading: { type: 'string' },
                    body: { type: 'string' },
                    label: { type: 'string' }
                  },
                  required: ['heading', 'subheading', 'body', 'label']
                },
                spacing: {
                  type: 'object',
                  properties: {
                    container: { type: 'string' },
                    card: { type: 'string' },
                    gap: { type: 'string' },
                    stack: { type: 'string' }
                  },
                  required: ['card', 'gap']
                },
                content: {
                  type: 'object',
                  properties: {
                    headline: { type: 'string' },
                    subheadline: { type: 'string' },
                    body_text: { type: 'string' },
                    cta_primary: { type: 'string' },
                    cta_secondary: { type: 'string' },
                    badge: { type: 'string' }
                  },
                  required: ['headline']
                },
                layout: {
                  type: 'object',
                  properties: {
                    pattern: { type: 'string', enum: ['centered', 'split', 'grid', 'stack', 'asymmetric', 'hero', 'bento'] },
                    max_width: { type: 'string' },
                    align: { type: 'string', enum: ['left', 'center', 'right'] }
                  },
                  required: ['pattern', 'max_width', 'align']
                },
                decorative_elements: { type: 'array', items: { type: 'string' } }
              },
              required: ['dark_mode', 'surfaces', 'border', 'border_radius', 'accent', 'typography', 'spacing', 'content', 'layout']
            },
            implementation_notes: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            component_structure: { type: 'string' },
            interactions: { type: 'array', items: { type: 'string' } },
            tech: { type: 'array', items: { type: 'string' } }
          },
          required: [
            'name', 'format', 'description', 'seo_description', 'animation_spec',
            'visual_spec', 'implementation_notes', 'tags', 'component_structure',
            'interactions', 'tech'
          ]
        }
      }
    ],
    tool_choice: { type: 'tool', name: 'output_enriched_spec' },
    messages: [{ role: 'user', content: buildEnrichPrompt(ideaJson) }]
  })

  const toolCall = res.content.find(c => c.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
  if (!toolCall) {
    throw new Error('Claude did not return structured data')
  }

  const usage = {
    input: res.usage.input_tokens,
    output: res.usage.output_tokens,
  }

  return { content: JSON.stringify(toolCall.input), usage }
}

async function streamToTextWithUsage(params: Anthropic.MessageCreateParams): Promise<{ content: string; usage: { input: number; output: number } }> {
  const stream = client.messages.stream(params)
  let text = ''
  let finalUsage = { input: 0, output: 0 }

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text
    } else if (event.type === 'message_stop') {
      // res.usage is often available on the message finalization
    }
  }

  const res = await stream.finalMessage()
  finalUsage = {
    input: res.usage.input_tokens,
    output: res.usage.output_tokens,
  }

  return { content: text, usage: finalUsage }
}

export async function generateWithClaude(specJson: string, config?: PipelineConfig): Promise<{ content: string; usage: { input: number; output: number } }> {
  const sys = config?.system_prompt ? `${CODE_GEN_SYSTEM_PROMPT}\n\n[USER INSTRUCTIONS]\n${config.system_prompt}` : CODE_GEN_SYSTEM_PROMPT
  return streamToTextWithUsage({
    model: getAnthropicModel(config),
    max_tokens: 8192, // landing pages and complex templates need more than 4k
    system: sys,
    messages: [{ role: 'user', content: buildGenPrompt(specJson) }]
  })
}

export async function fixWithClaude(
  specJson: string | null,
  code: string,
  error: string,
  config?: PipelineConfig,
  attempt = 1,
): Promise<{ content: string; usage: { input: number; output: number } }> {
  const content = specJson
    ? buildFixPrompt(specJson, code, error, attempt)
    : `Fix this React component. Error:\n${error}\n\nCode:\n${code}\n\nReturn ONLY the fixed code string. No markdown.`

  return streamToTextWithUsage({
    model: getAnthropicModel(config),
    max_tokens: 2500, // fix output is corrected code — bounded
    messages: [{ role: 'user', content }]
  })
}

export async function validateWithClaude(
  specJson: string,
  code: string,
  config?: PipelineConfig,
  previousIssues?: ValidationIssue[],
): Promise<{ content: ValidationReport; usage: { input: number; output: number } }> {
  const res = await client.messages.create({
    model: getAnthropicModel(config),
    max_tokens: previousIssues && previousIssues.length > 0 ? 1400 : 800,
    messages: [{ role: 'user', content: buildValidationPrompt(specJson, code, previousIssues) }]
  })

  const usage = {
    input: res.usage.input_tokens,
    output: res.usage.output_tokens,
  }

  const contentBlock = res.content.find(c => c.type === 'text') as Anthropic.TextBlock
  if (!contentBlock) throw new Error('Claude returned empty validation result')

  const text = contentBlock.text
  const s = text.indexOf('{')
  const e = text.lastIndexOf('}')
  if (s !== -1 && e > s) {
    try {
      return { content: JSON.parse(text.substring(s, e + 1)), usage }
    } catch { }
  }
  return { 
    content: { status: 'FAIL', score: 0, issues: [{ severity: 'critical', type: 'system', message: 'Failed to parse validation report' }] },
    usage
  }
}

export async function reflectWithClaude(code: string, config?: PipelineConfig): Promise<{ content: string; usage: { input: number; output: number } }> {
  return streamToTextWithUsage({
    model: getAnthropicModel(config),
    max_tokens: 2000, // reflection output is a revised component
    messages: [{
      role: 'user',
      content: `You are an expert UI/UX and React reviewer. Review the following React component (using Tailwind and Framer Motion).
Critique it for:
1. Visual aesthetics (padding, harmonious colors, typography)
2. Animation fluidity and correctness
3. Any blatant missing imports or bugs

If the code is already excellent, simply return the EXACT SAME code.
If there are issues, resolve them and return the COMPLETE updated component code.
Return ONLY the raw code string, without any markdown formatting or explanation.

Code:\n${code}`
    }]
  })
}
