// Canonical role & permission definitions
// Central source of truth to avoid duplication across server/client.

export const ROLE_HIERARCHY = {
  customer: 1,
  sales: 2,
  service_engineer: 2, // lateral to sales
  accounts: 3,
  manager: 4,
  admin: 5,
  superadmin: 6
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;
export const ALL_ROLES: UserRole[] = Object.keys(ROLE_HIERARCHY) as UserRole[];

// Master permission catalogue (add granular keys here; keep consistent naming)
export const PERMS = {
  PRODUCT_VIEW: 'product:view',
  PRODUCT_CREATE: 'product:create',
  ORDER_CREATE: 'order:create',
  ORDER_VIEW_SELF: 'order:view:self',
  ORDER_VIEW_ALL: 'order:view:all',
  CUSTOMER_MANAGE: 'customer:manage',
  SERVICE_TICKET_VIEW: 'service:ticket:view',
  SERVICE_TICKET_MANAGE_ASSIGNED: 'service:ticket:manage:assigned',
  SERVICE_TICKET_STATUS_UPDATE: 'service:ticket:status:update',
  SERVICE_TICKET_ADD_PARTS: 'service:ticket:add-parts',
  INVOICE_MANAGE: 'invoice:manage',
  REPORT_VIEW: 'report:view',
  INVENTORY_MANAGE: 'inventory:manage',
  SALES_TEAM_MANAGE: 'sales:team:manage',
  SERVICE_ENGINEER_ASSIGN: 'service:engineer:assign',
  USER_MANAGE: 'user:manage',
  SETTINGS_MANAGE: 'system:settings',
  ROLE_MANAGE: 'system:roles',
  SYSTEM_CONFIG: 'system:config'
} as const;

export type Permission = typeof PERMS[keyof typeof PERMS];

// Base direct permissions per role (without implicit inheritance). Roles inherit previous levels automatically.
const BASE_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  customer: [
    PERMS.PRODUCT_VIEW,
    PERMS.ORDER_CREATE,
    PERMS.ORDER_VIEW_SELF
  ],
  sales: [
    PERMS.ORDER_VIEW_ALL,
    PERMS.CUSTOMER_MANAGE
  ],
  service_engineer: [
    PERMS.SERVICE_TICKET_VIEW,
    PERMS.SERVICE_TICKET_MANAGE_ASSIGNED,
    PERMS.SERVICE_TICKET_STATUS_UPDATE,
    PERMS.SERVICE_TICKET_ADD_PARTS
  ],
  accounts: [
    PERMS.INVOICE_MANAGE,
    PERMS.REPORT_VIEW
  ],
  manager: [
    PERMS.INVENTORY_MANAGE,
    PERMS.SALES_TEAM_MANAGE,
    PERMS.SERVICE_ENGINEER_ASSIGN
  ],
  admin: [
    PERMS.USER_MANAGE,
    PERMS.SETTINGS_MANAGE,
    PERMS.ROLE_MANAGE,
    PERMS.REPORT_VIEW // ensure included even if hierarchy shifts
  ],
  superadmin: [
    PERMS.SYSTEM_CONFIG
  ]
};

// Compute inherited permissions (customer < sales < accounts < manager < admin < superadmin)
// service_engineer is a lateral branch at level 2, so it inherits customer but not sales' business perms.
function buildEffectivePermissions(): Record<UserRole, Set<Permission>> {
  const effective: Record<UserRole, Set<Permission>> = {
    customer: new Set(BASE_ROLE_PERMISSIONS.customer),
    sales: new Set(),
    service_engineer: new Set(),
    accounts: new Set(),
    manager: new Set(),
    admin: new Set(),
    superadmin: new Set()
  };

  // Helper to merge
  const addAll = (target: Set<Permission>, list: Permission[]) => list.forEach(p => target.add(p));

  // customer already set
  // sales inherits customer
  addAll(effective.sales, Array.from(effective.customer));
  addAll(effective.sales, BASE_ROLE_PERMISSIONS.sales);

  // service_engineer inherits customer only (lateral)
  addAll(effective.service_engineer, Array.from(effective.customer));
  addAll(effective.service_engineer, BASE_ROLE_PERMISSIONS.service_engineer);

  // accounts inherits sales (which already has customer) but NOT service_engineer branch
  addAll(effective.accounts, Array.from(effective.sales));
  addAll(effective.accounts, BASE_ROLE_PERMISSIONS.accounts);

  // manager inherits accounts (+ everything below sales path)
  addAll(effective.manager, Array.from(effective.accounts));
  addAll(effective.manager, BASE_ROLE_PERMISSIONS.manager);

  // admin inherits manager
  addAll(effective.admin, Array.from(effective.manager));
  addAll(effective.admin, BASE_ROLE_PERMISSIONS.admin);

  // superadmin inherits admin + all remaining including lateral branch unique perms (service engineer specific if not inherited yet)
  addAll(effective.superadmin, Array.from(effective.admin));
  addAll(effective.superadmin, BASE_ROLE_PERMISSIONS.superadmin);
  // ensure superadmin also explicitly gains any service_engineer exclusives if missing
  addAll(effective.superadmin, Array.from(effective.service_engineer));

  return effective;
}

export const EFFECTIVE_PERMISSIONS = buildEffectivePermissions();

export function isAtLeast(actual: UserRole, required: UserRole) {
  return ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[required];
}

export function hasPermission(role: UserRole, perm: Permission): boolean {
  return EFFECTIVE_PERMISSIONS[role].has(perm);
}

export const ROLE_DISPLAY_NAME: Record<UserRole, string> = {
  customer: 'Customer',
  sales: 'Sales Representative',
  service_engineer: 'Service Engineer',
  accounts: 'Accounts Manager',
  manager: 'Manager',
  admin: 'Administrator',
  superadmin: 'Super Administrator'
};

export function getDisplayName(role: UserRole) { return ROLE_DISPLAY_NAME[role]; }
