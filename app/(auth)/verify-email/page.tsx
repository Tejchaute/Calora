import type { Metadata } from 'next';
import { VerifyEmailPage } from '@/features/auth';

export const metadata: Metadata = { title: 'Verify email', description: 'Verify the email address associated with your Calora account.' };

export default function Page() {
  return <VerifyEmailPage />;
}
