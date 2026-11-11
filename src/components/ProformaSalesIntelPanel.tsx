import React, { useState, useMemo } from 'react';
import {
  Commodity,
  CommercialParams,
  FloorPricePolicy,
  InventoryItem,
  MaterialKey,
  PackingOrder,
  PackingSpec,
  ProformaItem,
} from '../types';
import { PACKING_MATERIALS_LIST } from '../utils/constants';
import { calculateMasterRow, fmt, fmtStr } from '../utils/calculations';
import {
  ShieldAlert,
  ShieldCheck,
  Boxes,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Package,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { SoundEngine } from '../utils/audio';

interface ProformaSalesIntelPanelProps {
  commodities: Record<string, Commodity>;
  packingData: Record<string, PackingSpec[]>;
  oilPrices: Record<string, number>;
  params: CommercialParams;
  quickPickOil: string;
  quickPickSkuId: number;
  quickPickQty: number;
  invoiceItems: ProformaItem[];
  inventory: InventoryItem[];
  orders: PackingOrder[];
  floorPolicy: FloorPricePolicy;
  canEditMasterCosting: boolean;
  canOverrideFloorPrice: boolean;
  canCreateEditPI: boolean;
  onUpdateFloorPolicy?: (next: FloorPricePolicy) => void;
  onApplyUnitPriceToLine: (lineIndex: number, newUnitPrice: number) => void;
  onSnapAllLinesToFloor: (floorMap: Record<number, number>) => void;
  onQuickAddWithPrice: (oilKey: string, spec: PackingSpec, qty: number, unitPrice: number) => void;
}

export function computeFloorPriceForSpec(
  spec: PackingSpec,
  oilKey: string,
  oilPrices: Record<string, number>,
  params: CommercialParams,
  commodities: Record<string, Commodity>,
  minFloorMarginPct: number
) {
  const bulkPrice = oilPrices[oilKey] ?? commodities[oilKey]?.defaultPrice ?? 0;
  const calc = calculateMasterRow(spec, bulkPrice, oilKey, params, commodities);
  const breakEven = calc.subtotalLandedCostQuoteCur;
  const rawFloor = breakEven * (1 + Math.max(0, minFloorMarginPct) / 100);
  const step = params.roundingStep > 0 ? params.roundingStep : 0.01;
  // Round up slightly or to nearest rounding step, never below rawFloor if rounding step is coarse
  const stepped = Math.ceil(rawFloor / step) * step;
  const minSellingPrice = fmt(Math.max(rawFloor, stepped > 0 ? stepped : rawFloor));

  return {
    calc,
    breakEven: fmt(breakEven),
    rawFloor: fmt(rawFloor),
    minSellingPrice,
    targetPrice: calc.roundedQuotePrice,
  };
}

export const ProformaSalesIntelPanel: React.FC<ProformaSalesIntelPanelProps> = ({
  commodities,
  packingData,
  oilPrices,
  params,
  quickPickOil,
  quickPickSkuId,
  quickPickQty,
  invoiceItems,
  inventory,
  orders,
  floorPolicy,
  canEditMasterCosting,
  canOverrideFloorPrice,
  canCreateEditPI,
  onUpdateFloorPolicy,
  onApplyUnitPriceToLine,
  onSnapAllLinesToFloor,
  onQuickAddWithPrice,
}) => {
  const [showAllSkuFloors, setShowAllSkuFloors] = useState(false);
  const [stockScope, setStockScope] = useState<'selected' | 'cart'>('selected');
  const [invSearch, setInvSearch] = useState('');

  const quickSpecs = packingData[quickPickOil] || [];
  const activeSpec =
    quickSpecs.find(s => s.id === quickPickSkuId) || quickSpecs[0] || null;

  const activeFloorInfo = useMemo(() => {
    if (!activeSpec) return null;
    return computeFloorPriceForSpec(
      activeSpec,
      quickPickOil,
      oilPrices,
      params,
      commodities,
      floorPolicy.minFloorMarginPct
    );
  }, [activeSpec, quickPickOil, oilPrices, params, commodities, floorPolicy.minFloorMarginPct]);

  // All SKUs floor table for quickPickOil
  const allCommoditySkuFloors = useMemo(() => {
    return quickSpecs.map(spec => ({
      spec,
      ...computeFloorPriceForSpec(
        spec,
        quickPickOil,
        oilPrices,
        params,
        commodities,
        floorPolicy.minFloorMarginPct
      ),
    }));
  }, [quickSpecs, quickPickOil, oilPrices, params, commodities, floorPolicy.minFloorMarginPct]);

  // Line-by-line floor audit for items currently in Proforma Invoice
  const lineFloorAudits = useMemo(() => {
    return invoiceItems.map((item, idx) => {
      const specsForOil = packingData[item.oilKey] || [];
      const matchedSpec =
        specsForOil.find(s => s.id === item.skuId) ||
        specsForOil.find(s => s.sku.trim().toLowerCase() === item.sku.trim().toLowerCase()) ||
        null;

      if (!matchedSpec) {
        return {
          idx,
          item,
          hasFloor: false,
          breakEven: 0,
          minSellingPrice: 0,
          targetPrice: item.unitPrice,
          isBelowFloor: false,
          diffFromFloor: 0,
          actualMarginPct: 0,
        };
      }

      const info = computeFloorPriceForSpec(
        matchedSpec,
        item.oilKey,
        oilPrices,
        params,
        commodities,
        floorPolicy.minFloorMarginPct
      );

      const diffFromFloor = fmt(item.unitPrice - info.minSellingPrice);
      const isBelowFloor = item.unitPrice + 0.001 < info.minSellingPrice;
      const actualMarginPct =
        info.breakEven > 0
          ? fmt(((item.unitPrice - info.breakEven) / info.breakEven) * 100)
          : 0;

      return {
        idx,
        item,
        hasFloor: true,
        breakEven: info.breakEven,
        minSellingPrice: info.minSellingPrice,
        targetPrice: info.targetPrice,
        isBelowFloor,
        diffFromFloor,
        actualMarginPct,
      };
    });
  }, [invoiceItems, packingData, oilPrices, params, commodities, floorPolicy.minFloorMarginPct]);

  const violations = lineFloorAudits.filter(a => a.isBelowFloor);

  // Compute Packaging & Raw Product Availability for either Selected SKU or Entire PI Cart
  const packagingAvailability = useMemo(() => {
    const useCart = stockScope === 'cart' && invoiceItems.length > 0;

    const targetSkuText = useCart
      ? invoiceItems.map(i => i.sku).join(' | ')
      : activeSpec?.sku || '';

    const totalCasesNeeded = useCart
      ? invoiceItems.reduce((s, i) => s + (i.qty || 0), 0)
      : quickPickQty || 1;

    const totalUnitsNeeded = useCart
      ? invoiceItems.reduce((s, i) => s + (i.qty || 0) * (i.units || 1), 0)
      : (quickPickQty || 1) * (activeSpec?.units || 1);

    const unitsPerCase = useCart
      ? Math.max(1, Math.round(totalUnitsNeeded / Math.max(1, totalCasesNeeded)))
      : activeSpec?.units || 12;

    const totalNetKgNeeded = useCart
      ? invoiceItems.reduce((s, i) => s + (i.qty || 0) * (i.netWeightKg || 0), 0)
      : (quickPickQty || 1) * (activeFloorInfo?.calc.netWeightKg || 0);

    const upperSku = (activeSpec?.sku || '').toUpperCase();
    const isGlassOrHdpe =
      !useCart &&
      (upperSku.includes('GLASS') || upperSku.includes('HDPE') || upperSku.includes('TIN'));

    const rows = PACKING_MATERIALS_LIST.map(pm => {
      const matKey = pm.key as MaterialKey;
      const isNA =
        (matKey === 'preform' && isGlassOrHdpe) ||
        (matKey === 'cst' && upperSku.includes('HDPE') && !useCart);

      // Match inventory items for this materialType:
      // Prefer exact linkedSku match if any linked items exist for this SKU; otherwise sum general/matching items
      const allMatItems = inventory.filter(inv => inv.materialType === matKey);
      let relevantItems = allMatItems;

      if (!useCart && activeSpec) {
        const skuLower = activeSpec.sku.trim().toLowerCase();
        const exactLinked = allMatItems.filter(
          inv => inv.linkedSku && inv.linkedSku.trim().toLowerCase() === skuLower
        );
        const unlinked = allMatItems.filter(
          inv => !inv.linkedSku || inv.linkedSku.trim().toLowerCase() === 'general'
        );
        if (exactLinked.length > 0) {
          relevantItems = [...exactLinked, ...unlinked];
        }
      } else if (useCart && invoiceItems.length > 0) {
        const cartSkus = new Set(invoiceItems.map(i => i.sku.trim().toLowerCase()));
        const linkedToCart = allMatItems.filter(
          inv =>
            !inv.linkedSku ||
            inv.linkedSku.trim().toLowerCase() === 'general' ||
            cartSkus.has(inv.linkedSku.trim().toLowerCase())
        );
        if (linkedToCart.length > 0) {
          relevantItems = linkedToCart;
        }
      }

      const onHand = relevantItems.reduce((sum, i) => sum + Math.max(0, i.quantity), 0);

      let requiredQty = totalUnitsNeeded;
      if (matKey === 'carton') {
        requiredQty = totalCasesNeeded;
      } else if (matKey === 'pallet') {
        requiredQty = Math.max(1, Math.ceil(totalCasesNeeded / 65));
      }

      if (isNA) {
        requiredQty = 0;
      }

      let maxCasesSupported = Infinity;
      if (!isNA) {
        if (matKey === 'carton') {
          maxCasesSupported = Math.floor(onHand);
        } else if (matKey === 'pallet') {
          maxCasesSupported = Math.floor(onHand * 65);
        } else {
          maxCasesSupported = Math.floor(onHand / Math.max(1, unitsPerCase));
        }
      }

      const shortfall = isNA ? 0 : Math.max(0, requiredQty - onHand);

      return {
        key: matKey,
        label: pm.label,
        short: pm.short,
        emoji: pm.emoji,
        isNA,
        onHand,
        requiredQty,
        shortfall,
        maxCasesSupported,
        matchedNames: relevantItems.map(i => `${i.name} (${i.quantity.toLocaleString()} ${i.unit})`),
      };
    });

    // Bottleneck packable cases across required packaging materials
    const activeRows = rows.filter(r => !r.isNA);
    const bottleneckRow =
      activeRows.length > 0
        ? activeRows.reduce((minR, r) =>
            r.maxCasesSupported < minR.maxCasesSupported ? r : minR
          )
        : null;

    const maxPackableCases = bottleneckRow
      ? Number.isFinite(bottleneckRow.maxCasesSupported)
        ? bottleneckRow.maxCasesSupported
        : 0
      : 0;

    // Raw Oil / Finished Product matching in inventory
    const oilLabel = commodities[quickPickOil]?.label || quickPickOil;
    const oilKeyword = oilLabel.split(' ')[0].toLowerCase();
    const rawAndFinishedMatches = inventory.filter(inv => {
      if (inv.category !== 'Raw Material' && inv.category !== 'Finished Goods') return false;
      if (useCart) {
        return invoiceItems.some(it =>
          inv.name.toLowerCase().includes(it.oilLabel.split(' ')[0].toLowerCase())
        );
      }
      return inv.name.toLowerCase().includes(oilKeyword);
    });

    const rawKgAvailable = rawAndFinishedMatches.reduce(
      (sum, i) => sum + (i.unit.toLowerCase() === 'kg' || i.unit.toLowerCase() === 'l' ? i.quantity : 0),
      0
    );

    return {
      useCart,
      targetSkuText,
      totalCasesNeeded,
      totalNetKgNeeded,
      rows,
      maxPackableCases,
      bottleneckMaterial: bottleneckRow?.label || '',
      rawAndFinishedMatches,
      rawKgAvailable,
    };
  }, [
    stockScope,
    invoiceItems,
    activeSpec,
    quickPickQty,
    activeFloorInfo,
    inventory,
    commodities,
    quickPickOil,
  ]);

  // Filtered full inventory catalog for quick lookup
  const filteredCatalog = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    if (!q) return inventory.slice(0, 12);
    return inventory.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.linkedSku || '').toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [inventory, invSearch]);

  const activeContainerCount = orders.filter(o => !o.archived).length;
  const showBreakEven = canEditMasterCosting || floorPolicy.showLandedBreakEvenToSales;

  return (
    <aside className="space-y-4">
      {/* CARD 1: AUTHORIZED MINIMUM SELLING PRICE (FLOOR GUARDRAIL) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 dark:border-indigo-500/30 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">
                Sales Floor Price Guardrail
              </h4>
              <p className="text-[10.5px] text-slate-400">
                Minimum authorized price per case ({params.incoterm} · {params.quoteCur})
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold whitespace-nowrap">
            Min +{floorPolicy.minFloorMarginPct}%
          </span>
        </div>

        <div className="p-4 space-y-3.5 text-xs">
          {/* Super Admin / Costing Admin Inline Floor Policy Quick Adjust */}
          {canEditMasterCosting && onUpdateFloorPolicy && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Min Sales Floor Margin (%):
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={100}
                  value={floorPolicy.minFloorMarginPct}
                  onChange={e =>
                    onUpdateFloorPolicy({
                      ...floorPolicy,
                      minFloorMarginPct: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-16 px-2 py-1 text-right font-mono font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                />
                <span className="text-[10px] text-slate-500">%</span>
              </div>
            </div>
          )}

          {/* Selected Quick-Pick Product Floor Card */}
          {activeSpec && activeFloorInfo ? (
            <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-900/60 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Selected Product ({commodities[quickPickOil]?.label})
                  </span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {activeSpec.sku}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {activeSpec.units} pcs/case
                </span>
              </div>

              <div className={`grid ${showBreakEven ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pt-1`}>
                {showBreakEven && (
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[9.5px] font-bold uppercase text-slate-400">
                      Break-Even (0%)
                    </div>
                    <div className="text-sm font-black font-mono tabular-nums text-slate-700 dark:text-slate-300 mt-0.5">
                      {params.curSymbol}
                      {fmtStr(activeFloorInfo.breakEven)}
                    </div>
                  </div>
                )}

                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600">
                  <div className="text-[9.5px] font-black uppercase text-amber-800 dark:text-amber-300">
                    Min Sell Price
                  </div>
                  <div className="text-base font-black font-mono tabular-nums text-amber-900 dark:text-amber-200 mt-0.5">
                    {params.curSymbol}
                    {fmtStr(activeFloorInfo.minSellingPrice)}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800">
                  <div className="text-[9.5px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                    Target (+{params.profitMargin}%)
                  </div>
                  <div className="text-sm font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {params.curSymbol}
                    {fmtStr(activeFloorInfo.targetPrice)}
                  </div>
                </div>
              </div>

              {canCreateEditPI && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.play('pop');
                      onQuickAddWithPrice(
                        quickPickOil,
                        activeSpec,
                        quickPickQty,
                        activeFloorInfo.minSellingPrice
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add @ Min ({params.curSymbol}{fmtStr(activeFloorInfo.minSellingPrice)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.play('pop');
                      onQuickAddWithPrice(
                        quickPickOil,
                        activeSpec,
                        quickPickQty,
                        activeFloorInfo.targetPrice
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add @ Target ({params.curSymbol}{fmtStr(activeFloorInfo.targetPrice)})</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-center py-3">
              No Master SKUs configured for this commodity.
            </div>
          )}

          {/* Active Proforma Cart Floor Compliance Check */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                PI Cart Price Check ({invoiceItems.length} Lines)
              </span>
              {violations.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-black">
                  <ShieldAlert className="w-3 h-3" />
                  {violations.length} Below Min
                </span>
              ) : invoiceItems.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                  <ShieldCheck className="w-3 h-3" />
                  All Authorized
                </span>
              ) : null}
            </div>

            {violations.length > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2">
                <div className="flex items-start gap-2 text-[11px] text-rose-800 dark:text-rose-200 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    {canOverrideFloorPrice || !floorPolicy.enforceStrictFloor
                      ? `${violations.length} line(s) are priced below the minimum sales floor. Override authority active.`
                      : `${violations.length} line(s) are below the authorized Minimum Selling Price. Increase price or request Super Admin override before issuing PI.`}
                  </span>
                </div>
                {canCreateEditPI && (
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.play('pop');
                      const map: Record<number, number> = {};
                      violations.forEach(v => {
                        map[v.idx] = v.minSellingPrice;
                      });
                      onSnapAllLinesToFloor(map);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-wider transition-colors"
                  >
                    Snap All Below-Floor Items to Min Price
                  </button>
                )}
              </div>
            )}

            {lineFloorAudits.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {lineFloorAudits.map(audit => (
                  <div
                    key={audit.item.id}
                    className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                      audit.isBelowFloor
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[11px] text-slate-900 dark:text-slate-100 truncate">
                        {audit.item.oilLabel} · {audit.item.sku}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Quoted: <strong>{params.curSymbol}{fmtStr(audit.item.unitPrice)}</strong>
                        {audit.hasFloor && (
                          <>
                            {' '}· Min:{' '}
                            <span className="text-amber-700 dark:text-amber-400 font-bold">
                              {params.curSymbol}{fmtStr(audit.minSellingPrice)}
                            </span>
                            {' '}({audit.actualMarginPct >= 0 ? '+' : ''}{audit.actualMarginPct}%)
                          </>
                        )}
                      </div>
                    </div>

                    {audit.hasFloor && audit.isBelowFloor && canCreateEditPI ? (
                      <button
                        type="button"
                        onClick={() => {
                          SoundEngine.play('tick');
                          onApplyUnitPriceToLine(audit.idx, audit.minSellingPrice);
                        }}
                        className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold whitespace-nowrap shrink-0"
                      >
                        Set {params.curSymbol}{fmtStr(audit.minSellingPrice)}
                      </button>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expandable All-SKU Floor Price Cheat Sheet */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAllSkuFloors(!showAllSkuFloors)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-400 hover:underline"
            >
              <span>
                All {commodities[quickPickOil]?.label} SKUs Min Floor Sheet ({allCommoditySkuFloors.length})
              </span>
              {showAllSkuFloors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAllSkuFloors && (
              <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[10.5px]">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-1.5 px-2">Pack SKU</th>
                      <th className="py-1.5 px-2 text-right text-amber-700 dark:text-amber-400">Min Floor</th>
                      <th className="py-1.5 px-2 text-right text-emerald-700 dark:text-emerald-400">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {allCommoditySkuFloors.map(row => (
                      <tr key={row.spec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-1.5 px-2 font-sans font-medium truncate max-w-[140px]" title={row.spec.sku}>
                          {row.spec.sku}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-amber-700 dark:text-amber-400">
                          {params.curSymbol}{fmtStr(row.minSellingPrice)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                          {params.curSymbol}{fmtStr(row.targetPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CARD 2: LIVE AVAILABLE PRODUCT & 8 PACKAGING MATERIALS PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-teal-900 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-teal-300 shrink-0" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">
                Available Stock &amp; Packaging
              </h4>
              <p className="text-[10.5px] text-teal-200/80">
                Real-time warehouse items, bulk oil &amp; 8 PM components
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-teal-800 text-teal-200 text-[10px] font-mono font-bold">
            {inventory.length} SKUs
          </span>
        </div>

        <div className="p-4 space-y-3.5 text-xs">
          {/* Scope Switcher: Selected SKU vs Full PI Cart */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setStockScope('selected')}
              className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-colors ${
                stockScope === 'selected'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Selected SKU ({quickPickQty} ctn)
            </button>
            <button
              type="button"
              onClick={() => setStockScope('cart')}
              className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-colors ${
                stockScope === 'cart'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              PI Cart ({invoiceItems.reduce((s, i) => s + (i.qty || 0), 0)} ctn)
            </button>
          </div>

          {/* Max Packable Summary Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
              packagingAvailability.maxPackableCases >= packagingAvailability.totalCasesNeeded &&
              packagingAvailability.totalCasesNeeded > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
            }`}
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Max Immediately Packable (PM Stock)
              </div>
              <div className="text-base font-black font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                {packagingAvailability.maxPackableCases.toLocaleString()} cases
              </div>
              {packagingAvailability.bottleneckMaterial && (
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Limiting material: <strong>{packagingAvailability.bottleneckMaterial}</strong> ·{' '}
                  {activeContainerCount} active plant order(s)
                </div>
              )}
            </div>
            <Package className="w-6 h-6 text-teal-600 dark:text-teal-400 shrink-0" />
          </div>

          {/* Bulk Raw Oil / Finished Product Stock */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-200">
                Bulk / Finished Commodity Stock
              </span>
              <span className="font-mono text-slate-500">
                Need: {fmtStr(packagingAvailability.totalNetKgNeeded)} kg
              </span>
            </div>
            {packagingAvailability.rawAndFinishedMatches.length === 0 ? (
              <div className="text-[11px] text-amber-700 dark:text-amber-400">
                No matching bulk raw material logged in warehouse for this commodity.
              </div>
            ) : (
              <div className="space-y-1">
                {packagingAvailability.rawAndFinishedMatches.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-[11px]">
                    <span className="truncate pr-2 text-slate-700 dark:text-slate-300" title={item.name}>
                      {item.name}
                    </span>
                    <span
                      className={`font-mono font-bold whitespace-nowrap ${
                        item.quantity > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
                      }`}
                    >
                      {item.quantity.toLocaleString()} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 8 Packaging Materials Grid */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              8 Packaging Materials Breakdown
            </div>
            <div className="grid grid-cols-2 gap-2">
              {packagingAvailability.rows.map(row => {
                const isReady = row.isNA || row.onHand >= row.requiredQty;
                const isOut = !row.isNA && row.onHand <= 0;
                return (
                  <div
                    key={row.key}
                    title={
                      row.matchedNames.length > 0
                        ? row.matchedNames.join('\n')
                        : 'No matching item in Inventory'
                    }
                    className={`p-2 rounded-xl border transition-colors ${
                      row.isNA
                        ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-65'
                        : isReady
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                        : isOut
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                        <span>{row.emoji}</span>
                        <span>{row.label}</span>
                      </span>
                      <span
                        className={`text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded ${
                          row.isNA
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            : isReady
                            ? 'bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                            : isOut
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                        }`}
                      >
                        {row.isNA ? 'N/A' : isReady ? 'Ready' : isOut ? '0 Stock' : 'Low'}
                      </span>
                    </div>

                    <div className="mt-1 flex items-baseline justify-between font-mono text-[10.5px]">
                      <span className="text-slate-500">Avail:</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {row.isNA ? '—' : `${row.onHand.toLocaleString()} pcs`}
                      </strong>
                    </div>
                    {!row.isNA && (
                      <div className="flex items-baseline justify-between font-mono text-[10px] text-slate-500">
                        <span>Need:</span>
                        <span>{row.requiredQty.toLocaleString()} pcs</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Searchable Warehouse Items Quick Lookup */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                value={invSearch}
                onChange={e => setInvSearch(e.target.value)}
                placeholder="Search any warehouse item or packaging..."
                className="w-full pl-8 pr-2.5 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {filteredCatalog.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-slate-400">
                  No warehouse items found.
                </div>
              ) : (
                filteredCatalog.map(item => (
                  <div
                    key={item.id}
                    className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.name}>
                        {item.name}
                      </div>
                      <div className="text-[9.5px] font-mono text-slate-400">
                        {item.sku} · {item.category}
                      </div>
                    </div>
                    <span
                      className={`font-mono font-bold whitespace-nowrap ${
                        item.quantity <= 0
                          ? 'text-rose-600'
                          : item.quantity <= item.minLevel
                          ? 'text-amber-600'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {item.quantity.toLocaleString()} {item.unit}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {!canEditMasterCosting && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 pt-1">
              <Lock className="w-3 h-3 shrink-0" />
              <span>Costing formulas &amp; floor margins are managed by Super Admin.</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
