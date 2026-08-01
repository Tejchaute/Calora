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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { supabase } from '@/lib/supabase/client';
import { getDashboardData, updateAppointmentStatus } from '../services/dashboard.service';
import { formatTime, formatDate } from '@/lib/utils';
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

export function DashboardPage() {
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
    const results = await getDashboardData(today);
    const [
      { count: todayCount },
      { count: upcomingCount },
      { count: customerCount },
      { count: serviceCount },
      { count: staffCount },
      { data: todayData },
      { data: upcomingData },
    ] = results;

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

  const handleQuickStatus = async (
    id: string,
    status: 'completed' | 'cancelled'
  ) => {
    const { error } = await updateAppointmentStatus(id, status);
    if (error) {
      toast.error('Failed to update appointment');
      return;
    }
    toast.success(`Appointment marked as ${status}`);
    fetchDashboardData();
  };

  const statCards = [
    { label: "Today's Appointments", value: stats?.todayAppointments ?? 0, icon: Calendar, iconColor: 'text-primary', iconBg: 'bg-primary/10' },
    { label: 'Upcoming Appointments', value: stats?.upcomingAppointments ?? 0, icon: Clock, iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
    { label: 'Total Customers', value: stats?.totalCustomers ?? 0, icon: Users, iconColor: 'text-success', iconBg: 'bg-success/10' },
    { label: 'Total Services', value: stats?.totalServices ?? 0, icon: Scissors, iconColor: 'text-orange-600', iconBg: 'bg-orange-50' },
    { label: 'Total Staff', value: stats?.totalStaff ?? 0, icon: UserCog, iconColor: 'text-teal-600', iconBg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            iconColor={stat.iconColor}
            iconBg={stat.iconBg}
            loading={loading}
          />
        ))}
      </div>

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">Today's Appointments</CardTitle>
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm" className="text-primary">
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
                <Calendar className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No appointments scheduled for today.</p>
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
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex w-16 flex-col items-center text-sm">
                      <div className="font-semibold text-foreground">{formatTime(appt.start_time)}</div>
                      <div className="text-xs text-muted-foreground">{appt.services.duration}min</div>
                    </div>
                    <div
                      className="h-10 w-1 rounded-full"
                      style={{ backgroundColor: appt.services.color || undefined }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {appt.customers.full_name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {appt.services.name} • {appt.staff?.full_name || 'Any staff'}
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
                    {appt.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleQuickStatus(appt.id, 'completed')}
                          className="rounded p-1 text-success hover:bg-success/10"
                          title="Mark completed"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleQuickStatus(appt.id, 'cancelled')}
                          className="rounded p-1 text-destructive hover:bg-destructive/10"
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">Upcoming Appointments</CardTitle>
            <Link href="/dashboard/calendar">
              <Button variant="ghost" size="sm" className="text-primary">
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
                <Clock className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No upcoming appointments.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex w-20 flex-col text-sm">
                      <div className="font-semibold text-foreground">
                        {formatDate(appt.appointment_date)}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatTime(appt.start_time)}</div>
                    </div>
                    <div
                      className="h-10 w-1 rounded-full"
                      style={{ backgroundColor: appt.services.color || undefined }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {appt.customers.full_name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {appt.services.name} • {appt.staff?.full_name || 'Any staff'}
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
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
