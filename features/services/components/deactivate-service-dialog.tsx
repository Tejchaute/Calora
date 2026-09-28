import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface DeactivateServiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serviceName: string;
    onConfirm: () => void;
}

export function DeactivateServiceDialog({
    open,
    onOpenChange,
    serviceName,
    onConfirm,
}: DeactivateServiceDialogProps) {
    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            title={`Deactivate "${serviceName}"?`}
            description="Customers will no longer be able to make new bookings for this service. Existing appointments will not be affected."
            confirmLabel="Deactivate"
            onConfirm={onConfirm}
        />
    );
}