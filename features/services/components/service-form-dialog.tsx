'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

import type { Service } from '@/types/database';

import { serviceSchema } from '../schemas/service.schema';
import {
  createService,
  updateService,
} from '../services/services.service';

import { handleError } from '@/lib/errors/error-handler';
import { useBusiness } from '@/features/business/hooks/use-business';
import { useBusinessCurrency } from '@/features/business/hooks/use-business-currency';

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSuccess: () => Promise<void>;
}

type ServiceFormValues = {
  name: string;
  description: string;
  duration: string;
  price: string;
  status: 'active' | 'inactive';
};

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSuccess,
}: ServiceFormDialogProps) {
  const { business, loading: businessLoading } = useBusiness();
  const { currency } = useBusinessCurrency();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),

    defaultValues: {
      name: '',
      description: '',
      duration: '30',
      price: '0',
      status: 'active',
    },
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    if (!open) return;

    if (service) {
      reset({
        name: service.name,
        description: service.description ?? '',
        duration: String(service.duration),
        price: String(service.price),
        status: service.status,
      });
    } else {
      reset({
        name: '',
        description: '',
        duration: '30',
        price: '0',
        status: 'active',
      });
    }
  }, [open, service, reset]);

  const handleSave = handleSubmit(async (values) => {
    if (!business?.id) {
      toast.error('Business is not loaded yet.');
      return;
    }

    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      duration: Number(values.duration),
      price: Number(values.price),
      status: values.status,
    };

    try {
      if (service) {
        const { error } = await updateService(
          business.id,
          service.id,
          payload
        );

        if (error) {
          handleError(error, {
            fallbackMessage: 'Failed to update service.',
          });
          return;
        }

        toast.success(
          values.status === 'inactive'
            ? 'Service deactivated'
            : 'Service updated'
        );
      } else {
        const { error } = await createService(
          business.id,
          payload
        );

        if (error) {
          handleError(error, {
            fallbackMessage: 'Failed to create service.',
          });
          return;
        }

        toast.success('Service created');
      }

      reset();
      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Failed to save service.',
      });
    }
  });

  const savingDisabled =
    isSubmitting || businessLoading || !business?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {service ? 'Edit Service' : 'Add Service'}
          </DialogTitle>

          <DialogDescription>
            {service
              ? 'Update the service details and booking availability.'
              : 'Create a service that customers can book.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="service-name">
              Service name
            </Label>

            <Input
              id="service-name"
              placeholder="e.g. Haircut"
              {...register('name')}
            />

            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="service-description">
              Description
            </Label>

            <Textarea
              id="service-description"
              rows={3}
              placeholder="Briefly describe this service..."
              {...register('description')}
            />

            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Duration + Price */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service-duration">
                Duration
              </Label>

              <div className="relative">
                <Input
                  id="service-duration"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  className="pr-14"
                  {...register('duration')}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  min
                </span>
              </div>

              {errors.duration && (
                <p className="text-sm text-destructive">
                  {errors.duration.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-price">
                Price ({currency})
              </Label>

              <Input
                id="service-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                {...register('price')}
              />

              {errors.price && (
                <p className="text-sm text-destructive">
                  {errors.price.message}
                </p>
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
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
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

            {selectedStatus === 'active' ? (
              <p className="text-xs text-muted-foreground">
                Active services can be offered and booked by customers.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Inactive services are hidden from new bookings but
                remain available for historical appointments.
              </p>
            )}

            {errors.status && (
              <p className="text-sm text-destructive">
                {errors.status.message}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={savingDisabled}
          >
            {isSubmitting
              ? 'Saving...'
              : service
                ? 'Save Changes'
                : 'Create Service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
