'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Scissors } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteServiceDialog } from "./delete-service-dialog";
import { EmptyState } from '@/components/shared/empty-state';
import { getServices, deleteService } from '../services/services.service';
import type { Service } from '@/types/database';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors/error-handler';
import { ServicesGrid } from "./services-grid";
import { ServiceFormDialog } from "./service-form-dialog";
 
const SERVICE_COLORS = ['#2563EB', '#16A34A', '#EA580C', '#9333EA', '#DC2626', '#0891B2', '#CA8A04', '#DB2777'];

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await getServices(search);

      if (error) {
        handleError(error, {
          fallbackMessage: "Failed to load services"
        });
        return;
      }

      setServices(data ?? []);
    } catch (error) {
        handleError(error, {
          fallbackMessage: "Failed to load services."
        });
    } finally {
      setLoading(false);
    }
    }, [search]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openForm = (service?: Service) => {
    setEditService(service ?? null);
    setFormOpen(true);
  };


  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteService(deleteId);
    if (error) {
      toast.error('Cannot delete service — it may have existing appointments');
      return;
    }
    toast.success('Service deleted');
    setDeleteId(null);
    await fetchServices();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the services your business offers.</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Add service
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

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
          description={search ? 'Try adjusting your search.' : 'Add your first service to get started.'}
          action={{ label: 'Add service', onClick: () => openForm() }}
        />
      ) : (
        <ServicesGrid
          services={services}
          onEdit={openForm}
          onDelete={setDeleteId}
        />
      )}
      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editService}
        serviceColors={SERVICE_COLORS}
        onSuccess={fetchServices}
      />
      <DeleteServiceDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
