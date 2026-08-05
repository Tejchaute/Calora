'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaffFilters } from './staff-filters';
import { StaffTable } from './staff-table';
import { StaffFormDialog } from './staff-form-dialog';
import { DeleteStaffDialog } from './delete-staff-dialog';
import {
  getStaff,
  getStaffServiceAssignments,
  getActiveServices,
  deleteStaff,
} from '../services/staff.service';
import type { Staff, Service } from '@/types/database';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors/error-handler';

export function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffServices, setStaffServices] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const { data, error } = await getActiveServices();
      if (error) {
        handleError(error, { fallbackMessage: 'Failed to load services' });
        return;
      }
      setServices(data ?? []);
    } catch (error) {
      handleError(error, { fallbackMessage: 'Unexpected error while loading services' });
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getStaff(search);
      if (error) {
        handleError(error, { fallbackMessage: 'Failed to load staff' });
        return;
      }
      setStaff(data ?? []);

      const { data: ssData, error: ssError } = await getStaffServiceAssignments();
      if (ssError) {
        handleError(ssError, { fallbackMessage: 'Failed to load service assignments' });
        return;
      }

      const map: Record<string, string[]> = {};
      (ssData ?? []).forEach((ss) => {
        if (!map[ss.staff_id]) map[ss.staff_id] = [];
        map[ss.staff_id].push(ss.service_id);
      });
      setStaffServices(map);
    } catch (error) {
      handleError(error, { fallbackMessage: 'Failed to load staff.' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStaff();
    fetchServices();
  }, [fetchStaff, fetchServices]);

  const openForm = (staffMember?: Staff) => {
    if (staffMember) {
      setEditStaff(staffMember);
      setEditServiceIds(staffServices[staffMember.id] || []);
    } else {
      setEditStaff(null);
      setEditServiceIds([]);
    }
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteStaff(deleteId);
    if (error) {
      handleError(error, { fallbackMessage: 'Failed to delete staff member' });
      return;
    }
    toast.success('Staff member deleted');
    setDeleteId(null);
    await fetchStaff();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your team members and their assigned services.</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Add staff
        </Button>
      </div>

      <StaffFilters search={search} onSearchChange={setSearch} />

      <StaffTable
        staff={staff}
        services={services}
        staffServices={staffServices}
        loading={loading}
        hasFilters={search !== ''}
        onEdit={openForm}
        onDelete={setDeleteId}
        onCreate={() => openForm()}
      />

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        staff={editStaff}
        initialServiceIds={editServiceIds}
        onSuccess={fetchStaff}
      />
      <DeleteStaffDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
