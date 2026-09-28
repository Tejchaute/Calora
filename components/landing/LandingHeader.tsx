'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CalendarCheck2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
    { href: '#product', label: 'Product' },
    { href: '#booking-flow', label: 'Booking flow' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#businesses', label: 'For businesses' },
    { href: '#faq', label: 'FAQ' },
    { href: '#contact', label: 'Contact' },
];

export function LandingHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-[#DFE3EA]/80 bg-[#FAF9F7]/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
                <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8] focus-visible:ring-offset-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5146D8] shadow-sm shadow-[#5146D8]/20">
                        <CalendarCheck2 className="h-[18px] w-[18px] text-white" strokeWidth={2.25} aria-hidden="true" />
                    </div>
                    <span className="text-lg font-bold tracking-[-0.025em] text-[#172033]">Calora</span>
                </Link>

                <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 lg:flex">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-[#526078] transition-colors motion-reduce:transition-none hover:bg-white hover:text-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8]"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-2 lg:flex">
                    <Link href="/login">
                        <Button size="sm" variant="ghost" className="text-[#526078] hover:bg-white hover:text-[#172033]">Sign in</Button>
                    </Link>
                    <Link href="/register">
                        <Button size="sm" className="bg-[#5146D8] text-white shadow-sm shadow-[#5146D8]/20 hover:bg-[#3E35B6]">Start free</Button>
                    </Link>
                </div>

                <button
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-[#172033] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8] lg:hidden"
                    onClick={() => setMobileMenuOpen((open) => !open)}
                    aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={mobileMenuOpen}
                >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {mobileMenuOpen && (
                <div className="border-t border-[#DFE3EA] bg-[#FAF9F7] px-5 pb-6 pt-3 lg:hidden">
                    <nav aria-label="Mobile navigation" className="flex flex-col">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-lg px-3 py-3 text-sm font-semibold text-[#526078] hover:bg-white hover:text-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8]"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                    <div className="mt-3 flex flex-col gap-2">
                        <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                            <Button variant="outline" className="h-11 w-full border-[#DFE3EA] bg-white text-[#172033]">
                                Sign in
                            </Button>
                        </Link>
                        <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                            <Button className="h-11 w-full bg-[#5146D8] text-white hover:bg-[#3E35B6]">Start free</Button>
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
