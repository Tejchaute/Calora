/*
# Business-Scoped Tables — Services, Staff, Customers, Resources, Scheduling

## Overview
Creates all business-owned operational tables. Every table has a
business_id column scoping it to a tenant. Appointments store snapshots
of service data at booking time. No availability table — availability
is derived from working_hours, time_off, and appointments.

## New Tables

### services
Services a business offers.
- id, business_id (FK), name, description,
  duration (minutes), price, color, status, created_at, updated_at

### staff
Staff members. profile_id is nullable (staff need not be auth users).
- id, business_id (FK), profile_id (FK nullable, ON DELETE SET NULL),
  position_id (FK nullable), full_name, email, phone, avatar_url, bio,
  status, created_at, updated_at

### staff_services (junction)
Links staff to services they can perform.
- staff_id (FK), service_id (FK), PRIMARY KEY (staff_id, service_id)

### resource_categories (business-scoped lookup)
Categories for grouping resources within a business.
- id, business_id (FK), name, slug, sort_order, created_at, updated_at

### resources
Physical resources (rooms, equipment) needed for appointments.
- id, business_id (FK), name, description,
  quantity, status, created_at, updated_at

### customers
Customers who book appointments.
- id, business_id (FK), full_name, email, phone, notes,
  created_at, updated_at

### customer_tags (business-scoped lookup)
Tags for segmenting customers within a business.
- id, business_id (FK), name, slug, color, created_at, updated_at

### customer_tag_assignments (junction)
Links customers to tags.
- id, customer_id (FK), tag_id (FK), created_at
- UNIQUE (customer_id, tag_id)

### working_hours
Weekly schedule for the business or per-staff.
- id, business_id (FK), staff_id (FK nullable, ON DELETE CASCADE),
  day_of_week (0-6), is_open, open_time, close_time,
  break_start, break_end, created_at, updated_at
- UNIQUE (business_id, staff_id, day_of_week)

### time_off
Scheduled absences (vacation, sick leave) for staff or business-wide.
- id, business_id (FK), staff_id (FK nullable, ON DELETE CASCADE),
  start_at, end_at, reason, status, created_at, updated_at

### appointments
Core appointment records with service snapshots.
- id, business_id (FK), customer_id (FK), service_id (FK),
  staff_id (FK nullable), resource_id (FK nullable),
  appointment_date, start_time, end_time,
  status (FK appointment_statuses),
  service_name_snapshot, duration_snapshot, price_snapshot,
  notes, created_at, updated_at

## Security
- RLS on all tables.
- Business members can SELECT/INSERT/UPDATE/DELETE all business-scoped data.
- Anon users can SELECT services, staff, working_hours for booking display.
- Anon users can INSERT customers and appointments for the booking flow.
- All policies use is_business_member(business_id) for ownership checks.

## Notes
1. No availability table — availability is derived from working_hours,
   time_off, and existing appointments.
2. Appointments store service_name_snapshot, duration_snapshot, price_snapshot
   so historical records remain accurate even if the service is later changed.
3. staff.profile_id is nullable — staff need not be authenticated users.
4. Roles are NOT on staff — they live in business_members only.
5. working_hours.staff_id NULL = business-wide default schedule.
6. time_off.staff_id NULL = business-wide closure.
*/

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  duration integer NOT NULL DEFAULT 30 CHECK (duration > 0),
  price numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS services_business_idx ON services(business_id);
CREATE INDEX IF NOT EXISTS services_status_idx ON services(status);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_auth" ON services;
CREATE POLICY "services_select_auth" ON services FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "services_select_anon" ON services;
CREATE POLICY "services_select_anon" ON services FOR SELECT
  TO anon USING (status = 'active');

