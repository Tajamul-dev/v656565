import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Download,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Sparkles,
  Building2,
  Package,
} from 'lucide-react';
import { MasterSheetItem } from '../types';
import { SoundEngine } from '../utils/audio';
import { exportTablePDF } from '../utils/pdfExport';

interface MasterSheetViewProps {
  masterItems: MasterSheetItem[];
  onSelectParty?: (party: { code: string; name: string }) => void;
}

export const MasterSheetView: React.FC<MasterSheetViewProps> = ({ masterItems, onSelectParty }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParty, setSelectedParty] = useState('all');

  const filteredItems = useMemo(() => {
    return masterItems.filter(item => {
      const matchSearch =
        item.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.partyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.skuCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.skuName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchParty = selectedParty === 'all' || item.partyCode === selectedParty;
      return matchSearch && matchParty;
    });
  }, [masterItems, searchQuery, selectedParty]);

  const parties = useMemo(() => {
    const map = new Map<string, string>();
    masterItems.forEach(i => map.set(i.partyCode, `${i.partyCode} - ${i.partyName}`));
    return Array.from(map.entries()).map(([code, label]) => ({ code, label }));
  }, [masterItems]);

  const handleExportXLS = () => {
    SoundEngine.play('export');
    exportTablePDF(
      'Master Sheet',
      ['Party Code', 'Party Name', 'SKU Code', 'SKU Name', 'Pack Size', 'Qty per Case', 'MRP', 'Pallet Requirement'],
      filteredItems.map(i => [
        i.partyCode,
        i.partyName,
        i.skuCode,
        i.skuName,
        i.packSize,
        i.qtyPerCs,
        i.mrp ? i.mrp : '—',
        i.palletRequirement || 'Floor Loading',
      ]),
      'GlobalFutura_Master_Sheet'
    );
  };

  const handleExportCSV = () => {
    SoundEngine.play('export');
    exportTablePDF(
      'Master Sheet — Summary',
      ['Party Code', 'Party Name', 'SKU Code', 'SKU Name', 'Pack Size', 'Qty/Cs', 'MRP', 'Pallet Req'],
      filteredItems.map(i => [
        i.partyCode,
        i.partyName,
        i.skuCode,
        i.skuName,
        i.packSize,
        i.qtyPerCs,
        i.mrp || '',
        i.palletRequirement || 'Floor Loading',
      ]),
      'GlobalFutura_Master_Sheet_Summary'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Master Enterprise Parties</span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
            {parties.length} Verified Accounts
          </div>
          <div className="text-[11px] text-slate-400 mt-1">India, GCC, USA, Canada, UK & Global</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Master Catalog SKUs</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {masterItems.length} Products
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Bottles, Buckets, Squeezies & Clip Jars</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Standard Export Protocol</span>
          </div>
          <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
            100% Interlinked
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Synced to BOM & Dispatch schedules</div>
        </div>
      </div>

      {/* Control Bar: Search & Exports */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Party, SKU Code, Description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={selectedParty}
            onChange={e => setSelectedParty(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
          >
            <option value="all">All Parties ({parties.length})</option>
            {parties.map(p => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportXLS}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Download full master sheet as PDF"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Master PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Download full master sheet as PDF (summary)"
          >
            <Download className="w-4 h-4" />
            <span>PDF Summary</span>
          </button>
        </div>
      </div>

      {/* Main Master Sheet Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider">
              May 2026 Master Production & SKU Registry
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-300">
            {filteredItems.length} Master SKU Configurations
          </span>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-[10.5px] uppercase font-bold text-slate-600 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3 w-20 text-center">Party Code</th>
                <th className="py-2.5 px-3 min-w-[200px]">Party Name</th>
                <th className="py-2.5 px-3 w-28">SKU Code</th>
                <th className="py-2.5 px-3 min-w-[260px]">Product / Sku Name</th>
                <th className="py-2.5 px-2 text-center w-24">Pack Size</th>
                <th className="py-2.5 px-2 text-center w-20">Qty/Cs</th>
                <th className="py-2.5 px-3 text-right w-24">Quoted MRP</th>
                <th className="py-2.5 px-3">Pallet Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No items found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-center">
                      <button
                        onClick={() => {
                          if (onSelectParty) {
                            SoundEngine.play('pop');
                            onSelectParty({ code: item.partyCode, name: item.partyName });
                          }
                        }}
                        className="px-2 py-0.5 rounded text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
                        title="Click to open complete Party Dossier"
                      >
                        {item.partyCode}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                      <button
                        onClick={() => {
                          if (onSelectParty) {
                            SoundEngine.play('pop');
                            onSelectParty({ code: item.partyCode, name: item.partyName });
                          }
                        }}
                        className="text-left hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center justify-between gap-1 w-full group cursor-pointer"
                        title="Click to open complete Party Dossier"
                      >
                        <span className="truncate group-hover:underline">{item.partyName}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.skuCode}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                      {item.skuName}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium">
                      {item.packSize}g
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                      {item.qtyPerCs}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {item.mrp ? `₹${item.mrp}` : 'Export Spec'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                        {item.palletRequirement || 'Floor Loading'}
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
  );
};
