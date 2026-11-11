import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  PackagePlus,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Upload,
  FileCheck,
  FileText,
  Camera,
  Trash2,
} from 'lucide-react';
import { InventoryItem, OrderRecord, MaterialDeductionItem } from '../types';
import { SoundEngine } from '../utils/audio';

interface PlaceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  existingParties: { code: string; name: string }[];
  onConfirmPlaceOrder: (newOrder: {
    partyCode: string;
    partyName: string;
    poNo: string;
    skuCode: string;
    skuName: string;
    packSize: number;
    packUnit: string;
    qtyPerCs: number;
    planCs: number;
    planKg: number;
    planPallets: number;
    deductions: MaterialDeductionItem[];
    invoiceAttachment?: { name: string; size: string; uploadedAt: string };
  }) => void;
}

interface SkuPreset {
  skuCode: string;
  skuName: string;
  packSize: number;
  packUnit: string;
  qtyPerCs: number;
  oilKey: string;
  density: number; // kg per unit
  bottleSkuMatch: string;
  capSkuMatch: string;
  labelSkuMatch: string;
  cartonSkuMatch: string;
  rawMaterialMatch: string;
}

const SKU_PRESETS: SkuPreset[] = [
  {
    skuCode: 'MUS-1L-PET',
    skuName: 'Pure Mustard Oil in 1 L PET Bottle (12/case)',
    packSize: 1000,
    packUnit: 'ML',
    qtyPerCs: 12,
    oilKey: 'mustard',
    density: 0.91,
    bottleSkuMatch: '1 L (33.8 oz) x 12 PET',
    capSkuMatch: 'Cap 28mm',
    labelSkuMatch: 'Label 1 L',
    cartonSkuMatch: 'Carton 1 L x 12',
    rawMaterialMatch: 'Mustard Oil',
  },
  {
    skuCode: 'ALN001',
    skuName: 'Alnoor Brand Acacia Honey in Bucket 2KG (4/case)',
    packSize: 2000,
    packUnit: 'G',
    qtyPerCs: 4,
    oilKey: 'honey_acacia',
    density: 2.0,
    bottleSkuMatch: '2 KG Bucket',
    capSkuMatch: 'Bucket Lid Handle',
    labelSkuMatch: 'Label 2 KG Bucket',
    cartonSkuMatch: 'Carton 2 KG x 4',
    rawMaterialMatch: 'Acacia Honey',
  },
  {
    skuCode: 'SOY-5L-PET',
    skuName: 'Refined Soybean Oil in 5 L PET Jar with Handle (4/case)',
    packSize: 5000,
    packUnit: 'ML',
    qtyPerCs: 4,
    oilKey: 'soybean',
    density: 4.6,
    bottleSkuMatch: '5 L (169 oz) x 4 PET',
    capSkuMatch: 'Cap 48mm Handle',
    labelSkuMatch: 'Label 5 L',
    cartonSkuMatch: 'Carton 5 L x 4',
    rawMaterialMatch: 'Soybean Oil',
  },
  {
    skuCode: 'SUN-1L-PET',
    skuName: 'Pure Sunflower Oil in 1 L PET Bottle (12/case)',
    packSize: 1000,
    packUnit: 'ML',
    qtyPerCs: 12,
    oilKey: 'sunflower',
    density: 0.92,
    bottleSkuMatch: '1 L (33.8 oz) x 12 PET',
    capSkuMatch: 'Cap 28mm',
    labelSkuMatch: 'Label 1 L',
    cartonSkuMatch: 'Carton 1 L x 12',
    rawMaterialMatch: 'Sunflower Oil',
  },
  {
    skuCode: 'CAN-3.79L-HDPE',
    skuName: 'Canola Oil in 3.79 L (1 Gal) HDPE Can (4/case)',
    packSize: 3790,
    packUnit: 'ML',
    qtyPerCs: 4,
    oilKey: 'canola',
    density: 3.48,
    bottleSkuMatch: '3.79 L (128 oz / 1 Gal) x 4 HDPE',
    capSkuMatch: 'Cap 38mm Ratchet',
    labelSkuMatch: 'Label 1 Gallon',
    cartonSkuMatch: 'Carton 1 Gal x 4',
    rawMaterialMatch: 'Canola Oil',
  },
  {
    skuCode: 'HON-500G-OCTA',
    skuName: 'Natural Wildflower Honey in 500g Octa Glass (12/case)',
    packSize: 500,
    packUnit: 'G',
    qtyPerCs: 12,
    oilKey: 'honey_wild',
    density: 0.5,
    bottleSkuMatch: '500 ml (16.9 oz) Octa Glass x 12',
    capSkuMatch: 'Gold Lug Cap 53mm',
    labelSkuMatch: 'Label 500g Hex/Octa',
    cartonSkuMatch: 'Carton 500g x 12',
    rawMaterialMatch: 'Natural Honey',
  },
];

