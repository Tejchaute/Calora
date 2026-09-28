import type { LucideIcon } from 'lucide-react';
import { Rocket, Settings2, Link2, UserCheck, ClipboardList, CalendarCheck, CalendarDays, Users, Clock, Bell, LayoutDashboard } from 'lucide-react';

export type WorkflowStep = {
    number: string;
    icon: LucideIcon;
    title: string;
    description: string;
};

export const WORKFLOW_STEPS: WorkflowStep[] = [
    {
        number: '01',
        icon: Rocket,
        title: 'Create your business',
        description: 'Add your business name, branding, and details.',
    },
    {
        number: '02',
        icon: Settings2,
        title: 'Add services & staff',
        description: 'Set what you offer, who provides it, and their working hours.',
    },
    {
        number: '03',
        icon: Link2,
        title: 'Share your booking page',
        description: 'Send the link, embed it on your site, or add it to your bio.',
    },
    {
        number: '04',
        icon: UserCheck,
        title: 'Customers book themselves',
        description: 'They choose a service, staff member, and time \u2014 no calls needed.',
    },
    {
        number: '05',
        icon: ClipboardList,
        title: 'You manage it from Calora',
        description: 'Every booking lands on your calendar, ready to run your day.',
    },
];


export type Faq = {
    question: string;
    answer: string;
};

export type BusinessType = {
    id: string;
    label: string;
    customerNoun: string;
    flow: string[];
    description: string;
};

export const BUSINESS_TYPES: BusinessType[] = [
    {
        id: 'clinic',
        label: 'Clinic',
        customerNoun: 'Patients',
        flow: ['Patients', 'Services', 'Staff', 'Availability', 'Appointments'],
        description:
            'Patients book a service, get matched to the right practitioner, and land on a schedule your front desk doesn\u2019t have to manage by hand.',
    },
    {
        id: 'salon',
        label: 'Salon',
        customerNoun: 'Clients',
        flow: ['Clients', 'Services', 'Stylists', 'Slots', 'Bookings'],
        description:
            'Clients pick a service and a stylist, choose an open slot, and the booking lands straight on that stylist\u2019s calendar.',
    },
    {
        id: 'consultant',
        label: 'Consultant',
        customerNoun: 'Clients',
        flow: ['Clients', 'Sessions', 'Availability', 'Meetings'],
        description:
            'Clients see your real availability and book a session directly \u2014 no email chains to find a time that works.',
    },
];

export const INDUSTRIES = [
    'Clinics',
    'Dental',
    'Salons',
    'Beauty',
    'Tattoo Studios',
    'Physiotherapy',
    'Gyms',
    'Tutors',
    'Consultants',
    'Lawyers',
];

// ---------------------------------------------------------------------------
// FEATURES — used by FeatureShowcase.tsx
// ---------------------------------------------------------------------------

export type Feature = {
    icon: LucideIcon;
    title: string;
    description: string;
};

export const FEATURES: Feature[] = [
    {
        icon: CalendarCheck,
        title: 'Smart Appointment Booking',
        description:
            'Customers book online 24/7 with real-time availability, instant confirmations, and zero double-bookings.',
    },
    {
        icon: CalendarDays,
        title: 'Professional Calendar',
        description:
            'Day, week, and month views. Drag to reschedule, click to edit, and see your whole team at a glance.',
    },
    {
        icon: Users,
        title: 'Customer Management',
        description:
            'Every customer\u2019s history, contact details, and notes in one place. Search and filter in seconds.',
    },
    {
        icon: Clock,
        title: 'Working Hours & Holidays',
        description:
            'Set weekly schedules, breaks, and holidays per staff member. Availability updates automatically.',
    },
    {
        icon: Bell,
        title: 'Automated Reminders',
        description:
            'Cut no-shows with automated reminders, ready for WhatsApp and email notifications.',
    },
    {
        icon: LayoutDashboard,
        title: 'Powerful Dashboard',
        description:
            'Today\u2019s appointments, upcoming bookings, revenue, and recent activity \u2014 all on one clean screen.',
    },
];
