export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      business_settings: {
        Row: BusinessSettings;
        Insert: Omit<BusinessSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BusinessSettings, 'id'>>;
      };
      services: {
        Row: Service;
        Insert: Omit<Service, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Service, 'id'>>;
      };
      staff: {
        Row: Staff;
        Insert: Omit<Staff, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Staff, 'id'>>;
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
      working_hours: {
        Row: WorkingHours;
        Insert: Omit<WorkingHours, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WorkingHours, 'id'>>;
      };
      holidays: {
        Row: Holiday;
        Insert: Omit<Holiday, 'id' | 'created_at'>;
        Update: Partial<Omit<Holiday, 'id'>>;
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Appointment, 'id'>>;
      };
    };
  };
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  role: 'admin' | 'staff';
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: string;
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

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  role: string;
  bio: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface StaffService {
  staff_id: string;
  service_id: string;
}

export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WorkingHours {
  id: string;
  staff_id: string | null;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  customers: Pick<Customer, 'id' | 'full_name' | 'email' | 'phone'>;
  services: Pick<Service, 'id' | 'name' | 'duration' | 'price' | 'color'>;
  staff: Pick<Staff, 'id' | 'full_name' | 'avatar_url'> | null;
}

export interface StaffWithServices extends Staff {
  staff_services: { services: Service }[];
}
