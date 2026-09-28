/*
 * Remove a business only when deletion of an Auth user would leave it without
 * any other active member. Shared businesses and their subscriptions survive.
 * Business deletion cascades to subscriptions and all business-owned rows.
 */

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_businesses_before_auth_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected_business_id uuid;
BEGIN
  FOR affected_business_id IN
    SELECT DISTINCT membership.business_id
    FROM public.business_members AS membership
    WHERE membership.profile_id = OLD.id
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.business_members AS remaining_membership
      JOIN public.profiles AS remaining_profile
        ON remaining_profile.id = remaining_membership.profile_id
      JOIN auth.users AS remaining_auth_user
        ON remaining_auth_user.id = remaining_profile.id
      WHERE remaining_membership.business_id = affected_business_id
        AND remaining_membership.profile_id <> OLD.id
        AND remaining_membership.status = 'active'
    ) THEN
      DELETE FROM public.businesses AS business
      WHERE business.id = affected_business_id;
    END IF;
  END LOOP;

  RETURN OLD;
END;
$$;

ALTER FUNCTION public.cleanup_orphaned_businesses_before_auth_user_delete()
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_businesses_before_auth_user_delete()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_businesses_before_auth_user_delete()
  FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_businesses_before_auth_user_delete()
  FROM authenticated;

DROP TRIGGER IF EXISTS cleanup_orphaned_businesses_before_auth_user_delete
  ON auth.users;
CREATE TRIGGER cleanup_orphaned_businesses_before_auth_user_delete
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_orphaned_businesses_before_auth_user_delete();
