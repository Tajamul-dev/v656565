import React, { useState } from 'react';
import {
  FloorPricePolicy,
  StaffMemberAccess,
  User,
  UserPermissions,
} from '../types';
import {
  DEFAULT_ROLE_RESPONSIBILITIES,
  emailToDocId,
  getPermissionsForRolePreset,
  isBootstrappedSuperAdmin,
  ROLE_BADGE_STYLES,
  ROLE_LABELS,
} from '../utils/permissions';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Eye,
  Check,
  Lock,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { SoundEngine } from '../utils/audio';

interface AccessControlViewProps {
  currentUser: User;
  staffDirectory: StaffMemberAccess[];
  floorPolicy: FloorPricePolicy;
  previewingAsEmail: string | null;
  onSaveStaffDirectory: (next: StaffMemberAccess[]) => void;
  onUpdateFloorPolicy: (next: FloorPricePolicy) => void;
  onPreviewAsUser: (email: string | null) => void;
  onNotify: (msg: string) => void;
}

const PERMISSION_COLUMNS: Array<{
  key: keyof UserPermissions;
  group: string;
  label: string;
  desc: string;
}> = [
  {
    key: 'dashboardView',
    group: 'Command Center',
    label: 'View Dashboard',
    desc: 'Access Executive KPIs & alerts',
  },
  {
    key: 'packingView',
    group: 'Packing Tracker',
    label: 'View Packing',
    desc: 'View container orders & waterfall',
  },
  {
    key: 'packingEdit',
    group: 'Packing Tracker',
    label: 'Edit Packing & PDF',
    desc: 'Create/edit orders, update PM status & upload PDFs',
  },
  {
    key: 'inventoryView',
    group: 'Inventory Control',
    label: 'View Inventory',
    desc: 'View warehouse stock & packaging balances',
  },
  {
    key: 'inventoryEdit',
    group: 'Inventory Control',
    label: 'Edit Stock & PDF',
    desc: 'Add/edit stock, quick adjust & AI PDF upload',
  },
  {
    key: 'oilcostView',
    group: 'OilCost Pro',
    label: 'Access Pricing',
    desc: 'Open OilCost Pro & Proforma builder',
  },
  {
    key: 'oilcostCreateEditPI',
    group: 'OilCost Pro',
    label: 'Create / Print PIs',
    desc: 'Generate Proforma Invoices & negotiations',
  },
  {
    key: 'oilcostEditMaster',
    group: 'OilCost Pro',
    label: 'Edit Master Costs',
    desc: 'Edit bulk oil rates, freight, duties & SKU formulas',
  },
  {
    key: 'oilcostOverrideFloor',
    group: 'OilCost Pro',
    label: 'Sell Below Floor',
    desc: 'Authorize Proforma prices below Min Selling Price',
  },
  {
    key: 'canClearData',
    group: 'Admin',
    label: 'Clear Data',
    desc: 'Wipe workspace/preloaded records',
  },
  {
    key: 'canManageAccess',
    group: 'Admin',
    label: 'Manage Access',
    desc: 'Assign team roles & permissions',
  },
  {
    key: 'ordersView',
    group: 'Operations',
    label: 'Order Dashboard',
    desc: 'View the main production order matrix & party drilldowns',
  },
  {
    key: 'dispatchView',
    group: 'Operations',
    label: 'Dispatches',
    desc: 'View container dispatch logs & quality records',
  },
  {
    key: 'mastersheetView',
    group: 'Operations',
    label: 'Master Sheet',
    desc: 'View the party-to-SKU master registry',
  },
];

