export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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

export interface Business {
  id: string;
  name: string;
  business_type_id: string | null;
  slug: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  profile_id: string;
  role: string;
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
  color: string | null;
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
  color: string | null;
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
  status: string;
  service_name_snapshot: string;
  duration_snapshot: number;
  price_snapshot: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentStatus {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  customers: Pick<Customer, 'id' | 'full_name' | 'email' | 'phone'>;
  services: Pick<Service, 'id' | 'name' | 'duration' | 'price' | 'color'>;
  staff: Pick<Staff, 'id' | 'full_name' | 'avatar_url'> | null;
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
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface StaffWithServices extends Staff {
  staff_services: { services: Service }[];
}
