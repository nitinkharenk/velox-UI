import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables in .env.local')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('--- Registering Gemini Production Pipeline ---')

  // 1. Create the Pipeline
  const { data: pipeline, error: pError } = await supabase
    .from('pipelines')
    .insert([
      {
        name: 'Gemini Production Pipeline',
        description: 'Advanced 6-stage pipeline using Gemini 2.5/3.1 with chunked code generation for high-fidelity components.',
        is_default: false,
      },
    ])
    .select()
    .single()

  if (pError || !pipeline) {
    console.error('Error creating pipeline:', pError?.message || 'No pipeline returned')
    process.exit(1)
  }

  console.log(`Pipeline created: ${pipeline.id}`)

  // 2. Define the Stages
  const stages = [
    {
      pipeline_id: pipeline.id,
      step_order: 1,
      name: 'Deep Research',
      action_type: 'enrich_spec',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      system_prompt: 'You are a senior design engineer. Create a high-fidelity implementation spec. Focus on micro-interactions and premium aesthetics.',
    },
    {
      pipeline_id: pipeline.id,
      step_order: 2,
      name: 'Structure Chunks',
      action_type: 'generate_code',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      system_prompt: 'Phase 1: Focus ONLY on the component skeleton, layout, and HTML structure. Use Tailwind for layout. Do not add complex logic or animations yet.',
    },
    {
      pipeline_id: pipeline.id,
      step_order: 3,
      name: 'Component Chunks',
      action_type: 'generate_code',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      system_prompt: 'Phase 2: Build upon the existing structure. Add React hooks, state handlers, and specific component logic. Keep animations minimal.',
    },
    {
      pipeline_id: pipeline.id,
      step_order: 4,
      name: 'Animation Chunks',
      action_type: 'generate_code',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      system_prompt: 'Phase 3: Complete the component by adding Framer Motion or GSAP animations. Ensure all interactions (hover, click, scroll) are fully wired up.',
    },
    {
      pipeline_id: pipeline.id,
      step_order: 5,
      name: 'Quality Validation',
      action_type: 'validate_code',
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      system_prompt: 'Strictly validate the code against premium UI standards and sandbox rules.',
    },
    {
      pipeline_id: pipeline.id,
      step_order: 6,
      name: 'Self-Repair & Polish',
      action_type: 'validate_code',
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      system_prompt: 'Fix any remaining validation issues and apply high-end design polish.',
    },
  ]

  const { error: sError } = await supabase.from('pipeline_stages').insert(stages)

  if (sError) {
    console.error('Error creating pipeline stages:', sError.message)
    process.exit(1)
  }

  console.log('--- Pipeline and Stages successfully seeded! ---')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
