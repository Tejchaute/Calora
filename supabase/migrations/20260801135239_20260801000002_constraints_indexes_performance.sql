/*
# Constraints, Indexes & Performance Optimization

## Overview
Adds missing CHECK constraints for data integrity, composite indexes for
common query patterns, and improves one FK delete action to preserve
appointment history. No schema design changes, no new tables.

## Constraints Added

### appointments
- end_time > start_time (prevents zero/negative-length appointments)
- duration_snapshot > 0 (snapshot must be valid)
- price_snapshot >= 0 (snapshot must be non-negative)

### services
- price >= 0 (non-negative pricing)

### resources
- capacity >= 0 (non-negative, when provided)

### time_off
- end_at > start_at (prevents invalid ranges)

### working_hours
- close_time > open_time (when is_open = true)
- break_end > break_start (when both break columns are non-null)

## Indexes Added (composite, query-pattern targeted)

### Dashboard / status filtering
- appointments (business_id, status)
- appointments (business_id, created_at)

### Appointment calendar
- appointments (business_id, appointment_date)
- appointments (business_id, staff_id, appointment_date)

### Customer search
- customers (business_id, email)
- customers (business_id, phone)

### Public booking
- services (business_id, status)
- staff (business_id, status)

### Staff schedule
- time_off (business_id, staff_id, start_at)
- working_hours (business_id, staff_id, day_of_week) — already covered
  by unique constraint, skipped

### Member management
- business_members (business_id, role)

### Notification log
- notification_deliveries (business_id, created_at)

### Audit log
- audit_logs (business_id, created_at)

## Foreign Key Improvements
- appointments.customer_id: CASCADE → RESTRICT
  Prevents deleting a customer with appointments, preserving
  appointment history. Businesses should anonymize customers
  instead of deleting them.

## Notes
1. No single-column indexes added — those already exist on all
   business_id, status, email, phone, created_at, etc. columns.
2. Only composite indexes that accelerate real query patterns
   (dashboard, calendar, search, booking) are added.
3. CHECK constraints use IF NOT EXISTS pattern via DO blocks to
   remain idempotent.
4. No schema design changes — only constraints, indexes, and one
   FK delete-rule improvement.
*/

-- ============================================================
-- CHECK CONSTRAINTS
-- ============================================================

-- appointments: end_time > start_time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_time_order_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_time_order_check CHECK (end_time > start_time);
  END IF;
END $$;

-- appointments: duration_snapshot > 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_duration_snapshot_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_duration_snapshot_check CHECK (duration_snapshot > 0);
  END IF;
END $$;

-- appointments: price_snapshot >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_price_snapshot_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_price_snapshot_check CHECK (price_snapshot >= 0);
  END IF;
END $$;

-- services: price >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_price_check'
  ) THEN
    ALTER TABLE services
      ADD CONSTRAINT services_price_check CHECK (price >= 0);
  END IF;
END $$;

-- resources: capacity >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resources_capacity_check'
  ) THEN
    ALTER TABLE resources
      ADD CONSTRAINT resources_capacity_check CHECK (capacity IS NULL OR capacity >= 0);
  END IF;
END $$;

-- time_off: end_at > start_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_off_time_order_check'
  ) THEN
    ALTER TABLE time_off
      ADD CONSTRAINT time_off_time_order_check CHECK (end_at > start_at);
  END IF;
END $$;

-- working_hours: close_time > open_time when open
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'working_hours_open_close_check'
  ) THEN
    ALTER TABLE working_hours
      ADD CONSTRAINT working_hours_open_close_check CHECK (
        is_open = false OR close_time > open_time
      );
  END IF;
END $$;

-- working_hours: break_end > break_start when both present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'working_hours_break_order_check'
  ) THEN
    ALTER TABLE working_hours
      ADD CONSTRAINT working_hours_break_order_check CHECK (
        break_start IS NULL OR break_end IS NULL OR break_end > break_start
      );
  END IF;
END $$;

-- ============================================================
-- FOREIGN KEY IMPROVEMENT
-- ============================================================

-- appointments.customer_id: CASCADE → RESTRICT (preserve appointment history)
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey,
  ADD CONSTRAINT appointments_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

-- ============================================================
-- COMPOSITE INDEXES
-- ============================================================

-- Dashboard: filter by business + status
CREATE INDEX IF NOT EXISTS appointments_business_status_idx
  ON appointments (business_id, status);

-- Dashboard: recent activity by business
CREATE INDEX IF NOT EXISTS appointments_business_created_idx
  ON appointments (business_id, created_at);

-- Calendar: appointments by business + date
CREATE INDEX IF NOT EXISTS appointments_business_date_idx
  ON appointments (business_id, appointment_date);

-- Staff schedule: appointments by business + staff + date
CREATE INDEX IF NOT EXISTS appointments_business_staff_date_idx
  ON appointments (business_id, staff_id, appointment_date);

-- Customer search: by email within a business
CREATE INDEX IF NOT EXISTS customers_business_email_idx
  ON customers (business_id, email);

-- Customer search: by phone within a business
CREATE INDEX IF NOT EXISTS customers_business_phone_idx
  ON customers (business_id, phone);

-- Public booking: active services by business
CREATE INDEX IF NOT EXISTS services_business_status_idx
  ON services (business_id, status);

-- Public booking: active staff by business
CREATE INDEX IF NOT EXISTS staff_business_status_idx
  ON staff (business_id, status);

-- Staff schedule: time off by business + staff + start
CREATE INDEX IF NOT EXISTS time_off_business_staff_start_idx
  ON time_off (business_id, staff_id, start_at);

-- Member management: members by business + role
CREATE INDEX IF NOT EXISTS business_members_business_role_idx
  ON business_members (business_id, role);

-- Notification log: recent deliveries by business
CREATE INDEX IF NOT EXISTS notification_deliveries_business_created_idx
  ON notification_deliveries (business_id, created_at);

-- Audit log: entries by business + time
CREATE INDEX IF NOT EXISTS audit_logs_business_created_idx
  ON audit_logs (business_id, created_at);
