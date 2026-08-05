import type { Service } from "@/types/database";
import { ServiceCard } from "./service-card";

interface ServicesGridProps {
  services: Service[];
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
}

export function ServicesGrid({
  services,
  onEdit,
  onDelete,
}: ServicesGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}