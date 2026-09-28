import Link from 'next/link';
import { ArrowRight, CalendarCheck2, Check, Clock3, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrowserChrome } from './product-ui';
import { HeroDepth, ProductLayer, RevealGroup, RevealItem } from './LandingMotion';

export function HeroSection() {
    return (
        <section className="relative overflow-hidden border-b border-[#DFE3EA]/70 bg-[#FAF9F7] py-16 sm:py-20 lg:py-28">
            <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(#E8EAF0_1px,transparent_1px),linear-gradient(90deg,#E8EAF0_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" aria-hidden="true" />
            <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-12">
                    <RevealGroup className="lg:col-span-5">
                        <RevealItem>
                        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5146D8]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#087B65]" />
                            Appointment booking, connected
                        </p></RevealItem><RevealItem>
                        <h1 className="mt-5 max-w-xl text-[42px] font-extrabold leading-[1.06] tracking-[-0.045em] text-[#172033] sm:text-[54px] lg:text-[64px]">
                            Your day, beautifully booked.
                        </h1></RevealItem><RevealItem>
                        <p className="mt-6 max-w-xl text-base leading-7 text-[#526078] sm:text-lg sm:leading-8">
                            Calora connects your customer&apos;s booking experience with your real services,
                            staff, working hours, appointments, customers, and calendar.
                        </p></RevealItem><RevealItem>

                        <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                            <Link href="/register" className="w-full sm:w-auto">
                                <Button size="lg" className="h-12 w-full bg-[#5146D8] px-6 text-white shadow-md shadow-[#5146D8]/20 hover:bg-[#3E35B6] sm:w-auto">
                                    Start free
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <a href="#booking-flow" className="w-full sm:w-auto">
                                <Button size="lg" variant="outline" className="h-12 w-full border-[#DFE3EA] bg-white px-6 text-[#172033] hover:bg-[#F2F4F8] sm:w-auto">
                                    See how it works
                                </Button>
                            </a>
                        </div></RevealItem><RevealItem>

                        <p className="mt-5 flex items-center gap-2 text-sm font-medium text-[#526078]">
                            <Check className="h-4 w-4 text-[#087B65]" aria-hidden="true" />
                            14-day free trial &middot; No credit card required
                        </p></RevealItem>
                    </RevealGroup>

                    <HeroDepth className="lg:col-span-7">
                        <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
                            <ProductLayer depth={0} delay={0.2}>
                            <BrowserChrome url="calora.app/book/harbor-studio">
                                <div className="grid gap-0 bg-[#F8F9FC] md:grid-cols-[0.88fr_1.12fr]">
                                    <ProductLayer depth={16} delay={0.3} className="border-b border-[#DFE3EA] bg-white p-5 md:border-b-0 md:border-r sm:p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECEBFF] text-[#5146D8]">
                                                <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[#172033]">Harbor Studio</p>
                                                <p className="text-xs text-[#526078]">Choose an available time</p>
                                            </div>
                                        </div>
                                        <div className="mt-6 rounded-xl border border-[#DFE3EA] bg-[#FAF9F7] p-4">
                                            <p className="text-xs font-semibold text-[#526078]">Consultation · Maya</p>
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                {['9:00 AM', '10:30 AM', '1:00 PM', '3:30 PM'].map((time) => (
                                                    <div key={time} className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold ${time === '10:30 AM' ? 'border-[#5146D8] bg-[#5146D8] text-white' : 'border-[#DFE3EA] bg-white text-[#526078]'}`}>{time}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </ProductLayer>
                                    <ProductLayer depth={28} delay={0.4} className="p-5 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-[#172033]">Wednesday</p>
                                                <p className="text-xs text-[#526078]">Business calendar</p>
                                            </div>
                                            <span className="rounded-full bg-[#E7F6F1] px-2.5 py-1 text-[11px] font-bold text-[#087B65]">Week view</span>
                                        </div>
                                        <div className="mt-5 grid grid-cols-[42px_1fr] gap-3">
                                            <div className="space-y-7 pt-1 text-[10px] font-medium text-[#526078]">
                                                <p>9 AM</p><p>10 AM</p><p>11 AM</p><p>12 PM</p>
                                            </div>
                                            <div className="relative min-h-[180px] rounded-xl border border-[#DFE3EA] bg-white [background-image:linear-gradient(#E8EAF0_1px,transparent_1px)] [background-size:100%_42px]">
                                                <ProductLayer depth={44} delay={0.58} className="absolute left-3 right-3 top-[55px] rounded-lg border border-[#5146D8]/20 bg-[#ECEBFF] p-2.5 shadow-sm">
                                                    <p className="text-[11px] font-bold text-[#3E35B6]">10:30 · Consultation</p>
                                                    <p className="mt-0.5 text-[10px] text-[#526078]">Ravi Patel with Maya</p>
                                                </ProductLayer>
                                            </div>
                                        </div>
                                    </ProductLayer>
                                </div>
                            </BrowserChrome>
                            </ProductLayer>
                            <ProductLayer depth={72} delay={0.7} className="absolute -bottom-7 left-5 right-5 flex items-center gap-3 rounded-xl border border-[#CDE8DF] bg-white p-3.5 shadow-xl shadow-[#172033]/15 sm:left-auto sm:right-8 sm:w-64">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F6F1] text-[#087B65]">
                                    <Check className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#172033]">Booking confirmed</p>
                                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-[#526078]"><Clock3 className="h-3 w-3" /> Wed · 10:30 AM <UserRound className="ml-1 h-3 w-3" /> Maya</p>
                                </div>
                            </ProductLayer>
                        </div>
                    </HeroDepth>
                </div>
            </div>
        </section>
    );
}
