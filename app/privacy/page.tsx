import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for Calora, an appointment booking and business management platform operated by Tej Umeshbhai Chaute.',
  alternates: { canonical: '/privacy' },
};

const sections = [
  {
    title: '1. About this Privacy Policy',
    paragraphs: [
      'This Privacy Policy explains how Calora, operated by Tej Umeshbhai Chaute, processes information when you use the Calora platform, including business management features and public appointment booking pages.',
      'Calora is currently operated as an individual, unregistered project. By using Calora, you acknowledge that information may be processed as described in this Privacy Policy.',
    ],
  },
  {
    title: '2. Information We Process',
    paragraphs: [
      'Calora processes information needed to provide account, business management, appointment scheduling, and public booking functionality.',
      'Depending on how you use Calora, this may include account information, business information, services, staff information, working hours, customer information, appointment information, and information required to manage appointment notifications.',
      'Customer and appointment information may include a customer name, contact information, appointment date and time, selected service, assigned staff member, appointment status, and related booking information.',
      'Calora does not intentionally request or require medical or health information, government identification numbers, payment-card information, or other sensitive identification information as part of its current appointment-booking workflow.',
    ],
  },
  {
    title: '3. Public Booking',
    paragraphs: [
      'Businesses using Calora may have a public booking page through which customers can request appointments.',
      'The public booking experience displays information necessary to understand and make a booking, such as available services, staff availability, working hours, and appointment-related information configured by the business.',
      'Customer information submitted through public booking is not intentionally displayed publicly to other visitors. It is used to create and manage the requested appointment.',
      'Depending on the booking configuration and appointment status, customers may be able to cancel or reschedule an appointment through the available booking workflow.',
    ],
  },
  {
    title: '4. How Information Is Used',
    paragraphs: [
      'Calora uses information to provide authentication, business administration, service and staff management, working-hour management, customer records, appointment scheduling, appointment status management, and related platform functionality.',
      'Information may also be used to send transactional appointment communications, including appointment confirmation and reminder emails.',
      'Calora does not currently send marketing emails.',
      'Calora does not currently use information for advertising, behavioral advertising, or third-party marketing tracking.',
    ],
  },
  {
    title: '5. Appointment Emails',
    paragraphs: [
      'Calora may send transactional emails relating to appointments. Current email types include appointment confirmation emails and appointment reminder emails.',
      'Depending on the appointment, these emails may contain the customer name, business name, service name, staff name, appointment date, appointment time, and appointment price.',
      'Transactional appointment emails are provided as part of the appointment-management functionality and are not currently used as marketing communications.',
    ],
  },
  {
    title: '6. Cookies and Local Storage',
    paragraphs: [
      'Calora currently uses only cookies that are necessary for authentication and secure session management. These cookies are provided through the Supabase authentication infrastructure used by Calora.',
      'Authentication cookies may contain session information required to keep a user signed in and to allow the application and server to verify the authenticated session. A temporary authentication cookie may also be used during secure PKCE authentication flows.',
      'Calora does not currently use advertising cookies, marketing-tracking cookies, behavioral tracking cookies, Google Analytics, Google Tag Manager, Meta Pixel, or similar third-party advertising or analytics trackers.',
      'Calora also uses browser local storage for limited functional purposes, including account display preferences and the selected application theme. Supabase may use browser storage to maintain the authenticated client session.',
      'Calora currently does not use sessionStorage or IndexedDB for application functionality.',
      'Calora does not currently display a separate cookie-consent banner because its current cookie usage is limited to authentication and other functional purposes. If the platform introduces non-essential tracking or advertising technologies in the future, this policy may be updated accordingly.',
    ],
  },
  {
    title: '7. Service Providers',
    paragraphs: [
      'Calora relies on third-party infrastructure providers to operate certain parts of the platform.',
      'Supabase provides database and authentication infrastructure used by Calora.',
      'Resend provides transactional email delivery for appointment-related emails.',
      'Netlify provides application hosting and deployment infrastructure and supports scheduled server-side processing used by Calora.',
      'These providers may process information as necessary to provide their services to Calora. Calora does not currently use additional third-party analytics or advertising services.',
    ],
  },
  {
    title: '8. Business and Customer Responsibilities',
    paragraphs: [
      'Businesses using Calora are responsible for the customer information they enter into the platform and for ensuring that they have the appropriate authority to collect and use that information for their business and appointment-management purposes.',
      'Businesses are also responsible for the accuracy of the services, staff information, schedules, appointment information, and customer information they configure or submit through Calora.',
      'Calora provides the technical platform for these workflows but does not determine why a business collects customer information or how a business independently uses that information outside Calora.',
    ],
  },
  {
    title: '9. Data Security',
    paragraphs: [
      'Calora uses technical controls intended to protect account and business information, including authenticated access controls, database row-level security, business-level data isolation, server-side authorization, HTTPS, and protected server-side credentials.',
      'Service-role credentials and other sensitive server-side configuration are not intended to be exposed to ordinary application users.',
      'No online service can guarantee absolute security. Calora continues to maintain and improve its technical controls as the platform develops.',
    ],
  },
  {
    title: '10. Data Retention',
    paragraphs: [
      'Calora generally retains account, business, customer, appointment, and related platform information while the associated account remains active.',
      'When an account deletion request is accepted and processed, Calora is intended to remove the data associated with that business from its database, including the associated account and business information, staff, services, customers, appointments, working hours, and related notification records.',
      'Calora does not currently publish a separate fixed retention period for individual categories of information. Retention practices may be updated as the platform and its operational requirements develop.',
    ],
  },
  {
    title: '11. Account Deletion',
    paragraphs: [
      'Calora does not currently provide a self-service account deletion control.',
      'If you want to request deletion of your account and associated business data, contact Tej Umeshbhai Chaute at tejchaute33@gmail.com.',
      'Deletion requests may require reasonable verification that the requester is authorized to request deletion of the relevant account or business data.',
    ],
  },
  {
    title: '12. Trial and Expired Accounts',
    paragraphs: [
      'Calora currently provides a 14-day trial beginning after a business is created through the setup workflow.',
      'When the trial expires, access to the operational application is blocked. The account and its associated data are not automatically deleted solely because the trial has expired.',
      'An expired account may display only the applicable access-restriction information until access is otherwise restored or the account is deleted.',
    ],
  },
  {
    title: '13. Changes to This Privacy Policy',
    paragraphs: [
      'Calora may update this Privacy Policy when the platform, its data practices, service providers, or applicable requirements change.',
      'The effective date and last-updated date shown on this page identify the current version of the policy.',
    ],
  },
  {
    title: '14. Contact',
    paragraphs: [
      'For questions about this Privacy Policy, privacy requests, or account and data deletion requests, contact:',
      'Tej Umeshbhai Chaute',
      'Email: tejchaute33@gmail.com',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This Privacy Policy explains how Calora processes account, business, customer, appointment, and booking information."
      sections={sections}
    />
  );
}