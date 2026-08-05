import { ConfirmDialog } from "@/components/shared/confirm-dialog";

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
      description="This action cannot be undone. If this service has existing appointments, they will be preserved."
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}