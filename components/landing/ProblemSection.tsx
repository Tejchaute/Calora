import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Link2,
    Scissors,
    UserRound,
    UsersRound,
} from 'lucide-react';
import {
    AppointmentListSnippet,
    BrowserChrome,
    CustomerListSnippet,
    ServiceListSnippet,
    StaffAvailabilityList,
} from './product-ui';
import { Reveal, ScrollFloat } from './LandingMotion';

const APPOINTMENTS = [
    { time: '9:00 AM', customer: 'Amelia Torres', service: 'Consultation', staff: 'Maya', status: 'Confirmed' },
    { time: '10:30 AM', customer: 'Ravi Patel', service: 'Follow-up session', staff: 'Noah', status: 'Pending' },
    { time: '1:00 PM', customer: 'Grace Lin', service: 'Consultation', staff: 'Maya', status: 'Confirmed' },
];

const CUSTOMERS = [
    { name: 'Amelia Torres', note: 'Last visit · 12 May', visits: '4 bookings' },
    { name: 'Ravi Patel', note: 'New customer', visits: '1 booking' },
    { name: 'Grace Lin', note: 'Last visit · 28 Apr', visits: '3 bookings' },
];

const STAFF = [
    { name: 'Maya Chen', role: 'Consultant', status: 'Available' as const },
    { name: 'Noah Williams', role: 'Consultant', status: 'Booked' as const },
];

const SERVICES = [
    { name: 'Consultation', duration: '45 minutes', price: '$60' },
    { name: 'Follow-up session', duration: '30 minutes', price: '$40' },
];

