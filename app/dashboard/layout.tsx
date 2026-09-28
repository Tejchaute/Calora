import type { Metadata } from 'next';
import {
  AuthGuard,
  BusinessGuard,
  SubscriptionGuard,
} from '@/components/auth';

import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';

export const metadata: Metadata = {
  title: 'Workspace',
  robots: { index: false, follow: false },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <BusinessGuard>
        <SubscriptionGuard>
          <DashboardLayoutClient>
            {children}
          </DashboardLayoutClient>
        </SubscriptionGuard>
      </BusinessGuard>
    </AuthGuard>
  );
}
