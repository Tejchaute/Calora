/*
# Platform Tables — Settings, Notifications, Audit Logs

## Overview
Creates business-level configuration tables, notification infrastructure,
and audit logging. All tables are business-scoped via business_id.

## New Tables

### business_settings
General business configuration (one row per business).
- id, business_id (FK UNIQUE), business_name, logo_url, phone, email,
  address, currency, timezone, booking_page_slug (unique),
  created_at, updated_at

### booking_settings
Booking flow configuration (one row per business).
- id, business_id (FK UNIQUE), min_lead_time_hours, max_advance_days,
  buffer_time_minutes, slot_interval_minutes, allow_overlapping,
  require_deposit, deposit_amount, auto_confirm, created_at, updated_at

### branding_settings
White-label branding configuration (one row per business).
- id, business_id (FK UNIQUE), primary_color, secondary_color,
  accent_color, font_family, logo_url, custom_css, created_at, updated_at

### notification_settings
Notification preferences (one row per business).
- id, business_id (FK UNIQUE), email_enabled, sms_enabled, push_enabled,
  send_reminders, reminder_hours_before, send_confirmations,
  send_cancellations, created_at, updated_at

### integration_settings
Third-party integration configuration (one row per business).
- id, business_id (FK UNIQUE), google_calendar_enabled,
  google_calendar_token (text, encrypted at app layer),
  stripe_enabled, stripe_account_id, twilio_enabled,
  twilio_account_sid, created_at, updated_at

### notification_templates
Reusable notification message templates per business.
- id, business_id (FK), channel_id (FK notification_channels),
  name, subject, body, variables (jsonb), status,
  created_at, updated_at

### notification_deliveries
Individual notification delivery records.
- id, business_id (FK), template_id (FK nullable),
  appointment_id (FK nullable), customer_id (FK nullable),
  channel_id (FK notification_channels),
  status_id (FK notification_statuses),
  recipient, content (jsonb), sent_at, delivered_at, error_message,
  created_at, updated_at

### audit_logs
Immutable audit trail of business actions.
- id, business_id (FK), actor_id (FK profiles nullable),
  action, entity_type, entity_id, changes (jsonb),
  ip_address, user_agent, created_at
- No updated_at — audit logs are append-only.

## Security
- RLS on all tables.
- Business members can SELECT all platform tables.
- Only business admins can INSERT/UPDATE/DELETE settings.
- All members can SELECT notification_deliveries; admins can manage.
- All members can SELECT audit_logs; no one can UPDATE or DELETE
  (enforced by absence of UPDATE/DELETE policies).

## Notes
1. Settings tables enforce one row per business via UNIQUE(business_id).
2. audit_logs has no updated_at and no UPDATE/DELETE policies — it is
   append-only by design. The set_updated_at trigger is NOT applied.
3. integration_settings stores tokens as text — encryption is the
   application layer's responsibility, not the database's.
4. notification_deliveries references both notification_channels and
   notification_statuses from the global lookup tables.
5. notification_templates.variables is jsonb for flexible template
   variable definitions.
*/

-- ============================================================
-- BUSINESS SETTINGS (one row per business)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS business_settings_business_idx ON business_settings(business_id);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_settings_select" ON business_settings;
CREATE POLICY "business_settings_select" ON business_settings FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "business_settings_select_anon" ON business_settings;
CREATE POLICY "business_settings_select_anon" ON business_settings FOR SELECT
  TO anon USING (booking_page_slug IS NOT NULL AND booking_page_slug != '');

DROP POLICY IF EXISTS "business_settings_insert" ON business_settings;
CREATE POLICY "business_settings_insert" ON business_settings FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "business_settings_update" ON business_settings;
CREATE POLICY "business_settings_update" ON business_settings FOR UPDATE
  TO authenticated USING (is_business_admin(business_id)) WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "business_settings_delete" ON business_settings;
CREATE POLICY "business_settings_delete" ON business_settings FOR DELETE
  TO authenticated USING (is_business_admin(business_id));

-- ============================================================
-- BOOKING SETTINGS (one row per business)
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  min_lead_time_hours integer NOT NULL DEFAULT 0 CHECK (min_lead_time_hours >= 0),
  max_advance_days integer NOT NULL DEFAULT 90 CHECK (max_advance_days > 0),
  buffer_time_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_time_minutes >= 0),
  slot_interval_minutes integer NOT NULL DEFAULT 30 CHECK (slot_interval_minutes > 0),
  allow_overlapping boolean NOT NULL DEFAULT false,
  require_deposit boolean NOT NULL DEFAULT false,
  deposit_amount numeric(10,2) NOT NULL DEFAULT 0,
  auto_confirm boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_settings_select" ON booking_settings;
CREATE POLICY "booking_settings_select" ON booking_settings FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "booking_settings_select_anon" ON booking_settings;
CREATE POLICY "booking_settings_select_anon" ON booking_settings FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "booking_settings_insert" ON booking_settings;
CREATE POLICY "booking_settings_insert" ON booking_settings FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "booking_settings_update" ON booking_settings;
CREATE POLICY "booking_settings_update" ON booking_settings FOR UPDATE
  TO authenticated USING (is_business_admin(business_id)) WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "booking_settings_delete" ON booking_settings;
CREATE POLICY "booking_settings_delete" ON booking_settings FOR DELETE
  TO authenticated USING (is_business_admin(business_id));

