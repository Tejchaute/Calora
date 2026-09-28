import type { Metadata } from 'next';
import { ForgotPasswordPage } from '@/features/auth';

export const metadata: Metadata = { title: 'Forgot password', description: 'Request a password reset link for your Calora account.' };

export default function Page() {
  return <ForgotPasswordPage />;
}
