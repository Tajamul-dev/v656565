import React, { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Calendar,
  MapPin,
  CheckCircle2,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DispatchRecord } from '../types';
import { SoundEngine } from '../utils/audio';
import { exportTablePDF } from '../utils/pdfExport';

interface DispatchViewProps {
  dispatches: DispatchRecord[];
  onAddDispatch?: (record: DispatchRecord) => void;
}

export const DispatchView: React.FC<DispatchViewProps> = ({ dispatches, onAddDispatch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Filtered dispatches
  const filteredDispatches = useMemo(() => {
    return dispatches.filter(d => {
      const matchSearch =
        d.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.dispatchLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchLocation =
        selectedLocation === 'all' || d.dispatchLocation.toLowerCase().includes(selectedLocation.toLowerCase());
      const matchMonth = selectedMonth === 'all' || d.month === selectedMonth;

      return matchSearch && matchLocation && matchMonth;
    });
  }, [dispatches, searchQuery, selectedLocation, selectedMonth]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCs = filteredDispatches.reduce((acc, d) => acc + d.dispatchCs, 0);
    const totalNos = filteredDispatches.reduce((acc, d) => acc + d.dispatchNos, 0);
    const totalMt = filteredDispatches.reduce((acc, d) => acc + d.dispatchMt, 0);
    const uniqueInvoices = new Set(filteredDispatches.map(d => d.invoiceNo)).size;

    return {
      totalCs,
      totalNos,
      totalMt: Math.round(totalMt * 100) / 100,
      uniqueInvoices,
    };
  }, [filteredDispatches]);

  // Unique locations
  const locations = useMemo(() => {
    const set = new Set<string>();
    dispatches.forEach(d => {
      if (d.dispatchLocation) set.add(d.dispatchLocation);
    });
    return Array.from(set);
  }, [dispatches]);

  const handleExportXLS = () => {
    SoundEngine.play('export');
    exportTablePDF(
      'Dispatches',
      ['Invoice No', 'Invoice Date', 'Month', 'Product Code', 'Product Name', 'Batch No', 'Case Pack', 'Dispatch Cs', 'Dispatch Nos', 'Pack Size (g)', 'Dispatch MT', 'Destination', 'Pallet Config', 'Moisture', 'HMF', 'Color', 'Special Instructions'],
      filteredDispatches.map(d => [
        d.invoiceNo,
        d.invoiceDate,
        d.month,
        d.productCode,
        d.productName,
        d.batchNo,
        d.casePack,
        d.dispatchCs,
        d.dispatchNos,
        d.packSize,
        d.dispatchMt,
        d.dispatchLocation,
        d.palletConfig || 'Standard',
        d.moisture || '—',
        d.hmf || '—',
        d.color || '—',
        d.specialInstructions || '—',
      ]),
      'GlobalFutura_Dispatch_Master'
    );
  };

  const handleExportCSV = () => {
    SoundEngine.play('export');
    exportTablePDF(
      'Dispatches — Summary',
      ['Invoice No', 'Invoice Date', 'Month', 'Product Code', 'Product Name', 'Batch No', 'Case Pack', 'Dispatch Cs', 'Dispatch Nos', 'Pack Size', 'Dispatch MT', 'Destination'],
      filteredDispatches.map(d => [
        d.invoiceNo,
        d.invoiceDate,
        d.month,
        d.productCode,
        d.productName,
        d.batchNo,
        d.casePack,
        d.dispatchCs,
        d.dispatchNos,
        d.packSize,
        d.dispatchMt,
        d.dispatchLocation,
      ]),
      'GlobalFutura_Dispatches_Summary'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Truck className="w-4 h-4 text-blue-600" />
            <span>Total Dispatched</span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
            {stats.totalCs.toLocaleString()} <span className="text-sm font-medium text-slate-500">Cases</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {stats.totalNos.toLocaleString()} bottles / jars
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Net Weight Dispatched</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.totalMt} <span className="text-sm font-medium">Metric Tons</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {(stats.totalMt * 1000).toLocaleString()} KG Net Honey / Oil
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Invoices Processed</span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
            {stats.uniqueInvoices} <span className="text-sm font-medium text-slate-500">Export Invoices</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Direct port consignments</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>Destinations</span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
            {locations.length} Ports
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {locations.slice(0, 3).join(', ')}
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, XLS / CSV */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Invoice, Batch, Product, Port..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
          >
            <option value="all">All Port Destinations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
          >
            <option value="all">All Months</option>
            <option value="Apr-26">Apr-26</option>
            <option value="May-26">May-26</option>
            <option value="Jun-26">Jun-26</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportXLS}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Download full dispatch log as Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Dispatch XLS</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Download full dispatch log as CSV"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Main Dispatch Details Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-black uppercase tracking-wider">
              Container Dispatch & Stuffing Log (May 2026 Audit Trail)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-300">
            {filteredDispatches.length} Consignments Recorded
          </span>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-[10.5px] uppercase font-bold text-slate-600 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-2">Date</th>
                <th className="py-2.5 px-2">SKU Code</th>
                <th className="py-2.5 px-3 min-w-[200px]">Product Name</th>
                <th className="py-2.5 px-2 font-mono">Batch No</th>
                <th className="py-2.5 px-2 text-center">Case Pack</th>
                <th className="py-2.5 px-2 text-right font-bold text-blue-700 dark:text-blue-300">
                  Dispatched Cs
                </th>
                <th className="py-2.5 px-2 text-right font-mono">Units (Nos)</th>
                <th className="py-2.5 px-2 text-right font-bold text-emerald-700 dark:text-emerald-300">
                  Dispatch MT
                </th>
                <th className="py-2.5 px-3 min-w-[130px]">Destination</th>
                <th className="py-2.5 px-2">Pallet Config</th>
                <th className="py-2.5 px-2">Quality Specs</th>
                <th className="py-2.5 px-3">Special Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                    No dispatches matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredDispatches.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {d.invoiceNo}
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 font-mono whitespace-nowrap">
                      {d.invoiceDate}
                    </td>
                    <td className="py-2.5 px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {d.productCode}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {d.productName}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 px-1.5 rounded">
                      {d.batchNo}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                      {d.casePack}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-black text-blue-700 dark:text-blue-300">
                      {d.dispatchCs.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-500">
                      {d.dispatchNos.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-700 dark:text-emerald-300">
                      {d.dispatchMt} MT
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{d.dispatchLocation}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-500">
                      {d.palletConfig || '1*90'}
                    </td>
                    <td className="py-2.5 px-2 text-[10.5px] font-mono text-slate-600 dark:text-slate-400">
                      {d.moisture ? `M:${d.moisture} • HMF:${d.hmf}` : 'Standard Grade'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500 max-w-[180px] truncate">
                      {d.specialInstructions || 'Direct customs clearance'}
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
