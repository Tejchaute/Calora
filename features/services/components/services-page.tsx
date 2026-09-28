'use client';

import { Plus, Search, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { EmptyState } from '@/components/shared/empty-state';

import { DeleteServiceDialog } from './delete-service-dialog';
import { ServicesGrid } from './services-grid';
import { ServiceFormDialog } from './service-form-dialog';

import { useServices } from '../hooks/use-services';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors/error-handler';
import { DeactivateServiceDialog } from './deactivate-service-dialog';

export function ServicesPage() {
  const {
    services,
    loading,
    search,
    setSearch,
    refresh,
    editService: updateService,
    removeService,
  } = useServices();

  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  const [formOpen, setFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<
    typeof services[number] | null
  >(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deactivateService, setDeactivateService] =
    useState<typeof services[number] | null>(null);

  const filteredServices = useMemo(() => {
    if (statusFilter === 'all') {
      return services;
    }

    return services.filter(
      (service) => service.status === statusFilter
    );
  }, [services, statusFilter]);

  const openForm = (service?: typeof services[number]) => {
    setSelectedService(service ?? null);
    setFormOpen(true);
  };

  const handleActivate = async (id: string) => {
    try {
      const { error } = await updateService(id, {
        status: 'active',
      });

      if (error) {
        handleError(error, {
          fallbackMessage: 'Failed to reactivate service.',
        });
        return;
      }

      toast.success('Service reactivated');
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Failed to reactivate service.',
      });
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateService) return;

    try {
      const { error } = await updateService(
        deactivateService.id,
        {
          status: 'inactive',
        }
      );

      if (error) {
        handleError(error, {
          fallbackMessage: 'Failed to deactivate service.',
        });
        return;
      }

      toast.success('Service deactivated');

      setDeactivateService(null);
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Failed to deactivate service.',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await removeService(deleteId);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Service deleted');
      setDeleteId(null);
    } catch (error) {
      handleError(error, {
        fallbackMessage: 'Failed to delete service.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Services
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage the services your business offers.
          </p>
        </div>

        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Add service
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(
              value as 'all' | 'active' | 'inactive'
            )
          }
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All statuses
            </SelectItem>

            <SelectItem value="active">
              Active
            </SelectItem>

            <SelectItem value="inactive">
              Inactive
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded-xl" />

                <Skeleton className="mt-4 h-5 w-32" />

                <Skeleton className="mt-2 h-4 w-48" />

                <Skeleton className="mt-4 h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="No services found"
          description={
            search
              ? 'Try adjusting your search.'
              : 'Add your first service to get started.'
          }
          action={{
            label: 'Add service',
            onClick: () => openForm(),
          }}
        />
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="No matching services"
          description="There are no services with this status."
          action={{
            label: 'Show all services',
            onClick: () => setStatusFilter('all'),
          }}
        />
      ) : (
        <ServicesGrid
          services={filteredServices}
          onEdit={openForm}
          onDelete={setDeleteId}
          onActivate={handleActivate}
          onDeactivate={setDeactivateService}
        />
      )}

      {/* Create / Edit */}
      <ServiceFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelectedService(null);
          }
        }}
        service={selectedService}
        onSuccess={async () => {
          await refresh();
        }}
      />

      {/* Delete */}
      <DeleteServiceDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
          }
        }}
        onConfirm={handleDelete}
      />

      {/* Deactivate */}
      <DeactivateServiceDialog
        open={!!deactivateService}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateService(null);
          }
        }}
        serviceName={deactivateService?.name ?? ''}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}