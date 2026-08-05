import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Clock,
  DollarSign,
  Edit,
  Trash2,
  Scissors,
} from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import type { Service } from "@/types/database";

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
}

export function ServiceCard({
  service,
  onEdit,
  onDelete,
}: ServiceCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `${service.color || "#2563EB"}15`,
            }}
          >
            <Scissors
              className="h-6 w-6"
              style={{ color: service.color || "#2563EB" }}
            />
          </div>

          <Badge
            variant={
              service.status === "active"
                ? "default"
                : "secondary"
            }
          >
            {service.status === "active"
              ? "Active"
              : "Inactive"}
          </Badge>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {service.name}
        </h3>

        {service.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {service.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {service.duration} min
          </div>

          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            {formatCurrency(service.price)}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(service)}
          >
            <Edit className="mr-2 h-3.5 w-3.5" />
            Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(service.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}