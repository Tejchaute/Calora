ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;