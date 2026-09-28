import type { Metadata } from 'next';
import { AuthShell } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Sign in to or create your Calora account.',
  robots: { index: false, follow: false },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthShell>{children}</AuthShell>;
}
