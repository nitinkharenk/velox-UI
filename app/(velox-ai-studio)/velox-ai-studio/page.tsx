import type { Metadata } from 'next'
import VeloxAIPage from '@/components/velox-ai/VeloxAIPage'

export const metadata: Metadata = {
  title: 'Velox AI Studio',
  description: 'Run the full Velox generation pipeline from one prompt with automatic review handoff.',
}

export default function VeloxAIStudioPage() {
  return <VeloxAIPage />
}