DROP POLICY IF EXISTS "services_insert" ON services;
CREATE POLICY "services_insert" ON services FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "services_update" ON services;
CREATE POLICY "services_update" ON services FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "services_delete" ON services;
CREATE POLICY "services_delete" ON services FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  position_id uuid REFERENCES staff_positions(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_business_idx ON staff(business_id);
CREATE INDEX IF NOT EXISTS staff_profile_idx ON staff(profile_id);
CREATE INDEX IF NOT EXISTS staff_status_idx ON staff(status);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_auth" ON staff;
CREATE POLICY "staff_select_auth" ON staff FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "staff_select_anon" ON staff;
CREATE POLICY "staff_select_anon" ON staff FOR SELECT
  TO anon USING (status = 'active');

DROP POLICY IF EXISTS "staff_insert" ON staff;
CREATE POLICY "staff_insert" ON staff FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "staff_update" ON staff;
CREATE POLICY "staff_update" ON staff FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "staff_delete" ON staff;
CREATE POLICY "staff_delete" ON staff FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- STAFF SERVICES (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_services (
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_services_select_auth" ON staff_services;
CREATE POLICY "staff_services_select_auth" ON staff_services FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM staff s WHERE s.id = staff_id AND is_business_member(s.business_id))
  );

DROP POLICY IF EXISTS "staff_services_select_anon" ON staff_services;
CREATE POLICY "staff_services_select_anon" ON staff_services FOR SELECT
  TO anon USING (
    EXISTS (SELECT 1 FROM staff s WHERE s.id = staff_id AND s.status = 'active')
  );

DROP POLICY IF EXISTS "staff_services_insert" ON staff_services;
CREATE POLICY "staff_services_insert" ON staff_services FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM staff s WHERE s.id = staff_id AND is_business_member(s.business_id))
  );

DROP POLICY IF EXISTS "staff_services_delete" ON staff_services;
CREATE POLICY "staff_services_delete" ON staff_services FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM staff s WHERE s.id = staff_id AND is_business_member(s.business_id))
  );

-- ============================================================
-- RESOURCE CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS resource_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

CREATE INDEX IF NOT EXISTS resource_categories_business_idx ON resource_categories(business_id);

ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_categories_select" ON resource_categories;
CREATE POLICY "resource_categories_select" ON resource_categories FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "resource_categories_insert" ON resource_categories;
CREATE POLICY "resource_categories_insert" ON resource_categories FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "resource_categories_update" ON resource_categories;
CREATE POLICY "resource_categories_update" ON resource_categories FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "resource_categories_delete" ON resource_categories;
CREATE POLICY "resource_categories_delete" ON resource_categories FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resources_business_idx ON resources(business_id);
CREATE INDEX IF NOT EXISTS resources_status_idx ON resources(status);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_select" ON resources;
CREATE POLICY "resources_select" ON resources FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "resources_insert" ON resources;
CREATE POLICY "resources_insert" ON resources FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "resources_update" ON resources;
CREATE POLICY "resources_update" ON resources FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "resources_delete" ON resources;
CREATE POLICY "resources_delete" ON resources FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_business_idx ON customers(business_id);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_auth" ON customers;
CREATE POLICY "customers_select_auth" ON customers FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "customers_insert_auth" ON customers;
CREATE POLICY "customers_insert_auth" ON customers FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "customers_insert_anon" ON customers;
CREATE POLICY "customers_insert_anon" ON customers FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "customers_delete" ON customers;
CREATE POLICY "customers_delete" ON customers FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- CUSTOMER TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

CREATE INDEX IF NOT EXISTS customer_tags_business_idx ON customer_tags(business_id);

ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_tags_select" ON customer_tags;
CREATE POLICY "customer_tags_select" ON customer_tags FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "customer_tags_insert" ON customer_tags;
CREATE POLICY "customer_tags_insert" ON customer_tags FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "customer_tags_update" ON customer_tags;
CREATE POLICY "customer_tags_update" ON customer_tags FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "customer_tags_delete" ON customer_tags;
CREATE POLICY "customer_tags_delete" ON customer_tags FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- CUSTOMER TAG ASSIGNMENTS (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, tag_id)
);

