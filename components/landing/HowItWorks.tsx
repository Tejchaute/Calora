import { CalendarCheck2, Link2, Settings2 } from 'lucide-react';
import { Reveal } from './LandingMotion';

const STEPS = [
    { number: '01', icon: Settings2, title: 'Set up your business', description: 'Add services, staff, working hours, holidays, and the details customers need.' },
    { number: '02', icon: Link2, title: 'Share your booking page', description: 'Give customers one public link where they can choose a service and available time.' },
    { number: '03', icon: CalendarCheck2, title: 'Run your day from Calora', description: 'Manage appointments, customers, staff, and the calendar from one workspace.' },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24 border-y border-[#DFE3EA] bg-[#F2F4F8] py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                <Reveal className="mx-auto max-w-2xl text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5146D8]">Simple to start</p>
                    <h2 id="how-title" className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#172033] sm:text-4xl">Set up. Share. Manage.</h2>
                    <p className="mt-4 text-base leading-7 text-[#526078] sm:text-lg">A clear path from creating your business to managing its daily appointments.</p>
                </Reveal>
                <Reveal delay={0.08}>
                <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8 before:absolute before:left-[16.66%] before:right-[16.66%] before:top-7 before:hidden before:h-px before:bg-[#C9CED8] md:before:block">
                    {STEPS.map((step) => (
                        <li key={step.number} className="relative text-center">
                            <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#D4D7F7] bg-[#FAF9F7] text-[#5146D8] shadow-sm"><step.icon className="h-5 w-5" aria-hidden="true" /></div>
                            <p className="mt-5 text-xs font-bold tracking-[0.14em] text-[#5146D8]">STEP {step.number}</p>
                            <h3 className="mt-2 text-xl font-bold text-[#172033]">{step.title}</h3>
                            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#526078]">{step.description}</p>
                        </li>
                    ))}
                </ol>
                </Reveal>
            </div>
        </section>
    );
}
