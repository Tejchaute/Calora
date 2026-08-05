'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { addMinutes, format } from 'date-fns';
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
import type { Service, Staff, Customer, Appointment } from '@/types/database';
import {
  getFormOptions,
  createCustomerInline,
  createAppointment,
  updateAppointment,
} from '../services/appointments.service';
import { handleError } from '@/lib/errors/error-handler';
import { appointmentSchema } from '../schemas/appointment.schema';

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: string;
  onSaved: () => void;
}

type AppointmentFormValues = {
  customer_id: string;
  service_id: string;
  staff_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: Appointment['status'];
  notes: string;
  newCustomerName: string;
  newCustomerPhone: string;
  newCustomerEmail: string;
};

const STATUS_VALUES: Appointment['status'][] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
];

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

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customer_id: '',
      service_id: '',
      staff_id: 'any',
      appointment_date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '09:00',
      status: 'pending',
      notes: '',
      newCustomerName: '',
      newCustomerPhone: '',
      newCustomerEmail: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    fetchOptions();
  }, [open]);

  useEffect(() => {
    if (appointment) {
      reset({
        customer_id: appointment.customer_id,
        service_id: appointment.service_id,
        staff_id: appointment.staff_id || 'any',
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time || appointment.start_time,
        status: appointment.status,
        notes: appointment.notes || '',
        newCustomerName: '',
        newCustomerPhone: '',
        newCustomerEmail: '',
      });
    } else {
      reset({
        customer_id: '',
        service_id: '',
        staff_id: 'any',
        appointment_date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '09:00',
        status: 'pending',
        notes: '',
        newCustomerName: '',
        newCustomerPhone: '',
        newCustomerEmail: '',
      });
    }
  }, [appointment, open, defaultDate, reset]);

  const fetchOptions = async () => {
    try {
      const [
        { data: svc, error: svcError },
        { data: stf, error: stfError },
        { data: cust, error: custError },
      ] = await getFormOptions();

      if (svcError || stfError || custError) {
        toast.error('Failed to load booking options');
        return;
      }

      setServices(svc ?? []);
      setStaff(stf ?? []);
      setCustomers(cust ?? []);
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Unexpected error while loading booking options',
      });
    }
  };

  const serviceId = watch('service_id');
  const startTime = watch('start_time');
  const customerId = watch('customer_id');
  const selectedService = services.find((s) => s.id === serviceId);
  const endTime = selectedService
    ? format(addMinutes(new Date(`2000-01-01T${startTime}`), selectedService.duration), 'HH:mm')
    : startTime;

  useEffect(() => {
    if (selectedService) {
      setValue('end_time', endTime);
    }
  }, [selectedService, endTime, setValue]);

  const handleSave = handleSubmit(async (values) => {
    let finalCustomerId = values.customer_id;

    if (values.customer_id === '__new__' && values.newCustomerName.trim()) {
      const { data: newCust, error } = await createCustomerInline({
        full_name: values.newCustomerName,
        phone: values.newCustomerPhone,
        email: values.newCustomerEmail,
      });
      if (error) {
        toast.error('Failed to create customer');
        return;
      }
      finalCustomerId = newCust.id;
    }

    const payload = {
      customer_id: finalCustomerId,
      service_id: values.service_id,
      staff_id: values.staff_id === 'any' ? null : values.staff_id,
      appointment_date: values.appointment_date,
      start_time: values.start_time,
      end_time: values.end_time,
      status: values.status,
      notes: values.notes,
    };

    if (appointment) {
      const { error } = await updateAppointment(appointment.id, payload);
      if (error) {
        toast.error('Failed to update appointment');
        return;
      }
      toast.success('Appointment updated');
    } else {
      const { error } = await createAppointment(payload);
      if (error) {
        toast.error('Failed to create appointment');
        return;
      }
      toast.success('Appointment created');
    }

    reset();
    onOpenChange(false);
    onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Controller
              control={control}
              name="customer_id"
              render={({ field }) => (
                <>
                  {field.value === '__new__' || (field.value === '' && customers.length === 0) ? (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <Input
                        placeholder="Customer name *"
                        {...register('newCustomerName')}
                      />
                      {errors.newCustomerName && (
                        <p className="text-sm text-destructive">{errors.newCustomerName.message}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Phone"
                          {...register('newCustomerPhone')}
                        />
                        <Input
                          placeholder="Email"
                          {...register('newCustomerEmail')}
                        />
                      </div>
                      {customers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => field.onChange('__select__')}
                          className="text-xs font-medium text-primary hover:text-primary"
                        >
                          Or select an existing customer
                        </button>
                      )}
                    </div>
                  ) : (
                    <Select
                      value={field.value === '__select__' ? '' : field.value}
                      onValueChange={(v) => field.onChange(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.full_name} {c.phone ? `• ${c.phone}` : ''}
                          </SelectItem>
                        ))}
                        <SelectItem value="__new__">+ Create new customer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {field.value === '__select__' && (
                    <Select
                      value=""
                      onValueChange={(v) => field.onChange(v)}
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
                        <SelectItem value="__new__">+ Create new customer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {errors.customer_id && (
                    <p className="text-sm text-destructive">{errors.customer_id.message}</p>
                  )}
                </>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Service</Label>
            <Controller
              control={control}
              name="service_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
              )}
            />
            {errors.service_id && (
              <p className="text-sm text-destructive">{errors.service_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Staff member</Label>
            <Controller
              control={control}
              name="staff_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...register('appointment_date')} />
              {errors.appointment_date && (
                <p className="text-sm text-destructive">{errors.appointment_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input type="time" {...register('start_time')} />
              {errors.start_time && (
                <p className="text-sm text-destructive">{errors.start_time.message}</p>
              )}
            </div>
          </div>

          {selectedService && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Duration: {selectedService.duration} min • Ends at {endTime}
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v as Appointment['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={2}
              placeholder="Any special requests..."
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : appointment ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
