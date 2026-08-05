'use client';

import { Users, Edit, Trash2 } from 'lucide-react';
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
import { getInitials, formatDate } from '@/lib/utils';
import type { Customer } from '@/types/database';

interface CustomersTableProps {
  customers: Customer[];
  loading: boolean;
  hasFilters: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onRowClick: (customer: Customer) => void;
  onCreate: () => void;
}

export function CustomersTable({
  customers,
  loading,
  hasFilters,
  onEdit,
  onDelete,
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
          hasFilters ? 'Try adjusting your search.' : 'Add your first customer to get started.'
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
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(c)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {getInitials(c.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{c.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.phone || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.created_at)}
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
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
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
