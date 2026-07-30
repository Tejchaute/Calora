import { AuthGuard } from '@/components/auth';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </AuthGuard>
  );
}
