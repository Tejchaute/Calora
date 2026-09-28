export type AnalyticsRangeDays = 1 | 7 | 30 | 90;

export interface AnalyticsCountGroup {
  total: number;
  completed: number;
  cancelled: number;
}

export interface BusinessAnalytics {
  clock: {
    server_now: string;
    business_date: string;
    business_time: string;
    timezone: string;
  };
  range: {
    days: AnalyticsRangeDays;
    start_date: string;
    end_date: string;
  };
  appointments: AnalyticsCountGroup & {
    pending: number;
    confirmed: number;
    no_show: number;
  };
  outcomes: Omit<AnalyticsCountGroup, "total"> & {
    eligible: number;
    no_show: number;
  };
  customers: {
    total: number;
    with_appointments: number;
    new_customers: number;
    returning_customers: number;
  };
  trend: Array<AnalyticsCountGroup & { date: string }>;
  services: Array<AnalyticsCountGroup & { id: string; name: string }>;
  staff: Array<AnalyticsCountGroup & { id: string | null; name: string }>;
}
