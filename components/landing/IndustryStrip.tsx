'use client';

import { useState } from 'react';
import { CalendarCheck2, Stethoscope, Scissors, BriefcaseBusiness, GraduationCap, Sparkles } from 'lucide-react';
import { Reveal } from './LandingMotion';

const TYPES = [
    { id: 'clinics', label: 'Clinics', icon: Stethoscope, noun: 'patients', service: 'Consultation', staff: 'Practitioner', note: 'Match services, practitioners, working hours, and patient bookings.' },
    { id: 'salons', label: 'Salons', icon: Scissors, noun: 'clients', service: 'Cut & style', staff: 'Stylist', note: 'Let clients choose a service, stylist, and an actually available time.' },
    { id: 'consultants', label: 'Consultants', icon: BriefcaseBusiness, noun: 'clients', service: 'Advisory session', staff: 'Consultant', note: 'Share a booking page that reflects the consultant’s working schedule.' },
    { id: 'tutors', label: 'Tutors', icon: GraduationCap, noun: 'students', service: 'Tutoring session', staff: 'Tutor', note: 'Organize subjects, tutors, availability, students, and booked sessions.' },
    { id: 'studios', label: 'Studios', icon: Sparkles, noun: 'customers', service: 'Studio session', staff: 'Specialist', note: 'Coordinate services, specialists, and time-based bookings in one calendar.' },
] as const;

export function IndustryStrip() {
    const [activeId, setActiveId] = useState<(typeof TYPES)[number]['id']>('clinics');
    const active = TYPES.find((type) => type.id === activeId) ?? TYPES[0];

    return (
        <section id="businesses" aria-labelledby="businesses-title" className="scroll-mt-24 bg-[#FAF9F7] py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
                <Reveal className="mx-auto max-w-3xl text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5146D8]">Flexible by design</p>
                    <h2 id="businesses-title" className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#172033] sm:text-4xl">Designed for appointment-based businesses such as...</h2>
                    <p className="mt-4 text-base leading-7 text-[#526078]">Calora keeps the workflow consistent while the language and services adapt to the way each business works.</p>
                </Reveal>
                <Reveal delay={0.06}>
                <div role="tablist" aria-label="Business types" className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
                    {TYPES.map((type) => <button key={type.id} type="button" role="tab" aria-selected={type.id === activeId} aria-controls="business-panel" id={`business-tab-${type.id}`} onClick={() => setActiveId(type.id)} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8] focus-visible:ring-offset-2 ${type.id === activeId ? 'border-[#5146D8] bg-[#5146D8] text-white' : 'border-[#DFE3EA] bg-white text-[#526078] hover:border-[#B8B4F0] hover:text-[#3E35B6]'}`}><type.icon className="h-4 w-4" aria-hidden="true" />{type.label}</button>)}
                </div>
                </Reveal>
                <Reveal delay={0.1}>
                <div id="business-panel" role="tabpanel" aria-labelledby={`business-tab-${active.id}`} className="mt-8 overflow-hidden rounded-[24px] border border-[#DFE3EA] bg-white">
                    <div className="grid gap-0 md:grid-cols-[0.82fr_1.18fr]">
                        <div className="border-b border-[#DFE3EA] p-6 md:border-b-0 md:border-r sm:p-8">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ECEBFF] text-[#5146D8]"><active.icon className="h-5 w-5" aria-hidden="true" /></div>
                            <h3 className="mt-5 text-2xl font-bold text-[#172033]">{active.label}</h3>
                            <p className="mt-3 text-base leading-7 text-[#526078]">{active.note}</p>
                        </div>
                        <div className="bg-[#F8F9FC] p-6 sm:p-8">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#526078]">Example booking path</p>
                            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                                {[active.noun, active.service, active.staff, 'Available time', 'Calendar'].map((item, index) => <div key={item} className="flex min-w-0 flex-1 items-center gap-3 sm:block"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ECEBFF] text-[10px] font-bold text-[#5146D8]">{index + 1}</span><p className="text-sm font-bold capitalize text-[#172033] sm:mt-2">{item}</p>{index < 4 && <span className="ml-auto h-px flex-1 bg-[#C9CED8] sm:hidden" aria-hidden="true" />}</div>)}
                            </div>
                            <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#CDE8DF] bg-[#E7F6F1] p-3 text-sm font-bold text-[#087B65]"><CalendarCheck2 className="h-4 w-4" aria-hidden="true" /> The same appointment workflow, adapted to the business.</div>
                        </div>
                    </div>
                </div>
                </Reveal>
            </div>
        </section>
    );
}
