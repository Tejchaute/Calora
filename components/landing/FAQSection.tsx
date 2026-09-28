import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Reveal } from './LandingMotion';

const FAQS = [
    { question: 'How does the public booking page work?', answer: 'Customers open your public booking link, choose a service and staff option, select an available date and time, enter their details, review the booking, and confirm it.' },
    { question: 'Do customers need a Calora account to book?', answer: 'No. The public booking flow collects the customer details needed for the appointment without requiring the customer to sign in.' },
    { question: 'How does Calora decide which times are available?', answer: 'Availability is calculated from the selected service duration, eligible staff, configured working hours, business holidays, and appointments already assigned to that staff member.' },
    { question: 'Can I manage multiple staff members?', answer: 'Yes. You can add staff members, connect them to services, manage their status, and use those assignments when determining booking availability.' },
    { question: 'Can appointments be edited or rescheduled?', answer: 'Yes. Existing appointments can be opened and updated, including their date, time, service, staff assignment, status, and notes.' },
    { question: 'What can I see in the calendar?', answer: 'The calendar supports day, week, and month views. It shows appointments along with closed days, working-hour context, and business holidays.' },
    { question: 'What is included in the free trial?', answer: 'Creating an account starts a 14-day free trial. The registration flow does not request a credit card.' },
];

export function FAQSection() {
    return (
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 bg-[#F2F4F8] py-20 sm:py-24 lg:py-28">
            <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-10">
                <Reveal direction="left">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5146D8]">Questions, answered</p>
                    <h2 id="faq-title" className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#172033] sm:text-4xl">What to know before you start.</h2>
                    <p className="mt-4 max-w-md text-base leading-7 text-[#526078]">Clear answers based on Calora&apos;s current product behavior and registration flow.</p>
                    <Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-[#5146D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8] focus-visible:ring-offset-4">Start free <ArrowRight className="h-4 w-4" /></Link>
                </Reveal>
                <Reveal direction="right" delay={0.06} className="rounded-2xl border border-[#DFE3EA] bg-white px-5 sm:px-7">
                    <Accordion type="single" collapsible className="divide-y divide-[#E8EAF0]">
                        {FAQS.map((faq, index) => <AccordionItem key={faq.question} value={`faq-${index}`} className="border-0"><AccordionTrigger className="py-5 text-left text-base font-bold text-[#172033] hover:no-underline">{faq.question}</AccordionTrigger><AccordionContent className="max-w-2xl pb-5 text-sm leading-7 text-[#526078]">{faq.answer}</AccordionContent></AccordionItem>)}
                    </Accordion>
                </Reveal>
            </div>
        </section>
    );
}
