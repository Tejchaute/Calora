import { supabase } from "@/lib/supabase/client";
import { requestAppointmentCancellationEmail } from "@/features/notifications/email/request-cancellation";
import { APPOINTMENT_SELECT } from "@/lib/supabase/helpers";
import type {
  Appointment,
  AppointmentWithRelations,
  DashboardBusinessClock,
} from "@/types/database";

export async function getDashboardData(businessId: string) {
  const clockResult = await supabase.rpc("get_dashboard_business_clock", {
    p_business_id: businessId,
  });
  if (clockResult.error) throw clockResult.error;

  const clock = (
    Array.isArray(clockResult.data) ? clockResult.data[0] : clockResult.data
  ) as DashboardBusinessClock | undefined;
  if (!clock) throw new Error("Business time is unavailable.");

  const futureFilter = `appointment_date.gt.${clock.business_date},and(appointment_date.eq.${clock.business_date},end_time.gt.${clock.business_time})`;
  const [todayList, upcomingList, customers, services, staff] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .eq("business_id", businessId)
        .eq("appointment_date", clock.business_date)
        .order("start_time")
        .limit(100),
      supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .eq("business_id", businessId)
        .in("status", ["pending", "scheduled", "confirmed"])
        .or(futureFilter)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(8),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "active"),
      supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "active"),
    ]);

  const responses = [todayList, upcomingList, customers, services, staff];
  const failed = responses.find((response) => response.error);
  if (failed?.error) throw failed.error;

  return {
    clock,
    today: (todayList.data ?? []) as AppointmentWithRelations[],
    upcoming: (upcomingList.data ?? []) as AppointmentWithRelations[],
    snapshot: {
      customers: customers.count ?? 0,
      services: services.count ?? 0,
      staff: staff.count ?? 0,
    },
  };
}

export async function updateAppointmentStatus(
  businessId: string,
  id: string,
  status: Appointment["status"],
) {
  const result = await supabase.rpc("set_appointment_status", {
    p_business_id: businessId,
    p_appointment_id: id,
    p_status: status,
  });
  if (!result.error && status === "cancelled")
    requestAppointmentCancellationEmail(id);
  return result;
}
