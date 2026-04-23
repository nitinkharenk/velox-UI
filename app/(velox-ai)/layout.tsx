import DashboardShell from '@/components/layout/DashboardShell'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ToastProvider } from '@/components/ui/Toast'

export default function VeloxAILayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardShell>{children}</DashboardShell>
      <ToastProvider />
    </ThemeProvider>
  )
}
