
/*
# Calora Initial Database Schema

## Overview
Full schema for the Calora appointment booking and business management platform.

## New Tables

### profiles
Extends Supabase auth.users with admin/staff role data.
- id: UUID (FK to auth.users)
- full_name, email, phone, avatar_url
- role: 'admin' | 'staff'
- created_at, updated_at

### business_settings
Single-row table for the business configuration.
- id, business_name, logo_url, phone, email, address
- currency, timezone, booking_page_slug (unique URL for public booking)
- created_at, updated_at

### services
Services the business offers.
- id, name, description, duration (minutes), price, color, status
- created_at, updated_at

### staff
Staff members.
- id, profile_id (FK profiles), full_name, email, phone, avatar_url
- role (title/position), bio, status
- created_at, updated_at

### staff_services
Junction table linking staff to services they can perform.
- staff_id, service_id

### customers
Customers who book appointments.
- id, full_name, email, phone, notes, created_at, updated_at

### working_hours
Weekly schedule for the business or per-staff.
- id, staff_id (nullable = business-wide), day_of_week (0=Sun..6=Sat)
- is_open, open_time, close_time, break_start, break_end

### holidays
Closed dates / holidays.
- id, date, name, created_at

### appointments
Core appointment records.
- id, customer_id, service_id, staff_id
- appointment_date, start_time, end_time
- status: 'pending'|'confirmed'|'completed'|'cancelled'
- notes, created_at, updated_at

## Security
- RLS enabled on all tables
- Authenticated users (admins/staff) can manage all business data
- Anon users can INSERT customers and appointments (for booking flow)
- Anon users can SELECT services, staff, working_hours, holidays (for booking display)
- business_settings readable by anon (for booking page branding)
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============================================================
-- BUSINESS SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'My Business',
  logo_url text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  currency text NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'UTC',
  booking_page_slug text UNIQUE DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bs_select_anon" ON business_settings;
CREATE POLICY "bs_select_anon" ON business_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "bs_insert_auth" ON business_settings;
CREATE POLICY "bs_insert_auth" ON business_settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "bs_update_auth" ON business_settings;
CREATE POLICY "bs_update_auth" ON business_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "bs_delete_auth" ON business_settings;
CREATE POLICY "bs_delete_auth" ON business_settings FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  duration integer NOT NULL DEFAULT 30 CHECK (duration > 0),
  price numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_anon" ON services;
CREATE POLICY "services_select_anon" ON services FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "services_insert_auth" ON services;
CREATE POLICY "services_insert_auth" ON services FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "services_update_auth" ON services;
CREATE POLICY "services_update_auth" ON services FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "services_delete_auth" ON services;
CREATE POLICY "services_delete_auth" ON services FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  role text DEFAULT '',
  bio text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_anon" ON staff;
CREATE POLICY "staff_select_anon" ON staff FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_auth" ON staff;
CREATE POLICY "staff_insert_auth" ON staff FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "staff_update_auth" ON staff;
CREATE POLICY "staff_update_auth" ON staff FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_delete_auth" ON staff;
CREATE POLICY "staff_delete_auth" ON staff FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- STAFF SERVICES (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_services (
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ss_select_anon" ON staff_services;
CREATE POLICY "ss_select_anon" ON staff_services FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ss_insert_auth" ON staff_services;
CREATE POLICY "ss_insert_auth" ON staff_services FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ss_delete_auth" ON staff_services;
CREATE POLICY "ss_delete_auth" ON staff_services FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_auth" ON customers;
CREATE POLICY "customers_select_auth" ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert_anon" ON customers;
CREATE POLICY "customers_insert_anon" ON customers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "customers_update_auth" ON customers;
CREATE POLICY "customers_update_auth" ON customers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customers_delete_auth" ON customers;
CREATE POLICY "customers_delete_auth" ON customers FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- WORKING HOURS
-- ============================================================
CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time DEFAULT '09:00',
  close_time time DEFAULT '17:00',
  break_start time DEFAULT NULL,
  break_end time DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, day_of_week)
);

ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wh_select_anon" ON working_hours;
CREATE POLICY "wh_select_anon" ON working_hours FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "wh_insert_auth" ON working_hours;
CREATE POLICY "wh_insert_auth" ON working_hours FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wh_update_auth" ON working_hours;
CREATE POLICY "wh_update_auth" ON working_hours FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wh_delete_auth" ON working_hours;
CREATE POLICY "wh_delete_auth" ON working_hours FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- HOLIDAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_select_anon" ON holidays;
CREATE POLICY "holidays_select_anon" ON holidays FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "holidays_insert_auth" ON holidays;
CREATE POLICY "holidays_insert_auth" ON holidays FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "holidays_update_auth" ON holidays;
CREATE POLICY "holidays_update_auth" ON holidays FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "holidays_delete_auth" ON holidays;
CREATE POLICY "holidays_delete_auth" ON holidays FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);
CREATE INDEX IF NOT EXISTS appointments_customer_idx ON appointments(customer_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select_auth" ON appointments;
CREATE POLICY "appointments_select_auth" ON appointments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "appointments_insert_anon" ON appointments;
CREATE POLICY "appointments_insert_anon" ON appointments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_update_auth" ON appointments;
CREATE POLICY "appointments_update_auth" ON appointments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_delete_auth" ON appointments;
CREATE POLICY "appointments_delete_auth" ON appointments FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- SEED: Default working hours (business-wide, Mon-Sun)
-- ============================================================
INSERT INTO working_hours (staff_id, day_of_week, is_open, open_time, close_time)
SELECT NULL, d, d NOT IN (0, 6), '09:00'::time, '17:00'::time
FROM generate_series(0, 6) AS d
ON CONFLICT (staff_id, day_of_week) DO NOTHING;

-- ============================================================
-- SEED: Default business settings
-- ============================================================
INSERT INTO business_settings (business_name, currency, timezone)
SELECT 'My Business', 'USD', 'UTC'
WHERE NOT EXISTS (SELECT 1 FROM business_settings);
