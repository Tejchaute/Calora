import { LandingPage } from '@/components/landing-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Page() {
  return <LandingPage />;
}
