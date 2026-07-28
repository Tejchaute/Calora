'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Calendar,
  Users,
  Clock,
  Settings,
  Check,
  Menu,
  X,
  ArrowRight,
  CalendarCheck,
  Bell,
  LayoutDashboard,
  Star,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Smart Appointment Booking',
    description:
      'Let customers book online 24/7. Real-time availability, automated confirmations, and zero double-bookings.',
  },
  {
    icon: Calendar,
    title: 'Professional Calendar',
    description:
      'Day, week, and month views. Drag to reschedule, click to edit, and see your whole team at a glance.',
  },
  {
    icon: Users,
    title: 'Customer Management',
    description:
      'Every customer history, contact detail, and note in one place. Search and filter in seconds.',
  },
  {
    icon: Clock,
    title: 'Working Hours & Holidays',
    description:
      'Set weekly schedules, break times, and holidays per staff member. Availability updates automatically.',
  },
  {
    icon: Bell,
    title: 'Automated Reminders',
    description:
      'Reduce no-shows with automated reminders. Ready for WhatsApp and email notifications.',
  },
  {
    icon: LayoutDashboard,
    title: 'Powerful Dashboard',
    description:
      "Today's appointments, upcoming bookings, revenue, and recent activity — all on one clean screen.",
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Set up your business',
    description: 'Add your services, staff, working hours, and branding in minutes.',
  },
  {
    number: '02',
    title: 'Share your booking link',
    description: 'Customers book online anytime — no phone calls, no back-and-forth.',
  },
  {
    number: '03',
    title: 'Manage everything',
    description: 'Track appointments, customers, and staff from one dashboard.',
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: '$19',
    period: '/month',
    description: 'Perfect for solo professionals and small teams getting started.',
    features: ['Up to 2 staff members', 'Unlimited appointments', 'Online booking page', 'Customer management', 'Email support'],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For growing businesses that need more power and flexibility.',
    features: ['Up to 10 staff members', 'Everything in Starter', 'Calendar sync (day/week/month)', 'Working hours & holidays', 'Automated reminders', 'Priority support'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For multi-location businesses with advanced needs.',
    features: ['Unlimited staff', 'Everything in Professional', 'Multi-location support', 'Custom integrations', 'Dedicated account manager', 'SLA & onboarding'],
    cta: 'Contact sales',
    highlighted: false,
  },
];

