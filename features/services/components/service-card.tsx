import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Clock,
  DollarSign,
  Edit,
  Trash2,
  Power,
  PowerOff,
} from 'lucide-react';

import type { Service } from '@/types/database';
import { useBusinessCurrency } from '@/features/business/hooks/use-business-currency';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDeactivate: (service: Service) => void;
}

export function ServiceCard({
  service,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
}: ServiceCardProps) {
  const { format: formatBusinessCurrency } = useBusinessCurrency();
  const isActive = service.status === 'active';

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <Badge
            variant={isActive ? 'default' : 'secondary'}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Service Information */}
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {service.name}
        </h3>

        {service.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {service.description}
          </p>
        )}

        {/* Duration + Price */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {service.duration} min
          </div>

          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            {formatBusinessCurrency(service.price)}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          {/* Edit */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(service)}
          >
            <Edit className="mr-2 h-3.5 w-3.5" />
            Edit
          </Button>

          {/* Activate / Deactivate */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              isActive
                ? onDeactivate(service)
                : onActivate(service.id)
            }
            title={
              isActive
                ? 'Deactivate service'
                : 'Activate service'
            }
            aria-label={
              isActive
                ? `Deactivate ${service.name}`
                : `Activate ${service.name}`
            }
          >
            {isActive ? (
              <PowerOff className="h-3.5 w-3.5" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Delete */}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(service.id)}
            title="Delete service"
            aria-label={`Delete ${service.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
