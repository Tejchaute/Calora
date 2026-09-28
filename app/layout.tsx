import '../styles/globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import {
  AuthProvider,
  BusinessProvider,
  SubscriptionProvider,
  ThemeProvider,
} from '@/providers';
import { siteUrl } from '@/lib/site';

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
  metadataBase: siteUrl,
  alternates: { canonical: '/' },
  icons: { icon: '/icon.svg' },
  openGraph: {
    title: 'Calora — Smart Appointment Booking & Business Management',
    description:
      'A modern appointment booking and business management platform for clinics, salons, studios, gyms, tutors, and consultants.',
    type: 'website',
    siteName: 'Calora',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Calora appointment booking and scheduling' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calora — Smart Appointment Booking & Business Management',
    description:
      'A modern appointment booking and business management platform for clinics, salons, studios, gyms, tutors, and consultants.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <BusinessProvider>
              <SubscriptionProvider>
                {children}
                <Toaster
                  richColors
                  position="top-right"
                />
              </SubscriptionProvider>
            </BusinessProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
