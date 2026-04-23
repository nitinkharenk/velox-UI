import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const THREEJS_RULES = `
---
THREE.JS SANDBOX RULES (STRICT):
* NEVER write: import * as THREE from 'three'
* NEVER write: import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
* ALWAYS use: const THREE = window.THREE
* ALWAYS use: const { GLTFLoader } = window.THREE (available via CDN)
* All Three.js classes accessed via window.THREE.*
* Three.js is pre-loaded in the sandbox via CDN — treat it like window.React
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
  if (data.system_prompt.includes('THREE.JS SANDBOX RULES')) {
    console.log("Rules already seem to be in the prompt. Aborting to prevent duplicates.")
    return
  }

  const updatedPrompt = data.system_prompt + '\n' + THREEJS_RULES

  const { error: updateError } = await supabase
    .from('pipeline_stages')
    .update({ system_prompt: updatedPrompt })
    .eq('id', data.id)

  if (updateError) {
    console.error("Error updating prompt:", updateError)
    process.exit(1)
  }

  console.log("Successfully updated Code Gen system prompt with Three.js rules!")
}

main()
