import { AuthShell } from '@/components/layout';
import { GuestGuard } from '@/components/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell>
      <GuestGuard>{children}</GuestGuard>
    </AuthShell>
  );
}
