'use client';

import { useState } from 'react';
import {
    CalendarCheck2,
    Check,
    Clock3,
    Scissors,
    UsersRound,
} from 'lucide-react';
import { BrowserChrome } from './product-ui';
import { Reveal, ScrollFloat } from './LandingMotion';

const STEPS = [
    { id: 'services', label: 'Services', description: 'Define what customers can book, including duration and price.' },
    { id: 'staff', label: 'Staff', description: 'Connect each service to the staff members who provide it.' },
    { id: 'hours', label: 'Working hours', description: 'Set open days, hours, breaks, and business holidays.' },
    { id: 'slot', label: 'Available slot', description: 'Calora turns those rules into times customers can actually book.' },
    { id: 'booking', label: 'Customer booking', description: 'Customers choose a service, staff member, date, and time.' },
    { id: 'confirmation', label: 'Confirmation', description: 'The customer reviews the details before confirming the appointment.' },
    { id: 'calendar', label: 'Calendar', description: 'The booking appears in the business calendar, ready to manage.' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

function ServicesPreview() {
    return (
        <div className="space-y-3">
            {[
                ['Consultation', '45 min', '$60'],
                ['Follow-up session', '30 min', '$40'],
            ].map(([name, duration, price]) => (
                <div key={name} className="flex items-center gap-4 rounded-xl border border-[#DFE3EA] bg-white p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ECEBFF] text-[#5146D8]"><Scissors className="h-5 w-5" aria-hidden="true" /></div>
                    <div className="min-w-0 flex-1"><p className="font-bold text-[#172033]">{name}</p><p className="mt-0.5 text-sm text-[#526078]">{duration} · Active</p></div>
                    <span className="font-bold text-[#172033]">{price}</span>
                </div>
            ))}
        </div>
    );
}

function StaffPreview() {
    return (
        <div className="space-y-3">
            {[
                ['Maya Chen', 'Consultation · Follow-up session'],
                ['Noah Williams', 'Consultation'],
            ].map(([name, services], index) => (
                <div key={name} className="flex items-center gap-4 rounded-xl border border-[#DFE3EA] bg-white p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECEBFF] text-sm font-bold text-[#5146D8]">{index === 0 ? 'MC' : 'NW'}</div>
                    <div className="min-w-0 flex-1"><p className="font-bold text-[#172033]">{name}</p><p className="mt-0.5 truncate text-sm text-[#526078]">{services}</p></div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087B65]"><span className="h-2 w-2 rounded-full bg-[#087B65]" /> Active</span>
                </div>
            ))}
        </div>
    );
}

function HoursPreview() {
    return (
        <div className="overflow-hidden rounded-xl border border-[#DFE3EA] bg-white">
            {[
                ['Monday', '9:00 AM', '5:00 PM', true],
                ['Tuesday', '9:00 AM', '5:00 PM', true],
                ['Wednesday', '9:00 AM', '5:00 PM', true],
                ['Thursday', '9:00 AM', '5:00 PM', true],
                ['Friday', '9:00 AM', '3:00 PM', true],
                ['Saturday', 'Closed', '', false],
            ].map(([day, start, end, open]) => (
                <div key={String(day)} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[#E8EAF0] px-4 py-3 last:border-0 sm:grid-cols-[1fr_100px_100px_auto]">
                    <span className="text-sm font-bold text-[#172033]">{day}</span>
                    <span className="hidden text-sm text-[#526078] sm:block">{start}</span>
                    <span className="hidden text-sm text-[#526078] sm:block">{end}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${open ? 'bg-[#E7F6F1] text-[#087B65]' : 'bg-[#F2F4F8] text-[#526078]'}`}>{open ? 'Open' : 'Closed'}</span>
                </div>
            ))}
        </div>
    );
}

function SlotPreview() {
    return (
        <div className="grid gap-5 rounded-xl border border-[#DFE3EA] bg-white p-5 sm:grid-cols-[1fr_0.9fr]">
            <div>
                <p className="text-sm font-bold text-[#172033]">Select a date</p>
                <div className="mt-4 grid grid-cols-5 gap-2">
                    {['Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16'].map((date) => (
                        <div key={date} className={`rounded-lg px-2 py-3 text-center text-xs font-bold ${date === 'Wed 14' ? 'bg-[#5146D8] text-white' : 'bg-[#F2F4F8] text-[#526078]'}`}>{date}</div>
                    ))}
                </div>
            </div>
            <div>
                <p className="text-sm font-bold text-[#172033]">Available times</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {['9:00 AM', '10:30 AM', '1:00 PM', '3:30 PM'].map((time) => (
                        <div key={time} className={`rounded-lg border px-2 py-2.5 text-center text-xs font-bold ${time === '10:30 AM' ? 'border-[#5146D8] bg-[#ECEBFF] text-[#3E35B6]' : 'border-[#DFE3EA] text-[#526078]'}`}>{time}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function BookingPreview() {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#DFE3EA] bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#526078]">Your details</p><div className="mt-4 space-y-3"><div className="rounded-lg border border-[#DFE3EA] px-3 py-2.5 text-sm text-[#172033]">Ravi Patel</div><div className="rounded-lg border border-[#DFE3EA] px-3 py-2.5 text-sm text-[#172033]">ravi@example.com</div></div></div>
            <div className="rounded-xl border border-[#DFE3EA] bg-[#F2F4F8] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#526078]">Selected</p><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#526078]">Service</dt><dd className="font-bold text-[#172033]">Consultation</dd></div><div className="flex justify-between gap-4"><dt className="text-[#526078]">Staff</dt><dd className="font-bold text-[#172033]">Maya</dd></div><div className="flex justify-between gap-4"><dt className="text-[#526078]">Time</dt><dd className="font-bold text-[#172033]">Wed · 10:30 AM</dd></div></dl></div>
        </div>
    );
}

function ConfirmationPreview() {
    return (
        <div className="mx-auto max-w-sm rounded-2xl border border-[#CDE8DF] bg-white p-6 text-center shadow-lg shadow-[#172033]/5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E7F6F1] text-[#087B65]"><Check className="h-6 w-6" aria-hidden="true" /></div>
            <h3 className="mt-4 text-xl font-bold text-[#172033]">Booking confirmed</h3>
            <p className="mt-2 text-sm text-[#526078]">Consultation with Maya</p>
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#F2F4F8] px-4 py-3 text-sm font-bold text-[#172033]"><CalendarCheck2 className="h-4 w-4 text-[#5146D8]" /> Wednesday · 10:30 AM</div>
        </div>
    );
}

function CalendarPreview() {
    return (
        <div className="grid grid-cols-[46px_1fr] gap-3 rounded-xl border border-[#DFE3EA] bg-white p-4">
            <div className="space-y-10 pt-8 text-[10px] font-semibold text-[#526078]"><p>9 AM</p><p>10 AM</p><p>11 AM</p><p>12 PM</p></div>
            <div><div className="grid grid-cols-3 border-b border-[#DFE3EA] pb-3 text-center text-xs font-bold text-[#526078]"><span>Tue 13</span><span className="text-[#5146D8]">Wed 14</span><span>Thu 15</span></div><div className="relative mt-3 h-48 rounded-lg [background-image:linear-gradient(#E8EAF0_1px,transparent_1px),linear-gradient(90deg,#E8EAF0_1px,transparent_1px)] [background-size:100%_44px,33.33%_100%]"><div className="absolute left-[35%] right-[34%] top-[57px] rounded-lg border border-[#5146D8]/20 bg-[#ECEBFF] p-2"><p className="text-[10px] font-bold text-[#3E35B6]">10:30 · Consultation</p><p className="mt-0.5 text-[9px] text-[#526078]">Ravi · Maya</p></div></div></div>
        </div>
    );
}

function StepPreview({ step }: { step: StepId }) {
    if (step === 'services') return <ServicesPreview />;
    if (step === 'staff') return <StaffPreview />;
    if (step === 'hours') return <HoursPreview />;
    if (step === 'slot') return <SlotPreview />;
    if (step === 'booking') return <BookingPreview />;
    if (step === 'confirmation') return <ConfirmationPreview />;
    return <CalendarPreview />;
}

export function FeatureShowcase() {
    const [activeStep, setActiveStep] = useState<StepId>('services');
    const activeIndex = STEPS.findIndex((step) => step.id === activeStep);
    const active = STEPS[activeIndex];

    return (
        <section id="booking-flow" aria-labelledby="booking-flow-title" className="scroll-mt-24 bg-[#172033] py-20 text-white sm:py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                <Reveal className="max-w-3xl">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#AFAAF7]">The real booking flow</p>
                    <h2 id="booking-flow-title" className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl">From your working hours to a confirmed appointment.</h2>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-[#B8C0D0] sm:text-lg">This static walkthrough mirrors how Calora connects business setup, public availability, customer booking, and the calendar.</p>
                </Reveal>

                <Reveal delay={0.08} className="mt-12 grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-12">
                    <ol className="relative space-y-1 before:absolute before:bottom-5 before:left-[31px] before:top-5 before:w-px before:bg-white/15">
                        {STEPS.map((step, index) => {
                            const selected = step.id === activeStep;
                            return (
                                <li key={step.id} className="relative">
                                    <button type="button" onClick={() => setActiveStep(step.id)} aria-current={selected ? 'step' : undefined} className={`group flex w-full items-start gap-4 rounded-xl p-3 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AFAAF7] ${selected ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                        <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors motion-reduce:transition-none ${selected ? 'border-[#AFAAF7] bg-[#5146D8] text-white' : 'border-white/20 bg-[#172033] text-[#B8C0D0]'}`}>{String(index + 1).padStart(2, '0')}</span>
                                        <span className="pt-0.5"><span className={`block text-sm font-bold ${selected ? 'text-white' : 'text-[#D7DCE5]'}`}>{step.label}</span><span className={`mt-1 block text-sm leading-6 ${selected ? 'text-[#B8C0D0]' : 'hidden text-[#8993A6] sm:block'}`}>{step.description}</span></span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    <ScrollFloat distance={20} className="lg:sticky lg:top-24">
                    <div aria-live="polite">
                        <BrowserChrome url={activeStep === 'calendar' ? 'app.calora.com/calendar' : 'calora.app/book/harbor-studio'}>
                            <div className="min-h-[370px] bg-[#F8F9FC] p-4 text-[#172033] sm:p-7">
                                <div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5146D8]">Step {activeIndex + 1} of {STEPS.length}</p><h3 className="mt-1 text-xl font-bold">{active.label}</h3></div><span className="hidden rounded-full bg-[#ECEBFF] px-3 py-1.5 text-xs font-bold text-[#3E35B6] sm:block">Product preview</span></div>
                                <StepPreview step={activeStep} />
                            </div>
                        </BrowserChrome>
                    </div>
                    </ScrollFloat>
                </Reveal>

                <Reveal delay={0.12} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-sm text-[#B8C0D0]">
                    <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#AFAAF7]" /> Working hours shape availability</span>
                    <span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4 text-[#AFAAF7]" /> Staff connect to services</span>
                    <span className="inline-flex items-center gap-2"><CalendarCheck2 className="h-4 w-4 text-[#AFAAF7]" /> Bookings reach the calendar</span>
                </Reveal>
            </div>
        </section>
    );
}
