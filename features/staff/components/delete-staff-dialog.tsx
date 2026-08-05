import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface DeleteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteStaffDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteStaffDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete staff member?"
      description="This will remove the staff member and their service assignments. Existing appointments will be preserved."
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}
