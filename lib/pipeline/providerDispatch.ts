import { enrichWithClaude, generateWithClaude } from '@/lib/ai/anthropic'
import { enrichWithGemini, generateWithGemini } from '@/lib/ai/gemini'
import { enrichWithGroq, generateWithGroq } from '@/lib/ai/groq'
import { enrichWithOllama, generateWithOllama } from '@/lib/ai/ollama'
import { enrichWithVertex, generateWithVertex } from '@/lib/ai/vertexPipeline'
import { enrichWithCustom, generateWithCustom } from '@/lib/ai/custom'
import type { PipelineConfig } from '@/types/pipeline'

export async function enrichWithProvider(input: string, config: PipelineConfig): Promise<{ content: string; usage: { input: number; output: number } }> {
  if (config.base_url) return enrichWithCustom(input, config)
  
  if (config.provider === 'anthropic') return enrichWithClaude(input, config)
  if (config.provider === 'gemini') return enrichWithGemini(input, config)
  if (config.provider === 'vertex') return enrichWithVertex(input, config)
  if (config.provider === 'groq') return enrichWithGroq(input, config)
  if (config.provider === 'ollama') return enrichWithOllama(input, config)
  
  return enrichWithCustom(input, config)
}

export async function generateWithProvider(input: string, config: PipelineConfig, previousCode?: string): Promise<{ content: string; usage: { input: number; output: number } }> {
  if (config.base_url) return generateWithCustom(input, config, previousCode)

  if (config.provider === 'anthropic') return generateWithClaude(input, config)
  if (config.provider === 'gemini') return generateWithGemini(input, config, previousCode)
  if (config.provider === 'vertex') return generateWithVertex(input, config)
  if (config.provider === 'groq') return generateWithGroq(input, config)
  if (config.provider === 'ollama') return generateWithOllama(input, config)

  return generateWithCustom(input, config, previousCode)
}
