/*
# Calora Foundation — Profiles, Businesses, Memberships, Global Lookups

## Overview
Establishes the multi-tenant foundation for Calora. Creates the profiles
table (extends auth.users), the businesses table (top-level tenant),
business_members (the ONLY place roles live), and global lookup tables
that downstream migrations depend on.

## New Tables

### profiles
Extends Supabase auth.users with display data. No roles here — roles
live exclusively in business_members.
- id (FK auth.users), full_name, email, phone, avatar_url
- created_at, updated_at

### business_types (lookup)
Global catalog of business categories (Salon, Spa, Clinic, etc.).
- id, name, slug, icon, sort_order, created_at, updated_at

### staff_positions (lookup)
Global catalog of staff position/title types.
- id, name, slug, sort_order, created_at, updated_at

### appointment_statuses (lookup)
Global catalog of appointment lifecycle statuses.
- id, name, slug, color, sort_order, is_system, created_at, updated_at

### notification_channels (lookup)
Global catalog of notification delivery channels (email, sms, push).
- id, name, slug, sort_order, created_at, updated_at

### notification_statuses (lookup)
Global catalog of notification delivery lifecycle statuses.
- id, name, slug, sort_order, created_at, updated_at

### businesses
Top-level tenant entity. Every business-owned row references this.
- id, name, business_type_id (FK), slug (unique), status, created_at, updated_at

### business_members
Maps profiles to businesses with a role. The ONLY place roles live.
- id, business_id (FK), profile_id (FK), role ('owner'|'admin'|'staff'),
  invited_by (FK profiles), status, created_at, updated_at
- UNIQUE (business_id, profile_id)

## Helper Functions
- is_business_member(uuid) → boolean: true if auth.uid() is an active member.
- is_business_admin(uuid) → boolean: true if auth.uid() is owner or admin.
Both SECURITY DEFINER STABLE so they work inside RLS policies.

## Security
- RLS on profiles, businesses, business_members.
- Profiles: users can read all profiles (for staff directories), update own.
- Businesses: members can SELECT; anon can SELECT active businesses with slugs.
- Business_members: members can SELECT; admins can INSERT/UPDATE/DELETE.
- Lookup tables: world-readable (anon + authenticated SELECT).

## Notes
1. Functions created BEFORE policies that reference them.
2. profiles has NO role column — roles live in business_members only.
3. All lookup tables are global catalogs with no business-scoped data.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- UPDATED_AT helper function
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
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
-- GLOBAL LOOKUP: business_types
-- ============================================================
CREATE TABLE IF NOT EXISTS business_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE business_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_types_select" ON business_types;
CREATE POLICY "business_types_select" ON business_types FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- GLOBAL LOOKUP: staff_positions
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_positions_select" ON staff_positions;
CREATE POLICY "staff_positions_select" ON staff_positions FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- GLOBAL LOOKUP: appointment_statuses
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  color text DEFAULT '#6B7280',
  sort_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointment_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_statuses_select" ON appointment_statuses;
CREATE POLICY "appointment_statuses_select" ON appointment_statuses FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- GLOBAL LOOKUP: notification_channels
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_channels_select" ON notification_channels;
CREATE POLICY "notification_channels_select" ON notification_channels FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- GLOBAL LOOKUP: notification_statuses
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_statuses_select" ON notification_statuses;
CREATE POLICY "notification_statuses_select" ON notification_statuses FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_type_id uuid REFERENCES business_types(id) ON DELETE SET NULL,
  slug text UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS businesses_slug_idx ON businesses(slug);
CREATE INDEX IF NOT EXISTS businesses_status_idx ON businesses(status);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BUSINESS MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, profile_id)
);

CREATE INDEX IF NOT EXISTS business_members_business_idx ON business_members(business_id);
CREATE INDEX IF NOT EXISTS business_members_profile_idx ON business_members(profile_id);

ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS (must exist before policies that call them)
-- ============================================================
CREATE OR REPLACE FUNCTION is_business_member(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_members.business_id = target_business_id
      AND business_members.profile_id = auth.uid()
      AND business_members.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_business_admin(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_members.business_id = target_business_id
      AND business_members.profile_id = auth.uid()
      AND business_members.status = 'active'
      AND business_members.role IN ('owner', 'admin')
  );
$$;

-- ============================================================
-- POLICIES: businesses
-- ============================================================
DROP POLICY IF EXISTS "businesses_select_own" ON businesses;
CREATE POLICY "businesses_select_own" ON businesses FOR SELECT
  TO authenticated USING (is_business_member(id));

DROP POLICY IF EXISTS "businesses_select_anon" ON businesses;
CREATE POLICY "businesses_select_anon" ON businesses FOR SELECT
  TO anon USING (status = 'active' AND slug IS NOT NULL);

DROP POLICY IF EXISTS "businesses_update_own" ON businesses;
CREATE POLICY "businesses_update_own" ON businesses FOR UPDATE
  TO authenticated USING (is_business_admin(id)) WITH CHECK (is_business_admin(id));

-- ============================================================
-- POLICIES: business_members
-- ============================================================
DROP POLICY IF EXISTS "business_members_select_own" ON business_members;
CREATE POLICY "business_members_select_own" ON business_members FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "business_members_insert_admin" ON business_members;
CREATE POLICY "business_members_insert_admin" ON business_members FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "business_members_update_admin" ON business_members;
CREATE POLICY "business_members_update_admin" ON business_members FOR UPDATE
  TO authenticated USING (is_business_admin(business_id)) WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "business_members_delete_admin" ON business_members;
CREATE POLICY "business_members_delete_admin" ON business_members FOR DELETE
  TO authenticated USING (is_business_admin(business_id));

-- ============================================================
-- SEED: business_types
-- ============================================================
INSERT INTO business_types (name, slug, sort_order) VALUES
  ('Salon', 'salon', 1),
  ('Spa', 'spa', 2),
  ('Clinic', 'clinic', 3),
  ('Gym', 'gym', 4),
  ('Studio', 'studio', 5),
  ('Consulting', 'consulting', 6),
  ('Other', 'other', 99)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: staff_positions
-- ============================================================
INSERT INTO staff_positions (name, slug, sort_order) VALUES
  ('Manager', 'manager', 1),
  ('Senior', 'senior', 2),
  ('Junior', 'junior', 3),
  ('Specialist', 'specialist', 4),
  ('Trainee', 'trainee', 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: appointment_statuses
-- ============================================================
INSERT INTO appointment_statuses (name, slug, color, sort_order, is_system) VALUES
  ('Pending', 'pending', '#F59E0B', 1, true),
  ('Confirmed', 'confirmed', '#10B981', 2, true),
  ('Completed', 'completed', '#3B82F6', 3, true),
  ('Cancelled', 'cancelled', '#EF4444', 4, true),
  ('No-show', 'no-show', '#6B7280', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: notification_channels
-- ============================================================
INSERT INTO notification_channels (name, slug, sort_order) VALUES
  ('Email', 'email', 1),
  ('SMS', 'sms', 2),
  ('Push', 'push', 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: notification_statuses
-- ============================================================
INSERT INTO notification_statuses (name, slug, sort_order) VALUES
  ('Pending', 'pending', 1),
  ('Sent', 'sent', 2),
  ('Delivered', 'delivered', 3),
  ('Failed', 'failed', 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles', 'business_types', 'staff_positions', 'appointment_statuses',
    'notification_channels', 'notification_statuses',
    'businesses', 'business_members'
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
