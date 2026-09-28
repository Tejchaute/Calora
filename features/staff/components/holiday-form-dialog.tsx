'use client';

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
import { holidaySchema } from '../schemas/working-hours.schema';
import { handleError } from '@/lib/errors/error-handler';
import { createHoliday } from '../services/working-hours.service';
import { useBusiness } from '@/features/business/hooks/use-business';

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}

type HolidayFormValues = {
  date: string;
  name: string;
};

export function HolidayFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: HolidayFormDialogProps) {
  const { business } = useBusiness();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      date: '',
      name: '',
    },
  });

  const handleSave = handleSubmit(async (values) => {
    if (!business?.id) {
      toast.error('Business not loaded');
      return;
    }

    try {
      const { error } = await createHoliday(business.id, {
        date: values.date,
        name: values.name,
      });

      if (error) {
        handleError(error, {
          fallbackMessage: 'Failed to add holiday.',
        });
        return;
      }

      toast.success('Holiday added');

      reset();
      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Failed to add holiday.',
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Holiday</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Date *</Label>

            <Input
              type="date"
              {...register('date')}
            />

            {errors.date && (
              <p className="text-sm text-destructive">
                {errors.date.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Name</Label>

            <Input
              {...register('name')}
              placeholder="e.g. Christmas, New Year's Day"
            />

            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}