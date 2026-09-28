import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Draft terms governing access to and use of Calora.',
  alternates: { canonical: '/terms' },
};

const sections = [
  { title: 'Using Calora', paragraphs: ['Users are responsible for providing accurate account and business information and for maintaining the security of their account credentials.', 'Businesses are responsible for the services, schedules, customer communications, and appointments they manage through Calora.'] },
  { title: 'Acceptable use', paragraphs: ['Calora must not be used to violate applicable law, access another business data, interfere with the service, or submit information without appropriate authority.'] },
  { title: 'Availability and changes', paragraphs: ['Features and service availability may change as Calora develops. Final terms should define support, availability, termination, and liability provisions before production launch.'] },
  { title: 'Questions', paragraphs: ['Questions about this draft can be sent to tejchaute33@gmail.com. These terms require legal review and identification of the responsible legal entity before launch.'] },
];

export default function TermsPage() {
  return <LegalPage title="Terms of Use" summary="These draft terms describe the basic responsibilities associated with accessing and using Calora." sections={sections} />;
}
