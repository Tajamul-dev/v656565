import React, { useMemo } from 'react';
import {
  ModuleId,
  PackingOrder,
  InventoryItem,
  SavedProformaInvoice,
  NegotiationRecord,
  ActivityLogItem,
  User,
  OrderRecord,
  DispatchRecord,
  MasterSheetItem,
  OrderDeductionRecord,
} from '../types';
import {
  TrendingUp,
  PackageCheck,
  Boxes,
  Calculator,
  ArrowRight,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  FileText,
  DollarSign,
  Sparkles,
  Camera,
  Table2,
  Truck,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  CheckCircle2,
  Layers,
  PackagePlus,
  ShieldAlert,
  Flame,
  LogOut,
} from 'lucide-react';
import { SoundEngine } from '../utils/audio';
import { fmtStr } from '../utils/calculations';

interface DashboardViewProps {
  user: User;
  onNavigate: (module: ModuleId) => void;
  orders: PackingOrder[];
  inventory: InventoryItem[];
  savedPIs: SavedProformaInvoice[];
  negotiations: NegotiationRecord[];
  activityLog: ActivityLogItem[];
  prodOrders?: OrderRecord[];
  dispatches?: DispatchRecord[];
  masterItems?: MasterSheetItem[];
  deductionsHistory?: OrderDeductionRecord[];
  isFirebaseUser?: boolean;
  onGoogleLogin?: () => void;
  onLogout?: () => void;
  onSelectParty?: (party: { code: string; name: string }) => void;
  onOpenQuickQuote: () => void;
  onOpenNewOrder: () => void;
  onOpenNewInventory: () => void;
  onOpenScanBill: () => void;
  onOpenPlaceOrderModal?: () => void;
  onQuickAdjustInventory: (id: string, delta: number) => void;
  visibleModules?: ModuleId[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onNavigate,
  orders,
  inventory,
  savedPIs,
  negotiations,
  activityLog,
  prodOrders = [],
  dispatches = [],
  masterItems = [],
  deductionsHistory = [],
  isFirebaseUser = false,
  onGoogleLogin,
  onLogout,
  onSelectParty,
  onOpenQuickQuote,
  onOpenNewOrder,
  onOpenNewInventory,
  onOpenScanBill,
  onOpenPlaceOrderModal,
  visibleModules,
  onQuickAdjustInventory,
}) => {
  const activeOrders = orders.filter(o => !o.archived);
  const urgentOrders = activeOrders.filter(o => o.priority === 'urgent');

  // Red stocks: items below minimum or zero/depleted
  const redStockItems = inventory.filter(i => i.quantity <= i.minLevel || i.quantity <= 0);
  const totalInventoryValINR = inventory.reduce((sum, item) => sum + item.quantity * item.cost, 0);

  const totalQuotedUSD = savedPIs.reduce((sum, pi) => sum + (pi.totalUSD || 0), 0);
  const totalQuotedINR = savedPIs.reduce((sum, pi) => sum + (pi.totalINR || 0), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Calculate distinct party list from production orders
  const partyList = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; totalPlanCs: number; totalKg: number; orderCount: number; hasShortage: boolean }
    >();

    prodOrders.forEach(o => {
      const existing = map.get(o.partyCode);
      const orderShortage = o.bom.some(b => b.shortExcess < 0);
      if (existing) {
        existing.totalPlanCs += o.planCs;
        existing.totalKg += o.planKg;
        existing.orderCount += 1;
        if (orderShortage) existing.hasShortage = true;
      } else {
        map.set(o.partyCode, {
          code: o.partyCode,
          name: o.partyName,
          totalPlanCs: o.planCs,
          totalKg: o.planKg,
          orderCount: 1,
          hasShortage: orderShortage,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.code.replace(/\D/g, '')) || 999;
      const numB = parseInt(b.code.replace(/\D/g, '')) || 999;
      return numA - numB;
    });
  }, [prodOrders]);

  // Operational Control Sheets definitions with user's exact requested badges
  const operationSheets: {
    id: ModuleId;
    title: string;
    badge: string;
    badgeColor: string;
    desc: string;
    stat: string;
    icon: React.ElementType;
    accent: string;
    borderAccent: string;
  }[] = [
    {
      id: 'orders',
      title: 'Order Dashboard',
      badge: 'Interactive BOM',
      badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800',
      desc: 'Master production matrix, SKU plans, filling progress, party drilldowns & live BOM calculations.',
      stat: `${prodOrders.length} Production Orders • ${prodOrders.reduce((a, b) => a + b.planCs, 0).toLocaleString()} Cases`,
      icon: Table2,
      accent: 'from-amber-500/10 to-orange-500/5 hover:from-amber-500/20',
      borderAccent: 'border-amber-400 dark:border-amber-600',
    },
    {
      id: 'dispatch',
      title: 'Dispatches',
      badge: `${dispatches.length > 0 ? dispatches.length : 13} Shipments`,
      badgeColor: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border-blue-300 dark:border-blue-800',
      desc: 'Export containers, invoice numbers, batch tracking, lab analysis & destination port logs.',
      stat: `${dispatches.length} Export Invoices • ${dispatches.reduce((a, b) => a + b.dispatchCs, 0).toLocaleString()} Cases Dispatched`,
      icon: Truck,
      accent: 'from-blue-500/10 to-indigo-500/5 hover:from-blue-500/20',
      borderAccent: 'border-blue-400 dark:border-blue-600',
    },
    {
      id: 'packing',
      title: 'Packing Tracker',
      badge: `${activeOrders.length > 0 ? activeOrders.length : 4} Active`,
      badgeColor: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
      desc: '8 packaging materials waterfall pipeline (Bottles, Caps, Labels, Sleeves, Cartons, Spouts, Inks).',
      stat: `${activeOrders.length} Active Containers • Material Stage Waterfall`,
      icon: PackageCheck,
      accent: 'from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/20',
      borderAccent: 'border-emerald-400 dark:border-emerald-600',
    },
    {
      id: 'inventory',
      title: 'Inventory Control',
      badge: redStockItems.length > 0 ? `${redStockItems.length} Low` : 'Healthy',
      badgeColor: redStockItems.length > 0
        ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-800'
        : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 border-teal-300 dark:border-teal-800',
      desc: 'Raw materials & packaging stock levels, minimum reorder thresholds & warehouse adjustments.',
      stat: `${inventory.length} Stock SKUs • ₹${fmtStr(totalInventoryValINR / 100000)} L Warehouse Valuation`,
      icon: Boxes,
      accent: 'from-teal-500/10 to-cyan-500/5 hover:from-teal-500/20',
      borderAccent: 'border-teal-400 dark:border-teal-600',
    },
    {
      id: 'oilcost',
      title: 'OilCost Pro',
      badge: `${savedPIs.length > 0 ? savedPIs.length : 1} PIs`,
      badgeColor: 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-800',
      desc: 'Forward & reverse costing, editable quoted prices, official Proforma Invoices & margin analysis.',
      stat: `${savedPIs.length} Issued Proformas • $${fmtStr(totalQuotedUSD)} Quoted Total`,
      icon: Calculator,
      accent: 'from-purple-500/10 to-pink-500/5 hover:from-purple-500/20',
      borderAccent: 'border-purple-400 dark:border-purple-600',
    },
    {
      id: 'mastersheet',
      title: 'Master Sheet',
      badge: 'May 2026',
      badgeColor: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800',
      desc: 'Party-to-SKU master registry, approved configurations, MRPs, pallet sizing & bulk export to XLS/CSV.',
      stat: `${masterItems.length} Master SKUs • Authentic May 2026 Registry`,
      icon: FileSpreadsheet,
      accent: 'from-indigo-500/10 to-violet-500/5 hover:from-indigo-500/20',
      borderAccent: 'border-indigo-400 dark:border-indigo-600',
    },
    {
      id: 'access',
      title: 'Access Control',
      badge: user.role === 'super_admin' || user.isSuperAdmin ? '👑 Super Admin' : '🔒 Restricted',
      badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800',
      desc: 'Super-Administrator security console, personnel RBAC directory, policy enforcements & digital signature audit.',
      stat: 'Security Clearance Level 1 • Strict Super Admin Protection',
      icon: ShieldCheck,
      accent: 'from-amber-500/10 to-yellow-500/5 hover:from-amber-500/20',
      borderAccent: 'border-amber-400 dark:border-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Global Futura Inc. • Executive Command Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {greeting}, <span className="text-amber-400">{user.name.split(' ')[0]}</span>
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Unified enterprise headquarters for edible oils, honey, and commodities operations across Jericho, NY and Indian processing facilities. Select any operational dashboard below to enter its workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isFirebaseUser ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Firebase Synced</span>
                </span>
                {onLogout && (
                  <button
                    onClick={() => {
                      SoundEngine.play('thud');
                      onLogout();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                    title="Log out of Google Firebase account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            ) : (
              onGoogleLogin && (
                <button
                  onClick={() => {
                    SoundEngine.play('pop');
                    onGoogleLogin();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-amber-100 font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border border-amber-300"
                  title="Sign in with Google Firebase"
                >
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>🔥 Sign In with Firebase</span>
                </button>
              )
            )}
            <button
              onClick={() => {
                SoundEngine.play('pop');
                onOpenScanBill();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Bill with AI</span>
            </button>
            <button
              onClick={() => {
                SoundEngine.play('pop');
                onNavigate('oilcost');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>Costing Engine</span>
            </button>
          </div>
        </div>

        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* USER REQUESTED: LIVE ORDER PLACEMENT & AUTOMATIC INVENTORY DEDUCTIONS HIGHLIGHT SECTION */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-purple-500/15 border-2 border-amber-500/50 dark:border-amber-500/40 p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-xs">
              <Sparkles className="w-3 h-3" />
              <span>Live Automatic Material Deductions</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-amber-500" />
              Order Placement & Warehouse Stock Cut Engine
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
              Placing any order automatically calculates the exact Bill of Materials (BOM) and cuts bottles, caps, cartons, labels, and bulk raw materials directly from warehouse stock. Scan supplier bills or PDFs to restock in 1 click.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                SoundEngine.play('pop');
                if (onOpenPlaceOrderModal) onOpenPlaceOrderModal();
                else onOpenNewOrder();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ Place Order (Auto-Deduct Stock)</span>
            </button>
            <button
              onClick={() => {
                SoundEngine.play('pop');
                onOpenScanBill();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Bill / PDF to Restock</span>
            </button>
          </div>
        </div>

        {/* Highlight Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Active Booked Orders</span>
              <div className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                {prodOrders.length} <span className="text-xs font-normal">Production Orders</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              {prodOrders.reduce((a, b) => a + b.planCs, 0).toLocaleString()} Cs
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Live Inventory SKUs</span>
              <div className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                {inventory.length} <span className="text-xs font-normal">Tracked Materials</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
              ₹{fmtStr(totalInventoryValINR / 100000)} L
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Warehouse Safety Status</span>
              <div className="text-base font-black font-mono mt-0.5">
                {redStockItems.length > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> {redStockItems.length} Materials On Red
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> 100% Sufficient Stock
                  </span>
                )}
              </div>
            </div>
            {redStockItems.length > 0 && (
              <button
                onClick={() => onOpenScanBill()}
                className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer"
              >
                Scan PDF to Fix
              </button>
            )}
          </div>
        </div>

        {/* Live Deductions Log Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <span>Recent Orders & Automatic Warehouse Deductions Feed:</span>
            {deductionsHistory.length > 0 && (
              <span className="text-[10px] font-mono text-slate-500">{deductionsHistory.length} Recorded Deductions</span>
            )}
          </div>

          {deductionsHistory.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-amber-500/30 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-500" />
                <span>Ready to deduct materials. Place an order to automatically cut packaging & raw materials from stock.</span>
              </div>
              <button
                onClick={() => {
                  SoundEngine.play('pop');
                  if (onOpenPlaceOrderModal) onOpenPlaceOrderModal();
                  else onOpenNewOrder();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                + Place First Order
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {deductionsHistory.slice(0, 4).map(rec => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40">
                        {rec.partyCode}
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100">{rec.partyName}</strong>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">{rec.poNo}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{rec.cases.toLocaleString()} Cases</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{rec.timestamp}</span>
                  </div>

                  {/* Deducted materials pills */}
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Cut From Stock:</span>
                    {rec.materialsDeducted.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        className={`px-2 py-0.5 rounded border ${
                          m.isDeficit
                            ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-900'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                        title={`Prev: ${m.prevStock} → Deducted: -${m.qtyDeducted} → Remaining: ${m.newStock}`}
                      >
                        {m.materialName}: <strong className="text-rose-600 dark:text-rose-400">-{m.qtyDeducted.toLocaleString()} {m.unit}</strong>
                        {m.isDeficit && <span className="ml-1 text-[9px] font-black text-rose-600">🚨 RED</span>}
                      </span>
                    ))}
                    {rec.invoiceAttachment && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-sans font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>PO/Invoice: {rec.invoiceAttachment.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* USER REQUESTED: PREVIOUS SALES & PRODUCT VELOCITY ALERTS SECTION */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500 text-white font-black">
                <Truck className="w-4 h-4" />
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                Previous Sales & Product Velocity Alerts
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                Intelligence Stream
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit alerts on previous export shipments, realized container revenues, and high-velocity product turnover rates.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                SoundEngine.play('tick');
                onNavigate('dispatch');
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View All 13 Dispatches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split: Previous Sales Alerts (Left) vs Product Velocity Alerts (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column 1: Previous Sales & Export Dispatches Alerts */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Recent Container Dispatches & Realized Sales</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                $1.48M Export Turnover
              </span>
            </div>

            <div className="space-y-2">
              {/* Alert 1 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1 hover:border-blue-400 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      EXP/2026/05/11
                    </span>
                    <strong className="text-slate-900 dark:text-slate-100">Bake Mate- Alnoor-Riyadh</strong>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">$126,800 USD</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>2,660 Cases</strong> • Acacia Honey 2KG Bucket (4/cs) • Cleared Port of Dammam • HMF & Lab Analysis passed.
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Payment Realized (30% Adv + 70% LC)</span>
                  <span>•</span>
                  <span>Batch #AC-2026-05</span>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1 hover:border-blue-400 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      EXP/2026/04/89
                    </span>
                    <strong className="text-slate-900 dark:text-slate-100">Dream Wholesale, NY</strong>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">$78,200 USD</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>1,800 Cases</strong> • Pure Mustard Oil 1 L PET (12/cs) • Delivered to Warren, MI via Port of Newark.
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ FDA Cleared / Zero Demurrage</span>
                  <span>•</span>
                  <span>Batch #MO-2026-04</span>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1 hover:border-blue-400 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      EXP/2026/04/42
                    </span>
                    <strong className="text-slate-900 dark:text-slate-100">Bay Food Distributors</strong>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">$105,600 USD</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>2,400 Cases</strong> • Soybean Oil 5 L PET Handle (4/cs) • Dispatched to West Coast / Port of Oakland.
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Completed Fulfillment</span>
                  <span>•</span>
                  <span>Palletized 32 Pallets</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Product Velocity & Demand Run-Rate Alerts */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Product Velocity & Stock Run-Rate Alerts</span>
              </span>
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                Run-Rate Health
              </span>
            </div>

            <div className="space-y-2">
              {/* Velocity Alert 1: Fast Moving Mustard Oil */}
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950">
                      🔥 FASTEST MOVER
                    </span>
                    <strong className="text-slate-900 dark:text-slate-100">Pure Mustard Oil 1 L PET</strong>
                  </div>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">3,200 Cs / Month</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                  High monthly turnover rate across US and GCC ethnic distributors. <strong>Warehouse Packaging Buffer: 14 Days</strong>. Current bottle inventory will exhaust after next 1,500 case order.
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-amber-200 dark:border-amber-900/60 text-[10px]">
                  <span className="text-slate-500">Lead Time: 12 Days</span>
                  <button
                    onClick={() => onOpenScanBill()}
                    className="font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Scan Arrival Bill →
                  </button>
                </div>
              </div>

              {/* Velocity Alert 2: Acacia Honey Surge */}
              <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-600 text-white">
                      📈 EXPORT SURGE
                    </span>
                    <strong className="text-slate-900 dark:text-slate-100">Alnoor Brand Acacia Honey 2KG</strong>
                  </div>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400">2,660 Cs Booked</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                  Upcoming Middle East season has booked 100% of planned 2KG bucket capacity. Bulk Acacia raw honey stock stands at <strong>3,500 KG</strong>; reorder required for second 40HQ container.
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-purple-200 dark:border-purple-900/60 text-[10px]">
                  <span className="text-slate-500">Raw Stock Threshold: Critical</span>
                  <button
                    onClick={() => onNavigate('inventory')}
                    className="font-bold text-purple-700 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    View Raw Stock →
                  </button>
                </div>
              </div>

              {/* Velocity Alert 3: Packaging Reorder Notice */}
              <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white">
                      ⚠️ REORDER ALERT
                    </span>
                    <strong className="text-slate-900 dark:text-slate-100">53mm Gold Lug Caps & Hex Jars</strong>
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">Below Minimum</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                  Natural Wildflower Honey 500g glass packaging balance is at <strong>480 units</strong> against 1,200 min safety level. Supplier lead time is 18 days.
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-rose-200 dark:border-rose-900/60 text-[10px]">
                  <span className="text-rose-700 dark:text-rose-400 font-bold">Action: Place Inward PO</span>
                  <button
                    onClick={() => {
                      if (onOpenPlaceOrderModal) onOpenPlaceOrderModal();
                      else onOpenNewOrder();
                    }}
                    className="font-bold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Place Restock Order →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* USER REQUESTED: PRIMARY COMMAND CENTER LAUNCHER CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Operational Control Sheets & Dashboards
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any dashboard below to immediately open that specific sheet.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {visibleModules
              ? `${operationSheets.filter(s => visibleModules.includes(s.id)).length} Authorized Enterprise Sheets`
              : '7 Connected Enterprise Sheets'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationSheets
            .filter(sheet => !visibleModules || visibleModules.includes(sheet.id))
            .map(sheet => {
            const Icon = sheet.icon;
            return (
              <div
                key={sheet.id}
                onClick={() => {
                  SoundEngine.play('pop');
                  onNavigate(sheet.id);
                }}
                className={`group relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:${sheet.borderAccent} cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${sheet.badgeColor}`}
                    >
                      {sheet.badge}
                    </span>
                  </div>

                  <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    <span>{sheet.title}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {sheet.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                    {sheet.stat}
                  </span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Open Sheet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* USER REQUESTED: ENTERPRISE CLIENT & PARTY DIRECTORY (CLICK ANY PARTY FOR 360° COLUMN POPUP) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                Enterprise Party Directory (Click Any Party for Complete Column Dossier)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clicking any party opens the comprehensive 4-tab column popup: All Orders, Packaging Materials Needed & Left-to-Buy, Dispatches, and Master SKUs with XLS/CSV download.
            </p>
          </div>

          <button
            onClick={() => {
              SoundEngine.play('tick');
              onNavigate('orders');
            }}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>View in Order Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Party Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {partyList.map(party => (
            <div
              key={party.code}
              onClick={() => {
                SoundEngine.play('pop');
                if (onSelectParty) {
                  onSelectParty({ code: party.code, name: party.name });
                } else {
                  onNavigate('orders');
                }
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-all cursor-pointer group flex flex-col justify-between"
              title={`Click to view complete 360° dossier for ${party.name}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                    {party.code}
                  </span>
                  {party.hasShortage ? (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Packaging Material Deficit" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="All Materials Sufficient" />
                  )}
                </div>

                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-tight">
                  {party.name}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                <span>{party.totalPlanCs.toLocaleString()} Cs</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold group-hover:underline">
                  Dossier →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROMINENT RED STOCKS ALERT BANNER (Directly on Front Page) */}
      {redStockItems.length > 0 && (
        <div className="bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-500/60 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200 dark:border-rose-900 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black shrink-0 shadow-sm animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-rose-950 dark:text-rose-100">
                    CRITICAL STOCKS ON RED ({redStockItems.length} Depleted Items)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-0.5">
                  These warehouse materials are below safety threshold or completely exhausted. Restock immediately to avoid export container dispatch delays.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  SoundEngine.play('pop');
                  onOpenScanBill();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Inward Bill with AI</span>
              </button>
              <button
                onClick={() => onNavigate('inventory')}
                className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100/50 flex items-center gap-1 cursor-pointer"
              >
                <span>Inventory Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Red Stock Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {redStockItems.map(item => {
              const isOut = item.quantity <= 0;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-rose-300 dark:border-rose-900 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate" title={item.name}>
                        {item.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                        isOut ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      }`}>
                        {isOut ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-1">
                      <span>Code: {item.sku}</span>
                      <span>•</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{item.linkedSku || 'General'}</span>
                    </div>

                    <div className="mt-2.5 p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 text-xs flex justify-between items-baseline font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">On Hand</span>
                        <strong className="text-base font-black text-rose-700 dark:text-rose-400">
                          {item.quantity.toLocaleString()} {item.unit}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block">Min Target</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          {item.minLevel.toLocaleString()} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-medium">Quick Restock:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onQuickAdjustInventory(item.id, 1000)}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-colors cursor-pointer"
                        title="Add 1,000 units"
                      >
                        +1,000
                      </button>
                      <button
                        onClick={() => onQuickAdjustInventory(item.id, 5000)}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-colors cursor-pointer"
                        title="Add 5,000 units"
                      >
                        +5,000
                      </button>
                      <button
                        onClick={() => onOpenScanBill()}
                        className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 hover:bg-purple-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                        title="Scan arrival bill"
                      >
                        <Camera className="w-3 h-3" /> Scan
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quotes Issued */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-amber-400">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Quoted Value</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-slate-100">
            ${fmtStr(totalQuotedUSD)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{savedPIs.length} Issued Proformas</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{fmtStr(totalQuotedINR / 100000)} L</span>
          </div>
        </div>

        {/* Active Packing Orders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-amber-400">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Packing Orders</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {activeOrders.length} <span className="text-sm font-normal text-slate-500">Containers</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{urgentOrders.length} marked urgent</span>
            <button
              onClick={() => onNavigate('packing')}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            >
              View Grid <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Warehouse Inventory Health */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-amber-400">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Inventory Value</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-slate-100">
            ₹{fmtStr(totalInventoryValINR / 100000)} L
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{inventory.length} tracked items</span>
            {redStockItems.length > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {redStockItems.length} On Red
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">100% Healthy</span>
            )}
          </div>
        </div>

        {/* Negotiations Recorded */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-amber-400">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Price Negotiations</span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {negotiations.length} <span className="text-sm font-normal text-slate-500">Analyses</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {negotiations.filter(n => n.verdict === 'accept').length} Accepted · {negotiations.filter(n => n.verdict === 'reject').length} Rejected
            </span>
            <button
              onClick={() => onNavigate('oilcost')}
              className="text-purple-600 dark:text-purple-400 font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            >
              Analyze <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Active Fulfillment Pipeline & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Order Fulfillment Pipeline */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-amber-500" />
                Active Container Orders & Material Fulfillment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time tracking of the 8 packaging materials across active export containers.
              </p>
            </div>
            <button
              onClick={() => onNavigate('packing')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Open Full Tracker <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">No active orders. Create one to begin.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeOrders.slice(0, 5).map(order => (
                <div key={order.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                        {order.container || order.id}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {order.customer}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          order.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {order.priority}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <strong>{order.item}</strong> — {order.sku} ({order.qty.toLocaleString()} cartons)
                    </div>
                    {order.remarks && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                        Note: {order.remarks}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Materials</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Object.entries(order.materials).map(([matKey, val]) => {
                          const isDone = ['available', 'received', 'approved'].includes(val.status);
                          const isNA = val.status === 'na';
                          return (
                            <span
                              key={matKey}
                              title={`${matKey}: ${val.status}`}
                              className={`w-2.5 h-2.5 rounded-sm ${
                                isNA
                                  ? 'bg-slate-200 dark:bg-slate-700'
                                  : isDone
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-400'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('packing')}
                      className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Activity Log Audit */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                System Activity Log
              </h3>
            </div>

            <div className="space-y-3">
              {activityLog.slice(0, 6).map(act => (
                <div key={act.id} className="text-xs flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-snug">
                      {act.summary}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span>{act.module}</span>
                      <span>•</span>
                      <span>{act.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
