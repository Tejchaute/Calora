'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Scissors, Edit, Trash2, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { getServices, createService, updateService, deleteService } from '../services/services.service';
import { formatCurrency } from '@/lib/utils';
import type { Service } from '@/types/database';
import { toast } from 'sonner';

const SERVICE_COLORS = ['#2563EB', '#16A34A', '#EA580C', '#9333EA', '#DC2626', '#0891B2', '#CA8A04', '#DB2777'];

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('0');
  const [color, setColor] = useState(SERVICE_COLORS[0]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getServices(search);
    if (error) {
      toast.error('Failed to load services');
    } else {
      setServices(data || []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openForm = (service?: Service) => {
    if (service) {
      setEditService(service);
      setName(service.name);
      setDescription(service.description);
      setDuration(String(service.duration));
      setPrice(String(service.price));
      setColor(service.color || SERVICE_COLORS[0]);
      setStatus(service.status);
    } else {
      setEditService(null);
      setName('');
      setDescription('');
      setDuration('30');
      setPrice('0');
      setColor(SERVICE_COLORS[0]);
      setStatus('active');
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Service name is required');
      return;
    }
    const dur = parseInt(duration);
    const pr = parseFloat(price);
    if (!dur || dur <= 0) {
      toast.error('Duration must be greater than 0');
      return;
    }
    if (isNaN(pr) || pr < 0) {
      toast.error('Price must be a valid number');
      return;
    }
    setSaving(true);
    const payload = {
      name,
      description,
      duration: dur,
      price: pr,
      color,
      status,
    };
    if (editService) {
      const { error } = await updateService(editService.id, payload);
      if (error) {
        toast.error('Failed to update service');
        setSaving(false);
        return;
      }
      toast.success('Service updated');
    } else {
      const { error } = await createService(payload);
      if (error) {
        toast.error('Failed to create service');
        setSaving(false);
        return;
      }
      toast.success('Service created');
    }
    setSaving(false);
    setFormOpen(false);
    fetchServices();
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
    fetchServices();
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${s.color || '#2563EB'}15` }}
                  >
                    <Scissors className="h-6 w-6" style={{ color: s.color || '#2563EB' }} />
                  </div>
                  <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                    {s.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{s.name}</h3>
                {s.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                )}
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {s.duration} min
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    {formatCurrency(s.price)}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openForm(s)} className="flex-1">
                    <Edit className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteId(s.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Service name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Haircut, Consultation, Cleaning" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the service" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes) *</Label>
                <Input type="number" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Price *</Label>
                <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full transition-transform ${
                      color === c ? 'ring-2 ring-offset-2 ring-muted-foreground/50 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'inactive')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editService ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete service?"
        description="This action cannot be undone. If this service has existing appointments, they will be preserved."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
