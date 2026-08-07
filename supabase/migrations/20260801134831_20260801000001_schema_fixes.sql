/*
# Schema Fixes — Business-Owned Lookups, Missing Columns, Anon Security

## Overview
Fixes five issues identified in the schema review:
1. Converts staff_positions from a global catalog to a business-owned table.
2. Adds date_of_birth to customers.
3. Adds capacity to resources (alongside existing quantity).
4. Adds employee_code to staff with a business-scoped unique constraint.
5. Replaces insecure anon INSERT policies (WITH CHECK true) with policies
   that validate business_id against an active business.

## Changes

### staff_positions (modified)
- Added business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE.
- Dropped global UNIQUE(name) and UNIQUE(slug) constraints.
- Added UNIQUE(business_id, name).
- Cleared global seed rows (no longer valid without a business owner).
- Updated RLS: SELECT now requires is_business_member(business_id).
  Added INSERT/UPDATE/DELETE policies for business members.

### customers (modified)
- Added date_of_birth DATE (nullable).

### resources (modified)
- Added capacity INTEGER (nullable). quantity is unchanged.

### staff (modified)
- Added employee_code TEXT (nullable).
- Added UNIQUE(business_id, employee_code). NULL employee_code values
  are treated as distinct by PostgreSQL, so unassigned staff do not conflict.

### appointments (policy changed)
- Dropped "appointments_insert_anon" (was WITH CHECK true).
- New policy validates that business_id references an active business
  via EXISTS check against the businesses table.

### customers (policy changed)
- Dropped "customers_insert_anon" (was WITH CHECK true).
- New policy validates that business_id references an active business
  via EXISTS check against the businesses table.

## Security
- Anon INSERT on appointments and customers now requires that the
  supplied business_id matches a row in businesses with status = 'active'.
  This prevents arbitrary business_id injection.
- Authenticated policies are unchanged.
- staff_positions is now member-scoped instead of world-readable.

## Notes
1. The global seed data in staff_positions (Manager, Senior, etc.) was
   removed because those rows have no business owner. Businesses will
   create their own positions through the application.
2. UNIQUE(business_id, employee_code) allows multiple NULL employee_code
   values within the same business — only non-NULL codes must be unique.
3. resources.quantity is preserved; capacity is additive for future use.
*/

-- ============================================================
-- 1. STAFF_POSITIONS → business-owned
-- ============================================================

-- Clear global seed rows that have no business owner
DELETE FROM staff_positions;

-- Add business_id column
ALTER TABLE staff_positions ADD COLUMN IF NOT EXISTS business_id uuid;

-- Drop global unique constraints (they prevent cross-business duplicates)
ALTER TABLE staff_positions DROP CONSTRAINT IF EXISTS staff_positions_name_key;
ALTER TABLE staff_positions DROP CONSTRAINT IF EXISTS staff_positions_slug_key;

-- Set NOT NULL now that table is empty
ALTER TABLE staff_positions ALTER COLUMN business_id SET NOT NULL;

-- Add FK to businesses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_positions_business_id_fkey'
  ) THEN
    ALTER TABLE staff_positions
    ADD CONSTRAINT staff_positions_business_id_fkey
    FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add business-scoped unique on name
ALTER TABLE staff_positions
  ADD CONSTRAINT staff_positions_business_name_key
  UNIQUE (business_id, name);

CREATE INDEX IF NOT EXISTS staff_positions_business_idx ON staff_positions(business_id);

-- Update RLS policies
DROP POLICY IF EXISTS "staff_positions_select" ON staff_positions;
CREATE POLICY "staff_positions_select" ON staff_positions FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "staff_positions_insert" ON staff_positions;
CREATE POLICY "staff_positions_insert" ON staff_positions FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "staff_positions_update" ON staff_positions;
CREATE POLICY "staff_positions_update" ON staff_positions FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "staff_positions_delete" ON staff_positions;
CREATE POLICY "staff_positions_delete" ON staff_positions FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ============================================================
-- 2. CUSTOMERS → add date_of_birth
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth date;

-- ============================================================
-- 3. RESOURCES → add capacity (nullable, alongside quantity)
-- ============================================================
ALTER TABLE resources ADD COLUMN IF NOT EXISTS capacity integer;

-- ============================================================
-- 4. STAFF → add employee_code with business-scoped unique
-- ============================================================
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employee_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_business_employee_code_key'
  ) THEN
    ALTER TABLE staff
    ADD CONSTRAINT staff_business_employee_code_key
    UNIQUE (business_id, employee_code);
  END IF;
END $$;

-- ============================================================
-- 5. FIX ANONYMOUS INSERT SECURITY
-- ============================================================

-- Appointments: replace WITH CHECK (true) with active-business validation
DROP POLICY IF EXISTS "appointments_insert_anon" ON appointments;
CREATE POLICY "appointments_insert_anon" ON appointments FOR INSERT
  TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = appointments.business_id
        AND businesses.status = 'active'
    )
  );

-- Customers: replace WITH CHECK (true) with active-business validation
DROP POLICY IF EXISTS "customers_insert_anon" ON customers;
CREATE POLICY "customers_insert_anon" ON customers FOR INSERT
  TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = customers.business_id
        AND businesses.status = 'active'
    )
  );
