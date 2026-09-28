import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Draft information about how Calora handles account and appointment data.',
  alternates: { canonical: '/privacy' },
};

const sections = [
  { title: 'Information Calora processes', paragraphs: ['Calora processes information supplied when users create accounts, configure a business workspace, manage customers, and schedule appointments.', 'Public booking may collect the customer details required to create and manage the requested appointment.'] },
  { title: 'How information is used', paragraphs: ['Information is used to provide authentication, business administration, appointment scheduling, customer records, and configured appointment notifications.', 'Calora does not currently use advertising or marketing-tracking cookies in this application.'] },
  { title: 'Access and security', paragraphs: ['Authenticated business data is separated by business membership and application authorization controls. Public booking receives only the information required for the booking workflow.', 'No online service can promise absolute security. Operational security practices and this policy should be reviewed before launch.'] },
  { title: 'Questions', paragraphs: ['Questions about this draft can be sent to tejchaute33@gmail.com. The final policy should identify the responsible legal entity and any legally required contact details.'] },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" summary="This draft explains the kinds of information Calora uses to provide appointment booking and business operations." sections={sections} />;
}
