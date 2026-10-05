# cityhealth + Admin Console changes

## Added

- `/assistant`: authenticated cityhealth chat with conversation history, new conversations, delete, suggested prompts, emergency notice, and Supabase persistence.
- `/admin`: admin-only console with overview metrics, catalogue CRUD for doctors/hospitals/specialties/packages, appointment status management, and user role management.
- Admin link in the main navigation for accounts that have the `admin` role.
- `supabase/migrations/20260913100000_admin_console.sql`: additional RLS policies required by the admin console.

## Supabase setup

1. Apply the new migration in Supabase SQL Editor (or through your normal migration workflow).
2. Create/sign in to the account that should be the first administrator.
3. In Supabase SQL Editor, assign that account the admin role using its Auth user UUID:

```sql
insert into public.user_roles (user_id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict (user_id, role) do nothing;
```

4. Make sure the Lovable AI gateway key is configured on the server as `LOVABLE_API_KEY`. The browser must never receive this key.

The admin migration does not create an Auth account, set its password, or assign an admin role by email. If sign-in reports "Invalid login credentials," use the sign-in page's "Forgot password?" link for an existing account, or create the account first. Afterward, assign its Auth user UUID the `admin` role using the SQL above.

## Super admins

Apply `supabase/migrations/20261006010000_super_admin_role.sql` to enable the `super_admin` role. Super admins have all admin access and can grant, change, or remove roles for other users. Regular admins can manage patient-role entries only.

To bootstrap the first super admin, use the account's Auth user UUID in Supabase SQL Editor:

```sql
update public.user_roles
set role = 'super_admin'
where user_id = 'YOUR_AUTH_USER_UUID'
  and role = 'admin';
```

## Important

The generated `src/routeTree.gen.ts` has been updated so the new routes work immediately in this archive. TanStack Router may regenerate that file during the normal Vite/Lovable build; that is expected.

The existing `has_role()` function remains the source of truth for admin authorization. Do not replace it with a client-only admin check.
