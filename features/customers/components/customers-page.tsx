'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CalendarIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerAppointments,
  CUSTOMERS_PAGE_SIZE,
} from '../services/customers.service';
import { getInitials, formatDate, formatTime, formatCurrency } from '@/lib/utils';
import type { Customer, AppointmentWithRelations } from '@/types/database';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors/error-handler';
import { customerSchema } from "../schemas/customer.schema";

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [customerAppts, setCustomerAppts] = useState<AppointmentWithRelations[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);

    try {
      const { data, count, error } = await getCustomers({
        page,
        search,
      });

      if (error) {
        handleError(error, {
          fallbackMessage: "Failed to load customers"
        });
        return;
      }

      setCustomers(data ?? []);
      setTotal(count ?? 0);

    } catch (error) {
        handleError(error, {
          fallbackMessage: "Unexpected error while loading customers."
        });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openForm = (customer?: Customer) => {
    if (customer) {
      setEditCustomer(customer);
      setFullName(customer.full_name);
      setEmail(customer.email);
      setPhone(customer.phone);
      setNotes(customer.notes);
    } else {
      setEditCustomer(null);
      setFullName('');
      setEmail('');
      setPhone('');
      setNotes('');
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    const validation = customerSchema.safeParse({
      fullName,
      email,
      phone,
      notes,
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }
    setSaving(true);
    const payload = { full_name: fullName, email, phone, notes };

    if (editCustomer) {
      const { error } = await updateCustomer(editCustomer.id, payload);
      if (error) {
        toast.error('Failed to update customer');
        setSaving(false);
        return;
      }
      toast.success('Customer updated');
    } else {
      const { error } = await createCustomer(payload);
      if (error) {
        toast.error('Failed to create customer');
        setSaving(false);
        return;
      }
      toast.success('Customer added');
    }
    setSaving(false);
    setFormOpen(false);
    await fetchCustomers();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteCustomer(deleteId);
    if (error) {
      toast.error('Failed to delete customer');
      return;
    }
    toast.success('Customer deleted');
    setDeleteId(null);
    await fetchCustomers();
  };

  const openDetail = async (customer: Customer) => {
    setDetailCustomer(customer);
    setDetailLoading(true);

    try {
      const { data, error } = await getCustomerAppointments(customer.id);

      if (error) {
        toast.error('Failed to load customer history');
        return;
      }

      setCustomerAppts(
        (data as AppointmentWithRelations[]) ?? []
      );
    } catch (error) {
      console.error(error);
      toast.error('Unexpected error while loading customer history');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.ceil(total / CUSTOMERS_PAGE_SIZE);

  if (detailCustomer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setDetailCustomer(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to customers
        </Button>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={detailCustomer.full_name} />
                <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
                  {getInitials(detailCustomer.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{detailCustomer.full_name}</h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {detailCustomer.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {detailCustomer.email}
                    </div>
                  )}
                  {detailCustomer.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {detailCustomer.phone}
                    </div>
                  )}
                </div>
                {detailCustomer.notes && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {detailCustomer.notes}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => { openForm(detailCustomer); setDetailCustomer(null); }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Booking History</CardTitle>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : customerAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No bookings yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customerAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="h-10 w-1 rounded-full" style={{ backgroundColor: appt.services.color || undefined }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{appt.services.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(appt.appointment_date)} at {formatTime(appt.start_time)} • {appt.staff?.full_name || 'Any staff'}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {formatCurrency(appt.services.price)}
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your customer database.</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Add customer
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers found"
              description={search ? 'Try adjusting your search.' : 'Add your first customer to get started.'}
              action={{ label: 'Add customer', onClick: () => openForm() }}
            />
          ) : (
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
                      onClick={() => openDetail(c)}
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
                      <TableCell className="text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openForm(c); }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
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
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * CUSTOMERS_PAGE_SIZE + 1}–{Math.min((page + 1) * CUSTOMERS_PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this customer..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editCustomer ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete customer?"
        description="This will also delete all their appointments. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
