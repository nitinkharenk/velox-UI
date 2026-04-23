import DashboardShell from '@/components/layout/DashboardShell'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ToastProvider } from '@/components/ui/Toast'

export default function VeloxAIStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardShell navVariant="studio">
        {children}
      </DashboardShell>
      <ToastProvider />
    </ThemeProvider>
  )
}
