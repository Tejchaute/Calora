import '../styles/globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, ThemeProvider } from '@/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Calora — Smart Appointment Booking & Business Management',
  description:
    'Calora is a modern appointment booking and business management platform for clinics, salons, studios, gyms, tutors, and consultants.',
  metadataBase: new URL('https://calora.app'),
  openGraph: {
    title: 'Calora — Smart Appointment Booking & Business Management',
    description:
      'A modern appointment booking and business management platform for clinics, salons, studios, gyms, tutors, and consultants.',
    type: 'website',
    siteName: 'Calora',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calora — Smart Appointment Booking & Business Management',
    description:
      'A modern appointment booking and business management platform for clinics, salons, studios, gyms, tutors, and consultants.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
