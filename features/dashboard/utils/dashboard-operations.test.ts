import assert from "node:assert/strict";
import test from "node:test";
import type { AppointmentWithRelations } from "@/types/database";
import {
  getGreeting,
  getNextOperationalAppointment,
  getTodayStatusCounts,
} from "./dashboard-operations";
import { getAppointmentTemporalState } from "@/features/appointments/utils/appointment-temporal";

function appointment(
  id: string,
  status: AppointmentWithRelations["status"],
  date = "2026-09-10",
  time = "09:00:00",
  endTime = "09:30:00",
) {
  return {
    id,
    status,
    appointment_date: date,
    start_time: time,
    end_time: endTime,
  } as AppointmentWithRelations;
}

test("today status counts include every operational state", () => {
  const counts = getTodayStatusCounts([
    appointment("1", "confirmed"),
    appointment("2", "confirmed"),
    appointment("3", "pending"),
    appointment("4", "completed"),
    appointment("5", "cancelled"),
  ]);
  assert.deepEqual(counts, {
    total: 5,
    confirmed: 2,
    pending: 1,
    completed: 1,
    cancelled: 1,
  });
});

test("temporal state uses the business clock and an exclusive end boundary", () => {
  const current = appointment(
    "1",
    "confirmed",
    "2026-09-10",
    "10:00:00",
    "10:30:00",
  );
  assert.equal(
    getAppointmentTemporalState(current, "2026-09-10", "10:15:00"),
    "in-progress",
  );
  assert.equal(
    getAppointmentTemporalState(current, "2026-09-10", "10:30:00"),
    "past",
  );
  assert.equal(
    getAppointmentTemporalState(current, "2026-09-10", "10:30:01"),
    "past",
  );
  assert.equal(
    getAppointmentTemporalState(current, "2026-09-10", "09:59:59"),
    "upcoming",
  );
});

test("business date, rather than the browser timezone, determines past and future", () => {
  const previousDay = appointment(
    "1",
    "confirmed",
    "2026-09-09",
    "23:30:00",
    "23:59:00",
  );
  const nextDay = appointment(
    "2",
    "confirmed",
    "2026-09-11",
    "00:01:00",
    "00:31:00",
  );
  assert.equal(
    getAppointmentTemporalState(previousDay, "2026-09-10", "00:01:00"),
    "past",
  );
  assert.equal(
    getAppointmentTemporalState(nextDay, "2026-09-10", "23:59:00"),
    "upcoming",
  );
});

test("next appointment excludes cancelled and completed appointments", () => {
  const next = getNextOperationalAppointment([
    appointment("1", "completed"),
    appointment("2", "cancelled"),
    appointment("3", "confirmed"),
  ]);
  assert.equal(next?.id, "3");
});

test("next appointment is null on an empty operational day", () => {
  assert.equal(
    getNextOperationalAppointment([appointment("1", "completed")]),
    null,
  );
});

test("greeting follows the authoritative business-local hour", () => {
  assert.equal(getGreeting(8), "Good morning");
  assert.equal(getGreeting(14), "Good afternoon");
  assert.equal(getGreeting(20), "Good evening");
});
