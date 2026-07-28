import { DashboardShell } from '@/components/layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
