"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffFilters } from "./staff-filters";
import { StaffTable } from "./staff-table";
import { StaffDetail } from "./staff-detail";
import { StaffFormDialog } from "./staff-form-dialog";
import { DeleteStaffDialog } from "./delete-staff-dialog";
import {
  getStaffOperations,
  getStaffDetail,
  getActiveServices,
  deleteStaff,
} from "../services/staff.service";
import type { Staff, Service } from "@/types/database";
import type {
  StaffDetailData,
  StaffWithOperations,
} from "../services/staff.service";
import { toast } from "sonner";
import { handleError } from "@/lib/errors/error-handler";
import { useBusiness } from "@/features/business/hooks/use-business";

export function StaffPage() {
  const [staff, setStaff] = useState<StaffWithOperations[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffServices, setStaffServices] = useState<Record<string, string[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailStaff, setDetailStaff] = useState<StaffWithOperations | null>(
    null,
  );
  const [detail, setDetail] = useState<StaffDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const detailRequestIdRef = useRef(0);
  const { business, loading: businessLoading } = useBusiness();
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchServices = useCallback(async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await getActiveServices(business.id);

      if (error) {
        handleError(error, {
          fallbackMessage: "Failed to load services",
        });
        return;
      }

      setServices(data ?? []);
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Unexpected error while loading services",
      });
    }
  }, [business?.id]);

  const fetchStaff = useCallback(async () => {
    if (!business?.id) {
      setStaff([]);
      setStaffServices({});
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    if (!hasLoadedRef.current) setLoading(true);

    try {
      const { data, error } = await getStaffOperations(
        business.id,
        debouncedSearch,
      );

      if (requestId !== requestIdRef.current) return;

      if (error) {
        handleError(error, {
          fallbackMessage: "Failed to load staff",
        });
        return;
      }

      const staffRows = data ?? [];
      setStaff(staffRows);

      const map: Record<string, string[]> = {};

      staffRows.forEach((staffMember) => {
        map[staffMember.id] = staffMember.staff_services.map(
          (assignment) => assignment.services.id,
        );
      });

      setStaffServices(map);
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to load staff.",
      });
    } finally {
      if (requestId === requestIdRef.current) {
        hasLoadedRef.current = true;
        setLoading(false);
      }
    }
  }, [business?.id, debouncedSearch]);

  useEffect(() => {
    if (businessLoading) return;

    void fetchStaff();

    return () => {
      requestIdRef.current += 1;
    };
  }, [businessLoading, fetchStaff]);

  useEffect(() => {
    if (!businessLoading) {
      void fetchServices();
    }
  }, [businessLoading, fetchServices]);

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

  const openDetail = useCallback(
    async (staffMember: StaffWithOperations) => {
      if (!business?.id) return;
      setDetailStaff(staffMember);
      setDetailLoading(true);
      setDetailError(false);
      const requestId = ++detailRequestIdRef.current;
      try {
        const result = await getStaffDetail(business.id, staffMember.id);
        if (requestId !== detailRequestIdRef.current) return;
        if (result.error || !result.data) throw result.error;
        setDetail(result.data);
      } catch (error) {
        setDetailError(true);
        handleError(error, {
          fallbackMessage: "Failed to load staff operations",
        });
      } finally {
        if (requestId === detailRequestIdRef.current) setDetailLoading(false);
      }
    },
    [business?.id],
  );

  const handleDelete = async () => {
    if (!business?.id || !deleteId) return;

    const { error } = await deleteStaff(business.id, deleteId);
    if (error) {
      handleError(error, { fallbackMessage: "Failed to delete staff member" });
      return;
    }
    toast.success("Staff member deleted");
    setDeleteId(null);
    await fetchStaff();
  };

  if (detailStaff)
    return (
      <>
        <StaffDetail
          staff={detailStaff}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onBack={() => {
            detailRequestIdRef.current += 1;
            setDetailStaff(null);
            setDetail(null);
          }}
          onEdit={() => openForm(detailStaff)}
          onRetry={() => void openDetail(detailStaff)}
        />
        <StaffFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          staff={editStaff}
          initialServiceIds={editServiceIds}
          onSuccess={async () => {
            await fetchStaff();
            await openDetail(detailStaff);
          }}
        />
      </>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your team members and their assigned services.
          </p>
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
        hasFilters={search !== ""}
        onEdit={openForm}
        onDelete={setDeleteId}
        onCreate={() => openForm()}
        onView={(member) => void openDetail(member)}
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
