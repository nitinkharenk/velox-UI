import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ideas = [
  { name: 'Magnetic Button', type: 'hover', category: 'animation', tech: ['Tailwind', 'Framer Motion'], complexity: 'medium', feel: 'springy, playful' },
  { name: 'Gradient Border Card', type: 'hover', category: 'component', tech: ['Tailwind'], complexity: 'low', feel: 'premium, smooth' },
  { name: 'Typewriter Text', type: 'mount', category: 'animation', tech: ['Tailwind'], complexity: 'medium', feel: 'retro, terminal' },
  { name: 'Spotlight Card', type: 'hover', category: 'component', tech: ['Tailwind', 'Framer Motion'], complexity: 'medium', feel: 'elegant, spotlight follows cursor' },
  { name: 'Staggered List', type: 'mount', category: 'animation', tech: ['Framer Motion'], complexity: 'low', feel: 'smooth cascade entrance' },
  { name: 'Morphing Button', type: 'click', category: 'animation', tech: ['Framer Motion'], complexity: 'high', feel: 'fluid shape morph' },
  { name: 'Parallax Scroll Cards', type: 'scroll', category: 'component', tech: ['Framer Motion'], complexity: 'medium', feel: 'depth, layered' },
  { name: 'Neon Glow Input', type: 'hover', category: 'component', tech: ['Tailwind'], complexity: 'low', feel: 'cyberpunk, glowing' },
  { name: 'Flip Counter', type: 'continuous', category: 'animation', tech: ['Framer Motion'], complexity: 'high', feel: 'mechanical, satisfying flip' },
  { name: 'Liquid Button', type: 'hover', category: 'animation', tech: ['GSAP'], complexity: 'high', feel: 'fluid, organic blob' },
  { name: 'Expanding Card', type: 'click', category: 'component', tech: ['Framer Motion'], complexity: 'medium', feel: 'smooth expand/collapse' },
  { name: 'Wave Loader', type: 'continuous', category: 'animation', tech: ['Tailwind'], complexity: 'low', feel: 'rhythmic, calming wave' },
  { name: 'Tilt Card', type: 'hover', category: 'component', tech: ['Framer Motion'], complexity: 'medium', feel: '3D perspective tilt' },
  { name: 'Shimmer Skeleton', type: 'continuous', category: 'component', tech: ['Tailwind'], complexity: 'low', feel: 'loading placeholder shimmer' },
  { name: 'Confetti Button', type: 'click', category: 'animation', tech: ['GSAP'], complexity: 'high', feel: 'celebration, burst of particles' },
  { name: 'Draggable Slider', type: 'click', category: 'component', tech: ['Framer Motion'], complexity: 'medium', feel: 'snappy drag, momentum' },
  { name: 'Blur Reveal Text', type: 'scroll', category: 'animation', tech: ['Framer Motion'], complexity: 'medium', feel: 'cinematic text reveal' },
  { name: 'Pulse Notification Badge', type: 'continuous', category: 'component', tech: ['Tailwind'], complexity: 'low', feel: 'attention-grabbing pulse' },
  { name: 'Accordion Menu', type: 'click', category: 'component', tech: ['Framer Motion'], complexity: 'medium', feel: 'smooth height animation' },
  { name: 'Orbiting Dots', type: 'continuous', category: 'animation', tech: ['GSAP'], complexity: 'high', feel: 'orbital, planetary motion' },
]

async function main() {
  console.log(`Seeding ${ideas.length} ideas...`)
  const { error } = await supabase.from('ideas').insert(ideas)
  if (error) {
    console.error('Error seeding:', error.message)
    process.exit(1)
  }
  console.log('Done! Ideas seeded successfully.')
}

main()
