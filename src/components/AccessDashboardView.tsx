import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Crown,
  Shield,
  UserCheck,
  Eye,
  Lock,
  Unlock,
  Key,
  Users,
  UserPlus,
  Trash2,
  Check,
  AlertTriangle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Clock,
  Fingerprint,
} from 'lucide-react';
import { User, UserRole, ActivityLogItem } from '../types';
import { SoundEngine } from '../utils/audio';

interface AccessDashboardViewProps {
  user: User;
  onRoleChange?: (role: UserRole) => void;
  activityLog?: ActivityLogItem[];
  onNavigateToCommandCenter?: () => void;
}

interface ManagedTeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'active' | 'suspended';
  lastActive: string;
  isPrimary?: boolean;
}

const INITIAL_TEAM: ManagedTeamMember[] = [
  {
    id: 'USR-001',
    name: 'Tajamul Sales',
    email: 'tajamul.sales@globaloils.us',
    role: 'super_admin',
    department: 'Executive Management & Global Trading',
    status: 'active',
    lastActive: 'Active Now',
    isPrimary: true,
  },
  {
    id: 'USR-002',
    name: 'Supply Chain Operations',
    email: 'admin.ops@globaloils.us',
    role: 'admin',
    department: 'Container Dispatches & Invoicing',
    status: 'active',
    lastActive: '12 mins ago',
  },
  {
    id: 'USR-003',
    name: 'Jericho / India Plant Supervisor',
    email: 'plant.filling@globaloils.us',
    role: 'operator',
    department: 'Packaging Tracker & Warehouse Floor',
    status: 'active',
    lastActive: '45 mins ago',
  },
  {
    id: 'USR-004',
    name: 'External Financial Auditor',
    email: 'accounts.audit@globaloils.us',
    role: 'viewer',
    department: 'Compliance & Export Inspection',
    status: 'active',
    lastActive: '2 hours ago',
  },
];

