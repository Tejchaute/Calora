import Link from 'next/link';
import { ArrowRight, CalendarCheck2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RevealGroup, RevealItem } from './LandingMotion';

export function FinalCTA() {
    return (
        <section className="relative overflow-hidden bg-[#FAF9F7] py-20 sm:py-24 lg:py-28">
            <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(#E8EAF0_1px,transparent_1px),linear-gradient(90deg,#E8EAF0_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" aria-hidden="true" />
            <RevealGroup className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
                <RevealItem>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ECEBFF] text-[#5146D8]"><CalendarCheck2 className="h-6 w-6" aria-hidden="true" /></div>
                </RevealItem><RevealItem>
                <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-extrabold tracking-[-0.04em] text-[#172033] sm:text-4xl lg:text-5xl">Make every appointment easier to manage.</h2>
                </RevealItem><RevealItem>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#526078] sm:text-lg">Set up your services, staff, and availability, then share a booking experience connected to the calendar you use to run the day.</p>
                </RevealItem><RevealItem>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link href="/register" className="w-full sm:w-auto"><Button size="lg" className="h-12 w-full bg-[#5146D8] px-7 text-white shadow-md shadow-[#5146D8]/20 hover:bg-[#3E35B6] sm:w-auto">Start free <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                    <a href="#contact" className="w-full sm:w-auto"><Button size="lg" variant="outline" className="h-12 w-full border-[#DFE3EA] bg-white px-7 text-[#172033] hover:bg-[#F2F4F8] sm:w-auto"><MessageCircle className="mr-2 h-4 w-4" /> Talk to us</Button></a>
                </div>
                </RevealItem><RevealItem>
                <p className="mt-5 text-sm font-semibold text-[#526078]">Start with a 14-day free trial · No credit card required</p>
                </RevealItem>
            </RevealGroup>
        </section>
    );
}
