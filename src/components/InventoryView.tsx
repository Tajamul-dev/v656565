import React, { useState, useMemo } from 'react';
import { InventoryItem, MaterialKey } from '../types';
import {
  Search,
  Plus,
  FileDown,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  PlusCircle,
  MinusCircle,
  Tag,
  DollarSign,
  Package,
  Camera,
} from 'lucide-react';
import { SoundEngine } from '../utils/audio';
import { fmtStr } from '../utils/calculations';

interface InventoryViewProps {
  inventory: InventoryItem[];
  masterSkus: string[];
  onSaveInventory: (items: InventoryItem[]) => void;
  onRefresh?: () => void;
  onOpenScanBill: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  masterSkus,
  onSaveInventory,
  onOpenScanBill,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Packaging' | 'Raw Material' | 'Finished Goods'>('Packaging');
  const [formMaterialType, setFormMaterialType] = useState<MaterialKey | 'none'>('preform');
  const [formLinkedSku, setFormLinkedSku] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formMinLevel, setFormMinLevel] = useState(0);
  const [formCost, setFormCost] = useState(0);
  const [formNotes, setFormNotes] = useState('');

  // Quick adjust popover
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1000);

  const getItemStatus = (item: InventoryItem) => {
    if (item.quantity <= 0) return 'out';
    if (item.minLevel > 0 && item.quantity <= item.minLevel) return 'low';
    return 'ok';
  };

  const filteredItems = useMemo(() => {
    let result = [...inventory];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.linkedSku || '').toLowerCase().includes(q) ||
          (i.notes || '').toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      result = result.filter(i => i.category === categoryFilter);
    }

    if (materialFilter) {
      result = result.filter(i => i.materialType === materialFilter);
    }

    if (statusFilter) {
      result = result.filter(i => getItemStatus(i) === statusFilter);
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, searchTerm, categoryFilter, materialFilter, statusFilter]);

  // Summary Metrics
  const totalItems = inventory.length;
  const totalValue = inventory.reduce((sum, item) => sum + item.quantity * item.cost, 0);
  const lowCount = inventory.filter(i => getItemStatus(i) === 'low').length;
  const outCount = inventory.filter(i => getItemStatus(i) === 'out').length;

  const handleOpenModal = (item?: InventoryItem) => {
    SoundEngine.play('pop');
    if (item) {
      setEditingItem(item);
      setFormSku(item.sku);
      setFormName(item.name);
      setFormCategory(item.category);
      setFormMaterialType(item.materialType);
      setFormLinkedSku(item.linkedSku);
      setFormUnit(item.unit);
      setFormQuantity(item.quantity);
      setFormMinLevel(item.minLevel);
      setFormCost(item.cost);
      setFormNotes(item.notes);
    } else {
      setEditingItem(null);
      setFormSku(`SKU-${Math.floor(100 + Math.random() * 900)}`);
      setFormName('');
      setFormCategory('Packaging');
      setFormMaterialType('preform');
      setFormLinkedSku(masterSkus[0] || '1 L (33.8 oz) x 12 PET');
      setFormUnit('pcs');
      setFormQuantity(5000);
      setFormMinLevel(2000);
      setFormCost(10);
      setFormNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    SoundEngine.play('success');

    if (editingItem) {
      const updated = inventory.map(i =>
        i.id === editingItem.id
          ? {
              ...i,
              sku: formSku,
              name: formName,
              category: formCategory,
              materialType: formMaterialType,
              linkedSku: formLinkedSku,
              unit: formUnit,
              quantity: formQuantity,
              minLevel: formMinLevel,
              cost: formCost,
              notes: formNotes,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
      onSaveInventory(updated);
    } else {
      const newItem: InventoryItem = {
        id: `ITM-${Date.now()}`,
        sku: formSku,
        name: formName,
        category: formCategory,
        materialType: formMaterialType,
        linkedSku: formLinkedSku,
        unit: formUnit,
        quantity: formQuantity,
        minLevel: formMinLevel,
        cost: formCost,
        notes: formNotes,
        updatedAt: new Date().toISOString(),
      };
      onSaveInventory([newItem, ...inventory]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (!window.confirm(`Delete inventory item "${name}"?`)) return;
    SoundEngine.play('thud');
    onSaveInventory(inventory.filter(i => i.id !== id));
  };

  const handleQuickAdjustStock = (id: string, delta: number) => {
    SoundEngine.play('tick');
    const updated = inventory.map(i => {
      if (i.id !== id) return i;
      return {
        ...i,
        quantity: Math.max(0, i.quantity + delta),
        updatedAt: new Date().toISOString(),
      };
    });
    onSaveInventory(updated);
    setAdjustingId(null);
  };

  const exportCSV = () => {
    SoundEngine.play('pop');
    const headers = ['Item Code', 'Item Name', 'Category', 'Material Type', 'Linked Master SKU', 'Unit', 'On Hand', 'Min Level', 'Cost/Unit', 'Total Value INR', 'Status'];
    const rows = inventory.map(i => [
      i.sku,
      i.name,
      i.category,
      i.materialType,
      i.linkedSku,
      i.unit,
      i.quantity,
      i.minLevel,
      i.cost,
      fmtStr(i.quantity * i.cost),
      getItemStatus(i).toUpperCase(),
    ]);

    const csvEscape = (v: string | number) => {
      const s = String(v == null ? '' : v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    let csv = headers.map(csvEscape).join(',') + '\n';
    rows.forEach(r => {
      csv += r.map(csvEscape).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Global_Futura_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMaterialBadgeStyle = (mat: MaterialKey | 'none') => {
    switch (mat) {
      case 'preform':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200';
      case 'bottle':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200';
      case 'cap':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-200';
      case 'wad':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200';
      case 'cst':
        return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
      case 'carton':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
      case 'label':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200';
      case 'pallet':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Items</div>
          <div className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {totalItems}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active catalog SKUs</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inventory Value</div>
          <div className="text-2xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{fmtStr(totalValue / 100000)} L
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total valuation at cost</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Low Stock Alerts</div>
          <div className="text-2xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {lowCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Below reorder minimum</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Out of Stock</div>
          <div className="text-2xl font-black font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {outCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Urgent procurement required</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, item name, linked SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="">All Categories</option>
            <option value="Packaging">📦 Packaging</option>
            <option value="Raw Material">🛢️ Raw Material</option>
            <option value="Finished Goods">✅ Finished Goods</option>
          </select>

          <select
            value={materialFilter}
            onChange={e => setMaterialFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="">All Material Types</option>
            <option value="preform">🧪 Preform</option>
            <option value="bottle">🍶 Bottle</option>
            <option value="cap">🔘 Cap</option>
            <option value="wad">⭕ Wad</option>
            <option value="cst">📏 CST</option>
            <option value="carton">📦 Carton</option>
            <option value="label">🏷️ Label</option>
            <option value="pallet">🪵 Pallet</option>
            <option value="none">📎 Non-Packaging</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="ok">✅ In Stock</option>
            <option value="low">⚠️ Low Stock</option>
            <option value="out">❌ Out of Stock</option>
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
            onClick={() => handleOpenModal()}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Item</span>
          </button>

          <button
            onClick={exportCSV}
            className="px-3 py-1.5 border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white text-[10.5px] uppercase tracking-wider font-black">
              <tr>
                <th className="py-2.5 px-3 min-w-[100px]">Item Code</th>
                <th className="py-2.5 px-3 min-w-[220px]">Item Description</th>
                <th className="py-2.5 px-3 min-w-[180px]">Key Line Dimension (Master SKU)</th>
                <th className="py-2.5 px-2.5 min-w-[110px]">Type</th>
                <th className="py-2.5 px-3 text-right min-w-[110px]">On Hand</th>
                <th className="py-2.5 px-2 text-center w-14">Unit</th>
                <th className="py-2.5 px-3 text-right min-w-[90px]">Min Level</th>
                <th className="py-2.5 px-3 text-right min-w-[100px]">Cost / Unit</th>
                <th className="py-2.5 px-3 text-center min-w-[90px]">Status</th>
                <th className="py-2.5 px-2 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    No inventory items found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const status = getItemStatus(item);
                  const isAdjusting = adjustingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        status === 'out'
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : status === 'low'
                          ? 'bg-amber-50/40 dark:bg-amber-950/20'
                          : ''
                      }`}
                    >
                      {/* Code */}
                      <td className="py-2 px-3 font-mono font-bold text-slate-500 text-[11px]">
                        {item.sku}
                      </td>

                      {/* Name */}
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {item.name}
                        {item.notes && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-sm mt-0.5">
                            {item.notes}
                          </div>
                        )}
                      </td>

                      {/* Linked Master SKU */}
                      <td className="py-2 px-3 font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {item.linkedSku || '—'}
                      </td>

                      {/* Material Type Badge */}
                      <td className="py-2 px-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getMaterialBadgeStyle(
                            item.materialType
                          )}`}
                        >
                          {item.materialType}
                        </span>
                      </td>

                      {/* On Hand + Quick Adjustment */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className={`font-mono font-black text-sm tabular-nums ${
                              status === 'out'
                                ? 'text-rose-600'
                                : status === 'low'
                                ? 'text-amber-600'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.quantity.toLocaleString()}
                          </span>

                          <button
                            onClick={() => {
                              SoundEngine.play('tick');
                              setAdjustingId(isAdjusting ? null : item.id);
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Quick Adjust Stock"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick stock popover */}
                        {isAdjusting && (
                          <div className="mt-1 flex items-center justify-end gap-1 animate-in fade-in">
                            <button
                              onClick={() => handleQuickAdjustStock(item.id, -1000)}
                              className="px-1.5 py-0.5 text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded font-bold"
                            >
                              -1k
                            </button>
                            <button
                              onClick={() => handleQuickAdjustStock(item.id, 1000)}
                              className="px-1.5 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-bold"
                            >
                              +1k
                            </button>
                            <button
                              onClick={() => handleQuickAdjustStock(item.id, 5000)}
                              className="px-1.5 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-bold"
                            >
                              +5k
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-2 text-center text-slate-500 font-semibold uppercase text-[10.5px]">
                        {item.unit}
                      </td>

                      {/* Min Level */}
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {item.minLevel.toLocaleString()}
                      </td>

                      {/* Cost / Unit */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{fmtStr(item.cost)}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                            status === 'out'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : status === 'low'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {status === 'out' ? 'Out' : status === 'low' ? 'Low' : 'OK'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Delete"
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

      {/* Add / Edit Inventory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                {editingItem ? '✏️ Edit Inventory Item' : '📦 New Inventory Warehouse Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Item Code / SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={e => setFormSku(e.target.value)}
                    placeholder="e.g. PRE-1L-PET"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as never)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="Packaging">📦 Packaging Material</option>
                    <option value="Raw Material">🛢️ Raw Bulk Oil</option>
                    <option value="Finished Goods">✅ Finished Goods</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Item Description / Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. 1L PET Preform 24g Alaska Neck"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Material Type (for Packing Tracker) *
                  </label>
                  <select
                    value={formMaterialType}
                    onChange={e => setFormMaterialType(e.target.value as never)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="preform">🧪 Preform</option>
                    <option value="bottle">🍶 Bottle</option>
                    <option value="cap">🔘 Cap</option>
                    <option value="wad">⭕ Wad</option>
                    <option value="cst">📏 CST (Shrink Tube)</option>
                    <option value="carton">📦 Carton</option>
                    <option value="label">🏷️ Label</option>
                    <option value="pallet">🪵 Pallet</option>
                    <option value="none">📎 Non-Packaging / Bulk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Linked Master SKU
                  </label>
                  <select
                    value={formLinkedSku}
                    onChange={e => setFormLinkedSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                  >
                    <option value="">None / Generic</option>
                    {masterSkus.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    On Hand Qty *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formQuantity}
                    onChange={e => setFormQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formMinLevel}
                    onChange={e => setFormMinLevel(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Cost per Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formCost}
                    onChange={e => setFormCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Technical Specifications / Supplier Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g. Supplier: Manjushree Technopack, Batch: 2026-B4, Virgin Food-Grade resin..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
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
                  {editingItem ? 'Update Item' : 'Save Warehouse Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
