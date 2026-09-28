'use client';

import { useCallback, useEffect, useState } from 'react';
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
  getStaffForService,
  createCustomerInline,
  createAppointment,
  updateAppointment,
  updateAppointmentMetadata,
  isAppointmentConflictError,
  getAppointmentAvailabilityMessage,
} from '../services/appointments.service';
import { handleError } from '@/lib/errors/error-handler';
import { appointmentSchema } from '../schemas/appointment.schema';
import { useBusiness } from '@/features/business/hooks/use-business';
import { useBusinessCurrency } from '@/features/business/hooks/use-business-currency';

const ANY_STAFF = 'any';
const NEW_CUSTOMER = '__new__';
const SELECT_CUSTOMER = '__select__';

interface AppointmentFormDialogProps {
  businessId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: string;
  defaultTime?: string;
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
  defaultTime,
  onSaved,
}: AppointmentFormDialogProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { business } = useBusiness();
  const { format: formatBusinessCurrency } = useBusinessCurrency();

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
      staff_id: ANY_STAFF,
      appointment_date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
      start_time: defaultTime || '09:00',
      end_time: defaultTime || '09:00',
      status: 'pending',
      notes: '',
      newCustomerName: '',
      newCustomerPhone: '',
      newCustomerEmail: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (!business?.id) return;

    fetchOptions();
  }, [open, business?.id, appointment?.service_id]);

  useEffect(() => {
    if (appointment) {
      reset({
        customer_id: appointment.customer_id,
        service_id: appointment.service_id,
        staff_id: appointment.staff_id || ANY_STAFF,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time || appointment.start_time,
        status: appointment.status === 'scheduled' ? 'pending' : appointment.status,
        notes: appointment.notes || '',
        newCustomerName: '',
        newCustomerPhone: '',
        newCustomerEmail: '',
      });
    } else {
      reset({
        customer_id: '',
        service_id: '',
        staff_id: ANY_STAFF,
        appointment_date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        start_time: defaultTime || '09:00',
        end_time: defaultTime || '09:00',
        status: 'pending',
        notes: '',
        newCustomerName: '',
        newCustomerPhone: '',
        newCustomerEmail: '',
      });
    }
  }, [appointment, open, defaultDate, defaultTime, reset]);

  const fetchOptions = async () => {
    if (!business?.id) return;
    try {
      const [
        { data: svc, error: svcError },
        { data: stf, error: stfError },
        { data: cust, error: custError },
      ] = await getFormOptions(
        business.id,
        appointment?.service_id,
        appointment?.staff_id ?? undefined
      );

      if (svcError || stfError || custError) {
        handleError(svcError || stfError || custError, {
          fallbackMessage: 'Failed to load booking options',
        });
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

  const fetchStaffForService = useCallback(
    async (serviceId: string) => {
      if (!business?.id || !serviceId) {
        setStaff([]);
        return;
      }

      try {
        const { data, error } = await getStaffForService(
          business.id,
          serviceId,
          appointment?.staff_id ?? undefined
        );

        if (error) {
          handleError(error, {
            fallbackMessage: 'Failed to load staff for this service',
          });

          setStaff([]);
          return;
        }

        setStaff(data ?? []);
      } catch (error) {
        handleError(error, {
          fallbackMessage: 'Unexpected error while loading staff',
        });

        setStaff([]);
      }
    },
    [business?.id, appointment?.staff_id]
  );

  const serviceId = watch('service_id');
  useEffect(() => {
    if (!open) return;
    if (!serviceId) {
      setStaff([]);
      return;
    }

    fetchStaffForService(serviceId);
  }, [open, serviceId, fetchStaffForService]);
  const startTime = watch('start_time');
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
    if (!business?.id) {
      toast.error('Business not loaded');
      return;
    }

    let finalCustomerId = values.customer_id;

    if (values.customer_id === NEW_CUSTOMER) {
      if (!values.newCustomerName.trim()) {
        toast.error('Customer name is required');
        return;
      }

      const { data: newCust, error } = await createCustomerInline(
        business.id,
        {
          full_name: values.newCustomerName.trim(),
          phone: values.newCustomerPhone.trim(),
          email: values.newCustomerEmail.trim().toLowerCase(),
        }
      );

      if (error) {
        handleError(error, {
          fallbackMessage: 'Failed to create customer',
        });
        return;
      }

      finalCustomerId = newCust.id;
    }

    const selectedService = services.find(
      (service) => service.id === values.service_id
    );

    if (!selectedService) {
      toast.error('Please select a valid service');
      return;
    }

    const payload = {
      customer_id: finalCustomerId,
      service_id: values.service_id,
      staff_id:
        values.staff_id === ANY_STAFF
          ? null
          : values.staff_id,

      appointment_date: values.appointment_date,
      start_time: values.start_time,
      end_time: values.end_time,

      service_name_snapshot: selectedService.name,
      duration_snapshot: selectedService.duration,
      price_snapshot: selectedService.price,

      status: values.status,
      notes: values.notes,
    };

    if (appointment) {
      const scheduleUnchanged =
        appointment.customer_id === payload.customer_id &&
        appointment.service_id === payload.service_id &&
        (appointment.staff_id || null) === (payload.staff_id || null) &&
        appointment.appointment_date === payload.appointment_date &&
        appointment.start_time.slice(0, 5) === payload.start_time &&
        appointment.end_time.slice(0, 5) === payload.end_time;

      const { error } = scheduleUnchanged
        ? await updateAppointmentMetadata(
            business.id,
            appointment.id,
            payload.notes,
            payload.status
          )
        : await updateAppointment(
            business.id,
            appointment.id,
            payload
          );

      if (error) {
        const availabilityMessage = getAppointmentAvailabilityMessage(error);
        if (availabilityMessage) {
          toast.error(availabilityMessage);
        } else if (isAppointmentConflictError(error)) {
          toast.error('This time is no longer available.');
        } else {
          handleError(error, {
            fallbackMessage: 'Failed to update appointment',
          });
        }

        return;
      }

      toast.success('Appointment updated');
    } else {
      const { error } = await createAppointment(
        business.id,
        payload
      );

      if (error) {
        const availabilityMessage = getAppointmentAvailabilityMessage(error);
        if (availabilityMessage) {
          toast.error(availabilityMessage);
        } else if (isAppointmentConflictError(error)) {
          toast.error('This time is no longer available.');
        } else {
          handleError(error, {
            fallbackMessage: 'Failed to create appointment',
          });
        }

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
                  {field.value === NEW_CUSTOMER || (field.value === '' && customers.length === 0) ? (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <Input
                        placeholder="Customer name *"
                        {...register('newCustomerName')}
                      />
                      {errors.newCustomerName && (
                        <p className="text-sm text-destructive">{errors.newCustomerName.message}</p>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
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
                          onClick={() => field.onChange(SELECT_CUSTOMER)}
                          className="text-xs font-medium text-primary hover:text-primary"
                        >
                          Or select an existing customer
                        </button>
                      )}
                    </div>
                  ) : (
                    <Select
                      value={field.value === SELECT_CUSTOMER ? '' : field.value}
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
                        <SelectItem value={NEW_CUSTOMER}>+ Create new customer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {field.value === SELECT_CUSTOMER && (
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
                        <SelectItem value={NEW_CUSTOMER}>+ Create new customer</SelectItem>
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

            {services.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4">
                <p className="text-sm text-muted-foreground">
                  No services available.
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Create a service first before booking appointments.
                </p>
              </div>
            ) : (
              <Controller
                control={control}
                name="service_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => {
                        const isInactive = s.status === 'inactive';

                        return (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} • {s.duration}min • {formatBusinessCurrency(s.price)}
                            {isInactive ? ' • Inactive' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {selectedService?.status === 'inactive' && (
              <p className="text-xs text-muted-foreground">
                This service is inactive and cannot be used for new bookings.
                This appointment can still be edited because it already exists.
              </p>
            )}
            {errors.service_id && (
              <p className="text-sm text-destructive">{errors.service_id.message}</p>
            )}
          </div>

          {serviceId && staff.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4">
              <p className="text-sm text-muted-foreground">
                No staff members are assigned to this service.
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Assign a staff member to this service before booking an appointment.
              </p>
            </div>
          ) : (
            <Controller
              control={control}
              name="staff_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any staff" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={ANY_STAFF}>
                      Any staff
                    </SelectItem>

                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
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
          <Button
            onClick={handleSave}
            disabled={
              isSubmitting ||
              services.length === 0
            }
          >
            {isSubmitting ? 'Saving...' : appointment ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
