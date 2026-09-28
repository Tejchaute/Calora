import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface DeleteServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteServiceDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteServiceDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete service?"
      description="This permanently removes the service. Services already used by appointments should be deactivated instead so appointment history is preserved."
      confirmLabel="Delete permanently"
      onConfirm={onConfirm}
    />
  );
}