import Link from 'next/link';
import { CalendarCheck2, Clock3, Link2, Mail, MessageCircle, ShieldCheck, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from './LandingMotion';

const CONTACT_EMAIL = 'tejchaute33@gmail.com';
const WHATSAPP_NUMBER = '919104459044';

const ASSURANCES = [
    { icon: Clock3, title: 'Availability follows working hours', description: 'Open days, weekly hours, breaks, holidays, and existing appointments shape the slots customers see.' },
    { icon: CalendarCheck2, title: 'Bookings connect to the calendar', description: 'Confirmed bookings enter the same calendar the business uses to organize appointments.' },
    { icon: UsersRound, title: 'Customer and appointment details stay connected', description: 'Customer records and booking history remain available alongside appointment information.' },
    { icon: Link2, title: 'One public booking link', description: 'Each configured business can share its public booking page with customers.' },
];

export function ContactSection() {
    return (
        <section id="contact" aria-labelledby="trust-title" className="scroll-mt-24 bg-[#172033] py-20 text-white sm:py-24 lg:py-28">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                    <Reveal direction="left">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#AFAAF7]">Product clarity</p>
                        <h2 id="trust-title" className="mt-4 max-w-2xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl">Trust the workflow you can see.</h2>
                        <p className="mt-5 max-w-xl text-base leading-7 text-[#B8C0D0] sm:text-lg">Calora keeps availability, bookings, customer details, and the business calendar connected in one clear workflow.</p>
                        <div className="mt-9 grid gap-x-8 gap-y-7 sm:grid-cols-2">
                            {ASSURANCES.map((item) => <div key={item.title} className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#AFAAF7]"><item.icon className="h-5 w-5" aria-hidden="true" /></div><div><h3 className="text-sm font-bold text-white">{item.title}</h3><p className="mt-1.5 text-sm leading-6 text-[#B8C0D0]">{item.description}</p></div></div>)}
                        </div>
                    </Reveal>
                    <Reveal direction="right" delay={0.08} className="rounded-[24px] border border-white/15 bg-white p-6 text-[#172033] shadow-2xl shadow-black/15 sm:p-8">
                        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ECEBFF] text-[#5146D8]"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5146D8]">14-day free trial</p><h3 className="mt-0.5 text-xl font-bold">Start without payment details.</h3></div></div>
                        <p className="mt-6 text-sm leading-6 text-[#526078]">The trial begins when you create your account. Registration asks for your name, email address, and password—no credit card is required.</p>
                        <ul className="mt-6 space-y-3 text-sm font-semibold text-[#526078]">
                            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#087B65]" /> Create your account</li>
                            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#087B65]" /> Set up your business</li>
                            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#087B65]" /> Start your 14-day trial</li>
                        </ul>
                        <Link href="/register" className="mt-7 block"><Button className="h-12 w-full bg-[#5146D8] text-white hover:bg-[#3E35B6]">Start free</Button></Link>
                        <p className="mt-3 text-center text-xs font-medium text-[#526078]">14-day free trial · No credit card required</p>
                        <div className="mt-7 border-t border-[#DFE3EA] pt-6">
                            <p className="text-sm font-bold text-[#172033]">Prefer to talk first?</p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#DFE3EA] px-4 text-sm font-bold text-[#526078] hover:bg-[#F2F4F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8]"><Mail className="h-4 w-4" /> Email us</a>
                                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#DFE3EA] px-4 text-sm font-bold text-[#526078] hover:bg-[#F2F4F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8]"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
