import assert from "node:assert/strict";
import test from "node:test";
import type { BusinessAnalytics } from "../types/analytics.types";
import { calculateRate, getAnalyticsSummary } from "./analytics-metrics";

test("calculates a factual percentage from the supplied outcome denominator", () => {
  assert.equal(calculateRate(2, 8), 25);
});

test("returns null instead of a misleading zero percent for no outcomes", () => {
  assert.equal(calculateRate(0, 0), null);
});

test("cancellation and no-show summaries use eligible ended appointments", () => {
  const data = {
    outcomes: { eligible: 10, completed: 6, cancelled: 3, no_show: 1 },
  } as BusinessAnalytics;
  assert.deepEqual(getAnalyticsSummary(data), {
    cancellationRate: 30,
    noShowRate: 10,
  });
});
