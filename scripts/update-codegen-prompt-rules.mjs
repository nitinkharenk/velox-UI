import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const NEW_RULES = `
---
STAGGER CHILDREN RULE:
* staggerChildren only works on DIRECT children of a motion element
* If you want to stagger nav links, the wrapper div must be motion.div
  with variants that include staggerChildren
* NEVER put staggerChildren on a parent when the animated elements
  are grandchildren or deeper

TAILWIND + MOTION HOVER RULE:
* When an element has both className="hover:text-white" AND style={{ color: ... }}
  the inline style always wins — Tailwind hover class does nothing
* ALWAYS use whileHover={{ color: '...' }} for hover color changes
  when the element already has a style prop
* NEVER mix Tailwind hover classes with motion style props on the same element
---`

async function main() {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('id, system_prompt')
    .eq('name', 'Code Gen')
    .single()

  if (error || !data) {
    console.error("Error fetching Code Gen stage:", error)
    process.exit(1)
  }

  console.log("Found Code Gen stage. Current prompt length:", data.system_prompt.length)

  // Append if not already there
  if (data.system_prompt.includes('STAGGER CHILDREN RULE')) {
    console.log("Rules already seem to be in the prompt. Aborting to prevent duplicates.")
    return
  }

  const updatedPrompt = data.system_prompt + '\n' + NEW_RULES

  const { error: updateError } = await supabase
    .from('pipeline_stages')
    .update({ system_prompt: updatedPrompt })
    .eq('id', data.id)

  if (updateError) {
    console.error("Error updating prompt:", updateError)
    process.exit(1)
  }

  console.log("Successfully updated Code Gen system prompt!")
}

main()
