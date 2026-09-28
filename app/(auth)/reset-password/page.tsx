import type { Metadata } from 'next';
import { ResetPasswordPage } from '@/features/auth';

export const metadata: Metadata = { title: 'Reset password', description: 'Create a new password for your Calora account.' };

export default function Page() {
  return <ResetPasswordPage />;
}
