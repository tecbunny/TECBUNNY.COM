# Roles & Permissions Architecture

This document is the canonical reference for user roles and permissions.

## Role Hierarchy
Higher number inherits (or equals) lower-level capabilities unless explicitly lateral.

| Role | Level | Notes |
|------|-------|-------|
| customer | 1 | Default signup role |
| sales | 2 | Commercial assistance (inherits customer) |
| service_engineer | 2 | Lateral to sales: service-only; inherits customer but not sales business perms |
| accounts | 3 | Financial / invoices (inherits sales branch) |
| manager | 4 | Supervises operational teams |
| admin | 5 | Full business administration (not platform root) |
| superadmin | 6 | Platform owner; system & security root |

## Source of Truth
- TypeScript: `src/lib/roles.ts` (do **not** redefine hierarchies elsewhere)
- Supabase `auth.users.app_metadata.role` is authoritative for security.
- `profiles.role` mirrors the value for convenience and querying.

## Permission Catalogue
See `roles.ts` constant `PERMS` for current granular keys.

## Inheritance Model
- Linear along customer → sales → accounts → manager → admin → superadmin.
- `service_engineer` branches from customer at level 2 and does **not** inherit sales commercial permissions.
- Superadmin receives union of admin + service_engineer unique capabilities.

## Guard Usage
Server route example:
```ts
import { requireRole } from '@/src/lib/auth/guard';

export async function GET() {
  const ctx = await requireRole('manager');
  if ('error' in ctx) return new Response(ctx.error, { status: ctx.status });
  // proceed with ctx.user / ctx.role
}
```

Client example:
```ts
import { isAtLeast } from '@/src/lib/roles';
const canManage = isAtLeast(user.role, 'manager');
```

## Elevation Rules
- Signup always yields `customer`.
- Only `superadmin` may assign `superadmin`.
- Admins may elevate up to `manager`/`admin` (business roles) but not create other admins if policy forbids (enforce in endpoint logic).

## Audit
Role changes must insert a row into `role_audit` (see planned migration). Include: user_id, new_role, changed_by, note.

## Adding a New Role
1. Modify `ROLE_HIERARCHY` in `roles.ts`.
2. Add display name & base permissions.
3. Regenerate effective permissions (automatic on import).
4. Update RLS policies / API guards if needed.
5. Document here and commit.

## DO NOT
- Hard-code role literals in components (import helpers instead).
- Trust `profiles.role` over `app_metadata.role` for authorization checks.
- Grant superadmin casually; requires manual review.

---
Maintainers: Update this document with any structural change to avoid drift.