export const AccessControlView: React.FC<AccessControlViewProps> = ({
  currentUser,
  staffDirectory,
  floorPolicy,
  previewingAsEmail,
  onSaveStaffDirectory,
  onUpdateFloorPolicy,
  onPreviewAsUser,
  onNotify,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<StaffMemberAccess['role']>('sales_exec');
  const [newDepartment, setNewDepartment] = useState('Export Sales');
  const [newTitle, setNewTitle] = useState('Sales Executive');
  const [newResponsibilities, setNewResponsibilities] = useState(
    DEFAULT_ROLE_RESPONSIBILITIES.sales_exec
  );

  const handleRolePresetSelectForNew = (role: StaffMemberAccess['role']) => {
    setNewRole(role);
    setNewResponsibilities(DEFAULT_ROLE_RESPONSIBILITIES[role]);
    if (role === 'sales_exec') {
      setNewDepartment('Export Sales');
      setNewTitle('Sales Executive');
    } else if (role === 'warehouse_mgr') {
      setNewDepartment('Warehouse & Packaging');
      setNewTitle('Inventory & Packing Manager');
    } else if (role === 'admin') {
      setNewDepartment('Operations');
      setNewTitle('Operations Administrator');
    } else if (role === 'super_admin') {
      setNewDepartment('Executive Management');
      setNewTitle('Super Admin');
    } else {
      setNewDepartment('Audit & Accounts');
      setNewTitle('Read-Only Viewer');
    }
  };

  const handleAddStaffMember = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      onNotify('Please enter a valid staff email address.');
      return;
    }

    const exists = staffDirectory.some(m => m.email.trim().toLowerCase() === cleanEmail);
    if (exists) {
      onNotify(`User ${cleanEmail} already exists in the Access Directory.`);
      return;
    }

    const displayName =
      newName.trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    const newEntry: StaffMemberAccess = {
      id: emailToDocId(cleanEmail),
      email: cleanEmail,
      name: displayName,
      role: newRole,
      department: newDepartment.trim() || 'Operations',
      title: newTitle.trim() || ROLE_LABELS[newRole],
      responsibilities:
        newResponsibilities.trim() || DEFAULT_ROLE_RESPONSIBILITIES[newRole],
      active: true,
      permissions: getPermissionsForRolePreset(newRole),
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: currentUser.email,
    };

    SoundEngine.play('success');
    onSaveStaffDirectory([newEntry, ...staffDirectory]);
    setNewEmail('');
    setNewName('');
    onNotify(`Added ${displayName} (${ROLE_LABELS[newRole]}) to Access Control.`);
  };

  const handleChangeMemberRole = (id: string, nextRole: StaffMemberAccess['role']) => {
    SoundEngine.play('tick');
    const updated = staffDirectory.map(member => {
      if (member.id !== id) return member;
      if (isBootstrappedSuperAdmin(member.email)) return member;
      return {
        ...member,
        role: nextRole,
        permissions: getPermissionsForRolePreset(nextRole),
        responsibilities:
          member.responsibilities === DEFAULT_ROLE_RESPONSIBILITIES[member.role]
            ? DEFAULT_ROLE_RESPONSIBILITIES[nextRole]
            : member.responsibilities,
        updatedAt: new Date().toISOString().split('T')[0],
        updatedBy: currentUser.email,
      };
    });
    onSaveStaffDirectory(updated);
  };

  const handleTogglePermission = (id: string, permKey: keyof UserPermissions) => {
    SoundEngine.play('tick');
    const updated = staffDirectory.map(member => {
      if (member.id !== id) return member;
      if (isBootstrappedSuperAdmin(member.email)) return member;

      const nextPerms = {
        ...member.permissions,
        [permKey]: !member.permissions[permKey],
      };

      // Keep logical dependencies consistent: if Edit is turned ON, automatically enable View
      if (permKey === 'packingEdit' && nextPerms.packingEdit) nextPerms.packingView = true;
      if (permKey === 'packingView' && !nextPerms.packingView) nextPerms.packingEdit = false;

      if (permKey === 'inventoryEdit' && nextPerms.inventoryEdit) nextPerms.inventoryView = true;
      if (permKey === 'inventoryView' && !nextPerms.inventoryView) nextPerms.inventoryEdit = false;

      if (
        (permKey === 'oilcostCreateEditPI' ||
          permKey === 'oilcostEditMaster' ||
          permKey === 'oilcostOverrideFloor') &&
        nextPerms[permKey]
      ) {
        nextPerms.oilcostView = true;
      }
      if (permKey === 'oilcostView' && !nextPerms.oilcostView) {
        nextPerms.oilcostCreateEditPI = false;
        nextPerms.oilcostEditMaster = false;
        nextPerms.oilcostOverrideFloor = false;
      }

      return {
        ...member,
        permissions: nextPerms,
        updatedAt: new Date().toISOString().split('T')[0],
        updatedBy: currentUser.email,
      };
    });
    onSaveStaffDirectory(updated);
  };

  // ---- Bulk permission helpers (per member) ----
  const bulkSetPermissions = (
    id: string,
    perms: Partial<UserPermissions>
  ) => {
    SoundEngine.play('pop');
    const updated = staffDirectory.map(member => {
      if (member.id !== id) return member;
      if (isBootstrappedSuperAdmin(member.email)) return member;
      return { ...member, permissions: { ...member.permissions, ...perms } };
    });
    onSaveStaffDirectory(updated);
  };

  const handleSelectAllPermissions = (id: string) => {
    const all: Partial<UserPermissions> = {};
    PERMISSION_COLUMNS.forEach(c => {
      (all as Record<string, boolean>)[c.key] = true;
    });
    bulkSetPermissions(id, all);
  };

  const handleClearAllPermissions = (id: string) => {
    const none: Partial<UserPermissions> = {};
    PERMISSION_COLUMNS.forEach(c => {
      (none as Record<string, boolean>)[c.key] = false;
    });
    bulkSetPermissions(id, none);
  };

  const handleCopyPermissions = (targetId: string, sourceId: string) => {
    const source = staffDirectory.find(m => m.id === sourceId);
    if (!source) return;
    bulkSetPermissions(targetId, source.permissions);
  };

  const handleUpdateField = (
    id: string,
    patch: Partial<Pick<StaffMemberAccess, 'name' | 'title' | 'department' | 'responsibilities' | 'active'>>
  ) => {
    const updated = staffDirectory.map(member => {
      if (member.id !== id) return member;
      if (isBootstrappedSuperAdmin(member.email) && patch.active === false) return member;
      return {
        ...member,
        ...patch,
        updatedAt: new Date().toISOString().split('T')[0],
        updatedBy: currentUser.email,
      };
    });
    onSaveStaffDirectory(updated);
  };

  const handleDeleteMember = (member: StaffMemberAccess) => {
    if (isBootstrappedSuperAdmin(member.email)) {
      onNotify('Primary Super Admin accounts cannot be deleted.');
      return;
    }
    SoundEngine.play('thud');
    if (previewingAsEmail === member.email) {
      onPreviewAsUser(null);
    }
    onSaveStaffDirectory(staffDirectory.filter(m => m.id !== member.id));
    onNotify(`Removed ${member.name} (${member.email}) from Access Control.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Banner */}
      <div className="rounded-2xl bg-slate-900 text-white p-6 border border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin Governance &amp; RBAC</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Team Access Roles, Responsibilities &amp; Floor Pricing Rules
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Assign exact roles and responsibilities to sales executives, warehouse managers, and operations staff. Control who can view or edit each module, lock master costing formulas, and enforce minimum selling prices on Proforma Invoices.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
            <div className="text-[10px] font-bold uppercase text-slate-400">Team Members</div>
            <div className="text-xl font-black font-mono tabular-nums text-amber-400">
              {staffDirectory.length}
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
            <div className="text-[10px] font-bold uppercase text-slate-400">Sales Min Floor</div>
            <div className="text-xl font-black font-mono tabular-nums text-emerald-400">
              +{floorPolicy.minFloorMarginPct}%
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Setup Row: 1) Floor Price Policy, 2) Assign New Team Member */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Global Sales Floor Price Policy */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Sales Floor Price &amp; Guardrail Policy
              </h3>
              <p className="text-[11px] text-slate-500">
                Controls the Minimum Selling Price shown in the Proforma Invoice side panel
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  Minimum Allowed Sales Margin (%)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Floor Price = Landed Break-Even Cost × (1 + Min Margin %)
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={100}
                  value={floorPolicy.minFloorMarginPct}
                  onChange={e =>
                    onUpdateFloorPolicy({
                      ...floorPolicy,
                      minFloorMarginPct: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-20 px-2.5 py-1.5 text-right font-mono font-black text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
            </div>

            <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  Enforce Strict Floor Lock on Proforma Invoices
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Blocks sales staff (without &ldquo;Sell Below Floor&rdquo; permission) from saving, printing, or exporting a Proforma Invoice if any item is priced below Minimum Selling Price.
                </div>
              </div>
              <input
                type="checkbox"
                checked={floorPolicy.enforceStrictFloor}
                onChange={e =>
                  onUpdateFloorPolicy({
                    ...floorPolicy,
                    enforceStrictFloor: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-indigo-600 mt-0.5 shrink-0"
              />
            </label>

            <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  Show Raw 0% Break-Even Cost to Sales Team
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  If unchecked, salespeople only see their Authorized Minimum Selling Price and Target Price (hiding raw factory break-even cost).
                </div>
              </div>
              <input
                type="checkbox"
                checked={floorPolicy.showLandedBreakEvenToSales}
                onChange={e =>
                  onUpdateFloorPolicy({
                    ...floorPolicy,
                    showLandedBreakEvenToSales: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-indigo-600 mt-0.5 shrink-0"
              />
            </label>
          </div>
        </div>

        {/* Add / Assign New Team Member */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Assign Access Role &amp; Responsibilities to Team Member
              </h3>
              <p className="text-[11px] text-slate-500">
                Add staff by Google / operator email — permissions apply immediately upon sign-in or profile switch
              </p>
            </div>
          </div>

          <form onSubmit={handleAddStaffMember} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Staff Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. rohan.sales@globaloils.us"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Rohan Verma"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Role Preset *
                </label>
                <select
                  value={newRole}
                  onChange={e =>
                    handleRolePresetSelectForNew(e.target.value as StaffMemberAccess['role'])
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="sales_exec">Sales Executive (PIs + Floor Locked)</option>
                  <option value="warehouse_mgr">Warehouse &amp; Packing Manager</option>
                  <option value="admin">Operations Admin</option>
                  <option value="viewer">Read-Only Viewer / Auditor</option>
                  <option value="super_admin">Super Admin (Full Control)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={e => setNewDepartment(e.target.value)}
                  placeholder="e.g. North America Export Sales"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Designation / Job Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Regional Sales Executive"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Assigned Responsibilities &amp; Operational Scope
              </label>
              <textarea
                rows={2}
                value={newResponsibilities}
                onChange={e => setNewResponsibilities(e.target.value)}
                placeholder="Describe what this team member is responsible for..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Assign Role &amp; Add Member</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Full Granular Access & Edit Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Granular Module Access &amp; Edit Permissions Matrix ({staffDirectory.length} Users)
              </h3>
              <p className="text-[11px] text-slate-500">
                Toggle exact View and Edit rights per person, edit their responsibilities inline, or click &ldquo;Test View&rdquo; to preview their exact workspace experience.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {staffDirectory.map(member => {
            const lockedSuper = isBootstrappedSuperAdmin(member.email);
            const isPreviewingThis =
              previewingAsEmail &&
              previewingAsEmail.trim().toLowerCase() === member.email.trim().toLowerCase();

            return (
              <div
                key={member.id}
                className={`p-4 space-y-3 transition-colors ${
                  !member.active
                    ? 'opacity-60 bg-slate-50 dark:bg-slate-950/50'
                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/25'
                }`}
              >
                {/* Top Row: Identity, Role Selector, Responsibilities, Actions */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-[260px]">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {member.name
                        .split(' ')
                        .map(w => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={member.name}
                          onChange={e => handleUpdateField(member.id, { name: e.target.value })}
                          className="font-black text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                        />
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase ${
                            ROLE_BADGE_STYLES[member.role]
                          }`}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                        {lockedSuper && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600 text-white text-[9.5px] font-black uppercase">
                            <Lock className="w-2.5 h-2.5" /> Primary Owner
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-mono text-slate-500">{member.email}</div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <input
                          type="text"
                          value={member.title}
                          onChange={e => handleUpdateField(member.id, { title: e.target.value })}
                          placeholder="Job Title"
                          className="px-2 py-0.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                        />
                        <span className="text-slate-300">·</span>
                        <input
                          type="text"
                          value={member.department}
                          onChange={e =>
                            handleUpdateField(member.id, { department: e.target.value })
                          }
                          placeholder="Department"
                          className="px-2 py-0.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assigned Responsibilities Input */}
                  <div className="flex-1 max-w-xl">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Assigned Responsibilities &amp; Duties
                    </label>
                    <textarea
                      rows={2}
                      value={member.responsibilities}
                      onChange={e =>
                        handleUpdateField(member.id, { responsibilities: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Role Preset + Status + Test As User + Delete */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      disabled={lockedSuper}
                      value={member.role}
                      onChange={e =>
                        handleChangeMemberRole(
                          member.id,
                          e.target.value as StaffMemberAccess['role']
                        )
                      }
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
                      title="Apply Role Preset"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Operations Admin</option>
                      <option value="sales_exec">Sales Executive</option>
                      <option value="warehouse_mgr">Warehouse &amp; Packing Mgr</option>
                      <option value="viewer">Read-Only Viewer</option>
                    </select>

                    {!lockedSuper && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateField(member.id, { active: !member.active })
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                          member.active
                            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {member.active ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Suspended
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.play('pop');
                        onPreviewAsUser(isPreviewingThis ? null : member.email);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                        isPreviewingThis
                          ? 'bg-amber-500 border-amber-500 text-slate-950'
                          : 'border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                      }`}
                      title="Simulate ERP interface as this user to verify their exact access & edit rights"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isPreviewingThis ? 'Exit Test' : 'Test View'}</span>
                    </button>

                    {!lockedSuper && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove staff member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Granular Access & Edit Checkboxes */}
                {!lockedSuper && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Bulk:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllPermissions(member.id)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearAllPermissions(member.id)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Clear All
                    </button>
                    <select
                      value=""
                      onChange={e => {
                        if (e.target.value) handleCopyPermissions(member.id, e.target.value);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300"
                    >
                      <option value="">Copy from…</option>
                      {staffDirectory
                        .filter(m => m.id !== member.id)
                        .map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.email}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {PERMISSION_COLUMNS.map(col => {
                    const enabled = member.permissions[col.key];
                    return (
                      <button
                        key={col.key}
                        type="button"
                        disabled={lockedSuper}
                        onClick={() => handleTogglePermission(member.id, col.key)}
                        title={col.desc}
                        className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between gap-1 ${
                          enabled
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                        } ${lockedSuper ? 'cursor-default' : 'cursor-pointer hover:border-blue-400'}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-black uppercase tracking-wider opacity-75 truncate">
                            {col.group}
                          </span>
                          <span
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                              enabled
                                ? 'bg-emerald-600 text-white'
                                : 'border border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {enabled && <Check className="w-2.5 h-2.5" />}
                          </span>
                        </div>
                        <div className="text-[10.5px] font-bold leading-tight">{col.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
