import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
