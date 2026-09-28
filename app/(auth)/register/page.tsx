import type { Metadata } from 'next';
import { GuestGuard } from '@/components/auth';
import { RegisterPage } from '@/features/auth';

export const metadata: Metadata = { title: 'Create account', description: 'Create your Calora account, then set up your business workspace.' };

export default function Page() {
  return (
    <GuestGuard>
      <RegisterPage />
    </GuestGuard>
  );
}