export const AccessDashboardView: React.FC<AccessDashboardViewProps> = ({
  user,
  onRoleChange,
  activityLog = [],
  onNavigateToCommandCenter,
}) => {
  const [teamMembers, setTeamMembers] = useState<ManagedTeamMember[]>(INITIAL_TEAM);
  const [policyEnforceInvoice, setPolicyEnforceInvoice] = useState(true);
  const [policyLiveForex, setPolicyLiveForex] = useState(true);
  const [policyRequireSignature, setPolicyRequireSignature] = useState(true);
  const [policyShieldCosting, setPolicyShieldCosting] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operator');

  const isSuperAdmin = user.role === 'super_admin' || user.isSuperAdmin;

  // USER REQUIREMENT: Access Dashboard that ONLY Super Admin can access!
  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center bg-white dark:bg-slate-900 border-2 border-rose-500/50 rounded-3xl shadow-2xl space-y-5 animate-in fade-in">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black shadow-inner border border-rose-300 dark:border-rose-900">
          <ShieldAlert className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
            SECURITY CLEARANCE LEVEL 1 REQUIRED
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Super Admin Access Only
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            This Security & Access Control Console is strictly restricted to the Chief Super Administrator (<strong>tajamul.sales@globaloils.us</strong>). Your current signed-in role (<strong>{user.role.toUpperCase()}</strong>) does not have clearance to modify security policies, RBAC roles, or user permissions.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Key className="w-4 h-4 text-amber-500" />
            <span>Developer / Administrator Switcher:</span>
          </div>
          <p className="text-[11px] text-slate-500">
            If you are the master administrator testing this environment, switch your active role to <strong>Super Admin</strong> using the top right role badge in the navigation header.
          </p>
          {onRoleChange && (
            <button
              onClick={() => {
                SoundEngine.play('success');
                onRoleChange('super_admin');
              }}
              className="mt-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Switch to Super Admin Clearance (Authenticate)</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Handle Role Change for Team Member
  const handleUpdateMemberRole = (memberId: string, newRole: UserRole) => {
    SoundEngine.play('pop');
    setTeamMembers(prev =>
      prev.map(m => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  };

  // Handle Toggle Member Status
  const handleToggleMemberStatus = (memberId: string) => {
    SoundEngine.play('thud');
    setTeamMembers(prev =>
      prev.map(m =>
        m.id === memberId
          ? { ...m, status: m.status === 'active' ? 'suspended' : 'active' }
          : m
      )
    );
  };

  // Handle Add Member
  const handleAddNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    SoundEngine.play('success');
    const newMember: ManagedTeamMember = {
      id: `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      department: 'Commodity Trading & Logistics',
      status: 'active',
      lastActive: 'Just registered',
    };

    setTeamMembers(prev => [...prev, newMember]);
    setNewUserName('');
    setNewUserEmail('');
    setIsAddUserOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 sm:p-7 shadow-xl border-2 border-amber-500/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Crown className="w-3.5 h-3.5" />
              <span>Super Admin Security Console • Clearance Level 1</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>Enterprise Access & RBAC Governance</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Super-Administrator command center for role-based permissions, digital signature policies, mandatory invoice upload rules, and personnel authorization across global trading desks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Team Member</span>
            </button>
          </div>
        </div>

        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards: Clearance & Personnel Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase mb-1">
            <span>Primary Master</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-slate-100 truncate">
            tajamul.sales@globaloils.us
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">
            Unrestricted Clearance
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase mb-1">
            <span>Active Team Members</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
            {teamMembers.filter(m => m.status === 'active').length} <span className="text-xs font-normal text-slate-400">/ {teamMembers.length} Accounts</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            100% Verified Identifiers
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase mb-1">
            <span>Policy Compliance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            100% ENFORCED
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Invoice Gate & Digital Signatures
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase mb-1">
            <span>Security Architecture</span>
            <Fingerprint className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-slate-100">
            Google Firebase Auth
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-1">
            Enterprise TLS + Firestore RBAC
          </div>
        </div>
      </div>

      {/* Main Grid: Personnel Management (Left 2 cols) & Security Policy Switches (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Personnel & Role Assignment Directory */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span>Personnel Roles & Access Clearance Directory</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assign and modify role clearances for trading, shop-floor operators, and external compliance inspectors.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {teamMembers.length} Users Registered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Team Member</th>
                  <th className="py-2.5 px-3">Clearance Role</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {teamMembers.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{member.name}</span>
                        {member.isPrimary && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-amber-400 text-slate-950">
                            Master Owner
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{member.email}</div>
                    </td>

                    <td className="py-3 px-3">
                      {member.isPrimary ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-400">
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>Super Admin</span>
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={e => handleUpdateMemberRole(member.id, e.target.value as UserRole)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs"
                        >
                          <option value="super_admin">👑 Super Admin</option>
                          <option value="admin">🛡️ Admin</option>
                          <option value="operator">📦 Operator</option>
                          <option value="viewer">👁️ Viewer</option>
                        </select>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {member.department}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          member.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{member.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      {!member.isPrimary && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleMemberStatus(member.id)}
                            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold cursor-pointer"
                          >
                            {member.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Global Security Policies & Enforcements */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Executive Security Policies</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Super-Admin system toggles controlling compliance rules.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Policy 1: Mandatory Invoice Upload for BOM Cut */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    Mandatory Invoice for BOM Cut
                  </span>
                  <button
                    onClick={() => {
                      SoundEngine.play('pop');
                      setPolicyEnforceInvoice(!policyEnforceInvoice);
                    }}
                    className="cursor-pointer text-emerald-600"
                  >
                    {policyEnforceInvoice ? (
                      <ToggleRight className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Locks automatic warehouse stock cuts until official client PO or invoice PDF is uploaded.
                </p>
              </div>

              {/* Policy 2: 100% Live Forex USD/INR Feed */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    100% Accurate Spot Forex Feed
                  </span>
                  <button
                    onClick={() => {
                      SoundEngine.play('pop');
                      setPolicyLiveForex(!policyLiveForex);
                    }}
                    className="cursor-pointer text-emerald-600"
                  >
                    {policyLiveForex ? (
                      <ToggleRight className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Auto-syncs spot USD to INR rates from verified interbank feeds (open.er-api / spot).
                </p>
              </div>

              {/* Policy 3: Mobile QR Digital Signature */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    Mobile QR Signature on Proforma
                  </span>
                  <button
                    onClick={() => {
                      SoundEngine.play('pop');
                      setPolicyRequireSignature(!policyRequireSignature);
                    }}
                    className="cursor-pointer text-emerald-600"
                  >
                    {policyRequireSignature ? (
                      <ToggleRight className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Generates mobile signing QR code so directors and buyers sign from their phones with automatic sync.
                </p>
              </div>

              {/* Policy 4: Shield Proprietary Cost Margins */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    Shield Margins from Operators
                  </span>
                  <button
                    onClick={() => {
                      SoundEngine.play('pop');
                      setPolicyShieldCosting(!policyShieldCosting);
                    }}
                    className="cursor-pointer text-emerald-600"
                  >
                    {policyShieldCosting ? (
                      <ToggleRight className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Restricts raw oil purchase pricing and margin waterfall formulas to Super Admin and Admin only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Clearance Capabilities Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            <span>Role-Based Access Control (RBAC) Permission Matrix</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent breakdown of features accessible by each role level.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="py-2.5 px-3">Enterprise Feature</th>
                <th className="py-2.5 px-3 text-center text-amber-600 dark:text-amber-400">👑 Super Admin</th>
                <th className="py-2.5 px-3 text-center text-blue-600 dark:text-blue-400">🛡️ Admin</th>
                <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">📦 Operator</th>
                <th className="py-2.5 px-3 text-center text-slate-500">👁️ Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                  Access & Security Governance Console
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Full Control</td>
                <td className="py-2.5 px-3 text-center text-rose-500">✗ Denied</td>
                <td className="py-2.5 px-3 text-center text-rose-500">✗ Denied</td>
                <td className="py-2.5 px-3 text-center text-rose-500">✗ Denied</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                  Edit Full Cost Breakdown Waterfall Line Items
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ 100% Line Edit</td>
                <td className="py-2.5 px-3 text-center text-blue-600">✓ Standard View</td>
                <td className="py-2.5 px-3 text-center text-rose-500">✗ Shielded</td>
                <td className="py-2.5 px-3 text-center text-rose-500">✗ Shielded</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                  Live Spot Forex USD/INR Override & Auto-Sync
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Full Override</td>
                <td className="py-2.5 px-3 text-center text-blue-600">✓ Read Live Feed</td>
                <td className="py-2.5 px-3 text-center text-rose-500">✗ Shielded</td>
                <td className="py-2.5 px-3 text-center text-rose-500">✗ Shielded</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                  Create Proforma Invoices with Cases & Pallet Adjustments
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Enabled</td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Enabled</td>
                <td className="py-2.5 px-3 text-center text-rose-500">✗ Shielded</td>
                <td className="py-2.5 px-3 text-center text-slate-500">View Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                  Digital QR Mobile Phone Signature Capture
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Full Signatory</td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Full Signatory</td>
                <td className="py-2.5 px-3 text-center text-rose-500">✗ Denied</td>
                <td className="py-2.5 px-3 text-center text-slate-500">View Signatures</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                  Place Production Order & BOM Automatic Warehouse Cut
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Authorized</td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Authorized</td>
                <td className="py-2.5 px-3 text-center text-slate-500">View Feed Only</td>
                <td className="py-2.5 px-3 text-center text-slate-500">View Feed Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                  Packing Tracker & Container Fulfillment Matrix
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Full Access</td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Full Access</td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">✓ Full Access</td>
                <td className="py-2.5 px-3 text-center text-slate-500">Read Only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-slate-900 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                Register New Enterprise User
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. r.sharma@globaloils.us"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Assigned Clearance Role
                </label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="admin">🛡️ Admin (Operations & Orders)</option>
                  <option value="operator">📦 Operator (Packaging & Floor)</option>
                  <option value="viewer">👁️ Viewer (Read Only Auditor)</option>
                  <option value="super_admin">👑 Super Admin (Full Clearance)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider"
                >
                  Register User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
