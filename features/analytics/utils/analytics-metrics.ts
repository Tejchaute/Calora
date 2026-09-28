import type { BusinessAnalytics } from "../types/analytics.types";

export function calculateRate(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export function getAnalyticsSummary(data: BusinessAnalytics) {
  return {
    cancellationRate: calculateRate(
      data.outcomes.cancelled,
      data.outcomes.eligible,
    ),
    noShowRate: calculateRate(data.outcomes.no_show, data.outcomes.eligible),
  };
}
