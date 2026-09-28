export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      businesses: {
        Row: Business;
        Insert: Omit<Business, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Business, 'id'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<
          Omit<Subscription, 'id' | 'business_id' | 'created_at'>
        >;
      };
      business_members: {
        Row: BusinessMember;
        Insert: Omit<BusinessMember, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BusinessMember, 'id'>>;
      };
      business_types: {
        Row: BusinessType;
        Insert: Omit<BusinessType, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BusinessType, 'id'>>;
      };
      booking_settings: {
        Row: BookingSettings;
        Insert: Omit<BookingSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BookingSettings, 'id'>>;
      };
      branding_settings: {
        Row: BrandingSettings;
        Insert: Omit<BrandingSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BrandingSettings, 'id'>>;
      };
      services: {
        Row: Service;
        Insert: Omit<Service, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Service, 'id'>>;
      };
      service_categories: {
        Row: ServiceCategory;
        Insert: Omit<ServiceCategory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ServiceCategory, 'id'>>;
      };
      staff: {
        Row: Staff;
        Insert: Omit<Staff, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Staff, 'id'>>;
      };
      staff_positions: {
        Row: StaffPosition;
        Insert: Omit<StaffPosition, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<StaffPosition, 'id'>>;
      };
      staff_services: {
        Row: StaffService;
        Insert: StaffService;
        Update: StaffService;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Customer, 'id'>>;
      };
      customer_tags: {
        Row: CustomerTag;
        Insert: Omit<CustomerTag, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CustomerTag, 'id'>>;
      };
      customer_tag_assignments: {
        Row: CustomerTagAssignment;
        Insert: Omit<CustomerTagAssignment, 'id' | 'created_at'>;
        Update: Partial<Omit<CustomerTagAssignment, 'id'>>;
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Appointment, 'id'>>;
      };
      appointment_statuses: {
        Row: AppointmentStatus;
        Insert: Omit<AppointmentStatus, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AppointmentStatus, 'id'>>;
      };
      resources: {
        Row: Resource;
        Insert: Omit<Resource, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Resource, 'id'>>;
      };
      resource_categories: {
        Row: ResourceCategory;
        Insert: Omit<ResourceCategory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ResourceCategory, 'id'>>;
      };
      working_hours: {
        Row: WorkingHours;
        Insert: Omit<WorkingHours, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WorkingHours, 'id'>>;
      };
      time_off: {
        Row: TimeOff;
        Insert: Omit<TimeOff, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TimeOff, 'id'>>;
      };
      notification_settings: {
        Row: NotificationSettings;
        Insert: Omit<NotificationSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<NotificationSettings, 'id'>>;
      };
      notification_templates: {
        Row: NotificationTemplate;
        Insert: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<NotificationTemplate, 'id'>>;
      };
      notification_deliveries: {
        Row: NotificationDelivery;
        Insert: Omit<NotificationDelivery, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<NotificationDelivery, 'id'>>;
      };
      notification_channels: {
        Row: NotificationChannel;
        Insert: Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<NotificationChannel, 'id'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: Partial<Omit<AuditLog, 'id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_customer_appointment_counts: {
        Args: { p_business_id: string; p_customer_ids: string[] };
        Returns: {
          customer_id: string;
          appointment_count: number;
          completed_count: number;
          cancelled_count: number;
          operational_count: number;
          next_appointment_id: string | null;
          last_appointment_id: string | null;
        }[];
      };
      replace_staff_services: {
        Args: {
          p_business_id: string;
          p_staff_id: string;
          p_service_ids: string[];
        };
        Returns: void;
      };
      create_business_with_owner: {
        Args: {
          p_name: string;
          p_slug: string;
          p_business_type_id: string;
        };
        Returns: Business;
      };
      get_subscription_access: {
        Args: {
          p_business_id: string;
        };
        Returns: SubscriptionAccess[];
      };
      get_dashboard_business_clock: {
        Args: { p_business_id: string };
        Returns: DashboardBusinessClock[];
      };
      get_public_booking_context: {
        Args: {
          p_booking_slug: string;
        };
        Returns: Json;
      };
      get_public_booked_slots: {
        Args: {
          p_booking_slug: string;
          p_date: string;
          p_staff_id?: string;
        };
        Returns: Json;
      };
      create_public_booking: {
        Args: {
          p_booking_slug: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_customer_email: string;
          p_service_id: string;
          p_staff_id: string | null;
          p_appointment_date: string;
          p_start_time: string;
          p_end_time: string;
          p_notes?: string;
        };
        Returns: Json;
      };
      claim_appointment_created_email: {
        Args: { target_appointment_id: string };
        Returns: Json | null;
      };
      claim_appointment_email: {
        Args: {
          target_appointment_id: string;
          target_event_type: 'appointment.created' | 'appointment.cancelled';
        };
        Returns: Json | null;
      };
      claim_appointment_rescheduled_email: {
        Args: { target_appointment_id: string };
        Returns: Json | null;
      };
      claim_due_appointment_email_reminder: {
        Args: Record<string, never>;
        Returns: Json | null;
      };
      reconcile_missing_appointment_email_reminders: {
        Args: Record<string, never>;
        Returns: number;
      };
      update_notification_settings: {
        Args: {
          target_business_id: string;
          target_send_confirmations: boolean;
          target_send_cancellations: boolean;
          target_send_rescheduling: boolean;
          target_send_reminders: boolean;
          target_reminder_hours_before: number;
          expected_updated_at?: string | null;
        };
        Returns: NotificationSettings;
      };
      complete_appointment_created_email: {
        Args: {
          target_delivery_id: string;
          target_idempotency_key: string;
          target_state: 'sent' | 'failed';
          target_provider_message_id?: string | null;
          target_failure_category?: string | null;
        };
        Returns: undefined;
      };
      validate_appointment_email_claim: {
        Args: { target_delivery_id: string; target_claim_token: string };
        Returns: boolean;
      };
      list_retryable_appointment_emails: {
        Args: Record<string, never>;
        Returns: { appointment_id: string; event_type: string }[];
      };
      complete_appointment_email_claim: {
        Args: {
          target_delivery_id: string;
          target_idempotency_key: string;
          target_claim_token: string;
          target_state: 'sent' | 'failed';
          target_provider_message_id?: string | null;
          target_failure_category?: string | null;
        };
        Returns: undefined;
      };
      complete_appointment_email: {
        Args: {
          target_delivery_id: string;
          target_idempotency_key: string;
          target_state: 'sent' | 'failed';
          target_provider_message_id?: string | null;
          target_failure_category?: string | null;
        };
        Returns: undefined;
      };
      save_appointment: {
        Args: {
          p_business_id: string;
          p_customer_id: string;
          p_service_id: string;
          p_staff_id: string | null;
          p_appointment_date: string;
          p_start_time: string;
          p_end_time: string;
          p_notes?: string;
          p_status?: string;
          p_appointment_id?: string | null;
          p_public_booking_slug?: string | null;
        };
        Returns: Appointment;
      };
      set_appointment_status: {
        Args: {
          p_business_id: string;
          p_appointment_id: string;
          p_status: string;
        };
        Returns: undefined;
      };
      update_appointment_metadata: {
        Args: {
          p_business_id: string;
          p_appointment_id: string;
          p_notes: string;
          p_status: string;
        };
        Returns: Appointment;
      };
    };
  };
}

