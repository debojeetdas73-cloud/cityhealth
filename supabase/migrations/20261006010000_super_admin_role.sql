ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role::text = 'admin' AND role::text = 'super_admin')
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'super_admin'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;

CREATE POLICY "Super admins assign roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) AND user_id <> auth.uid());

CREATE POLICY "Super admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) AND user_id <> auth.uid())
  WITH CHECK (public.is_super_admin(auth.uid()) AND user_id <> auth.uid());

CREATE POLICY "Super admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) AND user_id <> auth.uid());
