/*
# Business-owned subscription and trial foundation

- Existing businesses are explicitly grandfathered onto an active `legacy`
  subscription. They do not receive invented trial dates.
- New businesses are created with exactly one database-timestamped 14-day trial.
- Subscription access is enforced by the existing RLS helper functions as well
  as exposed through one server-authoritative access RPC.
*/

-- Keep profile provisioning reproducible in source control. Registration creates
-- an auth user only; this trigger creates the corresponding application profile.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = CASE
      WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    email = CASE
      WHEN public.profiles.email = '' THEN EXCLUDED.email
      ELSE public.profiles.email
    END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_auth_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Repair any pre-existing auth users that were created before the trigger was
-- represented in migrations.
INSERT INTO public.profiles (id, full_name, email)
SELECT
  users.id,
  COALESCE(users.raw_user_meta_data ->> 'full_name', ''),
  COALESCE(users.email, '')
FROM auth.users AS users
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free_trial', 'legacy', 'paid')),
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_business_key UNIQUE (business_id),
  CONSTRAINT subscriptions_trial_dates_check CHECK (
    (plan = 'free_trial'
      AND status = 'trialing'
      AND trial_started_at IS NOT NULL
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at > trial_started_at)
    OR
    (plan <> 'free_trial'
      AND trial_started_at IS NULL
      AND trial_ends_at IS NULL)
  ),
  CONSTRAINT subscriptions_period_check CHECK (
    current_period_end IS NULL
    OR current_period_start IS NULL
    OR current_period_end > current_period_start
  )
);

CREATE INDEX subscriptions_status_idx
  ON public.subscriptions (status);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.subscriptions FROM PUBLIC;
REVOKE ALL ON TABLE public.subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.subscriptions FROM authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

-- Membership without subscription access. This is deliberately separate from
-- is_business_member(), which becomes the central data-access predicate below.
CREATE OR REPLACE FUNCTION public.is_business_member_record(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members
    WHERE business_members.business_id = target_business_id
      AND business_members.profile_id = auth.uid()
      AND business_members.status = 'active'
  );
$$;

