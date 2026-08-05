import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface DeleteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteCustomerDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteCustomerDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete customer?"
      description="This will also delete all their appointments. This action cannot be undone."
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}
