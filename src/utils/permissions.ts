import { StaffMemberAccess, UserPermissions, FloorPricePolicy } from '../types';

export const BOOTSTRAPPED_SUPER_ADMIN_EMAILS = [
  'strangersyco@gmail.com',
  'tajamul.sales@globaloils.us',
];

export function isBootstrappedSuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return BOOTSTRAPPED_SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function emailToDocId(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 100);
}

export const ROLE_LABELS: Record<StaffMemberAccess['role'], string> = {
  super_admin: 'Super Admin',
  admin: 'Operations Admin',
  sales_exec: 'Sales Executive',
  warehouse_mgr: 'Warehouse & Packing Mgr',
  viewer: 'Read-Only Viewer',
};

export const ROLE_BADGE_STYLES: Record<StaffMemberAccess['role'], string> = {
  super_admin:
    'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
  admin:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  sales_exec:
    'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
  warehouse_mgr:
    'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-800',
  viewer:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
};

export const DEFAULT_ROLE_RESPONSIBILITIES: Record<StaffMemberAccess['role'], string> = {
  super_admin:
    'Full executive control over pricing formulas, minimum floor margins, team access roles, warehouse inventory, and container operations.',
  admin:
    'Manage day-to-day export costing, proforma invoices, container packing schedules, and warehouse inventory updates.',
  sales_exec:
    'Prepare client Proforma Invoices & negotiations within authorized minimum selling prices; verify live product & packaging stock readiness.',
  warehouse_mgr:
    'Maintain physical & raw material inventory, upload supplier bills/PDFs via AI, and update 8-stage container packaging statuses.',
  viewer:
    'Audit-only visibility into authorized dashboards, container schedules, and inventory balances without edit rights.',
};

export function getPermissionsForRolePreset(role: StaffMemberAccess['role']): UserPermissions {
  const base = getBaseRolePermissions(role);
  // Legacy modules are visible by default; Super Admin can switch them off per person
  return { ...base, ordersView: true, dispatchView: true, mastersheetView: true };
}

function getBaseRolePermissions(role: StaffMemberAccess['role']): UserPermissions {
  switch (role) {
    case 'super_admin':
      return {
        dashboardView: true,
        packingView: true,
        packingEdit: true,
        inventoryView: true,
        inventoryEdit: true,
        oilcostView: true,
        oilcostEditMaster: true,
        oilcostCreateEditPI: true,
        oilcostOverrideFloor: true,
        canClearData: true,
        canManageAccess: true,
      };
    case 'admin':
      return {
        dashboardView: true,
        packingView: true,
        packingEdit: true,
        inventoryView: true,
        inventoryEdit: true,
        oilcostView: true,
        oilcostEditMaster: true,
        oilcostCreateEditPI: true,
        oilcostOverrideFloor: true,
        canClearData: false,
        canManageAccess: false,
      };
    case 'sales_exec':
      return {
        dashboardView: true,
        packingView: true,
        packingEdit: false,
        inventoryView: true,
        inventoryEdit: false,
        oilcostView: true,
        oilcostEditMaster: false,
        oilcostCreateEditPI: true,
        oilcostOverrideFloor: false,
        canClearData: false,
        canManageAccess: false,
      };
    case 'warehouse_mgr':
      return {
        dashboardView: true,
        packingView: true,
        packingEdit: true,
        inventoryView: true,
        inventoryEdit: true,
        oilcostView: false,
        oilcostEditMaster: false,
        oilcostCreateEditPI: false,
        oilcostOverrideFloor: false,
        canClearData: false,
        canManageAccess: false,
      };
    case 'viewer':
    default:
      return {
        dashboardView: true,
        packingView: true,
        packingEdit: false,
        inventoryView: true,
        inventoryEdit: false,
        oilcostView: true,
        oilcostEditMaster: false,
        oilcostCreateEditPI: false,
        oilcostOverrideFloor: false,
        canClearData: false,
        canManageAccess: false,
      };
  }
}

export const DEFAULT_FLOOR_PRICE_POLICY: FloorPricePolicy = {
  minFloorMarginPct: 5.0,
  enforceStrictFloor: true,
  showLandedBreakEvenToSales: true,
};

