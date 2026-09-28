import type { Metadata } from 'next';
import { GuestGuard } from '@/components/auth';
import { LoginPage } from '@/features/auth';

export const metadata: Metadata = { title: 'Sign in', description: 'Sign in to your Calora workspace.' };

export default function Page() {
  return (
    <GuestGuard>
      <LoginPage />
    </GuestGuard>
  );
}
