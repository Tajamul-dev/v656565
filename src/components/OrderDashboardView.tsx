import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Camera,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Boxes,
  FileSpreadsheet,
  X,
  Plus,
  Truck,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Building2,
} from 'lucide-react';
import { OrderRecord, PartyBomRequirement, DispatchRecord, MasterSheetItem } from '../types';
import { SoundEngine } from '../utils/audio';
import { exportToXLSX, exportToCSV } from '../utils/productionData';
import { exportProductionSheetPDF, exportPendingOrdersPDF, exportTablePDF } from '../utils/pdfExport';
import { PartyDetailModal } from './PartyDetailModal';

interface OrderDashboardViewProps {
  orders: OrderRecord[];
  dispatches?: DispatchRecord[];
  masterItems?: MasterSheetItem[];
  onUpdateOrder: (order: OrderRecord) => void;
  onOpenScanner: () => void;
  onOpenUniversalUpload: () => void;
}

export const OrderDashboardView: React.FC<OrderDashboardViewProps> = ({
  orders,
  dispatches = [],
  masterItems = [],
  onUpdateOrder,
  onOpenScanner,
  onOpenUniversalUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedOrderForPopup, setSelectedOrderForPopup] = useState<OrderRecord | null>(null);
  const [selectedPartyForDossier, setSelectedPartyForDossier] = useState<{
    code: string;
    name: string;
  } | null>(null);

  // Active popup tab
  const [popupTab, setPopupTab] = useState<'bom' | 'progress' | 'actions'>('bom');

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchSearch =
        order.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.partyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.skuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.skuCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.poNo.toLowerCase().includes(searchQuery.toLowerCase());

      const matchParty = selectedPartyFilter === 'all' || order.partyCode === selectedPartyFilter;
      const matchStatus = selectedStatusFilter === 'all' || order.status === selectedStatusFilter;

      return matchSearch && matchParty && matchStatus;
    });
  }, [orders, searchQuery, selectedPartyFilter, selectedStatusFilter]);

  // Unique parties for filter
  const parties = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => map.set(o.partyCode, `${o.partyCode} - ${o.partyName}`));
    return Array.from(map.entries()).map(([code, label]) => ({ code, label }));
  }, [orders]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalPlanCs = orders.reduce((acc, o) => acc + o.planCs, 0);
    const totalFillingCs = orders.reduce((acc, o) => acc + o.fillingCs, 0);
    const totalDispatchedCs = orders.reduce((acc, o) => acc + o.dispatchedCs, 0);
    const totalBalanceCs = orders.reduce((acc, o) => acc + o.balanceCs, 0);
    const totalKg = orders.reduce((acc, o) => acc + o.planKg, 0);
    const totalPallets = orders.reduce((acc, o) => acc + o.planPallets, 0);

    return {
      totalOrders: orders.length,
      totalPlanCs,
      totalFillingCs,
      totalDispatchedCs,
      totalBalanceCs,
      totalKg,
      totalPallets,
      fillingProgressPct: totalPlanCs > 0 ? Math.round((totalFillingCs / totalPlanCs) * 100) : 0,
      dispatchProgressPct: totalPlanCs > 0 ? Math.round((totalDispatchedCs / totalPlanCs) * 100) : 0,
    };
  }, [orders]);

  // Export handlers — PDF format (Global Futura house style)
  const handleDownloadXLS = () => {
    SoundEngine.play('export');
    exportProductionSheetPDF(filteredOrders, 'Production Sheet');
  };

  const handleDownloadCSV = () => {
    SoundEngine.play('export');
    exportPendingOrdersPDF(filteredOrders, 'Pending Orders');
  };

  // Quick order adjustment from popup
  const handleQuickAddFilling = (order: OrderRecord, increment: number) => {
    SoundEngine.play('success');
    const newFilling = Math.min(order.planCs, order.fillingCs + increment);
    const newBalance = Math.max(0, order.planCs - newFilling);
    const newStatus =
      newFilling >= order.planCs
        ? 'Ready for Dispatch'
        : newFilling > 0
        ? 'Partially Filled'
        : order.status;

    const updated = {
      ...order,
      fillingCs: newFilling,
      balanceCs: newBalance,
      status: newStatus,
    };
    onUpdateOrder(updated);
    setSelectedOrderForPopup(updated);
  };

  const handleQuickAddDispatch = (order: OrderRecord, increment: number) => {
    SoundEngine.play('success');
    const newDispatched = Math.min(order.fillingCs, order.dispatchedCs + increment);
    const newStatus = newDispatched >= order.planCs ? 'Completed' : order.status;

    const updated = {
      ...order,
      dispatchedCs: newDispatched,
      status: newStatus,
    };
    onUpdateOrder(updated);
    setSelectedOrderForPopup(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Plan Cs</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {stats.totalPlanCs.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">{stats.totalKg.toLocaleString()} KG Net</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Filling Completed
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
            {stats.totalFillingCs.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">{stats.fillingProgressPct}% of Planned</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Dispatched Cs
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {stats.totalDispatchedCs.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">{stats.dispatchProgressPct}% Dispatched</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Balance Pending
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
            {stats.totalBalanceCs.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">Cs remaining</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Pallets Required
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
            {stats.totalPallets}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Pallet loading specs</div>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">Live Parties</div>
          <div className="text-xl font-black font-mono mt-0.5">{parties.length} Clients</div>
          <div className="text-[10px] opacity-80 mt-1">Interactive BOM linked</div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, XLS / CSV, Camera, File Upload */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Party, SKU, PO No..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Party Filter */}
          <select
            value={selectedPartyFilter}
            onChange={e => setSelectedPartyFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
          >
            <option value="all">All Parties ({parties.length})</option>
            {parties.map(p => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="In Production">In Production</option>
            <option value="Partially Filled">Partially Filled</option>
            <option value="Ready for Dispatch">Ready for Dispatch</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Scan physical bill or challan with camera"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Bill</span>
          </button>

          <button
            onClick={onOpenUniversalUpload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Upload PDF, CSV or Excel file to auto-update"
          >
            <Upload className="w-4 h-4" />
            <span>Upload PDF / XLS / CSV</span>
          </button>

          <button
            onClick={handleDownloadXLS}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Download Production Sheet as PDF"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>PDF Production Sheet</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Download Pending Orders as PDF (per-SKU sections)"
          >
            <Download className="w-4 h-4" />
            <span>PDF Pending Orders</span>
          </button>
        </div>
      </div>

      {/* Interactive Party Strip: One-click popup for ANY party */}
      <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Click Any Party for Complete Orders, Packaging & Status Dossier</span>
          </div>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
            {parties.length} Enterprise Clients
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {parties.map(p => (
            <button
              key={p.code}
              onClick={() => {
                SoundEngine.play('pop');
                setSelectedPartyForDossier({ code: p.code, name: p.label.split(' - ')[1] || p.label });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 transition-all shadow-xs shrink-0 active:scale-95 group"
            >
              <span className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 group-hover:bg-white group-hover:text-amber-800 flex items-center justify-center font-black text-[10px]">
                {p.code}
              </span>
              <span className="truncate max-w-[150px]">{p.label.split(' - ')[1] || p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Order Table (Layout strictly based on Qwen diagram & User's Screenshot) */}
      <div className="border-2 border-slate-900 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-md">

        {/* Table Title Bar */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider">
              Main Sheet — Order Dashboard (Click any row for Sheet Tab 2 BOM & Details)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-amber-300 font-bold">
            Showing {filteredOrders.length} orders
          </span>
        </div>

        {/* Scrollable Spreadsheet Table */}
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-[10.5px] uppercase font-black text-slate-800 dark:text-slate-200 sticky top-0 border-b-2 border-slate-900 dark:border-slate-700 select-none">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 w-16 text-center">
                  Party Code
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 min-w-[200px]">
                  Party Name
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 min-w-[120px]">
                  P.O. No
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 w-24">
                  SKU Code
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 min-w-[220px]">
                  SKU Description
                </th>
                <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center w-20">
                  Pack Size
                </th>
                <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center w-16">
                  Qty/Cs
                </th>
                <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-right bg-amber-50/70 dark:bg-amber-950/30 w-20">
                  Plan Cs
                </th>
                <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-right bg-amber-50/70 dark:bg-amber-950/30 w-24">
                  Plan in KG
                </th>
                <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-right bg-amber-50/70 dark:bg-amber-950/30 w-24">
                  Plan in LTR
                </th>
                <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center w-20">
                  Pallets
                </th>
                <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-right text-emerald-700 dark:text-emerald-300 w-20">
                  Filling Cs
                </th>
                <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-right text-blue-700 dark:text-blue-300 w-24">
                  Dispatched
                </th>
                <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-right text-rose-700 dark:text-rose-300 w-20">
                  Balance Cs
                </th>
                <th className="py-2.5 px-3 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400 font-medium">
                    No orders match your search filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const hasShortage = order.bom.some(b => b.shortExcess < 0);
                  const isSelected = selectedOrderForPopup?.id === order.id;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => {
                        SoundEngine.play('tick');
                        setSelectedOrderForPopup(order);
                      }}
                      className={`cursor-pointer transition-colors hover:bg-amber-50/60 dark:hover:bg-amber-950/20 ${
                        isSelected
                          ? 'bg-amber-100/70 dark:bg-amber-950/40 font-semibold'
                          : ''
                      }`}
                    >
                      {/* Party Code */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            SoundEngine.play('pop');
                            setSelectedPartyForDossier({ code: order.partyCode, name: order.partyName });
                          }}
                          className="px-2 py-0.5 rounded font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
                          title="Click to view full party dossier, all orders, packaging & status"
                        >
                          {order.partyCode}
                        </button>
                      </td>

                      {/* Party Name */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            SoundEngine.play('pop');
                            setSelectedPartyForDossier({ code: order.partyCode, name: order.partyName });
                          }}
                          className="text-left hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center justify-between gap-1 w-full group cursor-pointer"
                          title="Click to open complete party dossier"
                        >
                          <span className="truncate max-w-[220px] font-bold group-hover:underline">
                            {order.partyName}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                        </button>
                      </td>


                      {/* PO No */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px] text-blue-700 dark:text-blue-400 font-bold">
                        {order.poNo}
                      </td>

                      {/* SKU Code */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                        {order.skuCode}
                      </td>

                      {/* SKU Name */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                        <div className="truncate max-w-[240px]" title={order.skuName}>
                          {order.skuName}
                        </div>
                      </td>

                      {/* Pack Size */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono">
                        {order.packSize}
                        {order.packUnit}
                      </td>

                      {/* Qty/Cs */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-500">
                        {order.qtyPerCs}
                      </td>

                      {/* Plan Cs */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-amber-50/30 dark:bg-amber-950/10">
                        {order.planCs.toLocaleString()}
                      </td>

                      {/* Plan in KG */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-700 dark:text-slate-300 bg-amber-50/30 dark:bg-amber-950/10">
                        {order.planKg.toLocaleString()}
                      </td>

                      {/* Plan in LTR */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-700 dark:text-slate-300 bg-amber-50/30 dark:bg-amber-950/10">
                        {order.planLtr.toLocaleString()}
                      </td>

                      {/* Plan in Pallets */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-purple-700 dark:text-purple-300">
                        {order.planPallets}
                      </td>

                      {/* Filling Cs */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {order.fillingCs.toLocaleString()}
                      </td>

                      {/* Dispatched Cs */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                        {order.dispatchedCs.toLocaleString()}
                      </td>

                      {/* Balance Cs */}
                      <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-rose-700 dark:text-rose-400">
                        {order.balanceCs.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            order.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : order.status === 'Ready for Dispatch'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : order.status === 'Partially Filled'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {order.status}
                        </span>
                        {hasShortage && (
                          <span
                            className="inline-block ml-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                            title="BOM Shortage: Packaging deficit"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP DASHBOARD - SHEET TAB 2 (Triggered on click of any row as requested in Qwen diagram) */}
      {selectedOrderForPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-black text-lg">
                  {selectedOrderForPopup.partyCode}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight">{selectedOrderForPopup.partyName}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 uppercase">
                      Sheet Tab 2
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    PO: {selectedOrderForPopup.poNo} • SKU: {selectedOrderForPopup.skuCode} ({selectedOrderForPopup.skuName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForPopup(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Selector */}
            <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setPopupTab('bom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  popupTab === 'bom'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                📦 BOM Mapping & Deficit Stock
              </button>
              <button
                onClick={() => setPopupTab('progress')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  popupTab === 'progress'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                📄 Open Order Progress & Pallets
              </button>
              <button
                onClick={() => setPopupTab('actions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  popupTab === 'actions'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                ⚡ Quick Production Actions
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: BOM MAPPING */}
              {popupTab === 'bom' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Bill of Materials (BOM) Requirements vs Live Inventory
                      </h4>
                      <p className="text-xs text-slate-500">
                        Formula: Plan Cases ({selectedOrderForPopup.planCs}) × Consumption per Case
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        SoundEngine.play('export');
                        exportTablePDF(
                          `${selectedOrderForPopup.partyName} — BOM Requirements`,
                          ['Type', 'Code', 'Description', 'Cons/Cs', 'Required', 'Available Stock', 'Shortfall / Left to Buy', 'Excess Stock', 'UOM', 'Status'],
                          selectedOrderForPopup.bom.map(b => [
                            b.type.toUpperCase(),
                            b.code,
                            b.desc,
                            b.consPerCase,
                            b.requiredQty,
                            b.availableQty,
                            b.shortExcess < 0 ? Math.abs(b.shortExcess) : 0,
                            b.shortExcess > 0 ? b.shortExcess : 0,
                            b.uom,
                            b.shortExcess < 0 ? 'DEFICIT - BUY NEW' : 'SUFFICIENT',
                          ]),
                          `${selectedOrderForPopup.partyCode}_BOM_Requirements`
                        );
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export Party BOM (PDF)</span>
                    </button>
                  </div>

                  {/* BOM Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Material Category</th>
                          <th className="py-2.5 px-3">PM Code</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                          <th className="py-2.5 px-2 text-center">Cons/Cs</th>
                          <th className="py-2.5 px-2 text-right">Required</th>
                          <th className="py-2.5 px-2 text-right">Available in Stock</th>
                          <th className="py-2.5 px-3 text-right bg-rose-50/70 dark:bg-rose-950/20 font-black text-rose-700 dark:text-rose-400">
                            Left to Buy New (Deficit)
                          </th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedOrderForPopup.bom.map((b, idx) => {
                          const isShortage = b.shortExcess < 0;
                          return (
                            <tr
                              key={idx}
                              className={isShortage ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}
                            >
                              <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px]">
                                {b.type}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                                {b.code}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                                {b.desc}
                              </td>
                              <td className="py-2 px-2 text-center font-mono">{b.consPerCase}</td>
                              <td className="py-2 px-2 text-right font-mono font-bold">
                                {b.requiredQty.toLocaleString()} {b.uom}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                                {b.availableQty.toLocaleString()} {b.uom}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black bg-rose-50/70 dark:bg-rose-950/20">
                                {isShortage ? (
                                  <span className="text-rose-600 dark:text-rose-400">
                                    BUY {Math.abs(b.shortExcess).toLocaleString()} {b.uom}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    +{b.shortExcess.toLocaleString()} (Excess)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    isShortage
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}
                                >
                                  {isShortage ? 'DEFICIT' : 'READY'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Deficit Alert Banner if any packaging is missing */}
                  {selectedOrderForPopup.bom.some(b => b.shortExcess < 0) && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-bold text-rose-900 dark:text-rose-300">
                          Critical Packaging Deficit Detected for {selectedOrderForPopup.partyName}
                        </div>
                        <p className="text-rose-700 dark:text-rose-400 mt-0.5">
                          Production cannot fully complete until missing packaging materials are ordered. Use the "Quick Actions" tab to create a purchase order or scan supplier arrival challans.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: OPEN ORDER PROGRESS */}
              {popupTab === 'progress' && (
                <div className="space-y-6">
                  {/* Order Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Target Plan</div>
                      <div className="text-xl font-black font-mono mt-0.5">
                        {selectedOrderForPopup.planCs.toLocaleString()} Cs
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {selectedOrderForPopup.planKg.toLocaleString()} KG ({selectedOrderForPopup.planLtr.toLocaleString()} L)
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase font-bold text-amber-600">Filling Finished</div>
                      <div className="text-xl font-black font-mono text-amber-600 mt-0.5">
                        {selectedOrderForPopup.fillingCs.toLocaleString()} Cs
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {Math.round((selectedOrderForPopup.fillingCs / selectedOrderForPopup.planCs) * 100)}% Complete
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase font-bold text-blue-600">Dispatched</div>
                      <div className="text-xl font-black font-mono text-blue-600 mt-0.5">
                        {selectedOrderForPopup.dispatchedCs.toLocaleString()} Cs
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {Math.round((selectedOrderForPopup.dispatchedCs / selectedOrderForPopup.planCs) * 100)}% Left Port
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase font-bold text-rose-600">Remaining Balance</div>
                      <div className="text-xl font-black font-mono text-rose-600 mt-0.5">
                        {selectedOrderForPopup.balanceCs.toLocaleString()} Cs
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">To be filled & packed</div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>Order Fulfillment Waterfall</span>
                      <span className="font-mono">
                        {selectedOrderForPopup.fillingCs} filled / {selectedOrderForPopup.planCs} planned
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            (selectedOrderForPopup.dispatchedCs / selectedOrderForPopup.planCs) * 100
                          )}%`,
                        }}
                        className="bg-blue-600 h-full"
                        title="Dispatched"
                      />
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            ((selectedOrderForPopup.fillingCs - selectedOrderForPopup.dispatchedCs) /
                              selectedOrderForPopup.planCs) *
                              100
                          )}%`,
                        }}
                        className="bg-amber-500 h-full"
                        title="Filled & in Warehouse"
                      />
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                        <span>Dispatched to port</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                        <span>Filled (Ready to Dispatch)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-700" />
                        <span>Unfilled Balance</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping & Pallet Specs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h5 className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                        Pallet & Packaging Specifications
                      </h5>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Total Pallet Requirement:</span>
                        <span className="font-mono font-bold">{selectedOrderForPopup.planPallets} Pallets</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Pallet Stacking Configuration:</span>
                        <span className="font-mono">{selectedOrderForPopup.palletSize || 'Standard 1*90'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Units per Master Shipper:</span>
                        <span className="font-mono">{selectedOrderForPopup.qtyPerCs} units/CFC</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h5 className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                        Purchase Order Timeline
                      </h5>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">P.O. Issue Date:</span>
                        <span className="font-mono">{selectedOrderForPopup.poDate}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Target Expiry / Ship Date:</span>
                        <span className="font-mono font-bold text-amber-600">{selectedOrderForPopup.poExp}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Production Month:</span>
                        <span className="font-mono">{selectedOrderForPopup.month}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: QUICK PRODUCTION ACTIONS */}
              {popupTab === 'actions' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Update Production Floor Records
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Add Filling */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold">Record Case Filling</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Log batches filled by packaging line workers today.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuickAddFilling(selectedOrderForPopup, 100)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold active:scale-95"
                        >
                          +100 Cases
                        </button>
                        <button
                          onClick={() => handleQuickAddFilling(selectedOrderForPopup, 500)}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold active:scale-95"
                        >
                          +500 Cases
                        </button>
                        <button
                          onClick={() =>
                            handleQuickAddFilling(
                              selectedOrderForPopup,
                              selectedOrderForPopup.planCs - selectedOrderForPopup.fillingCs
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                        >
                          Mark 100% Filled
                        </button>
                      </div>
                    </div>

                    {/* Dispatch */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold">Record Dispatch Shipment</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Log container stuffing and port dispatch.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuickAddDispatch(selectedOrderForPopup, 100)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold active:scale-95"
                        >
                          +100 Cs Dispatched
                        </button>
                        <button
                          onClick={() =>
                            handleQuickAddDispatch(
                              selectedOrderForPopup,
                              selectedOrderForPopup.fillingCs - selectedOrderForPopup.dispatchedCs
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                        >
                          Dispatch All Filled
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Order ID: {selectedOrderForPopup.id}
              </span>
              <button
                onClick={() => setSelectedOrderForPopup(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close Dashboard Popup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 360° Party Dossier Modal (All Orders, Packaging Deficit & Dispatches) */}
      {selectedPartyForDossier && (
        <PartyDetailModal
          isOpen={true}
          partyCode={selectedPartyForDossier.code}
          partyName={selectedPartyForDossier.name}
          allOrders={orders}
          allDispatches={dispatches}
          allMasterItems={masterItems}
          onClose={() => setSelectedPartyForDossier(null)}
          onUpdateOrder={onUpdateOrder}
        />
      )}
    </div>
  );
};
