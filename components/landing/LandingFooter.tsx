import Link from 'next/link';
import { CalendarCheck2, Mail, MessageCircle } from 'lucide-react';

const GROUPS = [
    { title: 'Product', links: [{ label: 'Product', href: '#product' }, { label: 'Booking flow', href: '#booking-flow' }, { label: 'How it works', href: '#how-it-works' }, { label: 'FAQ', href: '#faq' }] },
    { title: 'For businesses', links: [{ label: 'Clinics', href: '#businesses' }, { label: 'Salons', href: '#businesses' }, { label: 'Consultants', href: '#businesses' }, { label: 'Tutors & studios', href: '#businesses' }] },
    { title: 'Get started', links: [{ label: 'Start free', href: '/register' }, { label: 'Sign in', href: '/login' }, { label: 'Contact', href: '#contact' }] },
];

export function LandingFooter() {
    return (
        <footer className="border-t border-white/10 bg-[#101827] text-[#B8C0D0]">
            <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AFAAF7]">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5146D8] text-white"><CalendarCheck2 className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                            <span className="text-xl font-bold tracking-[-0.025em] text-white">Calora</span>
                        </Link>
                        <p className="mt-5 max-w-sm text-sm leading-6">Appointment booking and scheduling that connects the customer experience with the business&apos;s real availability and calendar.</p>
                        <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold"><a href="mailto:tejchaute33@gmail.com" className="inline-flex items-center gap-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AFAAF7]"><Mail className="h-4 w-4" /> Email</a><a href="https://wa.me/919104459044" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AFAAF7]"><MessageCircle className="h-4 w-4" /> WhatsApp</a></div>
                    </div>
                    {GROUPS.map((group) => <div key={group.title}><h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">{group.title}</h3><ul className="mt-5 space-y-3">{group.links.map((link) => <li key={link.label}><Link href={link.href} className="rounded text-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AFAAF7]">{link.label}</Link></li>)}</ul></div>)}
                </div>
                <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <p>&copy; {new Date().getFullYear()} Calora. All rights reserved.</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Link href="/privacy" className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AFAAF7]">Privacy</Link>
                        <Link href="/terms" className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AFAAF7]">Terms</Link>
                        <span>Built for appointment-based businesses.</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