CREATE INDEX IF NOT EXISTS customer_tag_assignments_customer_idx ON customer_tag_assignments(customer_id);
CREATE INDEX IF NOT EXISTS customer_tag_assignments_tag_idx ON customer_tag_assignments(tag_id);

ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_tag_assignments_select" ON customer_tag_assignments;
CREATE POLICY "customer_tag_assignments_select" ON customer_tag_assignments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_id AND is_business_member(c.business_id))
  );

DROP POLICY IF EXISTS "customer_tag_assignments_insert" ON customer_tag_assignments;
CREATE POLICY "customer_tag_assignments_insert" ON customer_tag_assignments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_id AND is_business_member(c.business_id))
  );

DROP POLICY IF EXISTS "customer_tag_assignments_delete" ON customer_tag_assignments;
CREATE POLICY "customer_tag_assignments_delete" ON customer_tag_assignments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_id AND is_business_member(c.business_id))
  );

-- ============================================================
-- WORKING HOURS
-- ============================================================
CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time DEFAULT '09:00',
  close_time time DEFAULT '17:00',
  break_start time DEFAULT NULL,
  break_end time DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, staff_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS working_hours_business_idx ON working_hours(business_id);
CREATE INDEX IF NOT EXISTS working_hours_staff_idx ON working_hours(staff_id);

ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "working_hours_select_auth" ON working_hours;
CREATE POLICY "working_hours_select_auth" ON working_hours FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "working_hours_select_anon" ON working_hours;
CREATE POLICY "working_hours_select_anon" ON working_hours FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "working_hours_insert" ON working_hours;
CREATE POLICY "working_hours_insert" ON working_hours FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "working_hours_update" ON working_hours;
CREATE POLICY "working_hours_update" ON working_hours FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "working_hours_delete" ON working_hours;
CREATE POLICY "working_hours_delete" ON working_hours FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- TIME OFF
-- ============================================================
CREATE TABLE IF NOT EXISTS time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text DEFAULT '',
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_off_business_idx ON time_off(business_id);
CREATE INDEX IF NOT EXISTS time_off_staff_idx ON time_off(staff_id);
CREATE INDEX IF NOT EXISTS time_off_date_idx ON time_off(start_at, end_at);

ALTER TABLE time_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_off_select" ON time_off;
CREATE POLICY "time_off_select" ON time_off FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "time_off_insert" ON time_off;
CREATE POLICY "time_off_insert" ON time_off FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "time_off_update" ON time_off;
CREATE POLICY "time_off_update" ON time_off FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "time_off_delete" ON time_off;
CREATE POLICY "time_off_delete" ON time_off FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- APPOINTMENTS (with service snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  resource_id uuid REFERENCES resources(id) ON DELETE SET NULL,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no-show')),
  service_name_snapshot text NOT NULL DEFAULT '',
  duration_snapshot integer NOT NULL DEFAULT 0,
  price_snapshot numeric(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_business_idx ON appointments(business_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);
CREATE INDEX IF NOT EXISTS appointments_customer_idx ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS appointments_staff_idx ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS appointments_service_idx ON appointments(service_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select_auth" ON appointments;
CREATE POLICY "appointments_select_auth" ON appointments FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "appointments_insert_auth" ON appointments;
CREATE POLICY "appointments_insert_auth" ON appointments FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "appointments_insert_anon" ON appointments;
CREATE POLICY "appointments_insert_anon" ON appointments FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_update" ON appointments;
CREATE POLICY "appointments_update" ON appointments FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "appointments_delete" ON appointments;
CREATE POLICY "appointments_delete" ON appointments FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'services', 'staff', 'resources',
    'resource_categories', 'customers', 'customer_tags',
    'working_hours', 'time_off', 'appointments'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; '
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END $$;
