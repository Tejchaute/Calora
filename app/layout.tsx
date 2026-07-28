import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Schedora — Smart Appointment Booking & Business Management',
  description:
    'Schedora is a modern appointment booking and business management platform for clinics, salons, studios, gyms, tutors, and consultants.',
  openGraph: {
    title: 'Schedora — Smart Appointment Booking & Business Management',
    description:
      'A modern appointment booking and business management platform for clinics, salons, studios, gyms, tutors, and consultants.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