ALTER FUNCTION public.is_business_member_record(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_business_member_record(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_member_record(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_business_member_record(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_active_subscription(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE subscriptions.business_id = target_business_id
      AND (
        subscriptions.status = 'active'
        OR (
          subscriptions.status = 'trialing'
          AND subscriptions.trial_ends_at IS NOT NULL
          AND statement_timestamp() < subscriptions.trial_ends_at
        )
      )
  );
$$;

ALTER FUNCTION public.has_active_subscription(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO anon, authenticated;

-- Explicit migration policy for businesses that predate subscriptions. This is
-- access-preserving and does not fabricate a historical trial.
INSERT INTO public.subscriptions (business_id, plan, status)
SELECT businesses.id, 'legacy', 'active'
FROM public.businesses
ON CONFLICT (business_id) DO NOTHING;

DROP POLICY IF EXISTS "subscriptions_select_member" ON public.subscriptions;
CREATE POLICY "subscriptions_select_member"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_business_member_record(business_id));

-- No client INSERT/UPDATE/DELETE policy is intentionally provided. Subscription
-- state can only be created or changed by trusted database functions/migrations.

-- Keep membership discovery available after expiry so routing can distinguish
-- setup from subscription-required. Product-table policies that already call
-- is_business_member() automatically gain subscription enforcement.
CREATE OR REPLACE FUNCTION public.is_business_member(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.is_business_member_record(target_business_id)
    AND public.has_active_subscription(target_business_id);
$$;

ALTER FUNCTION public.is_business_member(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_business_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_business_admin(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members
    WHERE business_members.business_id = target_business_id
      AND business_members.profile_id = auth.uid()
      AND business_members.status = 'active'
      AND business_members.role IN ('owner', 'admin')
  ) AND public.has_active_subscription(target_business_id);
$$;

ALTER FUNCTION public.is_business_admin(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_business_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "businesses_select_own" ON public.businesses;
CREATE POLICY "businesses_select_own" ON public.businesses FOR SELECT
  TO authenticated USING (public.is_business_member_record(id));

DROP POLICY IF EXISTS "business_members_select_own" ON public.business_members;
CREATE POLICY "business_members_select_own" ON public.business_members FOR SELECT
  TO authenticated USING (public.is_business_member_record(business_id));

-- Public booking starts with a business-by-slug lookup. Hiding expired businesses
-- here also prevents the normal anonymous booking flow from continuing.
DROP POLICY IF EXISTS "businesses_select_anon" ON public.businesses;
CREATE POLICY "businesses_select_anon" ON public.businesses FOR SELECT
  TO anon, authenticated USING (
    status = 'active'
    AND slug IS NOT NULL
    AND public.has_active_subscription(id)
  );

CREATE OR REPLACE FUNCTION public.create_business_with_owner(
  p_name text,
  p_slug text,
  p_business_type_id uuid
)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_profile_id uuid := auth.uid();
  normalized_name text := btrim(p_name);
  normalized_slug text := lower(btrim(p_slug));
  created_business public.businesses;
  trial_start timestamptz := statement_timestamp();
BEGIN
  IF current_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to create a business'
      USING ERRCODE = '42501';
  END IF;

  IF normalized_name = '' OR char_length(normalized_name) > 120 THEN
    RAISE EXCEPTION 'Business name must contain between 1 and 120 characters'
      USING ERRCODE = '22023';
  END IF;

  IF normalized_slug = '' OR normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Business name must produce a valid URL slug'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_types WHERE id = p_business_type_id
  ) THEN
    RAISE EXCEPTION 'A valid business type is required'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize setup attempts for this user. This closes the double-submit race
  -- even when requests arrive concurrently.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_profile_id::text, 0)
  );

  -- Serialize identical slug candidates as well, so concurrent setup requests
  -- from different users cannot both pass the uniqueness check.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(normalized_slug, 1)
  );

  IF EXISTS (
    SELECT 1
    FROM public.business_members
    WHERE profile_id = current_profile_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'This account is already associated with a business'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.businesses (name, business_type_id, slug, status)
  VALUES (
    normalized_name,
    p_business_type_id,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.businesses WHERE slug = normalized_slug)
        THEN normalized_slug || '-' || substr(gen_random_uuid()::text, 1, 8)
      ELSE normalized_slug
    END,
    'active'
  )
  RETURNING * INTO created_business;

  INSERT INTO public.business_settings (
    business_id,
    business_name,
    booking_page_slug,
    currency,
    timezone
  ) VALUES (
    created_business.id,
    created_business.name,
    created_business.slug,
    'INR',
    'Asia/Kolkata'
  );

  INSERT INTO public.business_members (
    business_id,
    profile_id,
    role,
    status
  ) VALUES (
    created_business.id,
    current_profile_id,
    'owner',
    'active'
  );

  INSERT INTO public.subscriptions (
    business_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at
  ) VALUES (
    created_business.id,
    'free_trial',
    'trialing',
    trial_start,
    trial_start + interval '14 days'
  );

  RETURN created_business;
END;
$$;

ALTER FUNCTION public.create_business_with_owner(text, text, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.create_business_with_owner(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_business_with_owner(text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_business_with_owner(text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_subscription_access(p_business_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  business_id uuid,
  plan text,
  status text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  server_now timestamptz,
  access_allowed boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_business_member_record(p_business_id) THEN
    RAISE EXCEPTION 'Not authorized to access this subscription'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    subscriptions.id,
    subscriptions.business_id,
    subscriptions.plan,
    subscriptions.status,
    subscriptions.trial_started_at,
    subscriptions.trial_ends_at,
    subscriptions.current_period_start,
    subscriptions.current_period_end,
    statement_timestamp(),
    public.has_active_subscription(subscriptions.business_id),
    CASE
      WHEN subscriptions.status = 'active' THEN 'active_subscription'
      WHEN subscriptions.status = 'trialing'
        AND statement_timestamp() < subscriptions.trial_ends_at THEN 'active_trial'
      WHEN subscriptions.status = 'trialing' THEN 'trial_expired'
      ELSE 'subscription_required'
    END
  FROM public.subscriptions
  WHERE subscriptions.business_id = p_business_id;
END;
$$;

ALTER FUNCTION public.get_subscription_access(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_subscription_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_subscription_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_subscription_access(uuid) TO authenticated;