function CalendarStage() {
    return (
        <BrowserChrome url="app.calora.com/calendar">
            <div className="bg-white p-4 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div><p className="text-base font-bold text-[#172033]">Calendar</p><p className="mt-0.5 text-xs text-[#526078]">June 12–16</p></div>
                    <div className="flex items-center gap-2">
                        {['Day', 'Week', 'Month'].map((view) => <span key={view} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === 'Week' ? 'bg-[#5146D8] text-white' : 'bg-[#F2F4F8] text-[#526078]'}`}>{view}</span>)}
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-[38px_1fr] gap-3">
                    <div className="space-y-12 pt-8 text-[10px] font-semibold text-[#526078]"><p>9 AM</p><p>10 AM</p><p>11 AM</p><p>12 PM</p><p>1 PM</p></div>
                    <div>
                        <div className="grid grid-cols-5 pb-3 text-center text-[10px] font-bold text-[#526078]"><span>Mon</span><span>Tue</span><span className="text-[#5146D8]">Wed</span><span>Thu</span><span>Fri</span></div>
                        <div className="relative h-[260px] rounded-xl border border-[#DFE3EA] [background-image:linear-gradient(#E8EAF0_1px,transparent_1px),linear-gradient(90deg,#E8EAF0_1px,transparent_1px)] [background-size:100%_52px,20%_100%]">
                            <div className="absolute left-[2%] top-3 w-[16%] rounded-lg border border-[#CDE8DF] bg-[#E7F6F1] p-2"><p className="text-[10px] font-bold text-[#087B65]">9:00</p><p className="mt-0.5 truncate text-[9px] text-[#526078]">Amelia · Maya</p></div>
                            <div className="absolute left-[42%] top-[70px] w-[16%] rounded-lg border border-[#5146D8]/20 bg-[#ECEBFF] p-2"><p className="text-[10px] font-bold text-[#3E35B6]">10:30</p><p className="mt-0.5 truncate text-[9px] text-[#526078]">Ravi · Noah</p></div>
                            <div className="absolute left-[62%] top-[174px] w-[16%] rounded-lg border border-[#CDE8DF] bg-[#E7F6F1] p-2"><p className="text-[10px] font-bold text-[#087B65]">1:00</p><p className="mt-0.5 truncate text-[9px] text-[#526078]">Grace · Maya</p></div>
                        </div>
                    </div>
                </div>
            </div>
        </BrowserChrome>
    );
}

export function ProblemSection() {
    return (
        <section id="product" aria-labelledby="product-title" className="scroll-mt-24 bg-[#FAF9F7] py-20 sm:py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                <Reveal className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5146D8]">From scattered to connected</p>
                        <h2 id="product-title" className="mt-4 max-w-2xl text-3xl font-bold tracking-[-0.035em] text-[#172033] sm:text-4xl lg:text-5xl">One booking. Every part of the business stays in sync.</h2>
                    </div>
                    <p className="max-w-xl text-base leading-7 text-[#526078] sm:text-lg">Calls, messages, customer notes, staff schedules, and calendars are difficult to coordinate when they live apart. Calora brings the real workflow into one connected workspace.</p>
                </Reveal>

                <Reveal delay={0.08} className="mt-14 grid gap-6 lg:grid-cols-12 lg:items-start">
                    <div className="lg:col-span-8">
                        <div className="mb-5 flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ECEBFF] text-[#5146D8]"><CalendarDays className="h-5 w-5" aria-hidden="true" /></div>
                            <div><h3 className="text-xl font-bold text-[#172033]">A calendar built from real availability</h3><p className="mt-1 text-sm leading-6 text-[#526078]">Day, week, and month views organize appointments alongside working hours, closed days, and holidays.</p></div>
                        </div>
                        <ScrollFloat distance={18}><CalendarStage /></ScrollFloat>
                    </div>
                    <div className="space-y-5 lg:col-span-4 lg:pt-[76px]">
                        <div className="rounded-2xl border border-[#DFE3EA] bg-white p-5">
                            <div className="mb-4 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#087B65]" /><h3 className="text-sm font-bold text-[#172033]">Appointments</h3></div>
                            <AppointmentListSnippet items={APPOINTMENTS} />
                        </div>
                        <div className="rounded-2xl border border-[#DFE3EA] bg-white p-5">
                            <div className="mb-4 flex items-center gap-2"><UserRound className="h-4 w-4 text-[#5146D8]" /><h3 className="text-sm font-bold text-[#172033]">Customer records</h3></div>
                            <CustomerListSnippet items={CUSTOMERS} />
                        </div>
                    </div>
                </Reveal>

                <Reveal className="mt-20 grid gap-10 lg:grid-cols-12 lg:items-center">
                    <div className="lg:col-span-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5146D8]">Availability with context</p>
                        <h3 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[#172033]">Staff, services, and working hours shape what customers can book.</h3>
                        <p className="mt-5 text-base leading-7 text-[#526078]">Calora checks the selected service, eligible staff, configured hours, holidays, and existing appointments before showing an available slot.</p>
                        <ul className="mt-6 space-y-3 text-sm font-semibold text-[#526078]">
                            <li className="flex gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#087B65]" /> Closed days and holidays are excluded.</li>
                            <li className="flex gap-3"><UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-[#087B65]" /> Staff availability follows service assignments.</li>
                            <li className="flex gap-3"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#087B65]" /> The public booking page uses those rules.</li>
                        </ul>
                    </div>
                    <div className="lg:col-span-8">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-[#DFE3EA] bg-white p-5"><div className="mb-4 flex items-center gap-2"><Scissors className="h-4 w-4 text-[#5146D8]" /><h4 className="text-sm font-bold">Services</h4></div><ServiceListSnippet items={SERVICES} /></div>
                            <div className="rounded-2xl border border-[#DFE3EA] bg-white p-5"><div className="mb-4 flex items-center gap-2"><UsersRound className="h-4 w-4 text-[#5146D8]" /><h4 className="text-sm font-bold">Staff availability</h4></div><StaffAvailabilityList items={STAFF} /></div>
                        </div>
                        <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#DFE3EA] bg-[#172033] p-5 text-white sm:p-6">
                            <div className="pointer-events-none absolute inset-0 opacity-10 [background-image:linear-gradient(90deg,white_1px,transparent_1px)] [background-size:14.285%_100%]" aria-hidden="true" />
                            <div className="relative flex items-center justify-between gap-4"><div><p className="text-sm font-bold">Working hours</p><p className="mt-1 text-xs text-[#B8C0D0]">Configured weekly availability</p></div><span className="rounded-full bg-[#E7F6F1] px-3 py-1.5 text-xs font-bold text-[#087B65]">Wednesday · Open</span></div>
                            <div className="relative mt-5 grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
                                {['9 AM', '10 AM', '11 AM', '12 PM', '1 PM'].map((time, index) => <div key={time}><p className="text-[#B8C0D0]">{time}</p><div className={`mt-2 h-8 rounded-md ${index === 1 ? 'border border-[#AFAAF7] bg-[#5146D8]' : 'bg-white/10'}`} /></div>)}
                            </div>
                        </div>
                    </div>
                </Reveal>

                <Reveal className="mt-20 rounded-[28px] border border-[#DFE3EA] bg-white p-6 sm:p-8 lg:p-10">
                    <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5146D8]">One connected system</p>
                            <h3 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[#172033]">The booking page is only the beginning.</h3>
                            <p className="mt-4 text-base leading-7 text-[#526078]">Public booking, appointments, calendar, customers, services, staff, working hours, and the dashboard share one appointment-management workflow.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {['Services', 'Staff', 'Working hours', 'Public booking', 'Appointments', 'Calendar', 'Customers', 'Dashboard'].map((item, index) => (
                                <div key={item} className={`relative flex min-h-24 items-center justify-center rounded-xl border px-3 text-center text-xs font-bold ${index === 3 || index === 5 ? 'border-[#5146D8]/25 bg-[#ECEBFF] text-[#3E35B6]' : 'border-[#DFE3EA] bg-[#FAF9F7] text-[#526078]'}`}>
                                    {item}
                                    {index < 7 && <span className="absolute -right-2 top-1/2 z-10 hidden h-px w-4 bg-[#5146D8]/30 sm:block" aria-hidden="true" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
