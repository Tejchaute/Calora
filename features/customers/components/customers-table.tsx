'use client';

import { Users, Edit, CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { getInitials, formatDate, formatTime } from '@/lib/utils';
import type { CustomerWithIntelligence } from '../services/customers.service';

interface CustomersTableProps {
  customers: CustomerWithIntelligence[];
  loading: boolean;
  hasFilters: boolean;
  onEdit: (customer: CustomerWithIntelligence) => void;
  onRowClick: (customer: CustomerWithIntelligence) => void;
  onCreate: () => void;
}

export function CustomersTable({
  customers,
  loading,
  hasFilters,
  onEdit,
  onRowClick,
  onCreate,
}: CustomersTableProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No customers found"
        description={
          hasFilters
            ? 'Try adjusting your search.'
            : 'Add your first customer to get started.'
        }
        action={{ label: 'Add customer', onClick: onCreate }}
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Appointments</TableHead>
                <TableHead>Next appointment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {getInitials(c.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => onRowClick(c)}
                        className="rounded-sm text-left font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Open ${c.full_name}'s customer profile`}
                      >
                        {c.full_name}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{c.phone || 'No phone'}</div>
                    <div className="max-w-52 truncate text-xs">
                      {c.email || 'No email'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium tabular-nums">
                      {c.appointment_count}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.completed_count} completed · {c.cancelled_count}{' '}
                      cancelled
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.next_appointment ? (
                      <div className="flex items-start gap-2">
                        <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <div className="text-sm font-medium">
                            {formatDate(c.next_appointment.appointment_date)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(c.next_appointment.start_time)} ·{' '}
                            {c.next_appointment.services.name}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        None scheduled
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(c);
                        }}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                        title="Edit"
                        aria-label={`Edit ${c.full_name}`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