// ============================================================
// Auth & Business
// ============================================================

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export type BusinessStatus = 'active' | 'inactive' | 'suspended';

export interface Business {
  id: string;
  name: string;
  business_type_id: string | null;
  slug: string | null;
  status: BusinessStatus;
  created_at: string;
  updated_at: string;
}

export type BusinessRole = 'owner' | 'admin' | 'manager' | 'staff';

export interface BusinessMember {
  id: string;
  business_id: string;
  profile_id: string;
  role: BusinessRole;
  invited_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type SubscriptionPlan = 'free_trial' | 'legacy' | 'paid';

export type SubscriptionStatus =
  'trialing' | 'active' | 'past_due' | 'canceled';

export type SubscriptionAccessReason =
  | 'active_subscription'
  | 'active_trial'
  | 'trial_expired'
  | 'subscription_required';

export interface Subscription {
  id: string;
  business_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionAccess {
  subscription_id: string;
  business_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  server_now: string;
  access_allowed: boolean;
  access_reason: SubscriptionAccessReason;
}

export interface BookingSettings {
  id: string;
  business_id: string;
  min_lead_time_hours: number;
  max_advance_days: number;
  buffer_time_minutes: number;
  slot_interval_minutes: number;
  allow_overlapping: boolean;
  require_deposit: boolean;
  deposit_amount: number;
  auto_confirm: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandingSettings {
  id: string;
  business_id: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  logo_url: string;
  custom_css: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Services
// ============================================================

export interface Service {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string;
  duration: number;
  price: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Staff
// ============================================================

export interface Staff {
  id: string;
  business_id: string;
  profile_id: string | null;
  position_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  bio: string;
  status: 'active' | 'inactive';
  employee_code: string | null;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffPosition {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StaffService {
  staff_id: string;
  service_id: string;
}

// ============================================================
// Customers
// ============================================================

export interface Customer {
  id: string;
  business_id: string;
  full_name: string;
  email: string;
  phone: string;
  notes: string;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerTag {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerTagAssignment {
  id: string;
  customer_id: string;
  tag_id: string;
  created_at: string;
}

// ============================================================
// Appointments
// ============================================================
export type AppointmentStatusType =
  'pending' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  resource_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatusType;
  service_name_snapshot: string;
  duration_snapshot: number;
  price_snapshot: number;
  customer_name_snapshot: string | null;
  customer_phone_snapshot: string | null;
  customer_email_snapshot: string | null;
  staff_name_snapshot: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentStatus {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  customers: Pick<Customer, 'id' | 'full_name' | 'email' | 'phone'>;
  services: Pick<Service, 'id' | 'name' | 'duration' | 'price'>;
  staff: Pick<Staff, 'id' | 'full_name' | 'avatar_url'> | null;
}

export interface DashboardBusinessClock {
  server_now: string;
  business_date: string;
  business_time: string;
  timezone: string;
}

// ============================================================
// Resources
// ============================================================

export interface Resource {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string;
  quantity: number;
  capacity: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceCategory {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Scheduling
// ============================================================

export interface WorkingHours {
  id: string;
  business_id: string;
  staff_id: string | null;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeOff {
  id: string;
  business_id: string;
  staff_id: string | null;
  start_at: string;
  end_at: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Notifications
// ============================================================

export interface NotificationSettings {
  id: string;
  business_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  send_reminders: boolean;
  reminder_hours_before: number;
  send_confirmations: boolean;
  send_cancellations: boolean;
  send_rescheduling: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  business_id: string;
  channel_id: string;
  name: string;
  subject: string;
  body: string;
  variables: Json;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationDelivery {
  id: string;
  business_id: string;
  template_id: string | null;
  appointment_id: string | null;
  customer_id: string | null;
  channel_id: string;
  status_id: string;
  recipient: string;
  content: Json;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  event_id: string | null;
  idempotency_key: string | null;
  processed_at: string | null;
  provider_message_id: string | null;
  failure_category: string | null;
  due_at: string | null;
  scheduled_for: string | null;
  reminder_lead_minutes: number | null;
}

export type AppointmentLifecycleEventType =
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.cancelled'
  | 'appointment.rescheduled'
  | 'appointment.completed';

export interface AppointmentLifecycleEvent {
  id: string;
  business_id: string;
  appointment_id: string;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  event_type: AppointmentLifecycleEventType;
  event_sequence: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  actor_id: string | null;
  metadata: Json;
  idempotency_key: string;
  occurred_at: string;
  created_at: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Audit
// ============================================================

export interface AuditLog {
  id: string;
  business_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Json;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

// ============================================================
// Legacy compatibility interfaces (used by existing frontend pages)
// ============================================================

export interface BusinessSettings {
  id: string;
  business_id: string;
  business_name: string;
  logo_url: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  timezone: string;
  booking_page_slug: string;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface StaffWithServices extends Staff {
  staff_services: { services: Service }[];
}
