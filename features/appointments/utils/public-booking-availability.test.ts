import assert from "node:assert/strict";
import test from "node:test";
import { format } from "date-fns";
import {
  doAppointmentTimeRangesOverlap,
  getPublicBookingDateRange,
  isSlotAtOrAfterMinimumNotice,
  isSlotWithinWorkingHours,
  // Node's built-in TypeScript test runner requires the extension at runtime.
  // @ts-expect-error The application compiler intentionally disallows TS extensions.
} from "./public-booking-availability.ts";
// Node's built-in TypeScript test runner requires the extension at runtime.
// @ts-expect-error The application compiler intentionally disallows TS extensions.
import { addMinutes, generateTimeSlots } from "../../../lib/utils.ts";

test("minimum notice excludes earlier slots and includes the exact boundary", () => {
  const appointmentDate = new Date("2026-09-05T12:00:00");
  const common = {
    appointmentDate,
    minimumBookingDate: "2026-09-05",
    minimumBookingTime: "14:00:00",
  };

  assert.equal(
    isSlotAtOrAfterMinimumNotice({ ...common, startTime: "13:59" }),
    false,
  );
  assert.equal(
    isSlotAtOrAfterMinimumNotice({ ...common, startTime: "14:00" }),
    true,
  );
  assert.equal(
    isSlotAtOrAfterMinimumNotice({ ...common, startTime: "14:30" }),
    true,
  );
});

test("minimum notice compares business dates rather than the browser clock", () => {
  assert.equal(
    isSlotAtOrAfterMinimumNotice({
      appointmentDate: new Date("2026-09-06T12:00:00"),
      startTime: "09:00",
      minimumBookingDate: "2026-09-05",
      minimumBookingTime: "23:00:00",
    }),
    true,
  );
});

for (const horizon of [7, 14, 30]) {
  test(`${horizon}-day horizon includes its exact boundary and excludes later dates`, () => {
    const dates = getPublicBookingDateRange("2026-09-05", horizon);

    assert.equal(dates.length, horizon + 1);
    assert.equal(format(dates[0]!, "yyyy-MM-dd"), "2026-09-05");
    assert.equal(
      format(dates.at(-1)!, "yyyy-MM-dd"),
      format(new Date(2026, 8, 5 + horizon), "yyyy-MM-dd"),
    );
    assert.equal(
      dates.some(
        (date) =>
          format(date, "yyyy-MM-dd") ===
          format(new Date(2026, 8, 6 + horizon), "yyyy-MM-dd"),
      ),
      false,
    );
  });
}

test("closing, break, and adjacent appointment boundaries use [start, end) semantics", () => {
  const candidates = generateTimeSlots("09:00", "17:00", 30, "14:30", "15:00");
  const isBlocked = (startTime: string) =>
    doAppointmentTimeRangesOverlap({
      candidateStart: startTime,
      candidateEnd: addMinutes(startTime, 30),
      existingStart: "16:00:00",
      existingEnd: "16:30:00",
    });

  assert.equal(candidates.includes("14:00"), true);
  assert.equal(candidates.includes("14:30"), false);
  assert.equal(candidates.includes("15:00"), true);
  assert.equal(candidates.includes("15:30"), true);
  assert.equal(candidates.includes("16:00"), true);
  assert.equal(candidates.includes("16:30"), true);
  assert.equal(candidates.includes("17:00"), false);

  assert.equal(isBlocked("15:30"), false);
  assert.equal(isBlocked("16:00"), true);
  assert.equal(isBlocked("16:30"), false);
});

test("appointment conflicts allow adjacent candidates on either boundary", () => {
  const common = {
    existingStart: "10:00:00",
    existingEnd: "10:30:00",
  };

  assert.equal(
    doAppointmentTimeRangesOverlap({
      ...common,
      candidateStart: "09:30",
      candidateEnd: "10:00",
    }),
    false,
  );
  assert.equal(
    doAppointmentTimeRangesOverlap({
      ...common,
      candidateStart: "10:00",
      candidateEnd: "10:30",
    }),
    true,
  );
  assert.equal(
    doAppointmentTimeRangesOverlap({
      ...common,
      candidateStart: "10:30",
      candidateEnd: "11:00",
    }),
    false,
  );
});

test("a service may end exactly at closing but may not extend beyond it", () => {
  const candidates = generateTimeSlots("09:00", "17:00", 60);

  assert.equal(candidates.includes("16:00"), true);
  assert.equal(candidates.includes("16:30"), false);
});

test("configured buffers remain consistent with authoritative conflict semantics", () => {
  assert.equal(
    doAppointmentTimeRangesOverlap({
      candidateStart: "16:30",
      candidateEnd: "17:00",
      existingStart: "16:00:00",
      existingEnd: "16:30:00",
      bufferMinutes: 0,
    }),
    false,
  );
  assert.equal(
    doAppointmentTimeRangesOverlap({
      candidateStart: "16:30",
      candidateEnd: "17:00",
      existingStart: "16:00:00",
      existingEnd: "16:30:00",
      bufferMinutes: 15,
    }),
    true,
  );
});

test("public Any-staff hours normalize database seconds at opening, break and closing", () => {
  const hours = {
    openTime: "09:00:00",
    closeTime: "17:00:00",
    breakStart: "12:00:00",
    breakEnd: "12:30:00",
  };
  const allows = (slotStart: string, slotEnd: string) =>
    isSlotWithinWorkingHours({ ...hours, slotStart, slotEnd });
  assert.equal(allows("09:00", "09:30"), true);
  assert.equal(allows("08:30", "09:00"), false);
  assert.equal(allows("11:30", "12:00"), true);
  assert.equal(allows("12:00", "12:30"), false);
  assert.equal(allows("12:30", "13:00"), true);
  assert.equal(allows("16:30", "17:00"), true);
  assert.equal(allows("17:00", "17:30"), false);
});

test("public explicit and Any-staff slots keep half-open appointment and buffer boundaries", () => {
  const slots = generateTimeSlots("16:00:00", "17:00:00", 30);
  const common = {
    existingStart: "16:00:00",
    existingEnd: "16:30:00",
    candidateStart: "16:30",
    candidateEnd: "17:00",
  };
  assert.deepEqual(slots, ["16:00", "16:30"]);
  assert.equal(doAppointmentTimeRangesOverlap(common), false);
  assert.equal(doAppointmentTimeRangesOverlap({ ...common, bufferMinutes: 15 }), true);
  assert.equal(isSlotWithinWorkingHours({
    slotStart: common.candidateStart,
    slotEnd: common.candidateEnd,
    openTime: "16:00:00",
    closeTime: "17:00:00",
    breakStart: null,
    breakEnd: null,
  }), true);
});