-- ============================================================
-- BRANDING SETTINGS (one row per business)
-- ============================================================
CREATE TABLE IF NOT EXISTS branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  primary_color text DEFAULT '#2563EB',
  secondary_color text DEFAULT '#64748B',
  accent_color text DEFAULT '#0EA5E9',
  font_family text DEFAULT 'Inter, sans-serif',
  logo_url text DEFAULT '',
  custom_css text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);  

ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branding_settings_select" ON branding_settings;
CREATE POLICY "branding_settings_select" ON branding_settings FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "branding_settings_select_anon" ON branding_settings;
CREATE POLICY "branding_settings_select_anon" ON branding_settings FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "branding_settings_insert" ON branding_settings;
CREATE POLICY "branding_settings_insert" ON branding_settings FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "branding_settings_update" ON branding_settings;
CREATE POLICY "branding_settings_update" ON branding_settings FOR UPDATE
  TO authenticated USING (is_business_admin(business_id)) WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "branding_settings_delete" ON branding_settings;
CREATE POLICY "branding_settings_delete" ON branding_settings FOR DELETE
  TO authenticated USING (is_business_admin(business_id));

-- ============================================================
-- NOTIFICATION SETTINGS (one row per business)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  push_enabled boolean NOT NULL DEFAULT false,
  send_reminders boolean NOT NULL DEFAULT true,
  reminder_hours_before integer NOT NULL DEFAULT 24 CHECK (reminder_hours_before > 0),
  send_confirmations boolean NOT NULL DEFAULT true,
  send_cancellations boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_settings_select" ON notification_settings;
CREATE POLICY "notification_settings_select" ON notification_settings FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "notification_settings_insert" ON notification_settings;
CREATE POLICY "notification_settings_insert" ON notification_settings FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "notification_settings_update" ON notification_settings;
CREATE POLICY "notification_settings_update" ON notification_settings FOR UPDATE
  TO authenticated USING (is_business_admin(business_id)) WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "notification_settings_delete" ON notification_settings;
CREATE POLICY "notification_settings_delete" ON notification_settings FOR DELETE
  TO authenticated USING (is_business_admin(business_id));

-- ============================================================
-- INTEGRATION SETTINGS (one row per business)
-- ============================================================
CREATE TABLE IF NOT EXISTS integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  google_calendar_enabled boolean NOT NULL DEFAULT false,
  google_calendar_token text DEFAULT '',
  stripe_enabled boolean NOT NULL DEFAULT false,
  stripe_account_id text DEFAULT '',
  twilio_enabled boolean NOT NULL DEFAULT false,
  twilio_account_sid text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integration_settings_select" ON integration_settings;
CREATE POLICY "integration_settings_select" ON integration_settings FOR SELECT
  TO authenticated USING (is_business_admin(business_id));

DROP POLICY IF EXISTS "integration_settings_insert" ON integration_settings;
CREATE POLICY "integration_settings_insert" ON integration_settings FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "integration_settings_update" ON integration_settings;
CREATE POLICY "integration_settings_update" ON integration_settings FOR UPDATE
  TO authenticated USING (is_business_admin(business_id)) WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "integration_settings_delete" ON integration_settings;
CREATE POLICY "integration_settings_delete" ON integration_settings FOR DELETE
  TO authenticated USING (is_business_admin(business_id));

-- ============================================================
-- NOTIFICATION TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES notification_channels(id) ON DELETE RESTRICT,
  name text NOT NULL,
  subject text DEFAULT '',
  body text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_templates_business_idx ON notification_templates(business_id);
CREATE INDEX IF NOT EXISTS notification_templates_channel_idx ON notification_templates(channel_id);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_templates_select" ON notification_templates;
CREATE POLICY "notification_templates_select" ON notification_templates FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "notification_templates_insert" ON notification_templates;
CREATE POLICY "notification_templates_insert" ON notification_templates FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "notification_templates_update" ON notification_templates;
CREATE POLICY "notification_templates_update" ON notification_templates FOR UPDATE
  TO authenticated USING (is_business_admin(business_id)) WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS "notification_templates_delete" ON notification_templates;
CREATE POLICY "notification_templates_delete" ON notification_templates FOR DELETE
  TO authenticated USING (is_business_admin(business_id));

-- ============================================================
-- NOTIFICATION DELIVERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  template_id uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  channel_id uuid NOT NULL REFERENCES notification_channels(id) ON DELETE RESTRICT,
  status_id uuid NOT NULL REFERENCES notification_statuses(id) ON DELETE RESTRICT,
  recipient text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz DEFAULT NULL,
  delivered_at timestamptz DEFAULT NULL,
  error_message text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_deliveries_business_idx ON notification_deliveries(business_id);
CREATE INDEX IF NOT EXISTS notification_deliveries_appointment_idx ON notification_deliveries(appointment_id);
CREATE INDEX IF NOT EXISTS notification_deliveries_customer_idx ON notification_deliveries(customer_id);
CREATE INDEX IF NOT EXISTS notification_deliveries_status_idx ON notification_deliveries(status_id);

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_deliveries_select" ON notification_deliveries;
CREATE POLICY "notification_deliveries_select" ON notification_deliveries FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "notification_deliveries_insert" ON notification_deliveries;
CREATE POLICY "notification_deliveries_insert" ON notification_deliveries FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "notification_deliveries_update" ON notification_deliveries;
CREATE POLICY "notification_deliveries_update" ON notification_deliveries FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "notification_deliveries_delete" ON notification_deliveries;
CREATE POLICY "notification_deliveries_delete" ON notification_deliveries FOR DELETE
  TO authenticated USING (is_business_admin(business_id));

-- ============================================================
-- AUDIT LOGS (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid DEFAULT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_business_idx ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

-- ============================================================
-- UPDATED_AT TRIGGERS (NOT on audit_logs — it is append-only)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'business_settings', 'booking_settings', 'branding_settings',
    'notification_settings', 'integration_settings',
    'notification_templates', 'notification_deliveries'
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
