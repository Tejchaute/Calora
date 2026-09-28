import assert from "node:assert/strict";
import test from "node:test";
import type {
  AppointmentWithRelations,
  DashboardBusinessClock,
  Staff,
  TimeOff,
} from "@/types/database";
import { buildStaffIntelligence } from "./staff-intelligence";

const clock = {
  business_date: "2026-09-17",
  business_time: "10:30:00",
  timezone: "Asia/Kolkata",
  server_now: "2026-09-17T05:00:00Z",
} satisfies DashboardBusinessClock;
const staff = (id: string, status: Staff["status"] = "active") =>
  ({ id, business_id: "business-a", full_name: id, status }) as Staff;
const appointment = (
  id: string,
  staffId: string,
  status: AppointmentWithRelations["status"],
  date: string,
  start: string,
  end: string,
) =>
  ({
    id,
    business_id: "business-a",
    staff_id: staffId,
    status,
    appointment_date: date,
    start_time: start,
    end_time: end,
    services: { id: "service", name: "Consultation", duration: 30, price: 100 },
    customers: { id: "customer", full_name: "Customer", email: "", phone: "" },
    staff: { id: staffId, full_name: staffId, avatar_url: "" },
  }) as AppointmentWithRelations;
const timeOff = (
  id: string,
  staffId: string,
  start: string,
  end: string,
  status = "approved",
) =>
  ({
    id,
    business_id: "business-a",
    staff_id: staffId,
    start_at: start,
    end_at: end,
    status,
    reason: "",
    created_at: start,
    updated_at: start,
  }) satisfies TimeOff;

test("aggregates appointments by staff without cross-staff leakage", () => {
  const result = buildStaffIntelligence(
    [staff("a"), staff("b")],
    [
      appointment(
        "a-next",
        "a",
        "confirmed",
        "2026-09-18",
        "09:00:00",
        "09:30:00",
      ),
      appointment(
        "b-next",
        "b",
        "confirmed",
        "2026-09-18",
        "08:00:00",
        "08:30:00",
      ),
    ],
    [],
    clock,
  );
  assert.equal(result.get("a")?.nextAppointment?.id, "a-next");
  assert.equal(result.get("a")?.upcomingAppointmentCount, 1);
  assert.equal(result.get("b")?.nextAppointment?.id, "b-next");
});

test("uses shared exclusive end boundary for in-progress and historical appointments", () => {
  const result = buildStaffIntelligence(
    [staff("a")],
    [
      appointment(
        "ended",
        "a",
        "confirmed",
        "2026-09-17",
        "10:00:00",
        "10:30:00",
      ),
      appointment(
        "current",
        "a",
        "confirmed",
        "2026-09-17",
        "10:15:00",
        "10:45:00",
      ),
    ],
    [],
    clock,
  ).get("a");
  assert.equal(result?.inProgressAppointment?.id, "current");
  assert.equal(result?.upcomingAppointmentCount, 1);
  assert.equal(result?.todayAppointmentCount, 2);
});

test("terminal appointments remain counted today but never become operational", () => {
  const result = buildStaffIntelligence(
    [staff("a", "inactive")],
    [
      appointment(
        "completed",
        "a",
        "completed",
        "2026-09-17",
        "11:00:00",
        "11:30:00",
      ),
      appointment(
        "cancelled",
        "a",
        "cancelled",
        "2026-09-18",
        "11:00:00",
        "11:30:00",
      ),
    ],
    [],
    clock,
  ).get("a");
  assert.equal(result?.todayAppointmentCount, 1);
  assert.equal(result?.upcomingAppointmentCount, 0);
  assert.equal(result?.nextAppointment, null);
});

test("only approved current and upcoming staff time off is surfaced", () => {
  const result = buildStaffIntelligence(
    [staff("a")],
    [],
    [
      timeOff("current", "a", "2026-09-17T04:00:00Z", "2026-09-17T06:00:00Z"),
      timeOff(
        "declined",
        "a",
        "2026-09-17T06:30:00Z",
        "2026-09-17T07:00:00Z",
        "declined",
      ),
      timeOff("next", "a", "2026-09-18T04:00:00Z", "2026-09-18T06:00:00Z"),
    ],
    clock,
  ).get("a");
  assert.equal(result?.currentTimeOff?.id, "current");
  assert.equal(result?.nextTimeOff?.id, "next");
});
