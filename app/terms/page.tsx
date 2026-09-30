import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'Terms of Use for Calora, an appointment booking and business management platform operated by Tej Umeshbhai Chaute.',
  alternates: { canonical: '/terms' },
};

const sections = [
  {
    title: '1. About Calora',
    paragraphs: [
      'Calora is an appointment booking and business management platform operated by Tej Umeshbhai Chaute.',
      'The platform allows appointment-based businesses and individuals to manage services, staff, customers, working hours, appointments, and public booking pages.',
      'Calora is currently operated as an individual, unregistered project.',
    ],
  },
  {
    title: '2. Acceptance of These Terms',
    paragraphs: [
      'By creating an account, accessing the Calora platform, or using a Calora public booking page, you agree to use the service in accordance with these Terms of Use and applicable law.',
      'If you do not agree with these Terms, you should not create or use a Calora account or use the platform.',
    ],
  },
  {
    title: '3. Accounts',
    paragraphs: [
      'Individuals and businesses may create accounts subject to the availability and functionality of the platform.',
      'You are responsible for providing information that is accurate and reasonably current when creating and managing your account.',
      'You are responsible for maintaining the confidentiality of your authentication credentials and for activity performed through your account.',
      'You should notify Calora if you believe that your account has been accessed without authorization.',
    ],
  },
  {
    title: '4. Business Information and Customer Data',
    paragraphs: [
      'Businesses using Calora are responsible for the accuracy and lawful use of the information they enter into the platform.',
      'This may include information about services, staff, customers, schedules, working hours, and appointments.',
      'Businesses are responsible for ensuring that they have the appropriate authority to collect, use, and manage customer information through Calora.',
      'Calora provides the technical platform for managing this information but does not independently determine the purposes for which a business collects or uses customer information.',
    ],
  },
  {
    title: '5. Public Booking Pages',
    paragraphs: [
      'Calora may provide businesses with public booking pages that allow customers to view available appointment information and request appointments.',
      'Businesses are responsible for ensuring that the information displayed on their public booking page, including services, staff availability, schedules, pricing, and booking rules, is accurate.',
      'Customers are responsible for providing accurate information when submitting a booking request.',
      'Where supported by the booking workflow, customers may cancel or reschedule appointments subject to the applicable business rules and availability.',
    ],
  },
  {
    title: '6. Appointments and Notifications',
    paragraphs: [
      'Calora may create and manage appointment records based on information submitted through the platform or public booking pages.',
      'Calora may send transactional appointment confirmation and reminder emails to the email address provided for an appointment.',
      'Businesses remain responsible for the accuracy of their appointment information, services, staff schedules, prices, and customer communications.',
      'Calora does not guarantee that an appointment will be accepted, attended, changed, or fulfilled by a business or customer.',
    ],
  },
  {
    title: '7. Free Trial',
    paragraphs: [
      'Calora currently provides a 14-day free trial for a newly created business.',
      'The trial begins after the business is created through the Calora setup workflow.',
      'Calora currently does not charge users for the trial and does not currently provide paid subscription plans or payment processing.',
      'Trial availability and features may change as Calora develops.',
    ],
  },
  {
    title: '8. Expiration of the Trial',
    paragraphs: [
      'When the 14-day trial expires, access to the operational Calora application is blocked.',
      'Trial expiration does not automatically delete the account or associated business data. The data remains associated with the account unless the account is subsequently deleted.',
      'An expired account may display only the applicable access-restriction page until access is otherwise restored or the account is deleted.',
    ],
  },
  {
    title: '9. Acceptable Use',
    paragraphs: [
      'You must use Calora only for lawful purposes and in a manner that does not interfere with the operation or security of the service.',
      'You must not knowingly attempt to access another business’s information, bypass authentication or authorization controls, interfere with application infrastructure, introduce malicious code, or use Calora to facilitate unlawful activity.',
      'You must not submit information that you are not authorized to collect, use, or process.',
    ],
  },
  {
    title: '10. Security and Service Use',
    paragraphs: [
      'Calora uses authentication, authorization, database isolation, row-level security, HTTPS, and other technical controls intended to protect platform data.',
      'You must not attempt to circumvent these controls or test the security of the platform in a manner that could disrupt the service or affect other users.',
      'Although reasonable technical safeguards are used, no internet-based service can guarantee uninterrupted availability or absolute security.',
    ],
  },
  {
    title: '11. Service Availability and Changes',
    paragraphs: [
      'Calora is an actively developing platform. Features, interfaces, workflows, integrations, and availability may change over time.',
      'Calora may add, modify, suspend, or discontinue functionality as the platform develops. Where appropriate, changes may be reflected in the application or updated documentation.',
      'Calora does not currently provide a separate service-level agreement or guaranteed uptime commitment.',
    ],
  },
  {
    title: '12. Account and Data Deletion',
    paragraphs: [
      'Calora does not currently provide a self-service account deletion feature.',
      'An account holder may request deletion by contacting Tej Umeshbhai Chaute at tejchaute33@gmail.com.',
      'After reasonable verification, an approved deletion request is intended to remove the account and all data associated with the business from the Calora database, including associated staff, services, customers, appointments, working hours, and related notification records.',
    ],
  },
  {
    title: '13. Intellectual Property',
    paragraphs: [
      'Calora’s software, interface, branding, design, documentation, and underlying platform components are operated and maintained by Calora, subject to the rights of their respective owners and licensors.',
      'These Terms do not transfer ownership of Calora’s software or branding to users.',
      'Businesses retain responsibility for the information and content they submit to the platform and must have the necessary rights and permissions to use that information.',
    ],
  },
  {
    title: '14. Third-Party Services',
    paragraphs: [
      'Calora relies on third-party infrastructure and service providers, including Supabase for authentication and database infrastructure, Resend for transactional email delivery, and Netlify for hosting and deployment infrastructure.',
      'Third-party services may have their own terms and policies. Your use of Calora may therefore involve processing through these service providers as necessary for the platform to operate.',
    ],
  },
  {
    title: '15. No Payment or Refund Terms Currently Apply',
    paragraphs: [
      'Calora currently does not offer paid subscription plans or process payments through the platform.',
      'Accordingly, Calora does not currently maintain a paid-plan refund policy or payment-provider terms.',
      'If paid plans or payment processing are introduced in the future, the applicable commercial terms will be added or updated before those features are offered.',
    ],
  },
  {
    title: '16. Termination and Access Restrictions',
    paragraphs: [
      'Calora does not currently maintain a separate user-initiated termination or account-suspension program beyond the operational restriction that occurs when a trial expires.',
      'An account holder may request deletion of their account and associated business data as described in these Terms.',
    ],
  },
  {
    title: '17. Changes to These Terms',
    paragraphs: [
      'These Terms may be updated as Calora develops, introduces new functionality, changes its services, or changes its operating practices.',
      'The effective date and last-updated date shown on this page identify the current version of these Terms.',
      'Continued use of Calora after an updated version becomes available constitutes use under the updated Terms to the extent permitted by applicable law.',
    ],
  },
  {
    title: '18. Governing Law and Jurisdiction',
    paragraphs: [
      'Calora has not currently designated a specific governing-law or jurisdiction clause in these Terms. This section may be updated following appropriate legal advice.',
    ],
  },
  {
    title: '19. Contact',
    paragraphs: [
      'Questions regarding these Terms of Use may be directed to:',
      'Tej Umeshbhai Chaute',
      'Email: tejchaute33@gmail.com',
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      summary="These Terms describe the rules and responsibilities that apply when using Calora and its appointment-booking services."
      sections={sections}
    />
  );
}