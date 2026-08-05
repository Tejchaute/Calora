import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface DeleteAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteAppointmentDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteAppointmentDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete appointment?"
      description="This action cannot be undone. The appointment will be permanently removed."
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}
