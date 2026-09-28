/**
 * product-ui.tsx
 *
 * Shared product-UI fragments for the Calora landing page.
 * Each component is a miniature, believable slice of the real Calora application —
 * used to illustrate product functionality inside the marketing sections.
 *
 * Design language: white/neutral surfaces · indigo-600 accent · neutral-200 borders
 * · compact 11-12 px labels · status badges · no excessive decoration.
 */

import React from 'react';
import { Circle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppointmentItem {
    time: string;
    customer: string;
    service: string;
    staff: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled' | string;
}

export interface CustomerItem {
    name: string;
    note: string;
    visits: string;
}

export interface StaffItem {
    name: string;
    role: string;
    status: 'Available' | 'Booked' | 'Off today' | string;
}

export interface ServiceItem {
    name: string;
    duration: string;
    price: string;
}

export interface StatItem {
    label: string;
    value: string;
}

// ---------------------------------------------------------------------------
// BrowserChrome
// A lightweight browser-window frame that wraps product content.
// ---------------------------------------------------------------------------

interface BrowserChromeProps {
    url: string;
    children: React.ReactNode;
}

export function BrowserChrome({ url, children }: BrowserChromeProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-2.5 py-2 sm:px-4 sm:py-2.5">
                {/* Traffic lights */}
                <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                </div>
                {/* URL bar */}
                <div className="ml-1.5 flex min-w-0 flex-1 items-center justify-center sm:ml-2">
                    <div className="flex h-6 min-w-0 max-w-xs flex-1 items-center truncate rounded-md border border-neutral-200 bg-white px-2 text-[10px] text-neutral-400 sm:px-3 sm:text-[11px]">
                        {url}
                    </div>
                </div>
            </div>
            {/* Content */}
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// AppointmentListSnippet
// Compact list of appointments with time, avatar initials, service, and status.
// ---------------------------------------------------------------------------

function appointmentStatusStyle(status: string): string {
    switch (status) {
        case 'Confirmed':
            return 'bg-emerald-50 text-emerald-700';
        case 'Pending':
            return 'bg-amber-50 text-amber-700';
        case 'Cancelled':
            return 'bg-red-50 text-red-600';
        default:
            return 'bg-neutral-100 text-neutral-500';
    }
}

function initials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

interface AppointmentListSnippetProps {
    items: AppointmentItem[];
}

export function AppointmentListSnippet({ items }: AppointmentListSnippetProps) {
    return (
        <div className="divide-y divide-neutral-100">
            {items.map((appt) => (
                <div
                    key={`${appt.time}-${appt.customer}`}
                    className="flex min-w-0 items-center gap-2.5 py-2.5 first:pt-0 last:pb-0 sm:gap-3"
                >
                    {/* Time */}
                    <span className="w-14 shrink-0 text-[10px] font-medium tabular-nums text-neutral-400 sm:w-16 sm:text-[11px]">
                        {appt.time}
                    </span>
                    {/* Avatar */}
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[9px] font-semibold text-indigo-700">
                        {initials(appt.customer)}
                    </div>
                    {/* Details */}
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-neutral-900">{appt.customer}</div>
                        <div className="truncate text-[11px] text-neutral-500">
                            {appt.service} &middot; {appt.staff}
                        </div>
                    </div>
                    {/* Status badge */}
                    <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium sm:px-2 sm:text-[10px] ${appointmentStatusStyle(appt.status)}`}
                    >
                        {appt.status}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CustomerListSnippet
// Compact customer list with avatar initials, note, and visit count.
// ---------------------------------------------------------------------------

interface CustomerListSnippetProps {
    items: CustomerItem[];
}

export function CustomerListSnippet({ items }: CustomerListSnippetProps) {
    return (
        <div className="divide-y divide-neutral-100">
            {items.map((customer) => (
                <div key={customer.name} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    {/* Avatar */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-600">
                        {initials(customer.name)}
                    </div>
                    {/* Details */}
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-neutral-900">{customer.name}</div>
                        <div className="truncate text-[11px] text-neutral-500">{customer.note}</div>
                    </div>
                    {/* Visit count */}
                    <span className="shrink-0 text-[11px] text-neutral-400">{customer.visits}</span>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// StaffAvailabilityList
// Compact staff list with avatar, role, and colour-coded live status.
// ---------------------------------------------------------------------------

interface StaffStatusStyle {
    dot: string;
    label: string;
}

function staffStatusStyle(status: string): StaffStatusStyle {
    switch (status) {
        case 'Available':
            return { dot: 'text-emerald-500', label: 'text-emerald-700' };
        case 'Booked':
            return { dot: 'text-amber-400', label: 'text-amber-700' };
        case 'Off today':
            return { dot: 'text-neutral-300', label: 'text-neutral-400' };
        default:
            return { dot: 'text-neutral-300', label: 'text-neutral-500' };
    }
}

interface StaffAvailabilityListProps {
    items: StaffItem[];
}

export function StaffAvailabilityList({ items }: StaffAvailabilityListProps) {
    return (
        <div className="divide-y divide-neutral-100">
            {items.map((member) => {
                const styles = staffStatusStyle(member.status);
                return (
                    <div key={member.name} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        {/* Avatar */}
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                            {initials(member.name)}
                        </div>
                        {/* Details */}
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium text-neutral-900">{member.name}</div>
                            <div className="truncate text-[11px] text-neutral-500">{member.role}</div>
                        </div>
                        {/* Status */}
                        <div className="flex shrink-0 items-center gap-1">
                            <Circle className={`h-2 w-2 fill-current ${styles.dot}`} />
                            <span className={`text-[11px] font-medium ${styles.label}`}>{member.status}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// ServiceListSnippet
// Compact service catalogue list with duration and price.
// ---------------------------------------------------------------------------

interface ServiceListSnippetProps {
    items: ServiceItem[];
}

export function ServiceListSnippet({ items }: ServiceListSnippetProps) {
    return (
        <div className="divide-y divide-neutral-100">
            {items.map((service) => (
                <div key={service.name} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    {/* Name & duration */}
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-neutral-900">{service.name}</div>
                        <div className="text-[11px] text-neutral-500">{service.duration}</div>
                    </div>
                    {/* Price */}
                    <span className="shrink-0 text-xs font-semibold text-neutral-900">{service.price}</span>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// MiniCalendarWeek
// Simplified week-view slot grid.
// `booked` is a Set<string> of "dayIndex-slotIndex" keys e.g. "0-1".
// ---------------------------------------------------------------------------

const SLOT_COUNT = 4;

interface MiniCalendarWeekProps {
    days: string[];
    booked: Set<string>;
}

export function MiniCalendarWeek({ days, booked }: MiniCalendarWeekProps) {
    return (
        <div className="overflow-x-auto">
            <div
                className="grid min-w-[300px] gap-1 sm:min-w-0"
                style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
            >
                {/* Day headers */}
                {days.map((day) => (
                    <div
                        key={day}
                        className="text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-400"
                    >
                        {day}
                    </div>
                ))}

                {/* Slot rows */}
                {Array.from({ length: SLOT_COUNT }).map((_, slotIndex) =>
                    days.map((day, dayIndex) => {
                        const key = `${dayIndex}-${slotIndex}`;
                        const isBooked = booked.has(key);
                        return (
                            <div
                                key={key}
                                className={`h-6 rounded ${
                                    isBooked
                                        ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-200'
                                        : 'bg-neutral-100'
                                }`}
                                title={isBooked ? `${day} — booked` : undefined}
                            />
                        );
                    }),
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// TimeSlotGrid
// A 3-column grid of time-slot chips with one selected state.
// ---------------------------------------------------------------------------

interface TimeSlotGridProps {
    slots: string[];
    selected: string;
}

export function TimeSlotGrid({ slots, selected }: TimeSlotGridProps) {
    return (
        <div className="grid grid-cols-3 gap-1.5">
            {slots.map((slot) => {
                const isSelected = slot === selected;
                return (
                    <div
                        key={slot}
                        className={`rounded-md px-1.5 py-1.5 text-center text-[11px] font-medium ${
                            isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-neutral-100 text-neutral-600'
                        }`}
                    >
                        {slot}
                    </div>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// DashboardStatsRow
// A row of key metric tiles.
// ---------------------------------------------------------------------------

interface DashboardStatsRowProps {
    stats: StatItem[];
}

export function DashboardStatsRow({ stats }: DashboardStatsRowProps) {
    return (
        <div
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3"
        >
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="min-w-0 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 sm:py-3"
                >
                    <div className="text-lg font-bold tabular-nums text-neutral-900">
                        {stat.value}
                    </div>

                    <div className="mt-0.5 truncate text-[11px] leading-4 text-neutral-500">
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// TrendBadge
// A small positive-trend indicator badge.
// ---------------------------------------------------------------------------

interface TrendBadgeProps {
    label: string;
}

export function TrendBadge({ label }: TrendBadgeProps) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
            >
                <path
                    d="M1 7.5L4 4L6.5 6.5L9 2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            {label}
        </span>
    );
}
