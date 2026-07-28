'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Scissors,
  UserCog,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { formatTime, formatDate, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import type { AppointmentWithRelations } from '@/types/database';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DashboardStats {
  todayAppointments: number;
  upcomingAppointments: number;
  totalCustomers: number;
  totalServices: number;
  totalStaff: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppts, setTodayAppts] = useState<AppointmentWithRelations[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    const [
      { count: todayCount },
      { count: upcomingCount },
      { count: customerCount },
      { count: serviceCount },
      { count: staffCount },
      { data: todayData },
      { data: upcomingData },
    ] = await Promise.all([
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today).neq('status', 'cancelled'),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).gt('appointment_date', today).neq('status', 'cancelled'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('services').select('*', { count: 'exact', head: true }),
      supabase.from('staff').select('*', { count: 'exact', head: true }),
      supabase
        .from('appointments')
        .select('*, customers(id, full_name, email, phone), services(id, name, duration, price, color), staff(id, full_name, avatar_url)')
        .eq('appointment_date', today)
        .order('start_time')
        .limit(10),
      supabase
        .from('appointments')
        .select('*, customers(id, full_name, email, phone), services(id, name, duration, price, color), staff(id, full_name, avatar_url)')
        .gt('appointment_date', today)
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5),
    ]);

    setStats({
      todayAppointments: todayCount || 0,
      upcomingAppointments: upcomingCount || 0,
      totalCustomers: customerCount || 0,
      totalServices: serviceCount || 0,
      totalStaff: staffCount || 0,
    });
    setTodayAppts((todayData as unknown as AppointmentWithRelations[]) || []);
    setUpcomingAppts((upcomingData as unknown as AppointmentWithRelations[]) || []);
    setLoading(false);
  };

  const handleQuickStatus = async (id: string, status: 'completed' | 'cancelled') => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update appointment');
      return;
    }
    toast.success(`Appointment marked as ${status}`);
    fetchDashboardData();
  };

  const statCards = [
    { label: "Today's Appointments", value: stats?.todayAppointments ?? 0, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Upcoming Appointments', value: stats?.upcomingAppointments ?? 0, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Customers', value: stats?.totalCustomers ?? 0, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Services', value: stats?.totalServices ?? 0, icon: Scissors, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Staff', value: stats?.totalStaff ?? 0, icon: UserCog, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/appointments">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              View all
            </Button>
          </Link>
          <Link href="/dashboard/appointments?new=true">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="mt-4 h-8 w-16" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.label} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="mt-4 text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Quick Actions */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/customers">
            <Button variant="outline" size="sm">
              <Users className="mr-2 h-4 w-4" />
              Add customer
            </Button>
          </Link>
          <Link href="/dashboard/services">
            <Button variant="outline" size="sm">
              <Scissors className="mr-2 h-4 w-4" />
              Add service
            </Button>
          </Link>
          <Link href="/dashboard/staff">
            <Button variant="outline" size="sm">
              <UserCog className="mr-2 h-4 w-4" />
              Add staff
            </Button>
          </Link>
          <Link href="/book">
            <Button variant="outline" size="sm">
              <ArrowRight className="mr-2 h-4 w-4" />
              Open booking page
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">Today's Appointments</CardTitle>
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm" className="text-blue-600">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : todayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No appointments scheduled for today.</p>
                <Link href="/dashboard/appointments?new=true">
                  <Button variant="outline" size="sm" className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule one
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex w-16 flex-col items-center text-sm">
                      <div className="font-semibold text-slate-900">{formatTime(appt.start_time)}</div>
                      <div className="text-xs text-slate-400">{appt.services.duration}min</div>
                    </div>
                    <div className="h-10 w-1 rounded-full" style={{ backgroundColor: appt.services.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {appt.customers.full_name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {appt.services.name} • {appt.staff?.full_name || 'Any staff'}
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[appt.status]} variant="secondary">
                      {STATUS_LABELS[appt.status]}
                    </Badge>
                    {appt.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleQuickStatus(appt.id, 'completed')}
                          className="rounded p-1 text-green-600 hover:bg-green-50"
                          title="Mark completed"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleQuickStatus(appt.id, 'cancelled')}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title="Cancel"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">Upcoming Appointments</CardTitle>
            <Link href="/dashboard/calendar">
              <Button variant="ghost" size="sm" className="text-blue-600">
                View calendar <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : upcomingAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No upcoming appointments.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex w-20 flex-col text-sm">
                      <div className="font-semibold text-slate-900">{formatDate(appt.appointment_date)}</div>
                      <div className="text-xs text-slate-400">{formatTime(appt.start_time)}</div>
                    </div>
                    <div className="h-10 w-1 rounded-full" style={{ backgroundColor: appt.services.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {appt.customers.full_name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {appt.services.name} • {appt.staff?.full_name || 'Any staff'}
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[appt.status]} variant="secondary">
                      {STATUS_LABELS[appt.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
