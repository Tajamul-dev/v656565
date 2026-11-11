import React, { useState, useMemo } from 'react';
import {
  PackingOrder,
  InventoryItem,
  MaterialKey,
  MaterialStatus,
  PriorityLevel,
} from '../types';
import {
  PACKING_MATERIALS_LIST,
  getUnitsPerCase,
} from '../utils/constants';
import {
  computeWaterfallAvailability,
  computePMProgress,
  formatVolumeShort,
} from '../utils/calculations';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Printer,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Check,
  X,
  FileDown,
  Camera,
} from 'lucide-react';
import { SoundEngine } from '../utils/audio';

interface PackingTrackerViewProps {
  orders: PackingOrder[];
  inventory: InventoryItem[];
  clients: string[];
  itemsList: string[];
  brands: string[];
  skusList: string[];
  onSaveOrders: (orders: PackingOrder[]) => void;
  onRefreshInventory: () => void;
  onOpenScanBill: () => void;
}

export const PackingTrackerView: React.FC<PackingTrackerViewProps> = ({
  orders,
  inventory,
  clients,
  itemsList,
  brands,
  skusList,
  onSaveOrders,
  onRefreshInventory,
  onOpenScanBill,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [invOverviewExpanded, setInvOverviewExpanded] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PackingOrder | null>(null);

  // Form fields
  const [formContainer, setFormContainer] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formItem, setFormItem] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formQty, setFormQty] = useState<number>(2000);
  const [formPriority, setFormPriority] = useState<PriorityLevel>('normal');
  const [formRemarks, setFormRemarks] = useState('');

  // Status picker modal
  const [statusPickerTarget, setStatusPickerTarget] = useState<{
    orderId: string;
    matKey: MaterialKey;
    matLabel: string;
    currentStatus: MaterialStatus;
    currentDate?: string;
  } | null>(null);
  const [pickerStatus, setPickerStatus] = useState<MaterialStatus>('notstarted');
  const [pickerDate, setPickerDate] = useState('');

  // Filter orders
  const filteredOrders = useMemo(() => {
    let result = orders.filter(o => !o.archived);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        o =>
          (o.container || '').toLowerCase().includes(q) ||
          (o.customer || '').toLowerCase().includes(q) ||
          (o.item || '').toLowerCase().includes(q) ||
          (o.sku || '').toLowerCase().includes(q) ||
          (o.brand || '').toLowerCase().includes(q)
      );
    }

    if (clientFilter) {
      result = result.filter(o => o.customer === clientFilter);
    }

    if (priorityFilter) {
      result = result.filter(o => o.priority === priorityFilter);
    }

    if (statusFilter) {
      result = result.filter(o => {
        const prog = computePMProgress(o);
        if (statusFilter === 'complete') return prog.isComplete;
        if (statusFilter === 'pending') return !prog.isComplete;
        return true;
      });
    }

    return result;
  }, [orders, searchTerm, clientFilter, priorityFilter, statusFilter]);

  // Waterfall availability
  const waterfallMap = useMemo(() => {
    return computeWaterfallAvailability(filteredOrders, inventory);
  }, [filteredOrders, inventory]);

  // Material summary for the top collapsible overview
  const materialInventorySummary = useMemo(() => {
    const summary: Record<MaterialKey, { total: number; items: InventoryItem[] }> = {
      preform: { total: 0, items: [] },
      bottle:  { total: 0, items: [] },
      cap:     { total: 0, items: [] },
      wad:     { total: 0, items: [] },
      cst:     { total: 0, items: [] },
      carton:  { total: 0, items: [] },
      label:   { total: 0, items: [] },
      pallet:  { total: 0, items: [] },
    };

    inventory.forEach(item => {
      if (item.materialType !== 'none' && item.quantity > 0) {
        summary[item.materialType].total += item.quantity;
        summary[item.materialType].items.push(item);
      }
    });

    return summary;
  }, [inventory]);

  // Handle reordering
  const handleMoveOrder = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= filteredOrders.length) return;

    SoundEngine.play('pop');
    const newFiltered = [...filteredOrders];
    const temp = newFiltered[index];
    newFiltered[index] = newFiltered[targetIdx];
    newFiltered[targetIdx] = temp;

    // Map back into full orders array preserving order
    const updated = orders.map(o => {
      const match = newFiltered.find(nf => nf.id === o.id);
      return match || o;
    });

    onSaveOrders(updated);
  };

  const handleSortByProgress = () => {
    SoundEngine.play('whoosh');
    const sorted = [...orders].sort((a, b) => {
      const pA = computePMProgress(a).pct;
      const pB = computePMProgress(b).pct;
      return pB - pA;
    });
    onSaveOrders(sorted);
  };

  const handleOpenAddModal = (order?: PackingOrder) => {
    SoundEngine.play('pop');
    if (order) {
      setEditingOrder(order);
      setFormContainer(order.container);
      setFormClient(order.customer);
      setFormItem(order.item);
      setFormSku(order.sku);
      setFormBrand(order.brand);
      setFormQty(order.qty);
      setFormPriority(order.priority);
      setFormRemarks(order.remarks);
    } else {
      setEditingOrder(null);
      setFormContainer(`CONT-${Math.floor(1000 + Math.random() * 9000)}`);
      setFormClient(clients[0] || 'Dream Wholesale');
      setFormItem(itemsList[0] || 'Mustard Oil');
      setFormSku(skusList[0] || '1 L (33.8 oz) x 12 PET');
      setFormBrand(brands[0] || 'Futura');
      setFormQty(2100);
      setFormPriority('normal');
      setFormRemarks('');
    }
    setIsModalOpen(true);
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    SoundEngine.play('success');

    if (editingOrder) {
      const updated = orders.map(o =>
        o.id === editingOrder.id
          ? {
              ...o,
              container: formContainer,
              customer: formClient,
              item: formItem,
              sku: formSku,
              brand: formBrand,
              qty: formQty,
              priority: formPriority,
              remarks: formRemarks,
            }
          : o
      );
      onSaveOrders(updated);
    } else {
      const newOrder: PackingOrder = {
        id: `OIL-${Date.now()}`,
        container: formContainer,
        customer: formClient,
        item: formItem,
        sku: formSku,
        brand: formBrand,
        qty: formQty,
        priority: formPriority,
        remarks: formRemarks,
        createdAt: new Date().toISOString().split('T')[0],
        materials: {
          preform: { status: 'notstarted' },
          bottle:  { status: 'notstarted' },
          cap:     { status: 'notstarted' },
          wad:     { status: 'notstarted' },
          cst:     { status: 'notstarted' },
          carton:  { status: 'notstarted' },
          label:   { status: 'notstarted' },
          pallet:  { status: 'notstarted' },
        },
      };
      onSaveOrders([newOrder, ...orders]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteOrder = (id: string) => {
    if (!window.confirm('Delete this container packing order?')) return;
    SoundEngine.play('thud');
    onSaveOrders(orders.filter(o => o.id !== id));
  };

  const handleOpenStatusPicker = (orderId: string, matKey: MaterialKey, matLabel: string) => {
    SoundEngine.play('pop');
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const current = order.materials?.[matKey] || { status: 'notstarted' };
    setStatusPickerTarget({
      orderId,
      matKey,
      matLabel,
      currentStatus: current.status,
      currentDate: current.date,
    });
    setPickerStatus(current.status);
    setPickerDate(current.date || '');
  };

  const handleApplyStatus = (status: MaterialStatus) => {
    if (!statusPickerTarget) return;
    SoundEngine.play('tick');
    const { orderId, matKey } = statusPickerTarget;

    const updated = orders.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        materials: {
          ...o.materials,
          [matKey]: {
            status,
            date: pickerDate || undefined,
          },
        },
      };
    });

    onSaveOrders(updated);
    setStatusPickerTarget(null);
  };

  const getStatusBadge = (status: MaterialStatus) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', bg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300', dot: 'bg-emerald-600' };
      case 'received':
        return { label: 'Received', bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200', dot: 'bg-emerald-500' };
      case 'available':
        return { label: 'In Stock', bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200', dot: 'bg-blue-500' };
      case 'delivery':
        return { label: 'In Transit', bg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200', dot: 'bg-orange-500' };
      case 'ordered':
        return { label: 'PO Placed', bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200', dot: 'bg-amber-500' };
      case 'na':
        return { label: 'N/A', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' };
      default:
        return { label: 'Pending', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200', dot: 'bg-rose-500' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Warehouse Materials Overview (Collapsible) */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-teal-950/40 dark:to-slate-900 border-2 border-teal-500/50 rounded-2xl p-4 shadow-sm transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-teal-950 dark:text-teal-200">
                Live Packaging Inventory Waterfall Pool
              </h3>
              <p className="text-[11px] text-teal-800 dark:text-teal-400 font-medium">
                Live synchronization with Inventory Module. Materials deduct sequentially through the queue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                SoundEngine.play('pop');
                onRefreshInventory();
              }}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 hover:bg-teal-100/50 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button
              onClick={() => {
                SoundEngine.play('tick');
                setInvOverviewExpanded(!invOverviewExpanded);
              }}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 flex items-center gap-1"
            >
              {invOverviewExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {invOverviewExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {invOverviewExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-teal-200/60 dark:border-teal-800/60">
            {PACKING_MATERIALS_LIST.map(pm => {
              const summary = materialInventorySummary[pm.key];
              const isLow = summary.total <= 0;
              return (
                <div
                  key={pm.key}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isLow
                      ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/30 dark:border-rose-900'
                      : 'bg-white/90 dark:bg-slate-800/80 border-teal-200 dark:border-teal-800/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <span>{pm.emoji}</span>
                      <span>{pm.short}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">{pm.label}</span>
                  </div>
                  <div
                    className={`text-sm font-black font-mono tabular-nums mt-1 ${
                      isLow ? 'text-rose-600' : 'text-teal-800 dark:text-teal-300'
                    }`}
                  >
                    {summary.total.toLocaleString()} <span className="text-[10px] font-normal">pcs</span>
                  </div>
                  <div className="text-[9.5px] text-slate-500 truncate mt-0.5" title={summary.items.map(i => i.name).join(', ')}>
                    {summary.items.length > 0 ? `${summary.items.length} SKUs in stock` : 'Out of stock'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Control Toolbar */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search container, client, SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="">All Priorities</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="priority">🟠 Priority</option>
            <option value="advance">🟢 Advance Paid</option>
            <option value="partial">🟡 Partial Advance</option>
            <option value="normal">⚪ Normal</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="">All PM Status</option>
            <option value="complete">✅ 100% Complete</option>
            <option value="pending">⏳ Materials Pending</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenScanBill()}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Inward Bill</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>

          <button
            onClick={handleSortByProgress}
            className="px-3 py-1.5 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-purple-100 transition-colors"
            title="Sort orders by packaging completion percentage"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort PM%</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Transparent Procurement Grid */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white text-[10.5px] uppercase tracking-wider font-black">
              <tr>
                <th className="py-2.5 px-2 w-10 text-center">Move</th>
                <th className="py-2.5 px-2 w-10 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[120px]">Container</th>
                <th className="py-2.5 px-2.5 min-w-[90px]">Priority</th>
                <th className="py-2.5 px-3 min-w-[140px]">Client</th>
                <th className="py-2.5 px-3 min-w-[120px]">Product</th>
                <th className="py-2.5 px-3 min-w-[160px]">SKU / Pack Size</th>
                <th className="py-2.5 px-2 text-right min-w-[70px]">Cartons</th>
                <th className="py-2.5 px-2 text-center min-w-[50px]">Units</th>

                {/* 8 Packaging Materials Columns */}
                {PACKING_MATERIALS_LIST.map(pm => (
                  <th key={pm.key} className="py-2.5 px-2 text-center min-w-[105px] border-l border-slate-800">
                    <div className="flex items-center justify-center gap-1">
                      <span>{pm.emoji}</span>
                      <span>{pm.short}</span>
                    </div>
                  </th>
                ))}

                <th className="py-2.5 px-3 text-center min-w-[100px] border-l border-slate-800">PM Status</th>
                <th className="py-2.5 px-3 min-w-[150px] border-l border-slate-800">Remarks</th>
                <th className="py-2.5 px-2 text-center w-16 border-l border-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={22} className="py-12 text-center text-slate-400 font-medium">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const avail = waterfallMap[order.id] || {};
                  const progress = computePMProgress(order);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Move Order */}
                      <td className="py-2 px-1 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveOrder(idx, -1)}
                            className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={idx === filteredOrders.length - 1}
                            onClick={() => handleMoveOrder(idx, 1)}
                            className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Index */}
                      <td className="py-2 px-2 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      {/* Container */}
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {order.container}
                      </td>

                      {/* Priority */}
                      <td className="py-2 px-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                            order.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : order.priority === 'priority'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                              : order.priority === 'advance'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {order.priority}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {order.customer}
                      </td>

                      {/* Item */}
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        {order.item}
                      </td>

                      {/* SKU */}
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {order.sku}
                      </td>

                      {/* Cartons */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {order.qty.toLocaleString()}
                      </td>

                      {/* Units */}
                      <td className="py-2 px-2 text-center font-mono text-slate-500">
                        {getUnitsPerCase(order.sku)}
                      </td>

                      {/* 8 Packaging Materials Interactive Cells */}
                      {PACKING_MATERIALS_LIST.map(pm => {
                        const entry = order.materials?.[pm.key] || { status: 'notstarted' };
                        const statusInfo = getStatusBadge(entry.status);
                        const avData = avail[pm.key] || { req: 0, stock: 0, isReady: false, isNA: false };
                        const isGreenReady = avData.isReady && !avData.isNA;

                        return (
                          <td
                            key={pm.key}
                            onClick={() => handleOpenStatusPicker(order.id, pm.key, pm.label)}
                            className="py-1 px-1.5 text-center border-l border-slate-100 dark:border-slate-800 cursor-pointer"
                          >
                            <div
                              className={`p-1.5 rounded-lg border text-left transition-all hover:scale-105 ${
                                isGreenReady
                                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30'
                                  : statusInfo.bg
                              }`}
                            >
                              <div className="flex items-center justify-between text-[9.5px] font-bold">
                                <span className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                  <span>{statusInfo.label}</span>
                                </span>
                                {isGreenReady && (
                                  <span className="text-[8px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                                    Ready
                                  </span>
                                )}
                              </div>

                              {!avData.isNA ? (
                                <div className="mt-1 font-mono text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                                  <div className="flex justify-between">
                                    <span>Req:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                      {avData.req.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Stk:</span>
                                    <span
                                      className={`font-bold ${
                                        avData.stock >= avData.req
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}
                                    >
                                      {avData.stock.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[9px] text-slate-400 text-center mt-1">N/A</div>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* PM Progress */}
                      <td className="py-2 px-3 text-center border-l border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                progress.pct >= 100
                                  ? 'bg-emerald-500'
                                  : progress.pct >= 70
                                  ? 'bg-teal-500'
                                  : progress.pct >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${progress.pct}%` }}
                            />
                          </div>
                          <div className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                            {progress.pct}% ({progress.done}/{progress.total})
                          </div>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-2 px-3 border-l border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                        {order.remarks || (
                          progress.isComplete ? (
                            <span className="text-emerald-600 font-bold">All Materials Complete</span>
                          ) : (
                            <span className="text-amber-600">{progress.pendingMaterials.join(', ')} awaited</span>
                          )
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 text-center border-l border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAddModal(order)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Edit Order"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                {editingOrder ? '✏️ Edit Packing Order' : '📦 New Container Packing Order'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Container # *
                  </label>
                  <input
                    type="text"
                    required
                    value={formContainer}
                    onChange={e => setFormContainer(e.target.value)}
                    placeholder="e.g. MEDU782194"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Priority *
                  </label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="priority">🟠 Priority</option>
                    <option value="advance">🟢 Advance Paid</option>
                    <option value="partial">🟡 Partial Advance</option>
                    <option value="normal">⚪ Normal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Customer / Client *
                  </label>
                  <select
                    value={formClient}
                    onChange={e => setFormClient(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    {clients.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Product Commodity *
                  </label>
                  <select
                    value={formItem}
                    onChange={e => setFormItem(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    {itemsList.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Master SKU (Pack Size) *
                  </label>
                  <select
                    value={formSku}
                    onChange={e => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                  >
                    {skusList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    placeholder="e.g. Futura Nature's Best"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Quantity (Cartons/Cases) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formQty}
                    onChange={e => setFormQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    Total bottles: {(formQty * getUnitsPerCase(formSku)).toLocaleString()} pcs
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Internal Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={formRemarks}
                    onChange={e => setFormRemarks(e.target.value)}
                    placeholder="e.g. Awaiting label delivery..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm"
                >
                  {editingOrder ? 'Update Order' : 'Save Container Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Status Picker Modal */}
      {statusPickerTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Update {statusPickerTarget.matLabel} Status
                </h4>
                <p className="text-[10px] text-slate-500">Order: {statusPickerTarget.orderId}</p>
              </div>
              <button
                onClick={() => setStatusPickerTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 mb-4">
              {[
                { status: 'approved' as MaterialStatus, label: 'Approved (QC Passed)', icon: '✅' },
                { status: 'received' as MaterialStatus, label: 'Physically Received at Plant', icon: '📦' },
                { status: 'available' as MaterialStatus, label: 'Available in Stock', icon: '🟢' },
                { status: 'delivery' as MaterialStatus, label: 'In Transit / Delivery Expected', icon: '🚚' },
                { status: 'ordered' as MaterialStatus, label: 'Purchase Order Placed', icon: '🛒' },
                { status: 'notstarted' as MaterialStatus, label: 'Not Started / Pending', icon: '⏳' },
                { status: 'na' as MaterialStatus, label: 'Not Applicable for SKU', icon: '⚪' },
              ].map(opt => (
                <button
                  key={opt.status}
                  onClick={() => handleApplyStatus(opt.status)}
                  className={`w-full px-3 py-2 text-left rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                    statusPickerTarget.currentStatus === opt.status
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </span>
                  {statusPickerTarget.currentStatus === opt.status && (
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Scheduled / ETA Date (Optional)
              </label>
              <input
                type="date"
                value={pickerDate}
                onChange={e => setPickerDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
