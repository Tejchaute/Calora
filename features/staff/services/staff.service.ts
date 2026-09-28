import { supabase } from "@/lib/supabase/client";
import { APPOINTMENT_SELECT } from "@/lib/supabase/helpers";
import type {
  AppointmentWithRelations,
  DashboardBusinessClock,
  Staff,
  StaffWithServices,
  TimeOff,
  WorkingHours,
} from "@/types/database";
import {
  buildStaffIntelligence,
  type StaffOperationalIntelligence,
} from "../utils/staff-intelligence";

export interface StaffWithOperations extends StaffWithServices {
  operations: StaffOperationalIntelligence;
}
export interface StaffDetailData {
  clock: DashboardBusinessClock;
  appointments: AppointmentWithRelations[];
  workingHours: WorkingHours[];
  timeOff: TimeOff[];
}

type StaffPayload = Partial<Omit<Staff, "id" | "created_at" | "updated_at">>;

export async function getStaff(businessId: string, search?: string) {
  let query = supabase
    .from("staff")
    .select(
      `
        *,
        staff_services (
          services (*)
        )
      `,
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const term = search.trim().replace(/[,%()]/g, "");

    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  return query;
}

export async function getStaffOperations(businessId: string, search?: string) {
  const clockResult = await supabase.rpc("get_dashboard_business_clock", {
    p_business_id: businessId,
  });
  if (clockResult.error) return { data: null, error: clockResult.error };
  const clock = (
    Array.isArray(clockResult.data) ? clockResult.data[0] : clockResult.data
  ) as DashboardBusinessClock | undefined;
  if (!clock)
    return { data: null, error: new Error("Business time is unavailable.") };

  const [staffResult, appointmentsResult, timeOffResult] = await Promise.all([
    getStaff(businessId, search),
    supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("business_id", businessId)
      .gte("appointment_date", clock.business_date)
      .lte("appointment_date", addDays(clock.business_date, 30))
      .order("appointment_date")
      .order("start_time")
      .limit(500),
    supabase
      .from("time_off")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "approved")
      .gte("end_at", clock.server_now)
      .order("start_at")
      .limit(200),
  ]);
  const error =
    staffResult.error || appointmentsResult.error || timeOffResult.error;
  if (error) return { data: null, error };
  const staff = (staffResult.data ?? []) as StaffWithServices[];
  const intelligence = buildStaffIntelligence(
    staff,
    (appointmentsResult.data ?? []) as AppointmentWithRelations[],
    (timeOffResult.data ?? []) as TimeOff[],
    clock,
  );
  return {
    data: staff.map((member) => ({
      ...member,
      operations: intelligence.get(member.id)!,
    })) as StaffWithOperations[],
    error: null,
  };
}

export async function getStaffDetail(
  businessId: string,
  staffId: string,
): Promise<{ data: StaffDetailData | null; error: unknown | null }> {
  const clockResult = await supabase.rpc("get_dashboard_business_clock", {
    p_business_id: businessId,
  });
  if (clockResult.error) return { data: null, error: clockResult.error };
  const clock = (
    Array.isArray(clockResult.data) ? clockResult.data[0] : clockResult.data
  ) as DashboardBusinessClock | undefined;
  if (!clock)
    return { data: null, error: new Error("Business time is unavailable.") };
  const [appointmentsResult, hoursResult, timeOffResult] = await Promise.all([
    supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("business_id", businessId)
      .eq("staff_id", staffId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(50),
    supabase
      .from("working_hours")
      .select("*")
      .eq("business_id", businessId)
      .or(`staff_id.is.null,staff_id.eq.${staffId}`)
      .order("day_of_week"),
    supabase
      .from("time_off")
      .select("*")
      .eq("business_id", businessId)
      .eq("staff_id", staffId)
      .gte("end_at", clock.server_now)
      .order("start_at")
      .limit(20),
  ]);
  const error =
    appointmentsResult.error || hoursResult.error || timeOffResult.error;
  if (error) return { data: null, error };
  return {
    data: {
      clock,
      appointments: (appointmentsResult.data ??
        []) as AppointmentWithRelations[],
      workingHours: (hoursResult.data ?? []) as WorkingHours[],
      timeOff: (timeOffResult.data ?? []) as TimeOff[],
    },
    error: null,
  };
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function getActiveServices(businessId: string) {
  return supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("name");
}

export async function createStaff(
  businessId: string,
  payload: StaffPayload,
  serviceIds: string[] = [],
) {
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .insert({
      ...payload,
      business_id: businessId,
    })
    .select()
    .single();

  if (staffError || !staff) {
    return {
      data: null,
      error: staffError,
    };
  }

  if (serviceIds.length > 0) {
    const { error: servicesError } = await supabase
      .from("staff_services")
      .insert(
        serviceIds.map((serviceId) => ({
          staff_id: staff.id,
          service_id: serviceId,
        })),
      );

    if (servicesError) {
      // Roll back the staff record if service assignment failed.
      await supabase
        .from("staff")
        .delete()
        .eq("id", staff.id)
        .eq("business_id", businessId);

      return {
        data: null,
        error: servicesError,
      };
    }
  }

  return {
    data: staff,
    error: null,
  };
}

export async function updateStaff(
  businessId: string,
  id: string,
  payload: StaffPayload,
  serviceIds?: string[],
) {
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .update(payload)
    .eq("id", id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (staffError || !staff) {
    return {
      data: null,
      error: staffError,
    };
  }

  /*
   * serviceIds === undefined means:
   * "don't change service assignments"
   *
   * [] means:
   * "remove all service assignments"
   */
  if (serviceIds !== undefined) {
    const { error: assignmentError } = await supabase.rpc("replace_staff_services", {
      p_business_id: businessId,
      p_staff_id: id,
      p_service_ids: serviceIds,
    });
    if (assignmentError) return { data: null, error: assignmentError };
  }

  return {
    data: staff,
    error: null,
  };
}

export async function getStaffServiceAssignments(businessId: string) {
  return supabase
    .from("staff_services")
    .select(
      `
      staff_id,
      service_id,
      staff!inner (
        business_id
      )
    `,
    )
    .eq("staff.business_id", businessId);
}

export async function deleteStaff(businessId: string, id: string) {
  /*
   * Staff with appointment history must not be deleted.
   * Deactivation preserves historical appointment data.
   */
  const { count, error: appointmentError } = await supabase
    .from("appointments")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("business_id", businessId)
    .eq("staff_id", id);

  if (appointmentError) {
    return {
      data: null,
      error: appointmentError,
    };
  }

  if ((count ?? 0) > 0) {
    return {
      data: null,
      error: new Error(
        "This staff member is already used by appointments. Deactivate them instead of deleting them.",
      ),
    };
  }

  /*
   * Remove service assignments before deleting the staff member.
   */
  const { error: serviceAssignmentError } = await supabase
    .from("staff_services")
    .delete()
    .eq("staff_id", id);

  if (serviceAssignmentError) {
    return {
      data: null,
      error: serviceAssignmentError,
    };
  }

  return supabase
    .from("staff")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);
}
