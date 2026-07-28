'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { addMinutes, format } from 'date-fns';
import type { Service, Staff, Customer, Appointment } from '@/types/database';

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: string;
  onSaved: () => void;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  onSaved,
}: AppointmentFormDialogProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [status, setStatus] = useState<Appointment['status']>('pending');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // New customer fields
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  useEffect(() => {
    if (open) fetchOptions();
  }, [open]);

  useEffect(() => {
    if (appointment) {
      setCustomerId(appointment.customer_id);
      setServiceId(appointment.service_id);
      setStaffId(appointment.staff_id || 'any');
      setDate(appointment.appointment_date);
      setStartTime(appointment.start_time);
      setStatus(appointment.status);
      setNotes(appointment.notes || '');
    } else {
      setCustomerId('');
      setServiceId('');
      setStaffId('');
      setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
      setStartTime('09:00');
      setStatus('pending');
      setNotes('');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
    }
  }, [appointment, open, defaultDate]);

  const fetchOptions = async () => {
    const [{ data: svc }, { data: stf }, { data: cust }] = await Promise.all([
      supabase.from('services').select('*').eq('status', 'active').order('name'),
      supabase.from('staff').select('*').eq('status', 'active').order('full_name'),
      supabase.from('customers').select('*').order('full_name'),
    ]);
    setServices(svc || []);
    setStaff(stf || []);
    setCustomers(cust || []);
  };

  const selectedService = services.find((s) => s.id === serviceId);
  const endTime = selectedService
    ? format(addMinutes(new Date(`2000-01-01T${startTime}`), selectedService.duration), 'HH:mm')
    : startTime;

  const handleSubmit = async () => {
    if (!serviceId) {
      toast.error('Please select a service');
      return;
    }
    if (!customerId && !newCustomerName) {
      toast.error('Please select or add a customer');
      return;
    }
    setSaving(true);

    let finalCustomerId = customerId;

    if (!customerId && newCustomerName) {
      const { data: newCust, error } = await supabase
        .from('customers')
        .insert({
          full_name: newCustomerName,
          phone: newCustomerPhone,
          email: newCustomerEmail,
        })
        .select()
        .single();
      if (error) {
        toast.error('Failed to create customer');
        setSaving(false);
        return;
      }
      finalCustomerId = newCust.id;
    }

    const payload = {
      customer_id: finalCustomerId,
      service_id: serviceId,
      staff_id: staffId === 'any' ? null : staffId,
      appointment_date: date,
      start_time: startTime,
      end_time: endTime,
      status,
      notes,
    };

    if (appointment) {
      const { error } = await supabase.from('appointments').update(payload).eq('id', appointment.id);
      if (error) {
        toast.error('Failed to update appointment');
        setSaving(false);
        return;
      }
      toast.success('Appointment updated');
    } else {
      const { error } = await supabase.from('appointments').insert(payload);
      if (error) {
        toast.error('Failed to create appointment');
        setSaving(false);
        return;
      }
      toast.success('Appointment created');
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer</Label>
            {customerId ? (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} {c.phone ? `• ${c.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                <Input
                  placeholder="Customer name *"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Phone"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                  />
                  <Input
                    placeholder="Email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                  />
                </div>
                {customers.length > 0 && (
                  <button
                    onClick={() => setCustomerId('__select__')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Or select an existing customer
                  </button>
                )}
              </div>
            )}
            {customerId === '__select__' && (
              <Select
                value=""
                onValueChange={(v) => {
                  setCustomerId(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select existing customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} {c.phone ? `• ${c.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} • {s.duration}min • ${s.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff */}
          <div className="space-y-2">
            <Label>Staff member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Any staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any staff</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          {selectedService && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Duration: {selectedService.duration} min • Ends at {endTime}
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Appointment['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : appointment ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
