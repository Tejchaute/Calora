'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import type { Customer } from '@/types/database';
import { customerSchema } from '../schemas/customer.schema';
import { createCustomer, updateCustomer } from '../services/customers.service';
import { handleError } from '@/lib/errors/error-handler';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess: () => Promise<void>;
}

type CustomerFormValues = {
  full_name: string;
  email: string;
  phone: string;
  notes: string;
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;

    if (customer) {
      reset({
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes,
      });
    } else {
      reset({
        full_name: '',
        email: '',
        phone: '',
        notes: '',
      });
    }
  }, [open, customer, reset]);

  const handleSave = handleSubmit(async (values) => {
    const payload = {
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      notes: values.notes,
    };

    try {
      if (customer) {
        const { error } = await updateCustomer(customer.id, payload);
        if (error) {
          handleError(error, { fallbackMessage: 'Failed to update customer' });
          return;
        }
        toast.success('Customer updated');
      } else {
        const { error } = await createCustomer(payload);
        if (error) {
          handleError(error, { fallbackMessage: 'Failed to create customer' });
          return;
        }
        toast.success('Customer added');
      }

      reset();
      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      handleError(error, { fallbackMessage: 'Failed to save customer.' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Full name *</Label>
            <Input {...register('full_name')} placeholder="Jane Doe" />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register('phone')} placeholder="+1 234 567 890" />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register('email')} placeholder="jane@example.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              {...register('notes')}
              placeholder="Any notes about this customer..."
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
            {isSubmitting ? 'Saving...' : customer ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
