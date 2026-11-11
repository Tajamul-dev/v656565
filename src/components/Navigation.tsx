import React from 'react';
import { ModuleId, UserRole, UserPermissions } from '../types';
import {
  LayoutDashboard,
  ArrowLeft,
  Table2,
  Truck,
  FileSpreadsheet,
  PackageCheck,
  Boxes,
  Calculator,
  Camera,
  Upload,
  ChevronRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { SoundEngine } from '../utils/audio';

interface NavigationProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  orderCount: number;
  lowStockCount: number;
  openQuotesCount: number;
  dispatchCount?: number;
  userRole?: UserRole;
  visibleModules?: ModuleId[];
  onOpenScanner?: () => void;
  onOpenUniversalUpload?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeModule,
  onSelectModule,
  orderCount,
  lowStockCount,
  openQuotesCount,
  dispatchCount = 13,
  userRole = 'super_admin',
  visibleModules,
  onOpenScanner,
  onOpenUniversalUpload,
}) => {
  const isCommandCenter = activeModule === 'dashboard';

  const sheetDefinitions: Record<
    ModuleId,
    { label: string; sublabel: string; icon: React.ElementType; badge?: string }
  > = {
    dashboard: {
      label: 'Command Center',
      sublabel: 'Executive Operations Hub',
      icon: LayoutDashboard,
    },
    orders: {
      label: 'Order Dashboard',
      sublabel: 'Main Sheet & Party Drilldown',
      icon: Table2,
      badge: 'Interactive BOM',
    },
    dispatch: {
      label: 'Dispatches',
      sublabel: 'Container Logs & Quality',
      icon: Truck,
      badge: `${dispatchCount} Shipments`,
    },
    packing: {
      label: 'Packing Tracker',
      sublabel: 'Waterfall Order Fulfillment',
      icon: PackageCheck,
      badge: orderCount > 0 ? `${orderCount} Active` : undefined,
    },
    inventory: {
      label: 'Inventory Control',
      sublabel: 'Warehouse & Raw Materials',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
    },
    oilcost: {
      label: 'OilCost Pro',
      sublabel: userRole === 'operator' || userRole === 'viewer' ? '🔒 Restricted (Admin Only)' : 'Costing, Quotes & Reverse Engine',
      icon: Calculator,
      badge: userRole === 'operator' || userRole === 'viewer' ? '🔒 Admin Only' : openQuotesCount > 0 ? `${openQuotesCount} PIs` : undefined,
    },
    mastersheet: {
      label: 'Master Sheet',
      sublabel: 'Party-to-SKU Registry',
      icon: FileSpreadsheet,
      badge: 'May 2026',
    },
    access: {
      label: 'Access Control',
      sublabel: userRole === 'super_admin' ? 'Security & RBAC Governance' : '🔒 Super Admin Clearance Required',
      icon: ShieldCheck,
      badge: userRole === 'super_admin' ? '👑 Super Admin' : '🔒 Restricted',
    },
  };

  const currentSheet = sheetDefinitions[activeModule];
  const CurrentIcon = currentSheet.icon;

  const moduleVisible = (id: ModuleId) => !visibleModules || visibleModules.includes(id);
  const quickSheets: { id: ModuleId; label: string; badge?: string }[] = ([
    { id: 'orders', label: 'Order Dashboard', badge: 'Interactive BOM' },
    { id: 'dispatch', label: 'Dispatches', badge: `${dispatchCount} Shipments` },
    { id: 'packing', label: 'Packing Tracker', badge: `${orderCount} Active` },
    { id: 'inventory', label: 'Inventory Control', badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined },
    { id: 'oilcost', label: 'OilCost Pro', badge: userRole === 'operator' || userRole === 'viewer' ? '🔒 Admin Only' : `${openQuotesCount} PIs` },
    { id: 'mastersheet', label: 'Master Sheet', badge: 'May 2026' },
    { id: 'access', label: 'Access Control', badge: userRole === 'super_admin' ? '👑 Super Admin' : '🔒 Super Admin' },
  ] as { id: ModuleId; label: string; badge?: string }[]).filter(s => moduleVisible(s.id));

  return (
    <nav className="bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 transition-colors">
      <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
        {/* Left Side Navigation State */}
        <div className="flex items-center gap-3">
          {isCommandCenter ? (
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Executive Command Center
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Central Operation Hub
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select any operation sheet below to enter its workspace
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Back to Command Center Button */}
              <button
                onClick={() => {
                  SoundEngine.play('pop');
                  onSelectModule('dashboard');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 group cursor-pointer"
                title="Return to Command Center"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Command Center</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-3">
                <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <CurrentIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {currentSheet.label}
                    </span>
                    {currentSheet.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {currentSheet.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">{currentSheet.sublabel}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center / Right: Compact Sub-Sheet Switcher when inside a sheet */}
        {!isCommandCenter && (
          <div className="hidden xl:flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {quickSheets.map(s => {
              const isActive = activeModule === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    SoundEngine.play('tick');
                    onSelectModule(s.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-800'
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenScanner && (
            <button
              onClick={() => {
                SoundEngine.play('tick');
                onOpenScanner();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all shadow-xs active:scale-95"
              title="Scan physical invoice with camera"
            >
              <Camera className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Camera Scan</span>
            </button>
          )}

          {onOpenUniversalUpload && (
            <button
              onClick={() => {
                SoundEngine.play('tick');
                onOpenUniversalUpload();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-xs active:scale-95"
              title="Upload PDF, CSV or Excel files"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Upload PDF/XLS</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
