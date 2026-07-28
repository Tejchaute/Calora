import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  Scissors,
  UserCog,
  Clock,
  Settings,
  User,
} from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/services', label: 'Services', icon: Scissors },
  { href: '/dashboard/staff', label: 'Staff', icon: UserCog },
  { href: '/dashboard/working-hours', label: 'Working Hours', icon: Clock },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
] as const;
