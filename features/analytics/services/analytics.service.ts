import { supabase } from "@/lib/supabase/client";
import type {
  AnalyticsRangeDays,
  BusinessAnalytics,
} from "../types/analytics.types";

export async function getBusinessAnalytics(
  businessId: string,
  days: AnalyticsRangeDays,
) {
  const result = await supabase.rpc("get_business_analytics", {
    p_business_id: businessId,
    p_days: days,
  });
  return {
    data: result.data as BusinessAnalytics | null,
    error: result.error,
  };
}