export const INITIAL_STAFF_DIRECTORY: StaffMemberAccess[] = [
  {
    id: emailToDocId('strangersyco@gmail.com'),
    email: 'strangersyco@gmail.com',
    name: 'Global Futura Super Admin',
    role: 'super_admin',
    department: 'Executive Management',
    title: 'Managing Director & Super Admin',
    responsibilities: DEFAULT_ROLE_RESPONSIBILITIES.super_admin,
    active: true,
    permissions: getPermissionsForRolePreset('super_admin'),
    updatedAt: '2026-11-03',
    updatedBy: 'System',
  },
  {
    id: emailToDocId('tajamul.sales@globaloils.us'),
    email: 'tajamul.sales@globaloils.us',
    name: 'Tajamul Sales',
    role: 'super_admin',
    department: 'Executive & Commercial',
    title: 'Head of Global Sales (Super Admin)',
    responsibilities: DEFAULT_ROLE_RESPONSIBILITIES.super_admin,
    active: true,
    permissions: getPermissionsForRolePreset('super_admin'),
    updatedAt: '2026-11-03',
    updatedBy: 'System',
  },
  {
    id: emailToDocId('sales.rep@globaloils.us'),
    email: 'sales.rep@globaloils.us',
    name: 'Aarav Sharma (Sales)',
    role: 'sales_exec',
    department: 'US & Canada Export Sales',
    title: 'Senior Sales Executive',
    responsibilities: DEFAULT_ROLE_RESPONSIBILITIES.sales_exec,
    active: true,
    permissions: getPermissionsForRolePreset('sales_exec'),
    updatedAt: '2026-11-03',
    updatedBy: 'Super Admin',
  },
  {
    id: emailToDocId('warehouse@globaloils.us'),
    email: 'warehouse@globaloils.us',
    name: 'Vikram Patel (Plant & Stock)',
    role: 'warehouse_mgr',
    department: 'India Processing & Warehouse',
    title: 'Packing & Inventory Manager',
    responsibilities: DEFAULT_ROLE_RESPONSIBILITIES.warehouse_mgr,
    active: true,
    permissions: getPermissionsForRolePreset('warehouse_mgr'),
    updatedAt: '2026-11-03',
    updatedBy: 'Super Admin',
  },
];

export function resolveEffectiveAccess(
  email: string,
  directory: StaffMemberAccess[]
): {
  role: StaffMemberAccess['role'];
  permissions: UserPermissions;
  staffRecord: StaffMemberAccess | null;
  isSuspended: boolean;
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  const matched = directory.find(m => m.email.trim().toLowerCase() === cleanEmail) || null;

  // Bootstrapped super admin emails can never lock themselves out of Super Admin access
  if (isBootstrappedSuperAdmin(cleanEmail)) {
    return {
      role: 'super_admin',
      permissions: getPermissionsForRolePreset('super_admin'),
      staffRecord: matched,
      isSuspended: false,
    };
  }

  if (matched) {
    if (!matched.active) {
      return {
        role: matched.role,
        permissions: {
          dashboardView: false,
          packingView: false,
          packingEdit: false,
          inventoryView: false,
          inventoryEdit: false,
          oilcostView: false,
          oilcostEditMaster: false,
          oilcostCreateEditPI: false,
          oilcostOverrideFloor: false,
          canClearData: false,
          canManageAccess: false,
        },
        staffRecord: matched,
        isSuspended: true,
      };
    }
    return {
      role: matched.role,
      permissions: {
        ...matched.permissions,
        ordersView: matched.permissions.ordersView ?? true,
        dispatchView: matched.permissions.dispatchView ?? true,
        mastersheetView: matched.permissions.mastersheetView ?? true,
      },
      staffRecord: matched,
      isSuspended: false,
    };
  }

  // Unlisted authenticated/switched users default to safe Read-Only Viewer until Super Admin grants edit rights
  return {
    role: 'viewer',
    permissions: getPermissionsForRolePreset('viewer'),
    staffRecord: null,
    isSuspended: false,
  };
}
