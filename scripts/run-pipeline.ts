import { createClient } from '@supabase/supabase-js'
import { enrichIdea, generateCode, validateAndFix } from '../lib/pipeline/generate'
import { ingestAsset } from '../lib/pipeline/ingest'
import type { PipelineConfig } from '../types/pipeline'
import type { Idea } from '../types/pipeline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const command = process.argv[2] ?? 'full'
const providerStr = process.argv[3] || 'anthropic'
const config: PipelineConfig = {
  id: 'script', name: 'Script', provider: providerStr,
  model: providerStr === 'gemini' ? 'gemini-2.5-flash' : 'claude-3-5-sonnet-20240620',
  system_prompt: null, is_default: false
}

async function main() {
  const { data: ideas } = await supabase
    .from('ideas')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (!ideas || ideas.length === 0) {
    console.log('No pending ideas found. Run seed-ideas.ts first.')
    return
  }

  console.log(`Found ${ideas.length} pending ideas. Provider: ${providerStr}, Command: ${command}`)

  for (const idea of ideas as Idea[]) {
    console.log(`\n--- Processing: ${idea.name} ---`)

    try {
      // Stage 2: Enrich
      if (command === 'full' || command === 'enrich') {
        console.log('  Enriching...')
        await supabase.from('ideas').update({ status: 'enriching' }).eq('id', idea.id)
        const { spec } = await enrichIdea(idea as any, config)
        await supabase.from('ideas').update({ status: 'enriched', enriched_spec: spec }).eq('id', idea.id)
        idea.enriched_spec = spec
        console.log('  Enriched.')
        if (command === 'enrich') continue
      }

      if (!idea.enriched_spec) {
        console.log('  No enriched spec, skipping generation.')
        continue
      }

      // Stage 3: Generate Variants
      if (command === 'full' || command === 'generate') {
        console.log('  Generating 3 variants...')
        let anySuccess = false
        
        for (let v = 1; v <= 3; v++) {
          console.log(`\n    --- Variant ${v} ---`)
          await supabase.from('ideas').update({ status: 'generating' }).eq('id', idea.id)
          
          const variantSpec = { 
            ...idea.enriched_spec, 
            name: `${idea.enriched_spec.name} v${v}`,
            implementation_notes: `${idea.enriched_spec.implementation_notes}\n\nIMPORTANT: This is Design Variant ${v}. Please use a highly distinct visual approach, layout, and interaction style from a standard default implementation, while still fulfilling the core requirements.`
          }

          const { code: rawCode } = await generateCode(variantSpec as any, config)
          await supabase.from('ideas').update({ status: 'generated' }).eq('id', idea.id)

          // Stage 4: Validate
          console.log(`    Validating variant ${v}...`)
          await supabase.from('ideas').update({ status: 'validating' }).eq('id', idea.id)
          const { result } = await validateAndFix(rawCode, config, JSON.stringify(variantSpec))
          await supabase.from('ideas').update({ status: 'validated' }).eq('id', idea.id)

          if (result.has_errors) {
            console.log(`    Validation failed for variant ${v}: ${result.validation_notes}`)
            continue
          }

          // Stage 6: Ingest
          console.log(`    Ingesting variant ${v} to DB...`)
          const ingestResult = await ingestAsset(idea.id, variantSpec, result.code)
          if (ingestResult.ok) {
            console.log(`    Published: ${ingestResult.slug}`)
            anySuccess = true
          } else {
            console.log(`    Ingest failed: ${ingestResult.error}`)
          }
        }
        
        if (!anySuccess) {
           await supabase.from('ideas').update({ status: 'failed', error_log: 'All 3 variants failed' }).eq('id', idea.id)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`  Error: ${message}`)
      await supabase.from('ideas').update({ status: 'failed', error_log: message }).eq('id', idea.id)
    }
  }

  console.log('\nPipeline complete.')
}

main()
