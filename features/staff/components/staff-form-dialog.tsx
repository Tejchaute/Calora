'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

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
import { Checkbox } from '@/components/ui/checkbox';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Staff, Service } from '@/types/database';

import { staffSchema } from '../schemas/staff.schema';

import {
  getActiveServices,
  createStaff,
  updateStaff,
} from '../services/staff.service';

import { handleError } from '@/lib/errors/error-handler';
import { useBusiness } from '@/features/business/hooks/use-business';

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
  initialServiceIds?: string[];
  onSuccess: () => Promise<void>;
}

type StaffFormValues = {
  full_name: string;
  email: string;
  phone: string;
  employee_code: string;
  status: 'active' | 'inactive';
};

export function StaffFormDialog({
  open,
  onOpenChange,
  staff,
  initialServiceIds,
  onSuccess,
}: StaffFormDialogProps) {
  const { business } = useBusiness();

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      employee_code: '',
      status: 'active',
    },
  });

  const fetchServices = async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await getActiveServices(business.id);

      if (error) {
        handleError(error, {
          fallbackMessage: 'Failed to load services',
        });
        return;
      }

      setServices(data ?? []);
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Unexpected error while loading services',
      });
    }
  };

  useEffect(() => {
    if (!open || !business?.id) return;

    fetchServices();
  }, [open, business?.id]);

  useEffect(() => {
    if (!open) return;

    if (staff) {
      reset({
        full_name: staff.full_name ?? '',
        email: staff.email ?? '',
        phone: staff.phone ?? '',
        employee_code: staff.employee_code ?? '',
        status: staff.status,
      });

      setSelectedServices(initialServiceIds ?? []);
    } else {
      reset({
        full_name: '',
        email: '',
        phone: '',
        employee_code: '',
        status: 'active',
      });

      setSelectedServices([]);
    }
  }, [
    open,
    staff,
    initialServiceIds,
    reset,
  ]);

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const handleSave = handleSubmit(async (values) => {
    if (!business?.id) {
      toast.error('Business information is not available.');
      return;
    }

    const payload = {
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      employee_code: values.employee_code,
      status: values.status,
    };

    try {
      if (staff) {
        const { error } = await updateStaff(
          business.id,
          staff.id,
          payload,
          selectedServices,
        );

        if (error) {
          handleError(error, {
            fallbackMessage: 'Failed to update staff member',
          });
          return;
        }

        toast.success('Staff member updated');
      } else {
        const { error } = await createStaff(
          business.id,
          payload,
          selectedServices,
        );

        if (error) {
          handleError(error, {
            fallbackMessage: 'Failed to create staff member',
          });
          return;
        }

        toast.success('Staff member added');
      }

      reset();
      setSelectedServices([]);
      onOpenChange(false);

      await onSuccess();
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Failed to save staff member.',
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {staff ? 'Edit Staff Member' : 'Add Staff Member'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Full Name */}
          <div className="space-y-2">
            <Label>Full name *</Label>

            <Input
              {...register('full_name')}
              placeholder="Dr. Jane Doe"
            />

            {errors.full_name && (
              <p className="text-sm text-destructive">
                {errors.full_name.message}
              </p>
            )}
          </div>

          {/* Employee Code */}
          <div className="space-y-2">
            <Label>Employee code</Label>

            <Input
              {...register('employee_code')}
              placeholder="EMP-001"
            />

            {errors.employee_code && (
              <p className="text-sm text-destructive">
                {errors.employee_code.message}
              </p>
            )}
          </div>

          {/* Email + Phone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>

              <Input
                type="email"
                {...register('email')}
                placeholder="jane@business.com"
              />

              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>

              <Input
                {...register('phone')}
                placeholder="+1 234 567 890"
              />

              {errors.phone && (
                <p className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Assigned Services */}
          <div className="space-y-2">
            <Label>Assigned services</Label>

            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3 scrollbar-thin">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No services available. Add services first.
                </p>
              ) : (
                services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`svc-${service.id}`}
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() =>
                        toggleService(service.id)
                      }
                    />

                    <label
                      htmlFor={`svc-${service.id}`}
                      className="flex-1 text-sm text-foreground"
                    >
                      {service.name} • {service.duration}min
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) =>
                    field.onChange(
                      value as 'active' | 'inactive',
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="active">
                      Active
                    </SelectItem>

                    <SelectItem value="inactive">
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSubmitting || !business?.id}
          >
            {isSubmitting
              ? 'Saving...'
              : staff
                ? 'Update'
                : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
