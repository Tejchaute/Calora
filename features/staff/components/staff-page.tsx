'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, UserCog, Edit, Trash2, Mail, Phone, Scissors } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import {
  getStaff,
  getStaffServiceAssignments,
  getActiveServices,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../services/staff.service';
import { getInitials } from '@/lib/utils';
import type { Staff, Service } from '@/types/database';
import { toast } from 'sonner';

export function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffServices, setStaffServices] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getStaff(search);
    if (error) {
      toast.error('Failed to load staff');
    } else {
      setStaff(data || []);
      // Fetch service assignments
      const { data: ssData } = await getStaffServiceAssignments();
      const map: Record<string, string[]> = {};
      (ssData || []).forEach((ss: { staff_id: string; service_id: string }) => {
        if (!map[ss.staff_id]) map[ss.staff_id] = [];
        map[ss.staff_id].push(ss.service_id);
      });
      setStaffServices(map);
    }
    setLoading(false);
  }, [search]);

  const fetchServices = async () => {
    const { data } = await getActiveServices();
    setServices(data || []);
  };

  useEffect(() => {
    fetchStaff();
    fetchServices();
  }, [fetchStaff]);

  const openForm = (staffMember?: Staff) => {
    if (staffMember) {
      setEditStaff(staffMember);
      setFullName(staffMember.full_name);
      setEmail(staffMember.email);
      setPhone(staffMember.phone);
      setAvatarUrl(staffMember.avatar_url);
      setRole(staffMember.role);
      setBio(staffMember.bio);
      setStatus(staffMember.status);
      setSelectedServices(staffServices[staffMember.id] || []);
    } else {
      setEditStaff(null);
      setFullName('');
      setEmail('');
      setPhone('');
      setAvatarUrl('');
      setRole('');
      setBio('');
      setStatus('active');
      setSelectedServices([]);
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Staff name is required');
      return;
    }
    setSaving(true);
    const payload = {
      full_name: fullName,
      email,
      phone,
      avatar_url: avatarUrl,
      role,
      bio,
      status,
    };

    if (editStaff) {
      const { error } = await updateStaff(editStaff.id, payload, selectedServices);
      if (error) {
        toast.error('Failed to update staff member');
        setSaving(false);
        return;
      }
      toast.success('Staff member updated');
    } else {
      const { error } = await createStaff(payload, selectedServices);
      if (error) {
        toast.error('Failed to create staff member');
        setSaving(false);
        return;
      }
      toast.success('Staff member added');
    }

    setSaving(false);
    setFormOpen(false);
    fetchStaff();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteStaff(deleteId);
    if (error) {
      toast.error('Failed to delete staff member');
      return;
    }
    toast.success('Staff member deleted');
    setDeleteId(null);
    fetchStaff();
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
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

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search staff..."
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
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="mt-4 h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No staff members found"
          description={search ? 'Try adjusting your search.' : 'Add your first team member to get started.'}
          action={{ label: 'Add staff', onClick: () => openForm() }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <Card key={s.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={s.avatar_url} alt={s.full_name} />
                    <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
                      {getInitials(s.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{s.full_name}</h3>
                    {s.role && <p className="text-sm text-muted-foreground">{s.role}</p>}
                    <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="mt-2">
                      {s.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {s.phone}
                    </div>
                  )}
                </div>
                {staffServices[s.id] && staffServices[s.id].length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {staffServices[s.id].map((sid) => {
                      const svc = services.find((sv) => sv.id === sid);
                      return svc ? (
                        <span key={sid} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          <Scissors className="h-3 w-3" />
                          {svc.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Doe" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@business.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role / Title</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Stylist, Dentist, Trainer" />
            </div>
            <div className="space-y-2">
              <Label>Avatar URL</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio..." />
            </div>
            <div className="space-y-2">
              <Label>Assigned services</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3 scrollbar-thin">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services available. Add services first.</p>
                ) : (
                  services.map((s) => (
                    <div key={s.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`svc-${s.id}`}
                        checked={selectedServices.includes(s.id)}
                        onCheckedChange={() => toggleService(s.id)}
                      />
                      <label htmlFor={`svc-${s.id}`} className="flex-1 text-sm text-foreground">
                        {s.name} • {s.duration}min
                      </label>
                    </div>
                  ))
                )}
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
              {saving ? 'Saving...' : editStaff ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete staff member?"
        description="This will remove the staff member and their service assignments. Existing appointments will be preserved."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
