import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Download,
  FileSpreadsheet,
  Building2,
  Package,
  Boxes,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronRight,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { OrderRecord, DispatchRecord, MasterSheetItem, PartyBomRequirement } from '../types';
import { SoundEngine } from '../utils/audio';
import { exportTablePDF } from '../utils/pdfExport';

interface PartyDetailModalProps {
  isOpen: boolean;
  partyCode: string;
  partyName: string;
  allOrders: OrderRecord[];
  allDispatches: DispatchRecord[];
  allMasterItems: MasterSheetItem[];
  onClose: () => void;
  onUpdateOrder?: (order: OrderRecord) => void;
}

export const PartyDetailModal: React.FC<PartyDetailModalProps> = ({
  isOpen,
  partyCode,
  partyName,
  allOrders,
  allDispatches,
  allMasterItems,
  onClose,
  onUpdateOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'packaging' | 'dispatches' | 'master'>(
    'orders'
  );

  // Filter orders for this specific party
  const partyOrders = useMemo(() => {
    return allOrders.filter(
      o =>
        o.partyCode.toLowerCase() === partyCode.toLowerCase() ||
        o.partyName.toLowerCase().includes(partyName.toLowerCase()) ||
        partyName.toLowerCase().includes(o.partyName.toLowerCase())
    );
  }, [allOrders, partyCode, partyName]);

  // Filter dispatches for this party (matched by product name/code or location)
  const partyDispatches = useMemo(() => {
    const skuCodes = new Set(partyOrders.map(o => o.skuCode.toLowerCase()));
    const skuNames = partyOrders.map(o => o.skuName.toLowerCase());

    return allDispatches.filter(d => {
      const matchCode = skuCodes.has(d.productCode.toLowerCase());
      const matchName = skuNames.some(
        name =>
          name.includes(d.productName.toLowerCase()) || d.productName.toLowerCase().includes(name)
      );
      return matchCode || matchName;
    });
  }, [allDispatches, partyOrders]);

  // Filter master sheet items for this party
  const partyMasterItems = useMemo(() => {
    return allMasterItems.filter(
      m =>
        m.partyCode.toLowerCase() === partyCode.toLowerCase() ||
        m.partyName.toLowerCase().includes(partyName.toLowerCase()) ||
        partyName.toLowerCase().includes(m.partyName.toLowerCase())
    );
  }, [allMasterItems, partyCode, partyName]);

  // Aggregate Packaging Material Requirements (BOM) across all orders for this party
  const consolidatedBOM = useMemo(() => {
    const map = new Map<
      string,
      {
        type: string;
        code: string;
        desc: string;
        uom: string;
        totalRequired: number;
        availableQty: number;
        balanceStk: number;
        shortExcess: number;
        skus: Set<string>;
      }
    >();

    partyOrders.forEach(order => {
      order.bom.forEach(b => {
        const key = `${b.type}-${b.code}`;
        const existing = map.get(key);
        if (existing) {
          existing.totalRequired += b.requiredQty;
          existing.shortExcess += b.shortExcess;
          existing.skus.add(order.skuCode);
        } else {
          map.set(key, {
            type: b.type,
            code: b.code,
            desc: b.desc,
            uom: b.uom,
            totalRequired: b.requiredQty,
            availableQty: b.availableQty,
            balanceStk: b.balanceStk,
            shortExcess: b.shortExcess,
            skus: new Set([order.skuCode]),
          });
        }
      });
    });

    return Array.from(map.values()).map(item => ({
      ...item,
      skuList: Array.from(item.skus).join(', '),
      isDeficit: item.shortExcess < 0,
    }));
  }, [partyOrders]);

  // Party level statistics
  const stats = useMemo(() => {
    const totalPlanCs = partyOrders.reduce((acc, o) => acc + o.planCs, 0);
    const totalFillingCs = partyOrders.reduce((acc, o) => acc + o.fillingCs, 0);
    const totalDispatchedCs = partyOrders.reduce((acc, o) => acc + o.dispatchedCs, 0);
    const totalBalanceCs = partyOrders.reduce((acc, o) => acc + o.balanceCs, 0);
    const totalKg = partyOrders.reduce((acc, o) => acc + o.planKg, 0);
    const totalPallets = partyOrders.reduce((acc, o) => acc + o.planPallets, 0);
    const deficitCount = consolidatedBOM.filter(b => b.isDeficit).length;

    return {
      orderCount: partyOrders.length,
      totalPlanCs,
      totalFillingCs,
      totalDispatchedCs,
      totalBalanceCs,
      totalKg,
      totalMt: Math.round((totalKg / 1000) * 100) / 100,
      totalPallets,
      deficitCount,
      fillingPct: totalPlanCs > 0 ? Math.round((totalFillingCs / totalPlanCs) * 100) : 0,
      dispatchPct: totalPlanCs > 0 ? Math.round((totalDispatchedCs / totalPlanCs) * 100) : 0,
    };
  }, [partyOrders, consolidatedBOM]);

  if (!isOpen) return null;

  // Export handlers — PDF (Global Futura house style)
  const handleExportXLS = () => {
    SoundEngine.play('export');
    exportTablePDF(
      `${partyCode} - ${partyName} — Party Dossier (All Orders)`,
      ['Party Code', 'Party Name', 'PO Number', 'PO Date', 'Expiry Date', 'SKU Code', 'Product Name', 'Pack Size', 'Qty/Cs', 'Plan Cs', 'Plan KG', 'Pallets', 'Filling Cs', 'Dispatched Cs', 'Balance Cs', 'Status'],
      partyOrders.map(o => [
        o.partyCode,
        o.partyName,
        o.poNo,
        o.poDate,
        o.poExp,
        o.skuCode,
        o.skuName,
        `${o.packSize}${o.packUnit}`,
        o.qtyPerCs,
        o.planCs,
        o.planKg,
        o.planPallets,
        o.fillingCs,
        o.dispatchedCs,
        o.balanceCs,
        o.status,
      ]),
      `${partyCode}_${partyName.replace(/[^a-zA-Z0-9]/g, '_')}_Dossier`
    );
    exportTablePDF(
      `${partyCode} - ${partyName} — Packaging Materials (BOM)`,
      ['Category', 'PM Code', 'Description', 'Used In SKUs', 'Total Required', 'Available In Stock', 'Shortfall / Left to Buy', 'Surplus Stock', 'UOM', 'Status'],
      consolidatedBOM.map(b => [
        b.type.toUpperCase(),
        b.code,
        b.desc,
        b.skuList,
        b.totalRequired,
        b.availableQty,
        b.isDeficit ? Math.abs(b.shortExcess) : 0,
        !b.isDeficit ? b.shortExcess : 0,
        b.uom,
        b.isDeficit ? 'DEFICIT - ACTION REQUIRED' : 'SUFFICIENT',
      ]),
      `${partyCode}_Packaging_BOM`
    );
  };

  const handleExportCSV = () => {
    SoundEngine.play('export');
    exportTablePDF(
      `${partyCode} - ${partyName} — Orders Summary`,
      ['Party', 'PO', 'SKU', 'Name', 'Pack', 'Plan Cs', 'Plan Kg', 'Filled Cs', 'Dispatched Cs', 'Balance Cs', 'Status'],
      partyOrders.map(o => [
        `${partyCode} - ${partyName}`,
        o.poNo,
        o.skuCode,
        o.skuName,
        o.packSize,
        o.planCs,
        o.planKg,
        o.fillingCs,
        o.dispatchedCs,
        o.balanceCs,
        o.status,
      ]),
      `${partyCode}_Orders_Summary`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
              {partyCode}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">{partyName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900 uppercase">
                  Party 360° Dossier
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                Party Code: <span className="font-bold text-amber-300">{partyCode}</span> • Total Orders: {stats.orderCount} • Net Planned: {stats.totalPlanCs.toLocaleString()} Cases ({stats.totalMt} MT)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportXLS}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
              title="Download full Party Dossier as PDF"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all active:scale-95"
              title="Export as PDF"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Planned</span>
            <div className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              {stats.totalPlanCs.toLocaleString()} <span className="text-xs font-normal">Cs</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-amber-600">Filling Finished</span>
            <div className="text-base font-black font-mono text-amber-600 mt-0.5">
              {stats.totalFillingCs.toLocaleString()} <span className="text-xs font-normal">Cs</span>
            </div>
            <span className="text-[10px] text-slate-400">{stats.fillingPct}% Filled</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-blue-600">Dispatched Cs</span>
            <div className="text-base font-black font-mono text-blue-600 mt-0.5">
              {stats.totalDispatchedCs.toLocaleString()} <span className="text-xs font-normal">Cs</span>
            </div>
            <span className="text-[10px] text-slate-400">{stats.dispatchPct}% Left Port</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-rose-600">Balance Pending</span>
            <div className="text-base font-black font-mono text-rose-600 mt-0.5">
              {stats.totalBalanceCs.toLocaleString()} <span className="text-xs font-normal">Cs</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-purple-600">Pallets Required</span>
            <div className="text-base font-black font-mono text-purple-600 mt-0.5">
              {stats.totalPallets} <span className="text-xs font-normal">Pallets</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-500">Packaging Deficit</span>
            <div
              className={`text-base font-black font-mono mt-0.5 ${
                stats.deficitCount > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'
              }`}
            >
              {stats.deficitCount > 0 ? `${stats.deficitCount} Short Items` : '0 (Sufficient)'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>1. All Orders Ordered ({partyOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('packaging')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'packaging'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>2. Packaging Materials Needed & Deficit ({consolidatedBOM.length})</span>
            {stats.deficitCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                {stats.deficitCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dispatches')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'dispatches'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>3. Dispatches & Container Stuffing ({partyDispatches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('master')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'master'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4. Master SKU Catalog ({partyMasterItems.length})</span>
          </button>
        </div>

        {/* Modal Body: Column Structure Views */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: ALL ORDERS ORDERED BY THIS PARTY (COLUMN STRUCTURE) */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Comprehensive Order Register for {partyName}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Showing all purchase orders, planned quantities, filling milestones, and remaining balances in column structure.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10.5px] uppercase font-black text-slate-700 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700">P.O. No</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700">PO Date</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700">Expiry Date</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 font-mono">SKU Code</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 min-w-[200px]">Product / SKU Name</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-center">Pack Size</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-center">Qty/Cs</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-right bg-amber-50/70 dark:bg-amber-950/20 font-bold">Plan Cs</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-right bg-amber-50/70 dark:bg-amber-950/20">Plan KG</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-center">Pallets</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-right text-emerald-700 dark:text-emerald-400 font-bold">Filling Cs</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-right text-blue-700 dark:text-blue-400 font-bold">Dispatched</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-right text-rose-700 dark:text-rose-400 font-bold">Balance</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {partyOrders.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="py-10 text-center text-slate-400 font-medium">
                            No open production orders found for this party.
                          </td>
                        </tr>
                      ) : (
                        partyOrders.map(order => (
                          <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {order.poNo}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                              {order.poDate}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                              {order.poExp}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {order.skuCode}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                              {order.skuName}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono">
                              {order.packSize}{order.packUnit}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-500">
                              {order.qtyPerCs}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-black bg-amber-50/50 dark:bg-amber-950/20">
                              {order.planCs.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-600 dark:text-slate-400">
                              {order.planKg.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-purple-700 dark:text-purple-300">
                              {order.planPallets}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {order.fillingCs.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                              {order.dispatchedCs.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-black text-rose-700 dark:text-rose-400">
                              {order.balanceCs.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
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
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONSOLIDATED PACKAGING MATERIALS & SHORTFALL (COLUMN STRUCTURE) */}
          {activeTab === 'packaging' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Packaging Materials Needed vs. Live Stock Left to Buy (BOM Breakdown)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Consolidated material balance across all purchase orders for {partyName}. Items marked in Red Deficit must be ordered immediately.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10.5px] uppercase font-black text-slate-700 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 w-24">Material Category</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 w-24 font-mono">PM Code</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 min-w-[220px]">Material Description</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 w-32 font-mono">Used In SKU(s)</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-right w-24 font-bold">Total Required</th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-right w-24 font-mono">In Warehouse</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-right w-36 bg-rose-50/70 dark:bg-rose-950/20 font-black text-rose-700 dark:text-rose-400">
                          Left to Buy New (Deficit)
                        </th>
                        <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-center w-16">UOM</th>
                        <th className="py-2.5 px-3 text-center w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {consolidatedBOM.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400 font-medium">
                            No BOM materials configured for this party yet.
                          </td>
                        </tr>
                      ) : (
                        consolidatedBOM.map((bom, idx) => (
                          <tr
                            key={idx}
                            className={bom.isDeficit ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}
                          >
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] text-slate-700 dark:text-slate-300">
                              {bom.type}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-amber-700 dark:text-amber-400">
                              {bom.code}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
                              {bom.desc}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                              {bom.skuList}
                            </td>
                            <td className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold">
                              {bom.totalRequired.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-600 dark:text-slate-400">
                              {bom.availableQty.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-black bg-rose-50/70 dark:bg-rose-950/20">
                              {bom.isDeficit ? (
                                <span className="text-rose-600 dark:text-rose-400 font-black">
                                  🚨 BUY {Math.abs(bom.shortExcess).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  +{bom.shortExcess.toLocaleString()} (Surplus)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-500">
                              {bom.uom}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  bom.isDeficit
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                {bom.isDeficit ? 'DEFICIT' : 'READY'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISPATCHES & CONTAINER STUFFING (COLUMN STRUCTURE) */}
          {activeTab === 'dispatches' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Dispatched Shipments & Port Logs for {partyName}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Container stuffing records, invoice numbers, batch tracking, and export specifications.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10.5px] uppercase font-black text-slate-700 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Invoice No</th>
                        <th className="py-2.5 px-2">Date</th>
                        <th className="py-2.5 px-2">Batch No</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Product Dispatched</th>
                        <th className="py-2.5 px-2 text-center">Case Pack</th>
                        <th className="py-2.5 px-2 text-right font-bold text-blue-700 dark:text-blue-300">Cases Dispatched</th>
                        <th className="py-2.5 px-2 text-right font-bold text-emerald-700 dark:text-emerald-300">Net Weight (MT)</th>
                        <th className="py-2.5 px-3">Destination Port</th>
                        <th className="py-2.5 px-2">Pallet Config</th>
                        <th className="py-2.5 px-2">Specs (Moisture/HMF)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {partyDispatches.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-10 text-center text-slate-400 font-medium">
                            No container dispatches logged for this party yet.
                          </td>
                        </tr>
                      ) : (
                        partyDispatches.map(d => (
                          <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {d.invoiceNo}
                            </td>
                            <td className="py-2 px-2 font-mono text-slate-500 whitespace-nowrap">
                              {d.invoiceDate}
                            </td>
                            <td className="py-2 px-2 font-mono font-bold text-amber-700 dark:text-amber-400">
                              {d.batchNo}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                              {d.productName}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-500">
                              {d.casePack}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-black text-blue-700 dark:text-blue-300">
                              {d.dispatchCs.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-black text-emerald-700 dark:text-emerald-300">
                              {d.dispatchMt} MT
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {d.dispatchLocation}
                            </td>
                            <td className="py-2 px-2 font-mono text-[11px] text-slate-500">
                              {d.palletConfig || 'Standard'}
                            </td>
                            <td className="py-2 px-2 font-mono text-[10.5px] text-slate-500">
                              {d.moisture ? `M:${d.moisture} HMF:${d.hmf}` : 'Standard'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MASTER SKU CATALOG (COLUMN STRUCTURE) */}
          {activeTab === 'master' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Master SKU Catalog & Specifications for {partyName}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Officially approved bottle sizes, pack configurations, and pallet loading requirements.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10.5px] uppercase font-black text-slate-700 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 w-28">SKU Code</th>
                        <th className="py-2.5 px-3 min-w-[240px]">SKU / Product Description</th>
                        <th className="py-2.5 px-2 text-center w-24">Pack Size</th>
                        <th className="py-2.5 px-2 text-center w-20">Qty/Cs</th>
                        <th className="py-2.5 px-3 text-right w-24">Quoted MRP</th>
                        <th className="py-2.5 px-3">Pallet Requirement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {partyMasterItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                            No master catalog SKUs mapped for this party.
                          </td>
                        </tr>
                      ) : (
                        partyMasterItems.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                              {m.skuCode}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                              {m.skuName}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono">
                              {m.packSize}g
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                              {m.qtyPerCs}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {m.mrp ? `₹${m.mrp}` : 'Export Spec'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                              {m.palletRequirement || 'Floor Loading'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Party ID: {partyCode} • {partyName}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Close Party Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
