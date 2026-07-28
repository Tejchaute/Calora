import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="mt-4 h-8 w-16" />
          <Skeleton className="mt-2 h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div>
        <div className="mt-1 text-sm text-slate-500">{label}</div>
      </CardContent>
    </Card>
  );
}