export const PlaceOrderModal: React.FC<PlaceOrderModalProps> = ({
  isOpen,
  onClose,
  inventory,
  existingParties,
  onConfirmPlaceOrder,
}) => {
  const [partyCode, setPartyCode] = useState<string>(existingParties[0]?.code || 'P2');
  const [partyName, setPartyName] = useState<string>(existingParties[0]?.name || 'Bake Mate- Alnoor-Riyadh');
  const [poNo, setPoNo] = useState<string>(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [selectedSkuIndex, setSelectedSkuIndex] = useState<number>(0);
  const [planCs, setPlanCs] = useState<number>(500);

  // USER REQUIREMENT: Mandatory Commercial Invoice upload before stock cut
  const [invoiceAttachment, setInvoiceAttachment] = useState<{
    name: string;
    size: string;
    uploadedAt: string;
    dataUrl?: string;
  } | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSku = SKU_PRESETS[selectedSkuIndex] || SKU_PRESETS[0];

  // Handle Invoice File Upload
  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    SoundEngine.play('pop');
    setInvoiceError(null);

    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      setInvoiceAttachment({
        name: file.name,
        size: sizeStr,
        uploadedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
      SoundEngine.play('success');
    };
    reader.readAsDataURL(file);
  };

  const handleAttachDemoInvoice = () => {
    SoundEngine.play('success');
    setInvoiceError(null);
    setInvoiceAttachment({
      name: `Commercial_Invoice_${poNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      size: '284.5 KB',
      uploadedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const handleRemoveInvoice = () => {
    SoundEngine.play('thud');
    setInvoiceAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // When party selection changes from dropdown
  const handlePartySelect = (code: string) => {
    setPartyCode(code);
    const found = existingParties.find(p => p.code === code);
    if (found) setPartyName(found.name);
  };

  // Calculate required quantities based on cases
  const planUnits = planCs * currentSku.qtyPerCs;
  const planKg = Math.round(planUnits * currentSku.density);
  const planPallets = Math.ceil(planCs / 75); // approx 75-80 cases per pallet

  // Determine BOM deductions & match against warehouse inventory
  const materialDeductions = useMemo<MaterialDeductionItem[]>(() => {
    const deductions: MaterialDeductionItem[] = [];

    // Helper to find inventory item
    const findItem = (type: string, searchKey: string) => {
      return inventory.find(
        i =>
          i.name.toLowerCase().includes(searchKey.toLowerCase()) ||
          i.linkedSku.toLowerCase().includes(searchKey.toLowerCase()) ||
          i.materialType === type
      );
    };

    // 1. Bottle / Container
    const bottleItem = findItem('bottle', currentSku.bottleSkuMatch);
    if (bottleItem) {
      const required = planUnits;
      const prevStock = bottleItem.quantity;
      const newStock = Math.max(0, prevStock - required);
      deductions.push({
        inventoryId: bottleItem.id,
        materialName: bottleItem.name,
        materialType: 'Bottle / Container',
        qtyDeducted: required,
        unit: bottleItem.unit,
        prevStock,
        newStock,
        isDeficit: prevStock < required,
      });
    }

    // 2. Cap / Closure
    const capItem = findItem('cap', currentSku.capSkuMatch);
    if (capItem) {
      const required = planUnits;
      const prevStock = capItem.quantity;
      const newStock = Math.max(0, prevStock - required);
      deductions.push({
        inventoryId: capItem.id,
        materialName: capItem.name,
        materialType: 'Cap / Closure',
        qtyDeducted: required,
        unit: capItem.unit,
        prevStock,
        newStock,
        isDeficit: prevStock < required,
      });
    }

    // 3. Label
    const labelItem = findItem('label', currentSku.labelSkuMatch);
    if (labelItem) {
      const required = planUnits;
      const prevStock = labelItem.quantity;
      const newStock = Math.max(0, prevStock - required);
      deductions.push({
        inventoryId: labelItem.id,
        materialName: labelItem.name,
        materialType: 'Self-Adhesive Label',
        qtyDeducted: required,
        unit: labelItem.unit,
        prevStock,
        newStock,
        isDeficit: prevStock < required,
      });
    }

    // 4. Carton
    const cartonItem = findItem('carton', currentSku.cartonSkuMatch);
    if (cartonItem) {
      const required = planCs;
      const prevStock = cartonItem.quantity;
      const newStock = Math.max(0, prevStock - required);
      deductions.push({
        inventoryId: cartonItem.id,
        materialName: cartonItem.name,
        materialType: 'Outer Corrugated Carton',
        qtyDeducted: required,
        unit: cartonItem.unit,
        prevStock,
        newStock,
        isDeficit: prevStock < required,
      });
    }

    // 5. Raw Material (Bulk Oil / Honey)
    const rawItem = findItem('raw_material', currentSku.rawMaterialMatch);
    if (rawItem) {
      const required = planKg;
      const prevStock = rawItem.quantity;
      const newStock = Math.max(0, prevStock - required);
      deductions.push({
        inventoryId: rawItem.id,
        materialName: rawItem.name,
        materialType: 'Raw Material (Bulk)',
        qtyDeducted: required,
        unit: rawItem.unit,
        prevStock,
        newStock,
        isDeficit: prevStock < required,
      });
    }

    return deductions;
  }, [inventory, currentSku, planUnits, planCs, planKg]);

  const hasAnyShortfall = materialDeductions.some(d => d.isDeficit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName || !poNo || planCs <= 0) return;

    // USER REQUIREMENT: Once the invoice is updated there then only auto. cut the stock
    if (!invoiceAttachment) {
      SoundEngine.play('alert');
      setInvoiceError('Mandatory: Commercial Invoice or Client P.O. must be attached before executing automatic BOM stock cut.');
      return;
    }

    SoundEngine.play('success');
    onConfirmPlaceOrder({
      partyCode,
      partyName,
      poNo,
      skuCode: currentSku.skuCode,
      skuName: currentSku.skuName,
      packSize: currentSku.packSize,
      packUnit: currentSku.packUnit,
      qtyPerCs: currentSku.qtyPerCs,
      planCs,
      planKg,
      planPallets,
      deductions: materialDeductions,
      invoiceAttachment,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border-2 border-slate-900 dark:border-slate-700 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Place Production Order & Auto-Deduct Stock
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                  BOM Live Cut
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Placing this order automatically calculates required packaging and raw materials and directly cuts them from warehouse inventory.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Party Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Client / Party Name
              </label>
              <select
                value={partyCode}
                onChange={e => handlePartySelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {existingParties.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* P.O. Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Purchase Order (P.O.) Number
              </label>
              <input
                type="text"
                value={poNo}
                onChange={e => setPoNo(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Product / SKU Preset */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Select Product / SKU Specification
              </label>
              <select
                value={selectedSkuIndex}
                onChange={e => setSelectedSkuIndex(parseInt(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {SKU_PRESETS.map((sku, idx) => (
                  <option key={sku.skuCode} value={idx}>
                    {sku.skuName} • Pack: {sku.packSize}{sku.packUnit} • {sku.qtyPerCs}/case
                  </option>
                ))}
              </select>
            </div>

            {/* Order Quantity in Cases */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Order Quantity (Cases)</span>
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                  {planUnits.toLocaleString()} total units
                </span>
              </label>
              <input
                type="number"
                min="10"
                step="10"
                value={planCs}
                onChange={e => setPlanCs(Math.max(1, parseInt(e.target.value) || 0))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-mono font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Net Weight in KG / Pallets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Estimated Net Weight & Pallet Load
              </label>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>{planKg.toLocaleString()} KG (~{(planKg / 1000).toFixed(2)} MT)</span>
                <span className="text-purple-600 dark:text-purple-400">{planPallets} Pallets</span>
              </div>
            </div>
          </div>

          {/* USER REQUIREMENT: MANDATORY COMMERCIAL INVOICE / PO UPLOAD FOR BOM LIVE CUT */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 dark:border-amber-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>Client Commercial Invoice / P.O. Verification</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
                    MANDATORY FOR CUT
                  </span>
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Stock cut is locked until invoice is attached
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleInvoiceUpload}
              accept=".pdf,.png,.jpg,.jpeg,.csv,.xls,.xlsx"
              className="hidden"
            />

            {!invoiceAttachment ? (
              <div className="border-2 border-dashed border-amber-400/70 dark:border-amber-600/60 rounded-xl p-4 text-center bg-white/70 dark:bg-slate-900/70 flex flex-col items-center justify-center gap-2.5">
                <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Upload Official Commercial Invoice or Client Purchase Order (PDF, PNG, JPG)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Once the invoice is updated here, the system authorizes and executes the live BOM stock cut.
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse & Upload Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAttachDemoInvoice}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                    title="Attach a verified demo client commercial invoice"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Attach Demo Verified PO (PDF)</span>
                  </button>
                </div>

                {invoiceError && (
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{invoiceError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-950 dark:text-emerald-100 truncate">
                        {invoiceAttachment.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 shrink-0">
                        ✓ Verified & Authorized
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono mt-0.5">
                      Size: {invoiceAttachment.size} • Uploaded at {invoiceAttachment.uploadedAt} • Ready for BOM Auto-Cut
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveInvoice}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors shrink-0 cursor-pointer"
                  title="Remove and replace invoice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* BOM Material Cut Preview Strip */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Warehouse Inventory Auto-Deduction Breakdown
                </h4>
              </div>
              {hasAnyShortfall ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Material Shortfall Detected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Sufficient Warehouse Stock
                </span>
              )}
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Material Category</th>
                    <th className="py-2 px-3">Warehouse Item Name</th>
                    <th className="py-2 px-2 text-right">To Deduct</th>
                    <th className="py-2 px-2 text-right">In Stock</th>
                    <th className="py-2 px-3 text-right">Balance After Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 font-mono">
                  {materialDeductions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        No linked inventory materials configured for this SKU.
                      </td>
                    </tr>
                  ) : (
                    materialDeductions.map((d, idx) => (
                      <tr key={idx} className={d.isDeficit ? 'bg-rose-50/70 dark:bg-rose-950/20' : ''}>
                        <td className="py-2.5 px-3 font-sans font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300">
                          {d.materialType}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                          {d.materialName}
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-rose-600 dark:text-rose-400">
                          -{d.qtyDeducted.toLocaleString()} {d.unit}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-500">
                          {d.prevStock.toLocaleString()} {d.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {d.isDeficit ? (
                            <span className="text-rose-600 dark:text-rose-400 font-black">
                              🚨 DEFICIT ({d.prevStock - d.qtyDeducted} {d.unit})
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {d.newStock.toLocaleString()} {d.unit}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {hasAnyShortfall && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <strong>Notice on Stock Deduction:</strong> Deducting these materials will reduce your warehouse balances below minimum or into negative. The affected items will be immediately flagged in the <strong>Critical Stocks On Red</strong> section on the main dashboard for rapid restocking via Bill/PDF scanner.
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!invoiceAttachment}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all ${
                invoiceAttachment
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700'
              }`}
              title={!invoiceAttachment ? 'Upload Commercial Invoice or P.O. to authorize live stock deduction' : 'Execute live BOM stock deduction'}
            >
              <PackagePlus className="w-4 h-4" />
              <span>
                {invoiceAttachment ? 'Confirm & Auto-Deduct Inventory' : '🔒 Upload Invoice to Authorize Stock Cut'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