const FAQS = [
  {
    question: 'What types of businesses can use Calora?',
    answer:
      'Calora is built for any appointment-based business — clinics, dental offices, salons, beauty parlours, tattoo studios, physiotherapists, gyms, tutors, consultants, and lawyers. The platform is fully configurable so it adapts to your industry, not the other way around.',
  },
  {
    question: 'Do my customers need to create an account to book?',
    answer:
      'No. Customers simply visit your booking page, pick a service, choose a time, and enter their contact details. No login required on their end.',
  },
  {
    question: 'Can I manage multiple staff members?',
    answer:
      'Yes. You can add unlimited staff (depending on your plan), assign specific services to each person, and set individual working hours. The calendar shows everyone side by side.',
  },
  {
    question: 'Is my data secure?',
    answer:
      "Absolutely. Calora uses Supabase with row-level security, encrypted authentication, and industry-standard best practices. Your business data and your customers' information stay private.",
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. There are no long-term contracts. You can upgrade, downgrade, or cancel your plan at any time directly from your dashboard.',
  },
  {
    question: 'Do you offer a free trial?',
    answer:
      'Yes — every paid plan comes with a 14-day free trial. No credit card required to start.',
  },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Thanks! We'll get back to you within 24 hours.");
    setContactForm({ name: '', email: '', message: '' });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">Calora</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900">FAQ</a>
            <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-slate-900">Contact</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/register"><Button size="sm">Get started</Button></Link>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600">How It Works</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600">Pricing</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600">FAQ</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600">Contact</a>
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/login"><Button variant="outline" className="w-full">Sign in</Button></Link>
                <Link href="/register"><Button className="w-full">Get started</Button></Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
              <Zap className="h-4 w-4" />
              <span>Trusted by 2,000+ businesses worldwide</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Smart appointment booking for <span className="text-blue-600">every business</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Calora is the all-in-one platform that helps clinics, salons, studios, gyms, tutors, and consultants manage appointments, customers, and staff — all in one beautiful dashboard.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register"><Button size="lg" className="w-full sm:w-auto">Start free trial<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <Link href="/book"><Button size="lg" variant="outline" className="w-full sm:w-auto"><Calendar className="mr-2 h-4 w-4" />Book an appointment</Button></Link>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-600" />14-day free trial</div>
              <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-600" />No credit card required</div>
              <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-600" />Cancel anytime</div>
            </div>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <div className="ml-4 flex-1 text-center text-sm text-slate-500">calora.app/dashboard</div>
              </div>
              <div className="grid grid-cols-12 gap-0 bg-white">
                <div className="col-span-3 hidden border-r border-slate-200 bg-slate-900 p-4 sm:block">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-600" />
                    <div className="h-3 w-20 rounded bg-slate-700" />
                  </div>
                  <div className="mt-6 space-y-2">
                    {['Dashboard', 'Appointments', 'Calendar', 'Customers', 'Services', 'Staff'].map((item, i) => (
                      <div key={item} className={`flex items-center gap-2 rounded-md px-3 py-2 ${i === 0 ? 'bg-slate-800' : ''}`}>
                        <div className={`h-3 w-3 rounded ${i === 0 ? 'bg-blue-500' : 'bg-slate-600'}`} />
                        <div className={`h-2 w-16 rounded ${i === 0 ? 'bg-slate-300' : 'bg-slate-600'}`} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-12 p-6 sm:col-span-9">
                  <div className="mb-6">
                    <div className="h-5 w-40 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-60 rounded bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-4">
                        <div className="h-3 w-16 rounded bg-slate-100" />
                        <div className="mt-2 h-6 w-12 rounded bg-slate-200" />
                        <div className="mt-1 h-2 w-20 rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-1">
                          <div className="h-2.5 w-32 rounded bg-slate-200" />
                          <div className="h-2 w-24 rounded bg-slate-100" />
                        </div>
                        <div className="h-5 w-16 rounded-full bg-blue-100" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-slate-500">Built for every appointment-based business</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-slate-400">
            {['Clinics', 'Dental', 'Salons', 'Beauty', 'Tattoo Studios', 'Physiotherapy', 'Gyms', 'Tutors', 'Consultants', 'Lawyers'].map((b) => (
              <span key={b} className="text-sm font-semibold">{b}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need to run your business</h2>
            <p className="mt-4 text-lg text-slate-600">From booking to billing, Calora gives you the tools to manage your entire operation in one place.</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 transition-colors group-hover:bg-blue-100">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Up and running in minutes</h2>
            <p className="mt-4 text-lg text-slate-600">No technical skills required. Set up your business and start taking bookings today.</p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="relative rounded-2xl bg-white p-8 shadow-sm">
                <div className="text-5xl font-bold text-blue-100">{step.number}</div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-slate-600">Start free for 14 days. No credit card required. Cancel anytime.</p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border bg-white p-8 ${plan.highlighted ? 'border-blue-600 shadow-xl lg:scale-105' : 'border-slate-200 shadow-sm'}`}>
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">Most popular</div>
                )}
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="ml-1 text-sm text-slate-500">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 block">
                  <Button className="w-full" variant={plan.highlighted ? 'default' : 'outline'}>{plan.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Loved by businesses everywhere</h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              { name: 'Dr. Sarah Chen', role: 'Owner, Chen Dental Clinic', quote: 'Calora cut our no-show rate in half. The booking page looks professional and our patients love how easy it is.' },
              { name: 'Marcus Rivera', role: 'Founder, Inked Studio', quote: 'I manage four artists and a full calendar without breaking a sweat. The staff scheduling is a game changer.' },
              { name: 'Priya Sharma', role: 'Tutor & Consultant', quote: 'I went from juggling spreadsheets to one dashboard. My clients book themselves now — I just show up.' },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl bg-white p-8 shadow-sm">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {t.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Frequently asked questions</h2>
            <p className="mt-4 text-lg text-slate-600">Everything you need to know about Calora.</p>
          </div>
          <div className="mt-12">
            <Accordion type="single" collapsible className="space-y-4">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="rounded-xl border border-slate-200 px-6">
                  <AccordionTrigger className="text-left text-base font-medium text-slate-900 hover:no-underline">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-slate-600">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Get in touch</h2>
            <p className="mt-4 text-lg text-slate-600">Have a question? Want a demo? We'd love to hear from you.</p>
          </div>
          <form onSubmit={handleContactSubmit} className="mt-12 space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} placeholder="you@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={4} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} placeholder="How can we help?" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Sending...' : 'Send message'}</Button>
          </form>
        </div>
      </section>

      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to transform your booking experience?</h2>
          <p className="mt-4 text-lg text-blue-100">Join thousands of businesses that save hours every week with Calora.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register"><Button size="lg" variant="secondary" className="w-full sm:w-auto">Start your free trial<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link href="/book"><Button size="lg" variant="outline" className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"><Calendar className="mr-2 h-4 w-4" />Book an appointment</Button></Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-semibold text-white">Calora</span>
              </div>
              <p className="mt-4 text-sm text-slate-400">Smart appointment booking and business management for every industry.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Product</h4>
              <ul className="mt-4 space-y-2">
                <li><a href="#features" className="text-sm text-slate-400 hover:text-white">Features</a></li>
                <li><a href="#pricing" className="text-sm text-slate-400 hover:text-white">Pricing</a></li>
                <li><a href="#faq" className="text-sm text-slate-400 hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Company</h4>
              <ul className="mt-4 space-y-2">
                <li><a href="#contact" className="text-sm text-slate-400 hover:text-white">Contact</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white">About</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Legal</h4>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-sm text-slate-400 hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white">Terms</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-800 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-slate-400">© 2025 Calora. All rights reserved.</p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Shield className="h-4 w-4" />
                <span>Secured with Supabase & RLS</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
