import React, { useState, useMemo, useEffect } from 'react';
import {
  CommercialParams,
  MasterRowCalculation,
  PackingSpec,
  ProformaItem,
  ProformaExtraRow,
  SavedProformaInvoice,
  NegotiationRecord,
  User,
  Commodity,
  PortProfile,
  PoSellerConfig,
  InventoryItem,
  PackingOrder,
  FloorPricePolicy,
  DutyBasisType,
  PerKgDutyUnit,
  CommoditySection,
} from '../types';
import {
  COMMODITIES_CONFIG,
  PORT_PROFILES,
  KG_TO_LBS,
  MAX_CONTAINER_PAYLOAD_KG,
  MAX_CONTAINER_PAYLOAD_LBS,
  DEFAULT_PO_SELLER_CONFIG,
  DEFAULT_BANK_DETAILS_TEXT,
  formatPoProductDescription,
} from '../utils/constants';
import {
  calculateMasterRow,
  reverseCalculate,
  fmt,
  fmtStr,
  formatVolume,
  formatVolumeShort,
  kgToLbs,
  getDefaultTarePerUnit,
} from '../utils/calculations';
import { ProformaTemplateDocument } from './ProformaTemplateDocument';
import {
  ProformaSalesIntelPanel,
  computeFloorPriceForSpec,
} from './ProformaSalesIntelPanel';
import { DEFAULT_FLOOR_PRICE_POLICY } from '../utils/permissions';
import {
  Calculator,
  FileText,
  TrendingDown,
  MessageSquare,
  Package,
  Grid3X3,
  Container,
  History,
  Printer,
  FileSpreadsheet,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Edit2,
  Settings2,
  X,
  RotateCcw,
  Eye,
  Upload,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  ShieldAlert,
} from 'lucide-react';
import { SoundEngine } from '../utils/audio';

interface OilCostProViewProps {
  user: User;
  commodities: Record<string, Commodity>;
  ports: Record<string, PortProfile>;
  packingData: Record<string, PackingSpec[]>;
  oilPrices: Record<string, number>;
  savedPIs: SavedProformaInvoice[];
  negotiations: NegotiationRecord[];
  poSellerConfig: PoSellerConfig;
  onUpdateCommodities: (commodities: Record<string, Commodity>) => void;
  onUpdatePorts: (ports: Record<string, PortProfile>) => void;
  onUpdatePoSellerConfig: (cfg: PoSellerConfig) => void;
  onSavePI: (pi: SavedProformaInvoice) => void;
  onSaveNegotiation: (nego: NegotiationRecord) => void;
  onDeletePI: (piNumber: string) => void;
  onDeleteNegotiation: (negoNumber: string) => void;
  onUpdateOilPrices: (prices: Record<string, number>) => void;
  onUpdatePackingData: (data: Record<string, PackingSpec[]>) => void;
  onResetCommodityPacking: (commodityKey: string) => void;
  onPrintOfficialPI: (pi: SavedProformaInvoice) => void;
  onNotify: (msg: string) => void;
  clearBuyerNonce?: number;
  inventory?: InventoryItem[];
  orders?: PackingOrder[];
  floorPolicy?: FloorPricePolicy;
  canEditMasterCosting?: boolean;
  canCreateEditPI?: boolean;
  canOverrideFloorPrice?: boolean;
  onUpdateFloorPolicy?: (next: FloorPricePolicy) => void;
}

type OilCostSubTab =
  | 'forward'
  | 'invoice'
  | 'reverse'
  | 'nego'
  | 'packing'
  | 'matrix'
  | 'container'
  | 'history';

interface InlineOverrideInputProps {
  overrideValue: number | null | undefined;
  autoValue: number;
  step?: string;
  allowZero?: boolean;
  prefix?: string;
  suffix?: string;
  widthClass?: string;
  disabled?: boolean;
  title?: string;
  boldText?: boolean;
  onChangeOverride: (next: number | null) => void;
}

const InlineOverrideInput: React.FC<InlineOverrideInputProps> = ({
  overrideValue,
  autoValue,
  step = '0.01',
  allowZero = false,
  prefix,
  suffix,
  widthClass = 'w-16',
  disabled = false,
  title,
  boldText = false,
  onChangeOverride,
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const isOverridden =
    overrideValue !== null &&
    overrideValue !== undefined &&
    !Number.isNaN(overrideValue) &&
    (allowZero ? overrideValue >= 0 : overrideValue > 0);

  const displayVal =
    draft !== null ? draft : isOverridden ? String(overrideValue) : fmtStr(autoValue);

  if (disabled) {
    return (
      <span className={`font-mono tabular-nums ${boldText ? 'font-bold' : ''}`}>
        {prefix}
        {isOverridden ? fmtStr(overrideValue as number) : fmtStr(autoValue)}
        {suffix ? ` ${suffix}` : ''}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {prefix && (
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{prefix}</span>
      )}
      <input
        type="number"
        step={step}
        min={0}
        value={displayVal}
        title={
          title ||
          (isOverridden
            ? `Custom override active (Auto: ${prefix || ''}${fmtStr(autoValue)}${suffix ? ` ${suffix}` : ''})`
            : `Click to edit (Auto: ${prefix || ''}${fmtStr(autoValue)}${suffix ? ` ${suffix}` : ''})`)
        }
        onFocus={e => {
          setDraft(isOverridden ? String(overrideValue) : String(fmt(autoValue)));
          e.currentTarget.select();
        }}
        onChange={e => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw.trim() === '') {
            onChangeOverride(null);
            return;
          }
          const parsed = parseFloat(raw);
          if (!Number.isNaN(parsed) && (allowZero ? parsed >= 0 : parsed > 0)) {
            onChangeOverride(parsed);
          }
        }}
        onBlur={() => setDraft(null)}
        className={`${widthClass} px-1.5 py-0.5 text-right text-xs font-mono tabular-nums rounded border transition-colors focus:outline-none ${
          boldText ? 'font-bold' : 'font-semibold'
        } ${
          isOverridden
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 focus:border-amber-500'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800'
        }`}
      />
      {suffix && <span className="text-[10.5px] text-slate-500">{suffix}</span>}
      {isOverridden && (
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            onChangeOverride(null);
          }}
          className="p-0.5 rounded text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          title={`Reset to formula auto value (${prefix || ''}${fmtStr(autoValue)}${suffix ? ` ${suffix}` : ''})`}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

export const OilCostProView: React.FC<OilCostProViewProps> = ({
  user,
  commodities,
  ports,
  packingData,
  oilPrices,
  savedPIs,
  negotiations,
  poSellerConfig,
  onUpdateCommodities,
  onUpdatePorts,
  onUpdatePoSellerConfig,
  onSavePI,
  onSaveNegotiation,
  onDeletePI,
  onDeleteNegotiation,
  onUpdateOilPrices,
  onUpdatePackingData,
  onResetCommodityPacking,
  onPrintOfficialPI,
  onNotify,
  clearBuyerNonce = 0,
  inventory = [],
  orders = [],
  floorPolicy = DEFAULT_FLOOR_PRICE_POLICY,
  canEditMasterCosting = true,
  canCreateEditPI = true,
  canOverrideFloorPrice = true,
  onUpdateFloorPolicy,
}) => {
  const commodityKeys = useMemo(() => Object.keys(commodities), [commodities]);
  const indiaMainKeys = useMemo(
    () =>
      commodityKeys.filter(k => {
        const sec = commodities[k]?.originSection;
        return sec !== 'india_evoo_avo' && sec !== 'usa';
      }),
    [commodityKeys, commodities]
  );
  const indiaEvooAvoKeys = useMemo(
    () => commodityKeys.filter(k => commodities[k]?.originSection === 'india_evoo_avo'),
    [commodityKeys, commodities]
  );
  const usaPricelistKeys = useMemo(
    () => commodityKeys.filter(k => commodities[k]?.originSection === 'usa'),
    [commodityKeys, commodities]
  );
  const [subTab, setSubTab] = useState<OilCostSubTab>('forward');
  const [activeCommodity, setActiveCommodity] = useState<string>('mustard');
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(true);

  // Commercial Parameters state (persisted in localStorage)
  const [params, setParams] = useState<CommercialParams>(() => {
    const defaults: CommercialParams = {
      quoteCur: 'USD',
      curSymbol: '$',
      activeExRate: 95.5,
      exRateUSD: 95.5,
      exRateCAD: 70.2,
      oceanFreight: 7800,
      inlandDrayage: 1250,
      domesticFreight: 115000,
      reciprocalDuty: 10.0,
      basicDuty: 19.0,
      dutyType: '%',
      basicDutyPerKg: 0,
      basicDutyPerKgUnit: '$/kg',
      entryFeePercent: 0.004715,
      profitMargin: 10.0,
      density: 0.91,
      incoterm: 'DDP',
      isUSA: true,
      roundingStep: 0.5,
      portName: 'Port of New York / Newark, USA',
      containerSize: '40HQ',
    };
    try {
      const saved = localStorage.getItem('gfi_oilcost_commercial_params_v2');
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch {}
    return defaults;
  });

  const updateParams = (updater: (prev: CommercialParams) => CommercialParams) => {
    setParams(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem('gfi_oilcost_commercial_params_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // ---- Live FX rates (auto-update USD/INR and CAD/INR) ----
  const [fxStatus, setFxStatus] = useState<'idle' | 'loading' | 'live' | 'error'>(
    'idle'
  );
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string | null>(null);

  const fetchLiveFx = React.useCallback(async () => {
    setFxStatus('loading');
    try {
      const res = await fetch(
        'https://open.er-api.com/v6/latest/USD'
      );
      const data = await res.json();
      if (!data || !data.rates || typeof data.rates.INR !== 'number') {
        throw new Error('Invalid FX response');
      }
      const usdInr = Math.round(data.rates.INR * 100) / 100;
      const cadInr =
        data.rates.CAD ? Math.round((data.rates.INR / data.rates.CAD) * 100) / 100 : null;
      updateParams(p => ({
        ...p,
        exRateUSD: usdInr,
        activeExRate: p.quoteCur === 'USD' ? usdInr : p.activeExRate,
        ...(cadInr !== null
          ? {
              exRateCAD: cadInr,
              activeExRate: p.quoteCur === 'CAD' ? cadInr : p.activeExRate,
            }
          : {}),
      }));
      setFxUpdatedAt(new Date().toLocaleTimeString());
      setFxStatus('live');
    } catch (e) {
      console.warn('Live FX fetch failed:', e);
      setFxStatus('error');
    }
  }, []);

  React.useEffect(() => {
    fetchLiveFx();
    // Refresh automatically every 30 minutes
    const t = setInterval(fetchLiveFx, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchLiveFx]);

  // Forward Costing inline edit & duty elaboration state
  const [editAllCards, setEditAllCards] = useState<boolean>(false);
  const [editingCardIds, setEditingCardIds] = useState<Record<number, boolean>>({});
  const [elaborateAllDuties, setElaborateAllDuties] = useState<boolean>(false);
  const [expandedDutyCardIds, setExpandedDutyCardIds] = useState<Record<number, boolean>>({});
  const [cardAddQty, setCardAddQty] = useState<Record<number, number>>({});

  const curMultForSku =
    params.quoteCur === 'CAD'
      ? params.exRateUSD / Math.max(0.0001, params.exRateCAD)
      : params.quoteCur === 'INR'
      ? params.exRateUSD
      : 1;

  const usdToQuote = (usdVal: number | null | undefined): number | null => {
    if (usdVal === null || usdVal === undefined || Number.isNaN(usdVal)) return null;
    return curMultForSku === 1 ? usdVal : fmt(usdVal * curMultForSku);
  };

  const quoteToUsd = (quoteVal: number | null): number | null => {
    if (quoteVal === null || Number.isNaN(quoteVal)) return null;
    return curMultForSku === 1
      ? quoteVal
      : Number((quoteVal / Math.max(0.0001, curMultForSku)).toFixed(4));
  };

  // Commodity Editor Modal state
  const [commodityModalOpen, setCommodityModalOpen] = useState(false);
  const [editingCommodityKey, setEditingCommodityKey] = useState<string | null>(null);
  const [commForm, setCommForm] = useState<Commodity>({
    key: '',
    label: '',
    emoji: '🛢️',
    defaultPrice: 175,
    currency: 'INR',
    basicDuty: 10,
    dutyType: '%',
    basicDutyPerKg: 0,
    basicDutyPerKgUnit: '$/kg',
    density: 0.91,
    hsCode: '1514.99.20',
    isBlend: false,
    originSection: 'india',
    packingCurrency: 'INR',
  });

  // Port Manager Modal state
  const [portModalOpen, setPortModalOpen] = useState(false);
  const [newPortForm, setNewPortForm] = useState<PortProfile>({
    key: '',
    name: '',
    oceanFreight: 7500,
    drayage: 1200,
    isUS: true,
  });

  // Blended oil state
  const [blendMasterType, setBlendMasterType] = useState('olive');
  const [blendBaseType, setBlendBaseType] = useState('canola');
  const [blendMasterRatio, setBlendMasterRatio] = useState(10);
  const [blendMasterPrice, setBlendMasterPrice] = useState(220);
  const [blendBasePrice, setBlendBasePrice] = useState(180);

  // Proforma Invoice Generator state
  const generateNextPiNumber = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `GFI/${yr}/${mo}/`;
    let maxSerial = 0;
    savedPIs.forEach(p => {
      if (p.piNumber && p.piNumber.startsWith(prefix)) {
        const num = parseInt(p.piNumber.split('/')[3] || '0', 10);
        if (!Number.isNaN(num) && num > maxSerial) maxSerial = num;
      }
    });
    return `${prefix}${String(maxSerial + 1).padStart(4, '0')}`;
  };

  const [invoiceItems, setInvoiceItems] = useState<ProformaItem[]>([]);
  const [invNum, setInvNum] = useState<string>(() => generateNextPiNumber());
  const [invDate, setInvDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invDateDisplay, setInvDateDisplay] = useState<string>(() =>
    new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  );
  const isPreloadedClearedInit = () => {
    try {
      return localStorage.getItem('gfi_preloaded_cleared_v1') === 'true';
    } catch {
      return false;
    }
  };

  const [buyerName, setBuyerName] = useState(() => (isPreloadedClearedInit() ? '' : 'Dream Wholesale'));
  const [buyerShortName, setBuyerShortName] = useState(() => (isPreloadedClearedInit() ? '' : 'Dream'));
  const [buyerAddress, setBuyerAddress] = useState(() =>
    isPreloadedClearedInit() ? '' : '6000 Rinke Ave.\nWarren, Michigan 48091'
  );
  const [buyerAttention, setBuyerAttention] = useState(() => (isPreloadedClearedInit() ? '' : 'Mr. Oras'));
  const [shipToSameAsBuyer, setShipToSameAsBuyer] = useState(true);
  const [shipToName, setShipToName] = useState(() => (isPreloadedClearedInit() ? '' : 'Dream Wholesale'));
  const [shipToAddress, setShipToAddress] = useState(() =>
    isPreloadedClearedInit() ? '' : '6000 Rinke Ave.\nWarren, Michigan 48091'
  );
  const [shipToAttention, setShipToAttention] = useState(() => (isPreloadedClearedInit() ? '' : 'Mr. Oras'));

  const [mktExecName, setMktExecName] = useState(user.name);
  const [mktExecShort, setMktExecShort] = useState(user.initials);
  const [mktExecEmail, setMktExecEmail] = useState(user.email);
  const [deliveryTerms, setDeliveryTerms] = useState('Ex Warehouse, New Jersey');
  const [paymentTerms, setPaymentTerms] = useState('30% advance & Balance 70% against Delivery');
  const [extraSummaryRows, setExtraSummaryRows] = useState<ProformaExtraRow[]>([]);
  const [piInternalNote, setPiInternalNote] = useState('');
  const [showSellerSettings, setShowSellerSettings] = useState(false);
  const [showLiveTemplatePreview, setShowLiveTemplatePreview] = useState(true);
  const [liveTemplateInlineEdit, setLiveTemplateInlineEdit] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [showSalesIntelPanel, setShowSalesIntelPanel] = useState(true);

  // Quick SKU picker inside Proforma Invoice tab
  const [quickPickOil, setQuickPickOil] = useState<string>('mustard');
  const [quickPickSkuId, setQuickPickSkuId] = useState<number>(0);
  const [quickPickQty, setQuickPickQty] = useState<number>(500);

  // Reverse Costing state
  const [revCommodity, setRevCommodity] = useState('mustard');
  const [revSkuId, setRevSkuId] = useState<number>(0);
  const [revClientName, setRevClientName] = useState(() => (isPreloadedClearedInit() ? '' : 'Dream Wholesale'));
  const [revReference, setRevReference] = useState(() => (isPreloadedClearedInit() ? '' : 'RFQ-2026-NOV'));
  const [revTargetPrice, setRevTargetPrice] = useState<number>(42.0);
  const [revProfitTarget, setRevProfitTarget] = useState<number>(10.0);
  const [revUseOverride, setRevUseOverride] = useState(false);
  const [revBulkOverride, setRevBulkOverride] = useState<number>(170);
  const [revInternalNote, setRevInternalNote] = useState('');

  useEffect(() => {
    if (clearBuyerNonce <= 0) return;
    const cleared = isPreloadedClearedInit();
    if (cleared) {
      setInvoiceItems([]);
      setExtraSummaryRows([]);
      setBuyerName('');
      setBuyerShortName('');
      setBuyerAddress('');
      setBuyerAttention('');
      setShipToName('');
      setShipToAddress('');
      setShipToAttention('');
      setPiInternalNote('');
      setRevClientName('');
      setRevReference('');
      setRevInternalNote('');
    } else {
      setBuyerName('Dream Wholesale');
      setBuyerShortName('Dream');
      setBuyerAddress('6000 Rinke Ave.\nWarren, Michigan 48091');
      setBuyerAttention('Mr. Oras');
      setShipToName('Dream Wholesale');
      setShipToAddress('6000 Rinke Ave.\nWarren, Michigan 48091');
      setShipToAttention('Mr. Oras');
      setRevClientName('Dream Wholesale');
      setRevReference('RFQ-2026-NOV');
    }
  }, [clearBuyerNonce]);

  // Matrix cell override popover
  const [matrixEditCell, setMatrixEditCell] = useState<{ oilKey: string; skuId: number; val: string } | null>(null);

  // History & Nego search
  const [historySearch, setHistorySearch] = useState('');
  const [negoSearch, setNegoSearch] = useState('');

  const activeCommObj = commodities[activeCommodity] || Object.values(commodities)[0] || COMMODITIES_CONFIG.mustard;

  // Handle Port Change
  const handlePortChange = (portKey: string) => {
    SoundEngine.play('tick');
    const port = ports[portKey] || Object.values(ports)[0] || PORT_PROFILES.US_NY;
    updateParams(prev => ({
      ...prev,
      portName: port.name,
      oceanFreight: port.oceanFreight,
      inlandDrayage: port.drayage,
      isUSA: port.isUS,
      reciprocalDuty: port.isUS ? prev.reciprocalDuty || 10.0 : 0,
      basicDuty: port.isUS ? activeCommObj?.basicDuty || 0 : 0,
      dutyType: activeCommObj?.dutyType || '%',
      basicDutyPerKg: port.isUS ? activeCommObj?.basicDutyPerKg || 0 : 0,
      basicDutyPerKgUnit: activeCommObj?.basicDutyPerKgUnit || '$/kg',
    }));
  };

  // Handle Currency Change
  const handleCurrencyChange = (cur: 'USD' | 'CAD' | 'INR') => {
    SoundEngine.play('tick');
    updateParams(prev => {
      let activeExRate = prev.exRateUSD;
      let curSymbol = '$';
      if (cur === 'CAD') {
        activeExRate = prev.exRateCAD;
        curSymbol = 'C$';
      } else if (cur === 'INR') {
        activeExRate = 1.0;
        curSymbol = '₹';
      }
      return {
        ...prev,
        quoteCur: cur,
        activeExRate,
        curSymbol,
      };
    });
  };

  // Handle Commodity Selection
  const handleSelectCommodity = (key: string) => {
    SoundEngine.play('tick');
    setActiveCommodity(key);
    const oil = commodities[key];
    if (oil) {
      updateParams(prev => ({
        ...prev,
        basicDuty: prev.isUSA ? oil.basicDuty : 0,
        dutyType: oil.dutyType,
        basicDutyPerKg: prev.isUSA ? oil.basicDutyPerKg || 0 : 0,
        basicDutyPerKgUnit: oil.basicDutyPerKgUnit || '$/kg',
        density: oil.density || 0.91,
        profitMargin:
          oil.defaultProfitMargin !== undefined ? oil.defaultProfitMargin : prev.profitMargin,
      }));
      if (oil.isBlend && oil.originSection === 'usa') {
        const isAvo = key.includes('avo');
        const isSoy = key.includes('soy');
        setBlendMasterRatio(5);
        setBlendMasterType(isAvo ? 'Avocado Oil' : 'EV Olive Oil');
        setBlendMasterPrice(isAvo ? 4.85 : 5.35);
        setBlendBaseType(isSoy ? 'Soybean Oil' : 'Canola Oil');
        setBlendBasePrice(isSoy ? 1.94 : 1.91);
      } else if (oil.isBlend && oil.currency === 'INR') {
        setBlendMasterRatio(10);
        setBlendMasterType('Olive Oil');
        setBlendMasterPrice(220);
        setBlendBaseType('Canola Oil');
        setBlendBasePrice(180);
      }
    }
  };

  // Update a single commodity bulk price
  const handleUpdateSingleOilPrice = (key: string, newPrice: number) => {
    onUpdateOilPrices({
      ...oilPrices,
      [key]: newPrice,
    });
  };

  // Update a single PackingSpec field for any commodity
  const handleUpdateSkuSpec = (
    oilKey: string,
    skuId: number,
    patch: Partial<PackingSpec>
  ) => {
    const currentList = packingData[oilKey] || [];
    const updatedList = currentList.map(spec => {
      if (spec.id !== skuId) return spec;
      const next = { ...spec, ...patch, hasPackingData: true };
      return next;
    });
    onUpdatePackingData({
      ...packingData,
      [oilKey]: updatedList,
    });
  };

  const handleAddNewSku = (oilKey: string) => {
    SoundEngine.play('pop');
    const currentList = packingData[oilKey] || [];
    const comm = commodities[oilKey];
    const isUsa = comm?.originSection === 'usa' || comm?.packingCurrency === 'USD';
    const newSpec: PackingSpec = isUsa
      ? {
          id: Date.now() + Math.floor(Math.random() * 1000),
          sku: 'Custom 1 Ltr x 12',
          volume: 1.0,
          units: 12,
          cartons: 2100,
          type: 'Pet Bottle',
          bottleCost: 0.45,
          labelCost: 0.18,
          capCost: 0.15,
          fillCost: 0,
          cartonCost: 2.0,
          density: comm?.density || 0.91,
          hasPackingData: true,
        }
      : {
          id: Date.now() + Math.floor(Math.random() * 1000),
          sku: 'Custom 1 L (33.8 oz) x 12 PET',
          volume: 1.0,
          units: 12,
          cartons: 2100,
          type: 'PET Bottle',
          bottleCost: 7.5,
          labelCost: 3.0,
          capCost: 1.5,
          fillCost: 0,
          cartonCost: 35.0,
          density: comm?.density || 0.91,
          hasPackingData: true,
        };
    onUpdatePackingData({
      ...packingData,
      [oilKey]: [...currentList, newSpec],
    });
    setEditingCardIds(prev => ({ ...prev, [newSpec.id]: true }));
    onNotify(`Added new editable SKU to ${comm?.label || oilKey}`);
  };

  const handleDuplicateSku = (oilKey: string, spec: PackingSpec) => {
    SoundEngine.play('pop');
    const currentList = packingData[oilKey] || [];
    const copy: PackingSpec = {
      ...spec,
      id: Date.now() + Math.floor(Math.random() * 1000),
      sku: `${spec.sku} (Copy)`,
    };
    onUpdatePackingData({
      ...packingData,
      [oilKey]: [...currentList, copy],
    });
    onNotify(`Duplicated SKU "${spec.sku}"`);
  };

  const handleDeleteSku = (oilKey: string, skuId: number) => {
    SoundEngine.play('thud');
    const currentList = packingData[oilKey] || [];
    onUpdatePackingData({
      ...packingData,
      [oilKey]: currentList.filter(s => s.id !== skuId),
    });
  };

  // Commodity Modal Handlers
  const openEditCommodityModal = (key?: string, defaultSection: CommoditySection = 'india') => {
    SoundEngine.play('pop');
    if (key && commodities[key]) {
      const c = commodities[key];
      setEditingCommodityKey(key);
      setCommForm({
        ...c,
        defaultPrice: oilPrices[key] ?? c.defaultPrice,
        basicDutyPerKg: c.basicDutyPerKg ?? 0,
        basicDutyPerKgUnit: c.basicDutyPerKgUnit || '$/kg',
        originSection: c.originSection || 'india',
        packingCurrency: c.packingCurrency || (c.originSection === 'usa' ? 'USD' : 'INR'),
      });
    } else {
      setEditingCommodityKey(null);
      const isUsaDefault = defaultSection === 'usa';
      setCommForm({
        key: '',
        label: '',
        emoji: '🛢️',
        defaultPrice: isUsaDefault ? 2.05 : 180,
        currency: isUsaDefault ? 'USD' : 'INR',
        basicDuty: isUsaDefault ? 0 : 6.4,
        dutyType: '%',
        basicDutyPerKg: 0,
        basicDutyPerKgUnit: '$/kg',
        density: 0.91,
        hsCode: '1515.90.00',
        isBlend: false,
        originSection: defaultSection,
        packingCurrency: isUsaDefault ? 'USD' : 'INR',
        defaultProfitMargin: isUsaDefault ? 10 : undefined,
      });
    }
    setCommodityModalOpen(true);
  };

  const handleSaveCommodityModal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = commForm.label.trim();
    if (!cleanLabel) return;
    const key =
      editingCommodityKey ||
      commForm.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') ||
      `oil_${Date.now().toString().slice(-4)}`;

    const isUsa = commForm.originSection === 'usa';
    const updatedComm: Commodity = {
      ...commForm,
      key,
      label: cleanLabel,
      originSection: commForm.originSection || 'india',
      packingCurrency: isUsa ? 'USD' : commForm.packingCurrency || 'INR',
    };

    onUpdateCommodities({
      ...commodities,
      [key]: updatedComm,
    });

    onUpdateOilPrices({
      ...oilPrices,
      [key]: commForm.defaultPrice,
    });

    if (!packingData[key] || packingData[key].length === 0) {
      const template = isUsa
        ? packingData.usa_canola || packingData.usa_olive || []
        : packingData.mustard || Object.values(packingData)[0] || [];
      onUpdatePackingData({
        ...packingData,
        [key]: template.map((t, idx) => ({
          ...t,
          id: Date.now() + idx,
          density: updatedComm.density,
          customPriceOverride: null,
        })),
      });
    }

    if (activeCommodity === key) {
      updateParams(p => ({
        ...p,
        basicDuty: p.isUSA ? updatedComm.basicDuty : 0,
        dutyType: updatedComm.dutyType,
        basicDutyPerKg: p.isUSA ? updatedComm.basicDutyPerKg || 0 : 0,
        basicDutyPerKgUnit: updatedComm.basicDutyPerKgUnit || '$/kg',
        density: updatedComm.density,
      }));
    }

    SoundEngine.play('success');
    setActiveCommodity(key);
    setCommodityModalOpen(false);
    onNotify(`Saved commodity "${cleanLabel}"`);
  };

  const handleDeleteCommodity = (key: string) => {
    if (commodityKeys.length <= 1) return;
    const nextComm = { ...commodities };
    delete nextComm[key];
    onUpdateCommodities(nextComm);
    if (activeCommodity === key) {
      setActiveCommodity(Object.keys(nextComm)[0]);
    }
    setCommodityModalOpen(false);
    SoundEngine.play('thud');
    onNotify(`Removed commodity`);
  };

  // Blended Oil Calculation
  const blendedCalculatedPrice = useMemo(() => {
    const masterRatio = blendMasterRatio / 100;
    const baseRatio = (100 - blendMasterRatio) / 100;
    const weighted = masterRatio * blendMasterPrice + baseRatio * blendBasePrice;
    return Math.round(weighted * 100) / 100;
  }, [blendMasterRatio, blendMasterPrice, blendBasePrice]);

  // Current Commodity Calculations (unsorted or sorted cleanly while preserving stability)
  const currentCommoditySpecs = packingData[activeCommodity] || [];
  const currentCommodityCalculations = useMemo(() => {
    let price = oilPrices[activeCommodity] ?? activeCommObj?.defaultPrice ?? 0;
    if (activeCommObj?.isBlend && oilPrices[activeCommodity] === undefined) {
      price = blendedCalculatedPrice;
    }
    return currentCommoditySpecs.map(s =>
      calculateMasterRow(s, price, activeCommodity, params, commodities)
    );
  }, [activeCommodity, currentCommoditySpecs, oilPrices, activeCommObj, blendedCalculatedPrice, params, commodities]);

  // Reverse Costing Calculation
  const reverseResult = useMemo(() => {
    const specs = packingData[revCommodity] || [];
    const targetSpec = specs.find(s => s.id === revSkuId) || specs[0];
    if (!targetSpec) return null;

    const comm = commodities[revCommodity];
    const catalogPrice = oilPrices[revCommodity] ?? comm?.defaultPrice ?? 0;
    const overrideVal = revUseOverride ? revBulkOverride : null;

    return reverseCalculate(
      revTargetPrice,
      targetSpec,
      revCommodity,
      catalogPrice,
      overrideVal,
      params,
      revProfitTarget,
      commodities
    );
  }, [
    revCommodity,
    revSkuId,
    revTargetPrice,
    revUseOverride,
    revBulkOverride,
    revProfitTarget,
    packingData,
    oilPrices,
    params,
    commodities,
  ]);

  // Proforma Invoice totals
  const invoiceTotals = useMemo(() => {
    const totalQty = invoiceItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const subTotal = fmt(invoiceItems.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0));
    const extrasDelta = fmt(
      extraSummaryRows.reduce((s, r) => s + (Number(r.numericAmount) || 0), 0)
    );
    const grandTotal = fmt(subTotal + extrasDelta);
    const totalGrossKg = invoiceItems.reduce((s, i) => s + i.qty * (i.grossWeight || 0), 0);
    const totalGrossLbs = kgToLbs(totalGrossKg);
    const payloadPercent = Math.min(100, Math.round((totalGrossKg / MAX_CONTAINER_PAYLOAD_KG) * 100));

    return {
      totalQty,
      subTotal,
      extrasDelta,
      grandTotal,
      totalGrossKg,
      totalGrossLbs,
      payloadPercent,
    };
  }, [invoiceItems, extraSummaryRows]);

  // Build full SavedProformaInvoice snapshot from current state
  const currentInvoiceSnapshot: SavedProformaInvoice = useMemo(() => {
    return {
      piNumber: invNum,
      date: invDate,
      dateLong: invDateDisplay || invDate,
      timeCreated: new Date().toLocaleTimeString('en-US'),
      savedAt: new Date().toISOString(),
      ownerEmail: user.email,
      ownerName: user.name,
      ownerInitials: user.initials,
      documentTitle: poSellerConfig.documentTitle,
      companyName: poSellerConfig.companyName,
      companyAddress: poSellerConfig.companyAddress,
      companyPhone: poSellerConfig.companyPhone,
      companyEmail: poSellerConfig.companyEmail,
      companyTaxIdLabel: poSellerConfig.companyTaxIdLabel,
      companyTaxId: poSellerConfig.companyTaxId,
      buyerName,
      buyerShortName,
      buyerAddress,
      buyerAttention,
      shipToName: shipToSameAsBuyer ? buyerName : shipToName,
      shipToAddress: shipToSameAsBuyer ? buyerAddress : shipToAddress,
      shipToAttention: shipToSameAsBuyer ? buyerAttention : shipToAttention,
      mktExecName,
      mktExecShort,
      mktExecEmail,
      deliveryTerms,
      paymentTerms,
      incoterm: params.incoterm,
      portName: params.portName,
      quoteCur: params.quoteCur,
      curSymbol: params.curSymbol,
      activeExRate: params.activeExRate,
      roundingStep: params.roundingStep,
      items: invoiceItems,
      extraSummaryRows,
      subTotal: invoiceTotals.subTotal,
      totalQty: invoiceTotals.totalQty,
      totalUSD: invoiceTotals.grandTotal,
      totalINR: fmt(invoiceTotals.grandTotal * params.activeExRate),
      noteHeader: poSellerConfig.noteHeader,
      bankDetailsText: poSellerConfig.bankDetailsText,
      signatoryLabel: poSellerConfig.signatoryLabel,
      showStamp: poSellerConfig.showStamp,
      customLogoUrl: poSellerConfig.customLogoUrl,
      internalNote: piInternalNote,
    };
  }, [
    invNum,
    invDate,
    invDateDisplay,
    user,
    poSellerConfig,
    buyerName,
    buyerShortName,
    buyerAddress,
    buyerAttention,
    shipToSameAsBuyer,
    shipToName,
    shipToAddress,
    shipToAttention,
    mktExecName,
    mktExecShort,
    mktExecEmail,
    deliveryTerms,
    paymentTerms,
    params,
    invoiceItems,
    extraSummaryRows,
    invoiceTotals,
    piInternalNote,
  ]);

  // Sync edits made directly inside the live ProformaTemplateDocument preview back to form states
  const handleTemplateDocumentChange = (updated: SavedProformaInvoice) => {
    setInvNum(updated.piNumber);
    if (updated.dateLong !== undefined) setInvDateDisplay(updated.dateLong);
    setBuyerName(updated.buyerName);
    setBuyerAddress(updated.buyerAddress);
    setBuyerAttention(updated.buyerAttention);
    if (updated.shipToName !== undefined && updated.shipToName !== updated.buyerName) {
      setShipToSameAsBuyer(false);
      setShipToName(updated.shipToName);
    } else if (shipToSameAsBuyer) {
      setShipToName(updated.buyerName);
    }
    if (updated.shipToAddress !== undefined && updated.shipToAddress !== updated.buyerAddress) {
      setShipToSameAsBuyer(false);
      setShipToAddress(updated.shipToAddress);
    } else if (shipToSameAsBuyer) {
      setShipToAddress(updated.buyerAddress);
    }
    if (updated.shipToAttention !== undefined && updated.shipToAttention !== updated.buyerAttention) {
      setShipToSameAsBuyer(false);
      setShipToAttention(updated.shipToAttention);
    } else if (shipToSameAsBuyer) {
      setShipToAttention(updated.buyerAttention);
    }
    setInvoiceItems(updated.items);
    if (updated.extraSummaryRows) setExtraSummaryRows(updated.extraSummaryRows);

    onUpdatePoSellerConfig({
      ...poSellerConfig,
      documentTitle: updated.documentTitle ?? poSellerConfig.documentTitle,
      companyAddress: updated.companyAddress ?? poSellerConfig.companyAddress,
      companyPhone: updated.companyPhone ?? poSellerConfig.companyPhone,
      companyEmail: updated.companyEmail ?? poSellerConfig.companyEmail,
      companyTaxIdLabel: updated.companyTaxIdLabel ?? poSellerConfig.companyTaxIdLabel,
      companyTaxId: updated.companyTaxId ?? poSellerConfig.companyTaxId,
      noteHeader: updated.noteHeader ?? poSellerConfig.noteHeader,
      bankDetailsText: updated.bankDetailsText ?? poSellerConfig.bankDetailsText,
      signatoryLabel: updated.signatoryLabel ?? poSellerConfig.signatoryLabel,
      showStamp: updated.showStamp ?? poSellerConfig.showStamp,
    });
  };

  // Add SKU to invoice
  const handleAddSkuToInvoice = (calc: MasterRowCalculation, qtyToAdd = 500) => {
    SoundEngine.play('pop');
    setInvoiceItems(prev => {
      const exists = prev.find(i => i.skuId === calc.id && i.oilKey === calc.oilKey);
      if (exists) {
        return prev.map(i =>
          i.skuId === calc.id && i.oilKey === calc.oilKey
            ? {
                ...i,
                qty: i.qty + qtyToAdd,
                lineTotal: fmt((i.qty + qtyToAdd) * i.unitPrice),
              }
            : i
        );
      }
      const nextSr = prev.length + 1;
      return [
        ...prev,
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          srNo: nextSr,
          skuId: calc.id,
          oilKey: calc.oilKey,
          oilLabel: calc.oilLabel,
          sku: calc.sku,
          customDescription: formatPoProductDescription(calc.oilLabel, calc.sku, calc.volume, calc.units),
          volume: calc.volume,
          units: calc.units,
          qty: qtyToAdd,
          unitPrice: calc.roundedQuotePrice,
          lineTotal: fmt(qtyToAdd * calc.roundedQuotePrice),
          grossWeight: calc.grossWeight,
          grossWeightLbs: calc.grossWeightLbs,
          netWeightKg: calc.netWeightKg,
          netWeightLbs: calc.netWeightLbs,
        },
      ];
    });
    onNotify(`Added ${qtyToAdd} cases of ${calc.oilLabel} (${calc.sku}) to Proforma Invoice`);
  };

  const handleAddCustomInvoiceRow = () => {
    SoundEngine.play('pop');
    setInvoiceItems(prev => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        srNo: prev.length + 1,
        skuId: 0,
        oilKey: 'custom',
        oilLabel: 'Custom Product',
        sku: 'Custom Pack',
        customDescription: 'Mustard Oil ( 32 Fl oz X 12 pcs )',
        volume: 1,
        units: 12,
        qty: 250,
        unitPrice: 40.0,
        lineTotal: 10000.0,
        grossWeight: 12.0,
        grossWeightLbs: 26.46,
        netWeightKg: 10.92,
        netWeightLbs: 24.07,
      },
    ]);
  };

  // Resolve floor price metadata for any Proforma line item
  const resolveFloorForLineItem = (item: ProformaItem) => {
    const oilSpecs = packingData[item.oilKey] || [];
    const matchedSpec =
      oilSpecs.find(s => s.id === item.skuId) ||
      oilSpecs.find(s => s.sku.toLowerCase() === (item.sku || '').toLowerCase());
    if (!matchedSpec) return null;
    return computeFloorPriceForSpec(
      matchedSpec,
      item.oilKey,
      oilPrices,
      params,
      commodities,
      floorPolicy.minFloorMarginPct
    );
  };

  const checkFloorComplianceBeforeIssuing = (itemsToVerify: ProformaItem[]): boolean => {
    if (!floorPolicy.enforceStrictFloor || canOverrideFloorPrice) return true;
    const violations = itemsToVerify
      .map(it => {
        const fl = resolveFloorForLineItem(it);
        if (!fl) return null;
        if (it.unitPrice + 0.001 < fl.minSellingPrice) {
          return `${it.oilLabel} (${it.sku}): ${params.curSymbol}${fmtStr(it.unitPrice)} < Min ${params.curSymbol}${fmtStr(fl.minSellingPrice)}`;
        }
        return null;
      })
      .filter(Boolean);

    if (violations.length > 0) {
      SoundEngine.play('thud');
      onNotify(
        `Floor Price Guard: Cannot issue PI below minimum selling price (${violations[0]}). Snap to floor in the Sales Side Panel or request Admin override.`
      );
      return false;
    }
    return true;
  };

  const handleApplyUnitPriceToLine = (lineIndex: number, newUnitPrice: number) => {
    if (!canCreateEditPI) return;
    setInvoiceItems(prev =>
      prev.map((it, idx) =>
        idx === lineIndex
          ? { ...it, unitPrice: fmt(newUnitPrice), lineTotal: fmt(it.qty * fmt(newUnitPrice)) }
          : it
      )
    );
    onNotify(`Updated line #${lineIndex + 1} price to ${params.curSymbol}${fmtStr(newUnitPrice)}/case.`);
  };

  const handleSnapAllLinesToFloor = (floorMap: Record<number, number>) => {
    if (!canCreateEditPI) return;
    setInvoiceItems(prev =>
      prev.map((it, idx) => {
        const targetFloor = floorMap[idx];
        if (targetFloor !== undefined && it.unitPrice < targetFloor) {
          return {
            ...it,
            unitPrice: fmt(targetFloor),
            lineTotal: fmt(it.qty * fmt(targetFloor)),
          };
        }
        return it;
      })
    );
    onNotify('Snapped all below-floor Proforma items to authorized Minimum Selling Price.');
  };

  const handleQuickAddWithPrice = (
    oilKey: string,
    spec: PackingSpec,
    qty: number,
    unitPrice: number
  ) => {
    if (!canCreateEditPI) return;
    const p = oilPrices[oilKey] ?? commodities[oilKey]?.defaultPrice ?? 0;
    const calc = calculateMasterRow(spec, p, oilKey, params, commodities);
    const cleanPrice = fmt(unitPrice);
    setInvoiceItems(prev => {
      const exists = prev.find(i => i.skuId === calc.id && i.oilKey === calc.oilKey);
      if (exists) {
        return prev.map(i =>
          i.skuId === calc.id && i.oilKey === calc.oilKey
            ? {
                ...i,
                qty: i.qty + qty,
                unitPrice: cleanPrice,
                lineTotal: fmt((i.qty + qty) * cleanPrice),
              }
            : i
        );
      }
      const nextSr = prev.length + 1;
      return [
        ...prev,
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          srNo: nextSr,
          skuId: calc.id,
          oilKey: calc.oilKey,
          oilLabel: calc.oilLabel,
          sku: calc.sku,
          customDescription: formatPoProductDescription(calc.oilLabel, calc.sku, calc.volume, calc.units),
          volume: calc.volume,
          units: calc.units,
          qty,
          unitPrice: cleanPrice,
          lineTotal: fmt(qty * cleanPrice),
          grossWeight: calc.grossWeight,
          grossWeightLbs: calc.grossWeightLbs,
          netWeightKg: calc.netWeightKg,
          netWeightLbs: calc.netWeightLbs,
        },
      ];
    });
    onNotify(
      `Added ${qty} cases of ${calc.oilLabel} (${calc.sku}) at ${params.curSymbol}${fmtStr(cleanPrice)}/case`
    );
  };

  const handleDownloadCurrentXlsx = async (piToExport: SavedProformaInvoice = currentInvoiceSnapshot) => {
    if (!checkFloorComplianceBeforeIssuing(piToExport.items)) return;
    try {
      setIsExportingXlsx(true);
      SoundEngine.play('pop');
      const res = await fetch('/api/export-po-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(piToExport),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate Excel file');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (piToExport.piNumber || 'Proforma_Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.href = url;
      a.download = `${safeName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      SoundEngine.play('success');
      onNotify(`Downloaded ${safeName}.xlsx in Blank PO template`);
    } catch (e: unknown) {
      onNotify(e instanceof Error ? e.message : 'Failed to export Excel');
    } finally {
      setIsExportingXlsx(false);
    }
  };

  const handleSaveCurrentPI = () => {
    if (!canCreateEditPI) {
      onNotify('Your role does not have permission to save Proforma Invoices.');
      return;
    }
    if (invoiceItems.length === 0) {
      onNotify('Add at least one line item before saving the Proforma Invoice.');
      return;
    }
    if (!checkFloorComplianceBeforeIssuing(invoiceItems)) return;
    SoundEngine.play('success');
    onSavePI(currentInvoiceSnapshot);
    onNotify(`Proforma Invoice ${invNum} saved to PI History.`);
  };

  const handleLoadPIIntoEditor = (pi: SavedProformaInvoice) => {
    SoundEngine.play('pop');
    setInvNum(pi.piNumber);
    setInvDate(pi.date || new Date().toISOString().split('T')[0]);
    setInvDateDisplay(pi.dateLong || pi.date);
    setBuyerName(pi.buyerName);
    setBuyerShortName(pi.buyerShortName || pi.buyerName);
    setBuyerAddress(pi.buyerAddress);
    setBuyerAttention(pi.buyerAttention);

    const hasDistinctShipTo =
      (pi.shipToName && pi.shipToName !== pi.buyerName) ||
      (pi.shipToAddress && pi.shipToAddress !== pi.buyerAddress);
    setShipToSameAsBuyer(!hasDistinctShipTo);
    setShipToName(pi.shipToName || pi.buyerName);
    setShipToAddress(pi.shipToAddress || pi.buyerAddress);
    setShipToAttention(pi.shipToAttention || pi.buyerAttention);

    setMktExecName(pi.mktExecName || user.name);
    setMktExecShort(pi.mktExecShort || user.initials);
    setMktExecEmail(pi.mktExecEmail || user.email);
    setDeliveryTerms(pi.deliveryTerms || '');
    setPaymentTerms(pi.paymentTerms || '');
    setInvoiceItems(
      pi.items.map((it, idx) => ({
        ...it,
        srNo: it.srNo ?? idx + 1,
        customDescription:
          it.customDescription || formatPoProductDescription(it.oilLabel, it.sku, it.volume, it.units),
      }))
    );
    setExtraSummaryRows(pi.extraSummaryRows || []);
    setPiInternalNote(pi.internalNote || '');
    setSubTab('invoice');
    onNotify(`Loaded ${pi.piNumber} into Proforma Invoice editor.`);
  };

  const handleSaveCurrentNegotiation = () => {
    if (!reverseResult) return;
    SoundEngine.play('success');
    const newNego: NegotiationRecord = {
      negoNumber: `NEGO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      dateLong: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      timeString: new Date().toLocaleTimeString('en-US'),
      ownerEmail: user.email,
      ownerName: user.name,
      ownerInitials: user.initials,
      clientName: revClientName,
      reference: revReference,
      commodityKey: reverseResult.commodityKey,
      commodityLabel: reverseResult.commodityLabel,
      sku: reverseResult.sku,
      skuId: reverseResult.skuId,
      volume: reverseResult.volume,
      units: reverseResult.units,
      netWeightKg: reverseResult.netWeightKg,
      targetPrice: reverseResult.targetPrice,
      baseBeforeProfit: reverseResult.baseBeforeProfit,
      maxBulkPricePerKg: reverseResult.maxBulkPricePerKg,
      actualBulkPrice: reverseResult.actualBulkPrice,
      catalogBulkPrice: reverseResult.catalogBulkPrice,
      profitPerKg: reverseResult.profitPerKg,
      profitPerCarton: reverseResult.profitPerCarton,
      profitPct: reverseResult.profitPct,
      verdict: reverseResult.verdict,
      minAcceptablePrice: reverseResult.minAcceptablePrice,
      quoteCur: params.quoteCur,
      curSymbol: params.curSymbol,
      incoterm: params.incoterm,
      portName: params.portName,
      internalNote: revInternalNote,
      steps: reverseResult.steps,
    };
    onSaveNegotiation(newNego);
    onNotify(`Saved negotiation record ${newNego.negoNumber}`);
  };

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        onUpdatePoSellerConfig({ ...poSellerConfig, customLogoUrl: dataUrl });
        onNotify('Updated custom Proforma Invoice logo.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Matrix columns based on active commodity SKUs
  const matrixReferenceSkus = useMemo(() => {
    const base = packingData[activeCommodity] || packingData.mustard || [];
    return base.slice(0, 10);
  }, [packingData, activeCommodity]);

  const exportMatrixCSV = () => {
    SoundEngine.play('pop');
    const headers = ['Commodity', 'Currency', 'Bulk Rate', ...matrixReferenceSkus.map(s => s.sku)];
    const rows = commodityKeys.map(k => {
      const c = commodities[k];
      const p = oilPrices[k] ?? c.defaultPrice;
      const specs = packingData[k] || [];
      const cells = matrixReferenceSkus.map(refSku => {
        const match = specs.find(s => s.sku === refSku.sku);
        if (!match) return '-';
        const calc = calculateMasterRow(match, p, k, params, commodities);
        return `${params.curSymbol}${fmtStr(calc.roundedQuotePrice)}`;
      });
      return [c.label, c.currency, p, ...cells];
    });
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Global_Futura_Price_Matrix_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredSavedPIs = useMemo(() => {
    if (!historySearch.trim()) return savedPIs;
    const q = historySearch.toLowerCase();
    return savedPIs.filter(
      p =>
        p.piNumber.toLowerCase().includes(q) ||
        p.buyerName.toLowerCase().includes(q) ||
        (p.buyerAttention || '').toLowerCase().includes(q) ||
        (p.internalNote || '').toLowerCase().includes(q)
    );
  }, [savedPIs, historySearch]);

  const filteredNegotiations = useMemo(() => {
    if (!negoSearch.trim()) return negotiations;
    const q = negoSearch.toLowerCase();
    return negotiations.filter(
      n =>
        n.negoNumber.toLowerCase().includes(q) ||
        n.clientName.toLowerCase().includes(q) ||
        n.commodityLabel.toLowerCase().includes(q) ||
        n.sku.toLowerCase().includes(q)
    );
  }, [negotiations, negoSearch]);

  const quickPickSpecs = packingData[quickPickOil] || [];

  return (
    <div className="space-y-6">
      {/* Module Sub-Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl overflow-x-auto scrollbar-none">
        {[
          { id: 'forward' as OilCostSubTab, label: 'Forward Costing', icon: Calculator },
          {
            id: 'invoice' as OilCostSubTab,
            label: 'Proforma Invoice (PO Template)',
            icon: FileText,
            count: invoiceItems.length > 0 ? invoiceItems.length : null,
          },
          { id: 'reverse' as OilCostSubTab, label: 'Reverse Costing', icon: TrendingDown },
          { id: 'nego' as OilCostSubTab, label: 'Negotiation Log', icon: MessageSquare, count: negotiations.length },
          { id: 'packing' as OilCostSubTab, label: 'Packing Master', icon: Package },
          { id: 'matrix' as OilCostSubTab, label: 'Price Matrix', icon: Grid3X3 },
          { id: 'container' as OilCostSubTab, label: 'Container Plan', icon: Container },
          { id: 'history' as OilCostSubTab, label: 'PI History', icon: History, count: savedPIs.length },
        ].map(tab => {
          const isActive = subTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                SoundEngine.play('tick');
                setSubTab(tab.id);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count !== undefined && (
                <span className="text-[11px] font-mono opacity-75">({tab.count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ALL-EDITABLE COMMERCIAL, FREIGHT, PORT & DUTY PARAMETERS PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Commercial, Currency, Port Freight &amp; Customs Duty Parameters
            </span>
            {!canEditMasterCosting && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                <Lock className="w-3 h-3 text-amber-500" />
                <span>Master Rates Locked by Admin</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEditMasterCosting && (
              <button
                type="button"
                onClick={() => setPortModalOpen(true)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                Manage Ports ({Object.keys(ports).length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAdvancedParams(!showAdvancedParams)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap"
            >
              <span>{showAdvancedParams ? 'Compact View' : 'Show All Freight & Duty Inputs'}</span>
              {showAdvancedParams ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <fieldset disabled={!canEditMasterCosting} className="space-y-3 disabled:opacity-75">
        {/* Row 1: Primary Commercial Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
          <div>
            <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Quote Currency
            </label>
            <select
              value={params.quoteCur}
              onChange={e => handleCurrencyChange(e.target.value as 'USD' | 'CAD' | 'INR')}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
            >
              <option value="USD">USD ($)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Currency Symbol
            </label>
            <input
              type="text"
              value={params.curSymbol}
              onChange={e => updateParams(p => ({ ...p, curSymbol: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>USD / INR Rate</span>
              <button
                type="button"
                onClick={fetchLiveFx}
                title={
                  fxStatus === 'live'
                    ? `Live rate updated ${fxUpdatedAt ?? ''} — click to refresh`
                    : fxStatus === 'error'
                      ? 'Live fetch failed — click to retry'
                      : 'Fetch live rate'
                }
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  fxStatus === 'live'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : fxStatus === 'loading'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : fxStatus === 'error'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {fxStatus === 'loading' ? '…' : fxStatus === 'live' ? '● LIVE' : fxStatus === 'error' ? '! RETRY' : '↻ SYNC'}
              </button>
            </label>
            <input
              type="number"
              step="0.05"
              value={params.exRateUSD}
              onChange={e => {
                const v = parseFloat(e.target.value) || 0;
                updateParams(p => ({
                  ...p,
                  exRateUSD: v,
                  activeExRate: p.quoteCur === 'USD' ? v : p.activeExRate,
                }));
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              CAD / INR Rate
            </label>
            <input
              type="number"
              step="0.05"
              value={params.exRateCAD}
              onChange={e => {
                const v = parseFloat(e.target.value) || 0;
                updateParams(p => ({
                  ...p,
                  exRateCAD: v,
                  activeExRate: p.quoteCur === 'CAD' ? v : p.activeExRate,
                }));
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Incoterm
            </label>
            <select
              value={params.incoterm}
              onChange={e => updateParams(p => ({ ...p, incoterm: e.target.value as CommercialParams['incoterm'] }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
            >
              <option value="DDP">DDP (Delivered Duty Paid)</option>
              <option value="CIF">CIF (Cost Insurance Freight)</option>
              <option value="FOB">FOB (Origin Port)</option>
              <option value="EXW">EXW (Ex-Works Factory)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Destination Port (Select or Custom Name)
            </label>
            <div className="flex gap-1.5">
              <select
                value={Object.keys(ports).find(k => ports[k].name === params.portName) || 'CUSTOM'}
                onChange={e => handlePortChange(e.target.value)}
                className="w-1/2 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold truncate"
              >
                {Object.entries(ports).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={params.portName}
                onChange={e => updateParams(p => ({ ...p, portName: e.target.value }))}
                placeholder="Custom port name"
                className="w-1/2 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Profit Markup %
            </label>
            <input
              type="number"
              step="0.25"
              value={params.profitMargin}
              onChange={e => updateParams(p => ({ ...p, profitMargin: parseFloat(e.target.value) || 0 }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
            />
          </div>
        </div>

        {/* Row 2: All Freight, Customs Duties, Container Size, Density & Rounding */}
        {showAdvancedParams && (
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Ocean Freight ($/Ctnr)
              </label>
              <input
                type="number"
                step="50"
                value={params.oceanFreight}
                onChange={e => updateParams(p => ({ ...p, oceanFreight: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Dest. Drayage ($/Ctnr)
              </label>
              <input
                type="number"
                step="25"
                value={params.inlandDrayage}
                onChange={e => updateParams(p => ({ ...p, inlandDrayage: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Dom. Freight (₹/Ctnr)
              </label>
              <input
                type="number"
                step="1000"
                value={params.domesticFreight}
                onChange={e => updateParams(p => ({ ...p, domesticFreight: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Basic Customs Duty
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={params.basicDuty}
                  onChange={e => updateParams(p => ({ ...p, basicDuty: parseFloat(e.target.value) || 0 }))}
                  className="w-3/5 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
                />
                <select
                  value={params.dutyType}
                  onChange={e => updateParams(p => ({ ...p, dutyType: e.target.value as DutyBasisType }))}
                  className="w-2/5 px-1 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-[10.5px]"
                >
                  <option value="%">%</option>
                  <option value="$/kg">$/kg</option>
                  <option value="cents/kg">¢/kg</option>
                </select>
              </div>
            </div>

            <div>
              <label
                className="block text-[10.5px] font-semibold text-amber-700 dark:text-amber-400 mb-1 truncate"
                title="Second Basic Customs Duty option charged per kilogram of net product weight"
              >
                Basic Duty 2 (Per Kg)
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={params.basicDutyPerKg ?? 0}
                  onChange={e =>
                    updateParams(p => ({
                      ...p,
                      basicDutyPerKg: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  placeholder="0.00"
                  className="w-3/5 px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/20 font-mono font-bold tabular-nums"
                />
                <select
                  value={params.basicDutyPerKgUnit || '$/kg'}
                  onChange={e =>
                    updateParams(p => ({
                      ...p,
                      basicDutyPerKgUnit: e.target.value as PerKgDutyUnit,
                    }))
                  }
                  className="w-2/5 px-1 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/20 font-bold text-[10.5px]"
                >
                  <option value="$/kg">$/kg</option>
                  <option value="cents/kg">¢/kg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Reciprocal Tariff %
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={params.isUSA}
                  onChange={e => updateParams(p => ({ ...p, isUSA: e.target.checked }))}
                  className="accent-amber-600 w-3.5 h-3.5 shrink-0"
                  title="Apply US Reciprocal Tariff"
                />
                <input
                  type="number"
                  step="0.5"
                  disabled={!params.isUSA}
                  value={params.reciprocalDuty}
                  onChange={e => updateParams(p => ({ ...p, reciprocalDuty: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Entry Fee (% FOB)
              </label>
              <input
                type="number"
                step="0.0005"
                value={Number((params.entryFeePercent * 100).toFixed(4))}
                onChange={e =>
                  updateParams(p => ({
                    ...p,
                    entryFeePercent: (parseFloat(e.target.value) || 0) / 100,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Container Size
              </label>
              <select
                value={params.containerSize}
                onChange={e =>
                  updateParams(p => ({
                    ...p,
                    containerSize: e.target.value as CommercialParams['containerSize'],
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                <option value="40HQ">40&apos; HQ (100%)</option>
                <option value="40GP">40&apos; GP (95%)</option>
                <option value="20GP">20&apos; GP (45%)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Density (kg/L)
              </label>
              <input
                type="number"
                step="0.01"
                value={params.density}
                onChange={e => updateParams(p => ({ ...p, density: parseFloat(e.target.value) || 0.91 }))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Quote Rounding Step
              </label>
              <select
                value={String(params.roundingStep)}
                onChange={e => updateParams(p => ({ ...p, roundingStep: parseFloat(e.target.value) }))}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
              >
                <option value="0">Exact (No Rounding)</option>
                <option value="0.05">Up to 0.05</option>
                <option value="0.1">Up to 0.10</option>
                <option value="0.25">Up to 0.25</option>
                <option value="0.5">Up to 0.50</option>
                <option value="1">Up to 1.00</option>
              </select>
            </div>
          </div>
        )}
        </fieldset>
      </div>

      {/* SUBTAB 1: FORWARD COSTING & EDITABLE WATERFALL CARDS */}
      {subTab === 'forward' && (
        <div className="space-y-6">
          {/* Commodity Selector + Inline Bulk Price Inputs + Edit/Add Commodity */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {canEditMasterCosting
                  ? 'Select Commodity & Edit Bulk Buying Rate Directly:'
                  : 'Select Commodity (Bulk Buying Rates View-Only):'}
              </div>
              {canEditMasterCosting && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCommodityModal(undefined, 'india')}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add India Commodity</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditCommodityModal(undefined, 'usa')}
                    className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add USA Pricelist Product</span>
                  </button>
                </div>
              )}
            </div>

            {(() => {
              const renderCommodityCard = (key: string) => {
                const c = commodities[key];
                if (!c) return null;
                const isActive = activeCommodity === key;
                const price = oilPrices[key] ?? c.defaultPrice;
                const curPrefix = c.currency === 'USD' ? '$' : '₹';
                const isUsaItem = c.originSection === 'usa' || c.packingCurrency === 'USD';

                return (
                  <div
                    key={key}
                    onClick={() => handleSelectCommodity(key)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-2 ${
                      isActive
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-1 ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div
                          className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate"
                          title={c.label}
                        >
                          {c.emoji} {c.label}
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {isUsaItem ? (
                            c.blendNote ||
                            `USA Direct · Margin ${c.defaultProfitMargin ?? 10}%`
                          ) : (
                            <>
                              Duty:{' '}
                              {c.dutyType === '$/kg'
                                ? `$${c.basicDuty}/kg`
                                : c.dutyType === 'cents/kg'
                                ? `${c.basicDuty}¢/kg`
                                : `${c.basicDuty}%`}
                              {(c.basicDutyPerKg || 0) > 0
                                ? ` + ${
                                    (c.basicDutyPerKgUnit || '$/kg') === 'cents/kg'
                                      ? `${c.basicDutyPerKg}¢/kg`
                                      : `$${c.basicDutyPerKg}/kg`
                                  }`
                                : ''}{' '}
                              · HS {c.hsCode}
                            </>
                          )}
                        </div>
                      </div>
                      {canEditMasterCosting && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            openEditCommodityModal(key);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                          title="Edit commodity details, duty, density & HS code"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Direct Inline Editable Bulk Rate */}
                    <div
                      onClick={e => e.stopPropagation()}
                      className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-200/70 dark:border-slate-800"
                    >
                      <span className="text-[10.5px] font-semibold text-slate-500 leading-tight">
                        Bulk Rate:
                        {isUsaItem && c.currency === 'USD' && (
                          <span className="block text-[9.5px] font-mono text-slate-400">
                            ${(price / KG_TO_LBS).toFixed(4)}/lb
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          {curPrefix}
                        </span>
                        <input
                          type="number"
                          step={c.currency === 'USD' ? '0.01' : '0.25'}
                          disabled={!canEditMasterCosting}
                          value={price}
                          onChange={e =>
                            handleUpdateSingleOilPrice(key, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-1.5 py-0.5 text-right text-xs font-mono font-bold tabular-nums rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-70"
                        />
                        <span className="text-[10px] text-slate-500">/kg</span>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-4">
                  {/* Section 1: Existing Master Commodities (India Filling & Export) */}
                  {indiaMainKeys.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          India Filling &amp; Export Costing ({indiaMainKeys.length} Products)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
                        {indiaMainKeys.map(renderCommodityCard)}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Indian Section for EV Olive Oil & Avocado Oil */}
                  {indiaEvooAvoKeys.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/15 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                            Indian Section — EV Olive Oil &amp; Avocado Oil (India Filling · INR)
                          </div>
                          <div className="text-[10.5px] text-emerald-700 dark:text-emerald-400/90">
                            Indian INR bulk buying rate (₹/kg) + India packaging, domestic transport, FOB, ocean freight &amp; duties waterfall
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
                        {indiaEvooAvoKeys.map(renderCommodityCard)}
                      </div>
                    </div>
                  )}

                  {/* Section 3: USA Pricelist (USA Filling Cost) */}
                  {usaPricelistKeys.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/15 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                            USA Pricelist — Direct Product Costing ({usaPricelistKeys.length} Products · USD)
                          </div>
                          <div className="text-[10.5px] text-blue-700 dark:text-blue-400/90">
                            USA Filling Pricelist products (USD $/kg &amp; $/lb bulk rate + USD packaging + markup)
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
                        {usaPricelistKeys.map(renderCommodityCard)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Blended Oil Ratio Engine */}
          {activeCommObj?.isBlend && (
            <div className="p-5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-300 dark:border-teal-800 space-y-4">
              {(() => {
                const blendSym = activeCommObj.currency === 'USD' ? '$' : '₹';
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-teal-950 dark:text-teal-200">
                          Dual-Oil Master Blending Ratio Calculator ({activeCommObj.label})
                        </h3>
                        <p className="text-xs text-teal-800 dark:text-teal-400">
                          Adjust master and carrier base ratios or click Apply to set the active Blended Oil bulk cost.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] font-semibold text-teal-700 dark:text-teal-400">
                            Weighted Blend Rate
                          </div>
                          <div className="text-lg font-black font-mono tabular-nums text-teal-900 dark:text-teal-100">
                            {blendSym}
                            {fmtStr(blendedCalculatedPrice)} / kg
                          </div>
                        </div>
                        {canEditMasterCosting && (
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateSingleOilPrice(activeCommodity, blendedCalculatedPrice);
                              SoundEngine.play('pop');
                              onNotify(
                                `Applied ${blendSym}${fmtStr(blendedCalculatedPrice)}/kg to ${activeCommObj.label}`
                              );
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold whitespace-nowrap"
                          >
                            Apply Rate
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-teal-200 dark:border-teal-800 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                          <span>Master Oil Share: {blendMasterRatio}%</span>
                          <span className="font-mono">
                            {blendSym}
                            {blendMasterPrice}/kg
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={blendMasterRatio}
                          onChange={e => setBlendMasterRatio(parseInt(e.target.value, 10))}
                          className="w-full accent-teal-600"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={blendMasterType}
                            onChange={e => setBlendMasterType(e.target.value)}
                            placeholder="Master oil name"
                            className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                          <input
                            type="number"
                            step={activeCommObj.currency === 'USD' ? '0.01' : '0.5'}
                            value={blendMasterPrice}
                            onChange={e => setBlendMasterPrice(parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-right"
                          />
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-teal-200 dark:border-teal-800 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                          <span>Carrier Base Oil Share: {100 - blendMasterRatio}%</span>
                          <span className="font-mono">
                            {blendSym}
                            {blendBasePrice}/kg
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden my-2">
                          <div className="bg-teal-600 h-full" style={{ width: `${100 - blendMasterRatio}%` }} />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={blendBaseType}
                            onChange={e => setBlendBaseType(e.target.value)}
                            placeholder="Carrier oil name"
                            className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                          <input
                            type="number"
                            step={activeCommObj.currency === 'USD' ? '0.01' : '0.5'}
                            value={blendBasePrice}
                            onChange={e => setBlendBasePrice(parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-right"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* SKU Costing Waterfall Cards Toolbar */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  SKU Cost Breakdown Waterfalls — {activeCommObj?.label} ({currentCommodityCalculations.length} SKUs)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click the Edit icon on any card or enable &ldquo;Edit All SKU Cards&rdquo; to modify every dimension, weight, packaging cost, freight, or custom final quote price.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    SoundEngine.play('tick');
                    const next = !elaborateAllDuties;
                    setElaborateAllDuties(next);
                    if (!next) setExpandedDutyCardIds({});
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                    elaborateAllDuties
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {elaborateAllDuties ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {elaborateAllDuties
                      ? 'Collapse Duties & Drayage'
                      : 'Elaborate Duties, Entry & Drayage'}
                  </span>
                </button>

                {canEditMasterCosting && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.play('tick');
                        setEditAllCards(!editAllCards);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                        editAllCards
                          ? 'bg-amber-500 border-amber-500 text-slate-950'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{editAllCards ? 'Finish Editing All Cards' : 'Edit All SKU Cards'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddNewSku(activeCommodity)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New SKU</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onResetCommodityPacking(activeCommodity);
                        SoundEngine.play('pop');
                        onNotify(`Reset ${activeCommObj?.label} SKUs to factory defaults.`);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Waterfall Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentCommodityCalculations.map(calc => {
                const rawSpec = currentCommoditySpecs.find(s => s.id === calc.id);
                if (!rawSpec) return null;
                const isEditing = canEditMasterCosting && (editAllCards || !!editingCardIds[calc.id]);
                const isDutyElaborated =
                  elaborateAllDuties || (expandedDutyCardIds[calc.id] ?? isEditing);
                const qtyVal = cardAddQty[calc.id] ?? 500;

                return (
                  <div
                    key={calc.id}
                    className={`bg-white dark:bg-slate-900 border rounded-xl overflow-hidden flex flex-col justify-between transition-colors ${
                      isEditing
                        ? 'border-amber-500 ring-1 ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="bg-slate-900 text-white p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={rawSpec.sku}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, { sku: e.target.value })
                                }
                                placeholder="SKU Title"
                                className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                              />
                              <input
                                type="text"
                                value={rawSpec.type}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, { type: e.target.value })
                                }
                                placeholder="Container Type (e.g. PET Bottle)"
                                className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-200 text-[11px] focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="font-bold text-sm truncate" title={calc.sku}>
                                {calc.sku}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {calc.type} · {formatVolume(calc.volume)}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-start gap-1.5 shrink-0">
                          <div className="text-right">
                            <div className="text-[9.5px] font-semibold uppercase text-amber-400">
                              {calc.isCustomPriceOverridden ? 'Custom Quote' : 'Quoted Price'}
                            </div>
                            {isEditing ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs text-emerald-400 font-bold">{params.curSymbol}</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  placeholder={fmtStr(calc.calculatedRoundedPrice)}
                                  value={
                                    rawSpec.customPriceOverride !== null &&
                                    rawSpec.customPriceOverride !== undefined
                                      ? rawSpec.customPriceOverride
                                      : ''
                                  }
                                  onChange={e => {
                                    const val = e.target.value;
                                    handleUpdateSkuSpec(activeCommodity, calc.id, {
                                      customPriceOverride: val === '' ? null : parseFloat(val),
                                    });
                                  }}
                                  className="w-20 px-1.5 py-0.5 rounded bg-slate-800 border border-emerald-500 text-emerald-300 font-mono font-bold text-sm text-right focus:outline-none"
                                  title="Enter custom final quoted price or leave blank for auto-calculated"
                                />
                              </div>
                            ) : (
                              <div className="text-lg font-black font-mono tabular-nums text-emerald-400">
                                {params.curSymbol}
                                {fmtStr(calc.roundedQuotePrice)}
                              </div>
                            )}
                          </div>

                          {canEditMasterCosting && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingCardIds(prev => ({ ...prev, [calc.id]: !isEditing }))
                              }
                              className={`p-1.5 rounded-lg transition-colors ${
                                isEditing
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                              }`}
                              title={isEditing ? 'Done editing card' : 'Edit all fields on this SKU card'}
                            >
                              {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-[10.5px]">
                          <div className="flex items-center gap-2">
                            {calc.isCustomPriceOverridden && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, { customPriceOverride: null })
                                }
                                className="text-amber-300 hover:underline"
                              >
                                Reset Price to Auto ({params.curSymbol}
                                {fmtStr(calc.calculatedRoundedPrice)})
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDuplicateSku(activeCommodity, rawSpec)}
                              className="text-slate-300 hover:text-white flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSku(activeCommodity, calc.id)}
                              className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Body: Full Waterfall or Inline Editor */}
                    <div className="p-4 space-y-1.5 text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
                      {isEditing ? (
                        <>
                          <div className="grid grid-cols-3 gap-2 pb-2">
                            <div>
                              <label className="block text-[10px] text-slate-500">Volume (L)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={rawSpec.volume}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    volume: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500">Units / Case</label>
                              <input
                                type="number"
                                min={1}
                                value={rawSpec.units}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    units: Math.max(1, parseInt(e.target.value, 10) || 1),
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500">Ctns (40&apos;HQ)</label>
                              <input
                                type="number"
                                min={1}
                                value={rawSpec.cartons}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    cartons: Math.max(1, parseInt(e.target.value, 10) || 1),
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2">
                            <div>
                              <label className="block text-[10px] text-slate-500">Density (kg/L)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={rawSpec.density ?? params.density}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    density: parseFloat(e.target.value) || 0.91,
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500">Unit Wt (g)</label>
                              <input
                                type="number"
                                step="1"
                                placeholder="By Vol"
                                value={rawSpec.weightG ?? ''}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    weightG:
                                      e.target.value === '' ? undefined : parseFloat(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                                title="Optional net weight in grams per unit (overrides Volume × Density)"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500">Net Wt / Case (kg)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder={`Auto: ${calc.autoNetWeightKg}`}
                                value={rawSpec.customNetWeightKg ?? ''}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    customNetWeightKg: e.target.value === '' ? null : parseFloat(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-amber-300 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/20 font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500">Gross Wt / Case (kg)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder={`Auto: ${calc.autoGrossWeightKg}`}
                                value={rawSpec.customGrossWeightKg ?? ''}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    customGrossWeightKg: e.target.value === '' ? null : parseFloat(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-amber-300 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/20 font-mono font-bold"
                              />
                            </div>
                          </div>

                          {/* Net Product Cost Override Row */}
                          <div className="py-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                                {calc.isUsaDirectPricelist
                                  ? 'Net Product Cost / Case (USD $ Override)'
                                  : 'Net Product Cost / Case (INR ₹ Override)'}
                              </label>
                              {calc.isCustomNetProductCost && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSkuSpec(activeCommodity, calc.id, {
                                      customNetProductCostINR: null,
                                      customNetProductCostUSD: null,
                                    })
                                  }
                                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>
                                    Reset to Auto (
                                    {calc.isUsaDirectPricelist
                                      ? `$${fmtStr(calc.autoNetOilCostUSD)}`
                                      : `₹${fmtStr(calc.autoNetOilCostINR)}`}
                                    )
                                  </span>
                                </button>
                              )}
                            </div>
                            <input
                              type="number"
                              step={calc.isUsaDirectPricelist ? '0.05' : '0.5'}
                              min={0}
                              placeholder={
                                calc.isUsaDirectPricelist
                                  ? `Auto from Bulk Rate: $${fmtStr(calc.autoNetOilCostUSD)}`
                                  : `Auto from Bulk Rate: ₹${fmtStr(calc.autoNetOilCostINR)}`
                              }
                              value={
                                calc.isUsaDirectPricelist
                                  ? rawSpec.customNetProductCostUSD ?? ''
                                  : rawSpec.customNetProductCostINR ?? ''
                              }
                              onChange={e =>
                                handleUpdateSkuSpec(
                                  activeCommodity,
                                  calc.id,
                                  calc.isUsaDirectPricelist
                                    ? {
                                        customNetProductCostUSD:
                                          e.target.value === '' ? null : parseFloat(e.target.value),
                                      }
                                    : {
                                        customNetProductCostINR:
                                          e.target.value === '' ? null : parseFloat(e.target.value),
                                      }
                                )
                              }
                              className="w-full px-2 py-1 rounded border border-amber-300 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/20 font-mono font-bold text-xs"
                            />
                          </div>

                          {/* Packaging Component Costs */}
                          <div className="py-2 space-y-1.5">
                            <div className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                              Packaging Costs ({calc.packingCurrency === 'USD' ? 'USD $' : 'INR ₹'})
                            </div>
                            <div className="grid grid-cols-5 gap-1.5">
                              <div>
                                <label className="block text-[9.5px] text-slate-500">Bottle/pc</label>
                                <input
                                  type="number"
                                  step={calc.packingCurrency === 'USD' ? '0.01' : '0.1'}
                                  value={rawSpec.bottleCost}
                                  onChange={e =>
                                    handleUpdateSkuSpec(activeCommodity, calc.id, {
                                      bottleCost: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9.5px] text-slate-500">Label/pc</label>
                                <input
                                  type="number"
                                  step={calc.packingCurrency === 'USD' ? '0.01' : '0.1'}
                                  value={rawSpec.labelCost}
                                  onChange={e =>
                                    handleUpdateSkuSpec(activeCommodity, calc.id, {
                                      labelCost: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9.5px] text-slate-500">Cap/pc</label>
                                <input
                                  type="number"
                                  step={calc.packingCurrency === 'USD' ? '0.01' : '0.1'}
                                  value={rawSpec.capCost}
                                  onChange={e =>
                                    handleUpdateSkuSpec(activeCommodity, calc.id, {
                                      capCost: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9.5px] text-slate-500">Fill/pc</label>
                                <input
                                  type="number"
                                  step={calc.packingCurrency === 'USD' ? '0.01' : '0.1'}
                                  value={rawSpec.fillCost || 0}
                                  onChange={e =>
                                    handleUpdateSkuSpec(activeCommodity, calc.id, {
                                      fillCost: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9.5px] text-slate-500">Box/case</label>
                                <input
                                  type="number"
                                  step={calc.packingCurrency === 'USD' ? '0.05' : '0.5'}
                                  value={rawSpec.cartonCost}
                                  onChange={e =>
                                    handleUpdateSkuSpec(activeCommodity, calc.id, {
                                      cartonCost: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Per-SKU Freight Overrides */}
                          <div className="grid grid-cols-2 gap-2 py-2">
                            <div>
                              <label className="block text-[10px] text-slate-500">Dom. Transp ₹/Case Ovr</label>
                              <input
                                type="number"
                                step="1"
                                placeholder={
                                  calc.isUsaDirectPricelist
                                    ? 'Auto: ₹0.00 (USA Direct)'
                                    : `Auto: ₹${fmtStr(params.domesticFreight / calc.cartonsPerContainer)}`
                                }
                                value={rawSpec.customDomTransportINR ?? ''}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    customDomTransportINR:
                                      e.target.value === '' ? null : parseFloat(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500">Ocean Frt $/Case Ovr</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder={
                                  calc.isUsaDirectPricelist
                                    ? 'Auto: $0.00 (USA Direct)'
                                    : `Auto: $${fmtStr(params.oceanFreight / calc.cartonsPerContainer)}`
                                }
                                value={rawSpec.customOceanFreightUSD ?? ''}
                                onChange={e =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    customOceanFreightUSD:
                                      e.target.value === '' ? null : parseFloat(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                              />
                            </div>
                          </div>
                        </>
                      ) : null}

                      {/* Live Calculated Breakdown Rows */}
                      <div className="flex justify-between pt-1.5">
                        <span className="text-slate-500">Container Capacity ({params.containerSize})</span>
                        <span className="font-mono font-bold tabular-nums">
                          {calc.cartonsPerContainer.toLocaleString()} ctns ({calc.totalUnits.toLocaleString()} pcs)
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1.5">
                        <span className="text-slate-500 leading-tight">
                          Net / Gross Wt per Case
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {calc.netWeightLbs} / {calc.grossWeightLbs} lbs
                          </span>
                        </span>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          <InlineOverrideInput
                            overrideValue={rawSpec.customNetWeightKg}
                            autoValue={calc.autoNetWeightKg}
                            step="0.05"
                            widthClass="w-16"
                            disabled={!canEditMasterCosting}
                            title={`Net Weight per Case in kg (Auto: ${fmtStr(calc.autoNetWeightKg)} kg)`}
                            onChangeOverride={val =>
                              handleUpdateSkuSpec(activeCommodity, calc.id, {
                                customNetWeightKg: val,
                              })
                            }
                          />
                          <span className="text-slate-400 font-bold">/</span>
                          <InlineOverrideInput
                            overrideValue={rawSpec.customGrossWeightKg}
                            autoValue={calc.autoGrossWeightKg}
                            step="0.05"
                            suffix="kg"
                            widthClass="w-16"
                            boldText
                            disabled={!canEditMasterCosting}
                            title={`Gross Weight per Case in kg (Auto: ${fmtStr(calc.autoGrossWeightKg)} kg)`}
                            onChangeOverride={val =>
                              handleUpdateSkuSpec(activeCommodity, calc.id, {
                                customGrossWeightKg: val,
                              })
                            }
                          />
                        </div>
                      </div>
                      {calc.packingCurrency === 'USD' ? (
                        <div className="flex justify-between pt-1.5">
                          <span className="text-slate-500">
                            USA Packaging (${fmtStr(calc.bottleCostCase)}+${fmtStr(calc.labelCostCase)}+${fmtStr(calc.capCostCase)} ×{calc.units} + ${fmtStr(calc.cartonBoxCostCase)})
                          </span>
                          <span className="font-mono tabular-nums">
                            ${fmtStr(calc.totalPackagingCostCartonUSD)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between pt-1.5">
                          <span className="text-slate-500">
                            Packaging (₹{calc.bottleCostCase}+₹{calc.labelCostCase}+₹{calc.capCostCase} ×{calc.units} + ₹{calc.cartonBoxCostCase})
                          </span>
                          <span className="font-mono tabular-nums">
                            ₹{fmtStr(calc.totalPackagingCostCartonINR)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1.5">
                        <span className="text-slate-500 leading-tight">
                          {calc.isUsaDirectPricelist
                            ? 'Net Product Cost (USD)'
                            : 'Net Product Cost (INR)'}
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {calc.isCustomNetProductCost
                              ? `Custom Ovr · Auto ${
                                  calc.isUsaDirectPricelist
                                    ? `$${fmtStr(calc.autoNetOilCostUSD)}`
                                    : `₹${fmtStr(calc.autoNetOilCostINR)}`
                                }`
                              : `${calc.netWeightKg} kg × bulk rate`}
                          </span>
                        </span>
                        {calc.isUsaDirectPricelist ? (
                          <InlineOverrideInput
                            overrideValue={rawSpec.customNetProductCostUSD}
                            autoValue={calc.autoNetOilCostUSD}
                            step="0.05"
                            allowZero
                            prefix="$"
                            widthClass="w-24"
                            boldText
                            disabled={!canEditMasterCosting}
                            title={`Net Product Cost per Case in USD (Auto: $${fmtStr(calc.autoNetOilCostUSD)})`}
                            onChangeOverride={val =>
                              handleUpdateSkuSpec(activeCommodity, calc.id, {
                                customNetProductCostUSD: val,
                              })
                            }
                          />
                        ) : (
                          <InlineOverrideInput
                            overrideValue={rawSpec.customNetProductCostINR}
                            autoValue={calc.autoNetOilCostINR}
                            step="1"
                            allowZero
                            prefix="₹"
                            widthClass="w-24"
                            boldText
                            disabled={!canEditMasterCosting}
                            title={`Net Product Cost per Case in INR (Auto: ₹${fmtStr(calc.autoNetOilCostINR)})`}
                            onChangeOverride={val =>
                              handleUpdateSkuSpec(activeCommodity, calc.id, {
                                customNetProductCostINR: val,
                              })
                            }
                          />
                        )}
                      </div>
                      {!calc.isUsaDirectPricelist || calc.domTransportINR > 0 || calc.oceanFreightQuoteCur > 0 ? (
                        <>
                          <div className="flex justify-between pt-1.5">
                            <span className="text-slate-500">Domestic Transport / Case</span>
                            <span className="font-mono tabular-nums">₹{fmtStr(calc.domTransportINR)}</span>
                          </div>
                          <div className="flex justify-between pt-1.5 font-semibold text-amber-800 dark:text-amber-300">
                            <span>Total Origin FOB</span>
                            <span className="font-mono tabular-nums">
                              ₹{fmtStr(calc.totalFobCostINR)} · {params.curSymbol}
                              {fmtStr(calc.netFobPriceQuoteCur)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1.5">
                            <span className="text-slate-500">Ocean Freight + CIF</span>
                            <span className="font-mono tabular-nums">
                              +{params.curSymbol}
                              {fmtStr(calc.oceanFreightQuoteCur)} → {params.curSymbol}
                              {fmtStr(calc.cifQuoteCur)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between pt-1.5 font-semibold text-blue-800 dark:text-blue-300">
                          <span>Total Oil + USA Packing</span>
                          <span className="font-mono tabular-nums">
                            {params.curSymbol}
                            {fmtStr(calc.netFobPriceQuoteCur)}
                          </span>
                        </div>
                      )}
                      <div className="pt-1.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              SoundEngine.play('tick');
                              if (elaborateAllDuties) {
                                setElaborateAllDuties(false);
                                const nextMap: Record<number, boolean> = {};
                                currentCommodityCalculations.forEach(c => {
                                  nextMap[c.id] = c.id !== calc.id;
                                });
                                setExpandedDutyCardIds(nextMap);
                              } else {
                                setExpandedDutyCardIds(prev => ({
                                  ...prev,
                                  [calc.id]: !isDutyElaborated,
                                }));
                              }
                            }}
                            className="text-left group flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Click to elaborate and edit individual Customs Duties, Entry Fee & Drayage"
                          >
                            <span className="font-medium underline decoration-dotted underline-offset-2">
                              Duties, Entry &amp; Drayage
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              <span>{isDutyElaborated ? 'Hide' : 'Elaborate'}</span>
                              {isDutyElaborated ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </span>
                            {calc.hasAnyDutyDrayageOverride && (
                              <span className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9.5px] font-bold">
                                Ovr
                              </span>
                            )}
                          </button>

                          <span className="font-mono font-semibold tabular-nums">
                            +{params.curSymbol}
                            {fmtStr(calc.totalDutiesEntryDrayageQuoteCur)}
                          </span>
                        </div>

                        {isDutyElaborated && (
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-700/70">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {canEditMasterCosting
                                  ? 'Elaborated Breakdown (Click Any Box to Edit / Override)'
                                  : 'Elaborated Duties, Entry & Drayage Breakdown'}
                              </span>
                              {canEditMasterCosting && calc.hasAnyDutyDrayageOverride && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSkuSpec(activeCommodity, calc.id, {
                                      customBasicDuty1USD: null,
                                      customBasicDuty2USD: null,
                                      customReciprocalDutyUSD: null,
                                      customEntryFeeUSD: null,
                                      customDrayageUSD: null,
                                    })
                                  }
                                  className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 shrink-0"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Reset All</span>
                                </button>
                              )}
                            </div>

                            {/* 1. Basic Customs Duty 1 */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600 dark:text-slate-300 leading-tight">
                                Basic Customs Duty 1
                                <span className="block text-[9.5px] text-slate-400 font-mono">
                                  {params.dutyType === '$/kg'
                                    ? `$${params.basicDuty}/kg × ${calc.netWeightKg} kg`
                                    : params.dutyType === 'cents/kg'
                                    ? `${params.basicDuty}¢/kg × ${calc.netWeightKg} kg`
                                    : `${params.basicDuty}% of FOB`}
                                  {calc.isCustomBasicDuty1
                                    ? ` · Auto ${params.curSymbol}${fmtStr(calc.autoPrimaryBasicDutyQuoteCur)}`
                                    : ''}
                                </span>
                              </span>
                              <InlineOverrideInput
                                overrideValue={usdToQuote(rawSpec.customBasicDuty1USD)}
                                autoValue={calc.autoPrimaryBasicDutyQuoteCur}
                                step="0.05"
                                allowZero
                                prefix={`+${params.curSymbol}`}
                                widthClass="w-20"
                                disabled={!canEditMasterCosting}
                                title={`Basic Customs Duty 1 per Case (Auto: ${params.curSymbol}${fmtStr(calc.autoPrimaryBasicDutyQuoteCur)})`}
                                onChangeOverride={val =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    customBasicDuty1USD: quoteToUsd(val),
                                  })
                                }
                              />
                            </div>

                            {/* 2. Basic Customs Duty 2 (Per Kg) */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600 dark:text-slate-300 leading-tight">
                                Basic Duty 2 (Per Kg)
                                <span className="block text-[9.5px] text-slate-400 font-mono">
                                  {(params.basicDutyPerKgUnit || '$/kg') === 'cents/kg'
                                    ? `${params.basicDutyPerKg ?? 0}¢/kg × ${calc.netWeightKg} kg`
                                    : `$${params.basicDutyPerKg ?? 0}/kg × ${calc.netWeightKg} kg`}
                                  {calc.isCustomBasicDuty2
                                    ? ` · Auto ${params.curSymbol}${fmtStr(calc.autoBasicDutyPerKgQuoteCur)}`
                                    : ''}
                                </span>
                              </span>
                              <InlineOverrideInput
                                overrideValue={usdToQuote(rawSpec.customBasicDuty2USD)}
                                autoValue={calc.autoBasicDutyPerKgQuoteCur}
                                step="0.05"
                                allowZero
                                prefix={`+${params.curSymbol}`}
                                widthClass="w-20"
                                disabled={!canEditMasterCosting}
                                title={`Basic Customs Duty 2 (Per Kg) per Case (Auto: ${params.curSymbol}${fmtStr(calc.autoBasicDutyPerKgQuoteCur)})`}
                                onChangeOverride={val =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    customBasicDuty2USD: quoteToUsd(val),
                                  })
                                }
                              />
                            </div>

                            {/* 3. Reciprocal Tariff */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600 dark:text-slate-300 leading-tight">
                                Reciprocal Tariff
                                <span className="block text-[9.5px] text-slate-400 font-mono">
                                  {params.isUSA ? `${params.reciprocalDuty}% of FOB` : 'Non-US (0%)'}
                                  {calc.isCustomReciprocalDuty
                                    ? ` · Auto ${params.curSymbol}${fmtStr(calc.autoTrumpDutyQuoteCur)}`
                                    : ''}
                                </span>
                              </span>
                              <InlineOverrideInput
                                overrideValue={usdToQuote(rawSpec.customReciprocalDutyUSD)}
                                autoValue={calc.autoTrumpDutyQuoteCur}
                                step="0.05"
                                allowZero
                                prefix={`+${params.curSymbol}`}
                                widthClass="w-20"
                                disabled={!canEditMasterCosting}
                                title={`Reciprocal Tariff per Case (Auto: ${params.curSymbol}${fmtStr(calc.autoTrumpDutyQuoteCur)})`}
                                onChangeOverride={val =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    customReciprocalDutyUSD: quoteToUsd(val),
                                  })
                                }
                              />
                            </div>

                            {/* 4. Customs Entry Fee */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600 dark:text-slate-300 leading-tight">
                                Customs Entry Fee
                                <span className="block text-[9.5px] text-slate-400 font-mono">
                                  {Number((params.entryFeePercent * 100).toFixed(4))}% of FOB
                                  {calc.isCustomEntryFee
                                    ? ` · Auto ${params.curSymbol}${fmtStr(calc.autoOtherCustomEntryFeeQuoteCur)}`
                                    : ''}
                                </span>
                              </span>
                              <InlineOverrideInput
                                overrideValue={usdToQuote(rawSpec.customEntryFeeUSD)}
                                autoValue={calc.autoOtherCustomEntryFeeQuoteCur}
                                step="0.01"
                                allowZero
                                prefix={`+${params.curSymbol}`}
                                widthClass="w-20"
                                disabled={!canEditMasterCosting}
                                title={`Customs Entry Fee per Case (Auto: ${params.curSymbol}${fmtStr(calc.autoOtherCustomEntryFeeQuoteCur)})`}
                                onChangeOverride={val =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    customEntryFeeUSD: quoteToUsd(val),
                                  })
                                }
                              />
                            </div>

                            {/* 5. Destination Drayage */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600 dark:text-slate-300 leading-tight">
                                Destination Drayage
                                <span className="block text-[9.5px] text-slate-400 font-mono">
                                  ${params.inlandDrayage.toLocaleString()} ÷ {calc.cartonsPerContainer} ctns
                                  {calc.isCustomDrayage
                                    ? ` · Auto ${params.curSymbol}${fmtStr(calc.autoDrayageQuoteCur)}`
                                    : ''}
                                </span>
                              </span>
                              <InlineOverrideInput
                                overrideValue={usdToQuote(rawSpec.customDrayageUSD)}
                                autoValue={calc.autoDrayageQuoteCur}
                                step="0.05"
                                allowZero
                                prefix={`+${params.curSymbol}`}
                                widthClass="w-20"
                                disabled={!canEditMasterCosting}
                                title={`Destination Drayage per Case (Auto: ${params.curSymbol}${fmtStr(calc.autoDrayageQuoteCur)})`}
                                onChangeOverride={val =>
                                  handleUpdateSkuSpec(activeCommodity, calc.id, {
                                    customDrayageUSD: quoteToUsd(val),
                                  })
                                }
                              />
                            </div>

                            {canEditMasterCosting && (
                              <div className="pt-1 border-t border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between text-[10px] text-slate-500">
                                <span>
                                  Auto Sum: {params.curSymbol}
                                  {fmtStr(calc.autoDutiesEntryDrayageQuoteCur)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAdvancedParams(true);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  Edit Global Tariff &amp; Drayage Rates ↑
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between pt-1.5">
                        <span className="text-slate-500">Landed Cost ({params.quoteCur})</span>
                        <span className="font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                          {params.curSymbol}
                          {fmtStr(calc.subtotalLandedCostQuoteCur)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5">
                        <span className="text-slate-500">
                          Markup ({params.profitMargin}%) → Calc {params.incoterm}
                        </span>
                        <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          +{params.curSymbol}
                          {fmtStr(calc.profitMarkupQuoteCur)} → {params.curSymbol}
                          {fmtStr(calc.finalPriceQuoteCur)}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Quantity + Add to Proforma */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500 font-medium">Cases:</span>
                        <input
                          type="number"
                          min={1}
                          value={qtyVal}
                          onChange={e =>
                            setCardAddQty(prev => ({
                              ...prev,
                              [calc.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                            }))
                          }
                          className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-center"
                        />
                      </div>
                      {canCreateEditPI ? (
                        <button
                          type="button"
                          onClick={() => handleAddSkuToInvoice(calc, qtyVal)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Proforma</span>
                        </button>
                      ) : (
                        <span className="text-[10.5px] font-semibold text-slate-400">Read-Only</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PROFORMA INVOICE GENERATOR (OFFICIAL BLANK PO TEMPLATE) + LIVE FLOOR PRICE & PACKAGING SIDE PANEL */}
      {subTab === 'invoice' && (
        <div
          className={`grid grid-cols-1 ${
            showSalesIntelPanel ? 'xl:grid-cols-12' : ''
          } gap-6 items-start`}
        >
          {/* LEFT / MAIN COLUMN: PROFORMA BUILDER & LIVE PO SHEET */}
          <div className={`${showSalesIntelPanel ? 'xl:col-span-8' : ''} space-y-6 min-w-0`}>
            {/* Container Payload Capacity Meter + Side Panel Toggle */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Container className="w-4 h-4 text-amber-500" />
                  <span>
                    Container Payload Capacity (Max {MAX_CONTAINER_PAYLOAD_KG.toLocaleString()} kg /{' '}
                    {MAX_CONTAINER_PAYLOAD_LBS.toLocaleString()} lbs)
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {fmtStr(invoiceTotals.totalGrossKg)} kg ({fmtStr(invoiceTotals.totalGrossLbs)} lbs) ·{' '}
                    {invoiceTotals.payloadPercent}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.play('tick');
                      setShowSalesIntelPanel(!showSalesIntelPanel);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                      showSalesIntelPanel
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {showSalesIntelPanel ? (
                      <>
                        <PanelRightClose className="w-3.5 h-3.5" />
                        <span>Hide Sales &amp; Stock Panel</span>
                      </>
                    ) : (
                      <>
                        <PanelRightOpen className="w-3.5 h-3.5" />
                        <span>Show Min Floor Price &amp; Packaging Panel</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    invoiceTotals.payloadPercent > 100
                      ? 'bg-rose-500'
                      : invoiceTotals.payloadPercent >= 80
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, invoiceTotals.payloadPercent)}%` }}
                />
              </div>
            </div>

          {/* Quick Add SKU Bar right inside Proforma Tab */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3 text-xs">
            <div className="min-w-[160px] flex-1">
              <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                Quick Add Commodity
              </label>
              <select
                value={quickPickOil}
                onChange={e => {
                  setQuickPickOil(e.target.value);
                  setQuickPickSkuId(0);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {indiaMainKeys.length > 0 && (
                  <optgroup label="India Filling & Export">
                    {indiaMainKeys.map(k => (
                      <option key={k} value={k}>
                        {commodities[k]?.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {indiaEvooAvoKeys.length > 0 && (
                  <optgroup label="Indian Section — EVOO & Avocado">
                    {indiaEvooAvoKeys.map(k => (
                      <option key={k} value={k}>
                        {commodities[k]?.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {usaPricelistKeys.length > 0 && (
                  <optgroup label="USA Pricelist (USA Filling)">
                    {usaPricelistKeys.map(k => (
                      <option key={k} value={k}>
                        {commodities[k]?.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="min-w-[220px] flex-[2]">
              <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                Select Master SKU
              </label>
              <select
                value={quickPickSkuId || quickPickSpecs[0]?.id || 0}
                onChange={e => setQuickPickSkuId(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              >
                {quickPickSpecs.map(s => {
                  const p = oilPrices[quickPickOil] ?? commodities[quickPickOil]?.defaultPrice ?? 0;
                  const c = calculateMasterRow(s, p, quickPickOil, params, commodities);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.sku} — {params.curSymbol}
                      {fmtStr(c.roundedQuotePrice)}/case
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="w-28">
              <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                Qty (Cases)
              </label>
              <input
                type="number"
                min={1}
                value={quickPickQty}
                onChange={e => setQuickPickQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-center"
              />
            </div>

            <button
              type="button"
              disabled={!canCreateEditPI}
              onClick={() => {
                const targetSpec =
                  quickPickSpecs.find(s => s.id === quickPickSkuId) || quickPickSpecs[0];
                if (!targetSpec) return;
                const p = oilPrices[quickPickOil] ?? commodities[quickPickOil]?.defaultPrice ?? 0;
                const calc = calculateMasterRow(targetSpec, p, quickPickOil, params, commodities);
                handleAddSkuToInvoice(calc, quickPickQty);
              }}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 whitespace-nowrap h-[34px] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Selected SKU</span>
            </button>

            <button
              type="button"
              disabled={!canCreateEditPI}
              onClick={handleAddCustomInvoiceRow}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5 whitespace-nowrap h-[34px] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom / Blank Row</span>
            </button>
          </div>

          {/* Seller / Template Header Settings Toggle */}
          <fieldset disabled={!canCreateEditPI} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 text-xs disabled:opacity-75">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Proforma Invoice Details (Customer, Ship-To, Header, Bank Details &amp; Signatory)
              </div>
              {canEditMasterCosting && (
                <button
                  type="button"
                  onClick={() => setShowSellerSettings(!showSellerSettings)}
                  className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{showSellerSettings ? 'Hide Company Header & Bank Settings' : 'Edit Company Header, Logo & Bank Info'}</span>
                </button>
              )}
            </div>

            {showSellerSettings && canEditMasterCosting && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="space-y-2">
                  <div className="font-bold text-slate-700 dark:text-slate-300">Document & Company Header</div>
                  <div>
                    <span className="text-[11px] text-slate-500">Document Title:</span>
                    <input
                      type="text"
                      value={poSellerConfig.documentTitle}
                      onChange={e =>
                        onUpdatePoSellerConfig({ ...poSellerConfig, documentTitle: e.target.value })
                      }
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Company Address Line:</span>
                    <input
                      type="text"
                      value={poSellerConfig.companyAddress}
                      onChange={e =>
                        onUpdatePoSellerConfig({ ...poSellerConfig, companyAddress: e.target.value })
                      }
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-slate-500">Phone Line:</span>
                      <input
                        type="text"
                        value={poSellerConfig.companyPhone}
                        onChange={e =>
                          onUpdatePoSellerConfig({ ...poSellerConfig, companyPhone: e.target.value })
                        }
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Tax ID:</span>
                      <input
                        type="text"
                        value={poSellerConfig.companyTaxId}
                        onChange={e =>
                          onUpdatePoSellerConfig({ ...poSellerConfig, companyTaxId: e.target.value })
                        }
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Email Line:</span>
                    <input
                      type="text"
                      value={poSellerConfig.companyEmail}
                      onChange={e =>
                        onUpdatePoSellerConfig({ ...poSellerConfig, companyEmail: e.target.value })
                      }
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-slate-700 dark:text-slate-300">Note & Bank Wire Instructions</div>
                  <div>
                    <span className="text-[11px] text-slate-500">Note Section Heading:</span>
                    <input
                      type="text"
                      value={poSellerConfig.noteHeader}
                      onChange={e =>
                        onUpdatePoSellerConfig({ ...poSellerConfig, noteHeader: e.target.value })
                      }
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Bank Details / Note Body:</span>
                    <textarea
                      rows={5}
                      value={poSellerConfig.bankDetailsText}
                      onChange={e =>
                        onUpdatePoSellerConfig({ ...poSellerConfig, bankDetailsText: e.target.value })
                      }
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-slate-700 dark:text-slate-300">Logo, Stamp & Signatory</div>
                  <div>
                    <span className="text-[11px] text-slate-500">Signatory Caption:</span>
                    <input
                      type="text"
                      value={poSellerConfig.signatoryLabel}
                      onChange={e =>
                        onUpdatePoSellerConfig({ ...poSellerConfig, signatoryLabel: e.target.value })
                      }
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={poSellerConfig.showStamp}
                      onChange={e =>
                        onUpdatePoSellerConfig({ ...poSellerConfig, showStamp: e.target.checked })
                      }
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="font-medium">Show Official Global Futura Stamp & Signature</span>
                  </label>
                  <div className="pt-2 space-y-1.5">
                    <span className="block text-[11px] text-slate-500">Logo Image Override (Optional):</span>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-100 font-semibold flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Custom Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustomLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onUpdatePoSellerConfig(DEFAULT_PO_SELLER_CONFIG)}
                        className="px-2.5 py-1.5 rounded text-slate-600 hover:text-slate-900 dark:text-slate-400 underline"
                      >
                        Reset Default Header
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main PI Metadata, Customer, Ship-To, and Commercial Terms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Col 1: P.I. Number & Date */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  P.I. Number & Date
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">P.I. Number:</span>
                  <div className="flex gap-1.5 mt-0.5">
                    <input
                      type="text"
                      value={invNum}
                      onChange={e => setInvNum(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setInvNum(generateNextPiNumber())}
                      className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Generate next serial number"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500">Calendar Date:</span>
                    <input
                      type="date"
                      value={invDate}
                      onChange={e => {
                        setInvDate(e.target.value);
                        if (e.target.value) {
                          const d = new Date(e.target.value + 'T00:00:00');
                          if (!Number.isNaN(d.getTime())) {
                            setInvDateDisplay(
                              d.toLocaleDateString('en-US', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            );
                          }
                        }
                      }}
                      className="w-full mt-0.5 px-2 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Printed Date Text:</span>
                    <input
                      type="text"
                      value={invDateDisplay}
                      onChange={e => setInvDateDisplay(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Marketing Executive:</span>
                  <input
                    type="text"
                    value={mktExecName}
                    onChange={e => setMktExecName(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Col 2: CUSTOMER Block */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  CUSTOMER (Bill To)
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Company Name:</span>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={e => {
                      setBuyerName(e.target.value);
                      if (shipToSameAsBuyer) setShipToName(e.target.value);
                    }}
                    className="w-full mt-0.5 px-2.5 py-1.5 font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Address:</span>
                  <textarea
                    rows={2}
                    value={buyerAddress}
                    onChange={e => {
                      setBuyerAddress(e.target.value);
                      if (shipToSameAsBuyer) setShipToAddress(e.target.value);
                    }}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Kind Attention:</span>
                  <input
                    type="text"
                    value={buyerAttention}
                    onChange={e => {
                      setBuyerAttention(e.target.value);
                      if (shipToSameAsBuyer) setShipToAttention(e.target.value);
                    }}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Col 3: SHIP TO Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    SHIP TO
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shipToSameAsBuyer}
                      onChange={e => {
                        const checked = e.target.checked;
                        setShipToSameAsBuyer(checked);
                        if (checked) {
                          setShipToName(buyerName);
                          setShipToAddress(buyerAddress);
                          setShipToAttention(buyerAttention);
                        }
                      }}
                      className="accent-blue-600"
                    />
                    <span>Same as Customer</span>
                  </label>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Ship-To Company Name:</span>
                  <input
                    type="text"
                    disabled={shipToSameAsBuyer}
                    value={shipToSameAsBuyer ? buyerName : shipToName}
                    onChange={e => setShipToName(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Ship-To Address:</span>
                  <textarea
                    rows={2}
                    disabled={shipToSameAsBuyer}
                    value={shipToSameAsBuyer ? buyerAddress : shipToAddress}
                    onChange={e => setShipToAddress(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Ship-To Attention / Contact:</span>
                  <input
                    type="text"
                    disabled={shipToSameAsBuyer}
                    value={shipToSameAsBuyer ? buyerAttention : shipToAttention}
                    onChange={e => setShipToAttention(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Col 4: Delivery, Payment & Extra Summary Adjustments */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Terms & Summary Adjustments
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Delivery Terms:</span>
                  <input
                    type="text"
                    value={deliveryTerms}
                    onChange={e => setDeliveryTerms(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Payment Terms:</span>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Extra Charge / Discount Rows:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraSummaryRows(prev => [
                          ...prev,
                          {
                            id: `ex-${Date.now()}`,
                            label: 'Discount / Adjustment',
                            valueText: '',
                            numericAmount: 0,
                          },
                        ])
                      }
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Add Line
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {extraSummaryRows.map((row, idx) => (
                      <div key={row.id} className="flex items-center gap-1">
                        <input
                          type="text"
                          value={row.label}
                          placeholder="Label"
                          onChange={e =>
                            setExtraSummaryRows(prev =>
                              prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r))
                            )
                          }
                          className="w-1/2 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px]"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={row.numericAmount || ''}
                          placeholder="Amount (+/-)"
                          onChange={e => {
                            const num = parseFloat(e.target.value) || 0;
                            setExtraSummaryRows(prev =>
                              prev.map((r, i) =>
                                i === idx
                                  ? {
                                      ...r,
                                      numericAmount: num,
                                      valueText: num !== 0 ? `${num < 0 ? '-' : ''}${params.curSymbol}${fmtStr(Math.abs(num))}` : '',
                                    }
                                  : r
                              )
                            );
                          }}
                          className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px] text-right"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExtraSummaryRows(prev => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Editable Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Editable Proforma Line Items ({invoiceItems.length})
              </h4>
              {canCreateEditPI && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAddCustomInvoiceRow}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + Add Blank Row
                  </button>
                  {invoiceItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setInvoiceItems([])}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10.5px] font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-2.5 w-16 text-center">Sr. No.</th>
                    <th className="py-2 px-3 min-w-[280px]">Product Description (Printed on PO)</th>
                    <th className="py-2 px-2.5 w-28 text-center">Quantity (Case)</th>
                    <th className="py-2 px-2.5 w-28 text-right">Gross Wt/Case</th>
                    <th className="py-2 px-2.5 w-32 text-right">Price per Case</th>
                    <th className="py-2 px-3 w-32 text-right">Amount</th>
                    <th className="py-2 px-2 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoiceItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No items added yet. Use the Quick Add bar above or click &ldquo;Add to Proforma&rdquo; on any Forward Costing card.
                      </td>
                    </tr>
                  ) : (
                    invoiceItems.map((item, idx) => {
                      const descVal =
                        item.customDescription !== undefined
                          ? item.customDescription
                          : formatPoProductDescription(item.oilLabel, item.sku, item.volume, item.units);

                      const lineFloor = resolveFloorForLineItem(item);
                      const isBelowFloor =
                        lineFloor !== null && item.unitPrice + 0.001 < lineFloor.minSellingPrice;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                            isBelowFloor ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="py-2 px-2.5 text-center">
                            <input
                              type="text"
                              disabled={!canCreateEditPI}
                              value={item.srNo ?? idx + 1}
                              onChange={e =>
                                setInvoiceItems(prev =>
                                  prev.map((it, i) => (i === idx ? { ...it, srNo: e.target.value } : it))
                                )
                              }
                              className="w-12 px-1.5 py-1 text-center font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              disabled={!canCreateEditPI}
                              value={descVal}
                              onChange={e =>
                                setInvoiceItems(prev =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, customDescription: e.target.value } : it
                                  )
                                )
                              }
                              className="w-full px-2.5 py-1 font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            <input
                              type="number"
                              min={1}
                              disabled={!canCreateEditPI}
                              value={item.qty}
                              onChange={e => {
                                const qty = Math.max(0, parseFloat(e.target.value) || 0);
                                setInvoiceItems(prev =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, qty, lineTotal: fmt(qty * it.unitPrice) } : it
                                  )
                                );
                              }}
                              className="w-20 px-2 py-1 text-center font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                            />
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="0.1"
                                disabled={!canCreateEditPI}
                                value={item.grossWeight}
                                onChange={e => {
                                  const gw = Math.max(0, parseFloat(e.target.value) || 0);
                                  setInvoiceItems(prev =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, grossWeight: gw, grossWeightLbs: kgToLbs(gw) } : it
                                    )
                                  );
                                }}
                                className="w-16 px-1.5 py-1 text-right font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                              />
                              <span className="text-[10px] text-slate-400">kg</span>
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 font-bold">{params.curSymbol}</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={!canCreateEditPI}
                                  value={item.unitPrice}
                                  onChange={e => {
                                    const up = parseFloat(e.target.value) || 0;
                                    setInvoiceItems(prev =>
                                      prev.map((it, i) =>
                                        i === idx ? { ...it, unitPrice: up, lineTotal: fmt(it.qty * up) } : it
                                      )
                                    );
                                  }}
                                  className={`w-24 px-2 py-1 text-right font-mono font-bold rounded border tabular-nums ${
                                    isBelowFloor
                                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                                  }`}
                                />
                              </div>
                              {lineFloor && (
                                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                  <span
                                    className={
                                      isBelowFloor
                                        ? 'text-rose-600 dark:text-rose-400 font-bold flex items-center gap-0.5'
                                        : 'text-slate-400'
                                    }
                                  >
                                    {isBelowFloor && <ShieldAlert className="w-2.5 h-2.5 inline" />}
                                    Min: {params.curSymbol}
                                    {fmtStr(lineFloor.minSellingPrice)}
                                  </span>
                                  {isBelowFloor && canCreateEditPI && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleApplyUnitPriceToLine(idx, lineFloor.minSellingPrice)
                                      }
                                      className="text-amber-600 dark:text-amber-400 font-bold underline"
                                    >
                                      Snap
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {params.curSymbol}
                            {fmtStr(item.lineTotal)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {canCreateEditPI && (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    if (idx === 0) return;
                                    setInvoiceItems(prev => {
                                      const copy = [...prev];
                                      const tmp = copy[idx - 1];
                                      copy[idx - 1] = copy[idx];
                                      copy[idx] = tmp;
                                      return copy;
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInvoiceItems(prev => prev.filter((_, i) => i !== idx))
                                  }
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                  title="Remove line item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {invoiceItems.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-800/90 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right text-slate-500">
                        Total Cases &amp; Amount
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono font-black tabular-nums">
                        {invoiceTotals.totalQty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 tabular-nums">
                        {fmtStr(invoiceTotals.totalGrossKg)} kg
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-500">Total:</td>
                      <td className="py-2.5 px-3 text-right font-mono text-base font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                        {params.curSymbol}
                        {fmtStr(invoiceTotals.grandTotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Internal Audit Note + Primary Export / Print Actions */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Internal PI Audit Note (Saved in PI History Only — Never Printed on Client PO)
              </label>
              <textarea
                rows={2}
                value={piInternalNote}
                onChange={e => setPiInternalNote(e.target.value)}
                placeholder="e.g. Approved 30% deposit & balance on delivery; ship 2nd week of November."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLiveTemplatePreview(!showLiveTemplatePreview)}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showLiveTemplatePreview ? 'Hide Live PO Sheet Preview' : 'Show Live PO Sheet Preview'}</span>
                </button>

                {showLiveTemplatePreview && canCreateEditPI && (
                  <button
                    type="button"
                    onClick={() => setLiveTemplateInlineEdit(!liveTemplateInlineEdit)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                      liveTemplateInlineEdit
                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{liveTemplateInlineEdit ? 'Done Direct Sheet Editing' : 'Edit Directly on PO Sheet'}</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {canCreateEditPI && (
                  <button
                    type="button"
                    onClick={handleSaveCurrentPI}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Save to PI History
                  </button>
                )}

                <button
                  type="button"
                  disabled={isExportingXlsx}
                  onClick={() => handleDownloadCurrentXlsx(currentInvoiceSnapshot)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isExportingXlsx ? 'Exporting...' : 'Download Excel (.xlsx)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!checkFloorComplianceBeforeIssuing(currentInvoiceSnapshot.items)) return;
                    SoundEngine.play('print');
                    onPrintOfficialPI(currentInvoiceSnapshot);
                  }}
                  className="px-5 py-2 bg-[#003366] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Printer className="w-4 h-4" />
                  <span>Generate &amp; Print Proforma</span>
                </button>
              </div>
            </div>
          </div>

          {/* LIVE BLANK PO TEMPLATE PREVIEW */}
          {showLiveTemplatePreview && (
            <div className="p-4 sm:p-6 rounded-xl bg-slate-200/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 overflow-x-auto">
              <ProformaTemplateDocument
                invoice={currentInvoiceSnapshot}
                editable={canCreateEditPI && liveTemplateInlineEdit}
                onChange={handleTemplateDocumentChange}
              />
            </div>
          )}
          </div>

          {/* RIGHT SIDE PANEL: LIVE SALES FLOOR PRICE & WAREHOUSE PACKAGING INTELLIGENCE */}
          {showSalesIntelPanel && (
            <div className="xl:col-span-4 xl:sticky xl:top-20">
              <ProformaSalesIntelPanel
                commodities={commodities}
                packingData={packingData}
                oilPrices={oilPrices}
                params={params}
                quickPickOil={quickPickOil}
                quickPickSkuId={quickPickSkuId || quickPickSpecs[0]?.id || 0}
                quickPickQty={quickPickQty}
                invoiceItems={invoiceItems}
                inventory={inventory}
                orders={orders}
                floorPolicy={floorPolicy}
                canEditMasterCosting={canEditMasterCosting}
                canOverrideFloorPrice={canOverrideFloorPrice}
                canCreateEditPI={canCreateEditPI}
                onUpdateFloorPolicy={onUpdateFloorPolicy}
                onApplyUnitPriceToLine={handleApplyUnitPriceToLine}
                onSnapAllLinesToFloor={handleSnapAllLinesToFloor}
                onQuickAddWithPrice={handleQuickAddWithPrice}
              />
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: REVERSE COSTING */}
      {subTab === 'reverse' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-slate-900 text-white space-y-1.5 border border-slate-800">
            <div className="text-amber-400 text-xs font-bold uppercase tracking-wider">
              Reverse Costing Margin Audit
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Buyer Target Price Backwards Deduction Calculator
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Enter the buyer&apos;s offered target price per carton. All duties, ocean freight, port drayage, packaging, and domestic transport are deducted to compute the exact maximum bulk oil price you can pay in ₹/kg.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">Client Name</label>
              <input
                type="text"
                value={revClientName}
                onChange={e => setRevClientName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">Reference / RFQ #</label>
              <input
                type="text"
                value={revReference}
                onChange={e => setRevReference(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">Commodity</label>
              <select
                value={revCommodity}
                onChange={e => {
                  setRevCommodity(e.target.value);
                  setRevSkuId(0);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {indiaMainKeys.length > 0 && (
                  <optgroup label="India Filling & Export">
                    {indiaMainKeys.map(k => (
                      <option key={k} value={k}>
                        {commodities[k]?.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {indiaEvooAvoKeys.length > 0 && (
                  <optgroup label="Indian Section — EVOO & Avocado">
                    {indiaEvooAvoKeys.map(k => (
                      <option key={k} value={k}>
                        {commodities[k]?.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {usaPricelistKeys.length > 0 && (
                  <optgroup label="USA Pricelist (USA Filling)">
                    {usaPricelistKeys.map(k => (
                      <option key={k} value={k}>
                        {commodities[k]?.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">Pack Size / SKU</label>
              <select
                value={revSkuId || (packingData[revCommodity]?.[0]?.id ?? 0)}
                onChange={e => setRevSkuId(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
              >
                {(packingData[revCommodity] || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.sku} ({formatVolumeShort(s.volume)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                Client Target ({params.curSymbol}/Case)
              </label>
              <input
                type="number"
                step="0.25"
                value={revTargetPrice}
                onChange={e => setRevTargetPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 font-mono text-sm font-black tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                Target Profit (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={revProfitTarget}
                onChange={e => setRevProfitTarget(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold tabular-nums"
              />
            </div>
          </div>

          {/* Bulk Buying Source */}
          <div className="flex flex-wrap items-center gap-4 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Bulk Buying Rate Source:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={!revUseOverride}
                onChange={() => setRevUseOverride(false)}
                className="accent-blue-600"
              />
              <span>
                Catalog Rate ({commodities[revCommodity]?.currency === 'USD' ? '$' : '₹'}
                {oilPrices[revCommodity] ?? commodities[revCommodity]?.defaultPrice}/kg)
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={revUseOverride}
                onChange={() => setRevUseOverride(true)}
                className="accent-blue-600"
              />
              <span>Custom Supplier Rate:</span>
            </label>
            {revUseOverride && (
              <input
                type="number"
                step="0.5"
                value={revBulkOverride}
                onChange={e => setRevBulkOverride(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
              />
            )}
          </div>

          {reverseResult && (
            <div className="space-y-4">
              <div
                className={`p-5 rounded-xl text-center space-y-1 text-white ${
                  reverseResult.verdict === 'accept'
                    ? 'bg-emerald-700'
                    : reverseResult.verdict === 'caution'
                    ? 'bg-amber-600'
                    : 'bg-rose-700'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider opacity-90">Commercial Verdict</div>
                <div className="text-2xl sm:text-3xl font-black">
                  {reverseResult.verdict === 'accept'
                    ? 'ACCEPTABLE — VIABLE MARGIN'
                    : reverseResult.verdict === 'caution'
                    ? 'CAUTION — TIGHT MARGIN'
                    : 'REJECT — BELOW COST'}
                </div>
                <p className="text-xs opacity-95">
                  At {params.curSymbol}
                  {fmtStr(reverseResult.targetPrice)}/case, net margin on bulk oil is{' '}
                  {fmtStr(reverseResult.profitPct)}% (Minimum recommended counter-offer:{' '}
                  {params.curSymbol}
                  {fmtStr(reverseResult.minAcceptablePrice)}).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10.5px] text-slate-500 font-semibold">Max Affordable Bulk</div>
                  <div className="text-lg font-black font-mono tabular-nums mt-1">
                    {reverseResult.bulkCurrencySymbol || '₹'}
                    {fmtStr(reverseResult.maxBulkPricePerKg)}/kg
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10.5px] text-slate-500 font-semibold">Actual Bulk Cost</div>
                  <div className="text-lg font-black font-mono tabular-nums mt-1">
                    {reverseResult.bulkCurrencySymbol || '₹'}
                    {fmtStr(reverseResult.actualBulkPrice)}/kg
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10.5px] text-slate-500 font-semibold">Spread / kg</div>
                  <div
                    className={`text-lg font-black font-mono tabular-nums mt-1 ${
                      reverseResult.profitPerKg >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {reverseResult.profitPerKg >= 0 ? '+' : ''}
                    {reverseResult.bulkCurrencySymbol || '₹'}
                    {fmtStr(reverseResult.profitPerKg)}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10.5px] text-slate-500 font-semibold">Spread / Carton</div>
                  <div
                    className={`text-lg font-black font-mono tabular-nums mt-1 ${
                      reverseResult.profitPerCarton >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {reverseResult.profitPerCarton >= 0 ? '+' : ''}
                    {reverseResult.bulkCurrencySymbol || '₹'}
                    {fmtStr(reverseResult.profitPerCarton)}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10.5px] text-slate-500 font-semibold">Net Margin %</div>
                  <div
                    className={`text-lg font-black font-mono tabular-nums mt-1 ${
                      reverseResult.profitPct >= 10
                        ? 'text-emerald-600'
                        : reverseResult.profitPct >= 4
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {fmtStr(reverseResult.profitPct)}%
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800">
                  <div className="text-[10.5px] text-amber-800 dark:text-amber-300 font-semibold">
                    Suggested Counter
                  </div>
                  <div className="text-lg font-black font-mono tabular-nums mt-1 text-amber-900 dark:text-amber-200">
                    {params.curSymbol}
                    {fmtStr(reverseResult.minAcceptablePrice)}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
                  <span>Step-by-Step Reverse Cost Deduction</span>
                  <span className="font-mono text-slate-300">
                    {reverseResult.commodityLabel} · {reverseResult.sku}
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reverseResult.steps.map(s => (
                      <tr
                        key={s.step}
                        className={
                          s.isFinal
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-bold'
                            : s.isTotal
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 font-bold'
                            : ''
                        }
                      >
                        <td className="py-2 px-3 w-12 text-center font-mono text-slate-400">{s.step}</td>
                        <td className="py-2 px-3">
                          <span className="font-semibold">{s.label}</span>
                          {s.sub && <span className="block text-[10.5px] text-slate-500">{s.sub}</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                          {s.value < 0 ? '-' : ''}
                          {s.cur === '₹/kg'
                            ? `₹${fmtStr(Math.abs(s.value))}/kg`
                            : s.cur === '$/kg'
                            ? `$${fmtStr(Math.abs(s.value))}/kg`
                            : `${s.cur}${fmtStr(Math.abs(s.value))}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Negotiation Note
                  </label>
                  <input
                    type="text"
                    value={revInternalNote}
                    onChange={e => setRevInternalNote(e.target.value)}
                    placeholder="Add context or buyer feedback..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                {canCreateEditPI && (
                  <button
                    type="button"
                    onClick={handleSaveCurrentNegotiation}
                    className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold whitespace-nowrap"
                  >
                    Save to Negotiation Log
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: NEGOTIATION LOG */}
      {subTab === 'nego' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Client Price Negotiation Ledger ({filteredNegotiations.length})
            </h3>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={negoSearch}
                onChange={e => setNegoSearch(e.target.value)}
                placeholder="Search client, SKU, ref..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white text-[10.5px] font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Nego #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Client &amp; Ref</th>
                    <th className="py-2.5 px-3">Commodity &amp; SKU</th>
                    <th className="py-2.5 px-3 text-right">Target</th>
                    <th className="py-2.5 px-3 text-right">Max Bulk</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-center">Verdict</th>
                    <th className="py-2.5 px-3">Internal Note (Editable)</th>
                    <th className="py-2.5 px-2 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredNegotiations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400">
                        No negotiation analyses found.
                      </td>
                    </tr>
                  ) : (
                    filteredNegotiations.map(nego => (
                      <tr key={nego.negoNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-mono font-bold">{nego.negoNumber}</td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{nego.dateLong}</td>
                        <td className="py-2 px-3">
                          <div className="font-bold">{nego.clientName}</div>
                          <div className="text-[10.5px] text-slate-400">{nego.reference}</div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          {nego.commodityLabel} · {nego.sku}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                          {nego.curSymbol}
                          {fmtStr(nego.targetPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          ₹{fmtStr(nego.maxBulkPricePerKg)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold tabular-nums ${
                            nego.profitPct >= 10
                              ? 'text-emerald-600'
                              : nego.profitPct >= 4
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {nego.profitPct}%
                        </td>
                        <td className="py-2 px-3 text-center uppercase font-bold text-[10.5px]">
                          <span
                            className={
                              nego.verdict === 'accept'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : nego.verdict === 'caution'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }
                          >
                            {nego.verdict}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={nego.internalNote || ''}
                            onChange={e =>
                              onSaveNegotiation({ ...nego, internalNote: e.target.value })
                            }
                            placeholder="Add note..."
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-amber-500 bg-transparent text-[11px]"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRevCommodity(nego.commodityKey);
                                setRevSkuId(nego.skuId);
                                setRevClientName(nego.clientName);
                                setRevReference(nego.reference);
                                setRevTargetPrice(nego.targetPrice);
                                setRevInternalNote(nego.internalNote || '');
                                setSubTab('reverse');
                              }}
                              className="p-1 text-slate-500 hover:text-blue-600"
                              title="Load into Reverse Costing"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteNegotiation(nego.negoNumber)}
                              className="p-1 text-slate-500 hover:text-rose-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* SUBTAB 5: PACKING MASTER — FULL INLINE EDITABLE SPREADSHEET */}
      {subTab === 'packing' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Master Packaging &amp; Costing Specifications:
              </h3>
              <select
                value={activeCommodity}
                onChange={e => handleSelectCommodity(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                {indiaMainKeys.length > 0 && (
                  <optgroup label="India Filling & Export">
                    {indiaMainKeys.map(k => (
                      <option key={k} value={k}>
                        {commodities[k]?.emoji} {commodities[k]?.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {indiaEvooAvoKeys.length > 0 && (
                  <optgroup label="Indian Section — EVOO & Avocado">
                    {indiaEvooAvoKeys.map(k => (
                      <option key={k} value={k}>
                        {commodities[k]?.emoji} {commodities[k]?.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {usaPricelistKeys.length > 0 && (
                  <optgroup label="USA Pricelist (USA Filling)">
                    {usaPricelistKeys.map(k => (
                      <option key={k} value={k}>
                        {commodities[k]?.emoji} {commodities[k]?.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {canEditMasterCosting && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddNewSku(activeCommodity)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add SKU Row</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetCommodityPacking(activeCommodity);
                    SoundEngine.play('pop');
                    onNotify(`Reset ${activeCommObj?.label} packing table to defaults.`);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>
            )}
          </div>

          <fieldset disabled={!canEditMasterCosting} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 disabled:opacity-80">
            <div className="overflow-x-auto max-h-[72vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white text-[10.5px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-2.5 text-center w-10">#</th>
                    <th className="py-2.5 px-2.5 min-w-[210px]">SKU Description</th>
                    <th className="py-2.5 px-2 text-center w-20">Vol (L)</th>
                    <th className="py-2.5 px-2 text-center w-20">Wt (g)</th>
                    <th className="py-2.5 px-2 text-center w-16">Units</th>
                    <th className="py-2.5 px-2 text-center w-24">40&apos;HQ Ctns</th>
                    <th className="py-2.5 px-2 min-w-[120px]">Container Type</th>
                    <th className="py-2.5 px-2 text-right w-20">
                      Bottle {activeCommObj?.originSection === 'usa' || activeCommObj?.packingCurrency === 'USD' ? '$' : '₹'}
                    </th>
                    <th className="py-2.5 px-2 text-right w-20">
                      Label {activeCommObj?.originSection === 'usa' || activeCommObj?.packingCurrency === 'USD' ? '$' : '₹'}
                    </th>
                    <th className="py-2.5 px-2 text-right w-20">
                      Cap {activeCommObj?.originSection === 'usa' || activeCommObj?.packingCurrency === 'USD' ? '$' : '₹'}
                    </th>
                    <th className="py-2.5 px-2 text-right w-20">
                      Fill {activeCommObj?.originSection === 'usa' || activeCommObj?.packingCurrency === 'USD' ? '$' : '₹'}
                    </th>
                    <th className="py-2.5 px-2 text-right w-20">
                      Carton {activeCommObj?.originSection === 'usa' || activeCommObj?.packingCurrency === 'USD' ? '$' : '₹'}
                    </th>
                    <th className="py-2.5 px-2 text-right w-20">Tare kg</th>
                    <th className="py-2.5 px-2 text-right w-20">Density</th>
                    <th className="py-2.5 px-2 text-right w-24">Net Wt kg</th>
                    <th className="py-2.5 px-2 text-right w-24">Gross Wt kg</th>
                    <th className="py-2.5 px-2 text-right w-28">
                      Net Prod {activeCommObj?.originSection === 'usa' || activeCommObj?.packingCurrency === 'USD' ? '$' : '₹'}
                    </th>
                    <th className="py-2.5 px-2 text-right w-24">Quote Ovr</th>
                    <th className="py-2.5 px-2 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentCommoditySpecs.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-1.5 px-2 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.sku}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, { sku: e.target.value })
                          }
                          className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.001"
                          value={row.volume}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              volume: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-1 text-center font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="1"
                          placeholder="-"
                          value={row.weightG ?? ''}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              weightG: e.target.value === '' ? undefined : parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-1.5 py-1 text-center font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          min={1}
                          value={row.units}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              units: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full px-1.5 py-1 text-center font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          min={1}
                          value={row.cartons}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              cartons: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full px-1.5 py-1 text-center font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          value={row.type}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, { type: e.target.value })
                          }
                          className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.1"
                          value={row.bottleCost}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              bottleCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.1"
                          value={row.labelCost}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              labelCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.1"
                          value={row.capCost}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              capCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.1"
                          value={row.fillCost || 0}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              fillCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.5"
                          value={row.cartonCost}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              cartonCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.005"
                          value={row.tarePerUnitKg ?? getDefaultTarePerUnit(row.type)}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              tarePerUnitKg: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={row.density ?? activeCommObj?.density ?? 0.91}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              density: parseFloat(e.target.value) || 0.91,
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.05"
                          placeholder="Auto"
                          value={row.customNetWeightKg ?? ''}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              customNetWeightKg:
                                e.target.value === '' ? null : parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-amber-50/40 dark:bg-slate-800 tabular-nums"
                          title="Custom Net Weight per Case (kg) override"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.05"
                          placeholder="Auto"
                          value={row.customGrossWeightKg ?? ''}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              customGrossWeightKg:
                                e.target.value === '' ? null : parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-amber-50/40 dark:bg-slate-800 tabular-nums"
                          title="Custom Gross Weight per Case (kg) override"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step={activeCommObj?.originSection === 'usa' || activeCommObj?.packingCurrency === 'USD' ? '0.05' : '1'}
                          placeholder="Auto"
                          value={
                            activeCommObj?.originSection === 'usa' || activeCommObj?.packingCurrency === 'USD'
                              ? row.customNetProductCostUSD ?? ''
                              : row.customNetProductCostINR ?? ''
                          }
                          onChange={e =>
                            handleUpdateSkuSpec(
                              activeCommodity,
                              row.id,
                              activeCommObj?.originSection === 'usa' || activeCommObj?.packingCurrency === 'USD'
                                ? {
                                    customNetProductCostUSD:
                                      e.target.value === '' ? null : parseFloat(e.target.value),
                                  }
                                : {
                                    customNetProductCostINR:
                                      e.target.value === '' ? null : parseFloat(e.target.value),
                                  }
                            )
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-amber-50/40 dark:bg-slate-800 tabular-nums"
                          title="Custom Net Product Cost per Case override"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          step="0.05"
                          placeholder="Auto"
                          value={row.customPriceOverride ?? ''}
                          onChange={e =>
                            handleUpdateSkuSpec(activeCommodity, row.id, {
                              customPriceOverride:
                                e.target.value === '' ? null : parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-1.5 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-amber-50/40 dark:bg-slate-800 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateSku(activeCommodity, row)}
                            className="p-1 text-slate-400 hover:text-blue-600"
                            title="Duplicate row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSku(activeCommodity, row.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>
        </div>
      )}

      {/* SUBTAB 6: CROSS-COMMODITY PRICE MATRIX (EDITABLE BULK RATES & CLICKABLE CELL OVERRIDES) */}
      {subTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cross-Commodity Quote Matrix ({params.quoteCur} · {params.incoterm})
              </h3>
              <p className="text-xs text-slate-500">
                Edit Bulk Rates inline in column 2, or click any Quoted Price cell to set a custom price override.
              </p>
            </div>
            <button
              type="button"
              onClick={exportMatrixCSV}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Matrix CSV</span>
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto max-h-[72vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white text-[10px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[155px]">Commodity</th>
                    <th className="py-2.5 px-3 text-right min-w-[125px]">Bulk Rate (Editable)</th>
                    {matrixReferenceSkus.map(s => (
                      <th key={s.id} className="py-2.5 px-2.5 text-right min-w-[115px]">
                        <div className="truncate max-w-[120px]" title={s.sku}>
                          {s.sku}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {commodityKeys.map(k => {
                    const c = commodities[k];
                    const p = oilPrices[k] ?? c.defaultPrice;
                    const specs = packingData[k] || [];

                    return (
                      <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {c.emoji} {c.label}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-amber-700 dark:text-amber-400 font-bold">
                              {c.currency === 'USD' ? '$' : '₹'}
                            </span>
                            <input
                              type="number"
                              step="0.25"
                              disabled={!canEditMasterCosting}
                              value={p}
                              onChange={e =>
                                handleUpdateSingleOilPrice(k, parseFloat(e.target.value) || 0)
                              }
                              className="w-20 px-1.5 py-0.5 text-right font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums disabled:opacity-70"
                            />
                          </div>
                        </td>
                        {matrixReferenceSkus.map(refSku => {
                          const match = specs.find(s => s.sku === refSku.sku);
                          if (!match) {
                            return (
                              <td key={refSku.id} className="py-2 px-2.5 text-right text-slate-400">
                                —
                              </td>
                            );
                          }
                          const res = calculateMasterRow(match, p, k, params, commodities);
                          const isEditingThis =
                            canEditMasterCosting &&
                            matrixEditCell?.oilKey === k &&
                            matrixEditCell?.skuId === match.id;

                          return (
                            <td key={refSku.id} className="py-2 px-2.5 text-right font-mono tabular-nums">
                              {isEditingThis ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    step="0.05"
                                    autoFocus
                                    value={matrixEditCell.val}
                                    onChange={e =>
                                      setMatrixEditCell({
                                        oilKey: k,
                                        skuId: match.id,
                                        val: e.target.value,
                                      })
                                    }
                                    onBlur={() => {
                                      const parsed =
                                        matrixEditCell.val.trim() === ''
                                          ? null
                                          : parseFloat(matrixEditCell.val);
                                      handleUpdateSkuSpec(k, match.id, {
                                        customPriceOverride: parsed,
                                      });
                                      setMatrixEditCell(null);
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        const parsed =
                                          matrixEditCell.val.trim() === ''
                                            ? null
                                            : parseFloat(matrixEditCell.val);
                                        handleUpdateSkuSpec(k, match.id, {
                                          customPriceOverride: parsed,
                                        });
                                        setMatrixEditCell(null);
                                      } else if (e.key === 'Escape') {
                                        setMatrixEditCell(null);
                                      }
                                    }}
                                    className="w-20 px-1 py-0.5 text-right font-bold rounded border border-amber-500 bg-amber-50 dark:bg-slate-800"
                                  />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!canEditMasterCosting}
                                  onClick={() => {
                                    if (!canEditMasterCosting) return;
                                    setMatrixEditCell({
                                      oilKey: k,
                                      skuId: match.id,
                                      val: String(res.roundedQuotePrice),
                                    });
                                  }}
                                  className={`font-bold ${
                                    canEditMasterCosting ? 'hover:underline' : 'cursor-default'
                                  } ${
                                    res.isCustomPriceOverridden
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-slate-900 dark:text-slate-100'
                                  }`}
                                  title={canEditMasterCosting ? 'Click to override price' : 'Quoted Price'}
                                >
                                  {params.curSymbol}
                                  {fmtStr(res.roundedQuotePrice)}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 7: CONTAINER PLAN (EDITABLE LOGISTICS CAPACITIES) */}
      {subTab === 'container' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Container Capacity &amp; Payload Guide ({params.containerSize}):
              </h3>
              <select
                value={activeCommodity}
                onChange={e => handleSelectCommodity(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                {commodityKeys.map(k => (
                  <option key={k} value={k}>
                    {commodities[k]?.emoji} {commodities[k]?.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-500">
              Edit 40&apos;HQ Cartons, Volume, or Units inline to adjust container loadouts
            </span>
          </div>

          <fieldset disabled={!canEditMasterCosting} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 disabled:opacity-80">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white text-[10.5px] font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-2 text-center w-24">Volume (L)</th>
                    <th className="py-2.5 px-2 text-center w-24">Units/Ctn</th>
                    <th className="py-2.5 px-2 text-center w-28">Base 40&apos;HQ Ctns</th>
                    <th className="py-2.5 px-3 text-right">Active {params.containerSize} Ctns</th>
                    <th className="py-2.5 px-3 text-right">Total Units</th>
                    <th className="py-2.5 px-3 text-right">Total Liquid Vol</th>
                    <th className="py-2.5 px-3 text-right">Gross Container Wt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentCommodityCalculations.map(c => {
                    const spec = currentCommoditySpecs.find(s => s.id === c.id);
                    if (!spec) return null;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">{c.sku}</td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={spec.volume}
                            onChange={e =>
                              handleUpdateSkuSpec(activeCommodity, c.id, {
                                volume: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 px-1.5 py-1 text-center font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={spec.units}
                            onChange={e =>
                              handleUpdateSkuSpec(activeCommodity, c.id, {
                                units: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="w-16 px-1.5 py-1 text-center font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={spec.cartons}
                            onChange={e =>
                              handleUpdateSkuSpec(activeCommodity, c.id, {
                                cartons: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="w-24 px-1.5 py-1 text-center font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {c.cartonsPerContainer.toLocaleString()} ctns
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {c.totalUnits.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {c.totalVolume.toLocaleString()} L
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                          {c.totalWeight.toLocaleString()} kg ({c.totalWeightLbs.toLocaleString()} lbs)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </fieldset>
        </div>
      )}

      {/* SUBTAB 8: PI HISTORY LEDGER */}
      {subTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Issued Proforma Invoices Ledger ({filteredSavedPIs.length})
            </h3>
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search PI #, customer, attention..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white text-[10.5px] font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">PI #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Attention</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3">Internal Note (Editable)</th>
                    <th className="py-2.5 px-3 text-center w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSavedPIs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No Proforma Invoices match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredSavedPIs.map(pi => (
                      <tr key={pi.piNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {pi.piNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {pi.dateLong || pi.date}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {pi.buyerName}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {pi.buyerAttention}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{pi.items.length}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {pi.curSymbol}
                          {fmtStr(pi.totalUSD)}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            disabled={!canCreateEditPI}
                            value={pi.internalNote || ''}
                            onChange={e => onSavePI({ ...pi, internalNote: e.target.value })}
                            placeholder="Add audit note..."
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-amber-500 bg-transparent text-[11px]"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {canCreateEditPI && (
                              <button
                                type="button"
                                onClick={() => handleLoadPIIntoEditor(pi)}
                                className="p-1 text-slate-500 hover:text-blue-600"
                                title="Load & Edit in Proforma Builder"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDownloadCurrentXlsx(pi)}
                              className="p-1 text-slate-500 hover:text-emerald-600"
                              title="Download Excel (.xlsx)"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                SoundEngine.play('print');
                                onPrintOfficialPI(pi);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              title="Preview & Print PO Template"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canCreateEditPI && (
                              <button
                                type="button"
                                onClick={() => onDeletePI(pi.piNumber)}
                                className="p-1 text-slate-500 hover:text-rose-600"
                                title="Delete PI"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* COMMODITY EDITOR / ADD MODAL */}
      {commodityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingCommodityKey ? `Edit Commodity: ${commForm.label}` : 'Add New Commodity'}
              </h3>
              <button
                type="button"
                onClick={() => setCommodityModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCommodityModal} className="space-y-3 text-xs">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">Icon</label>
                  <input
                    type="text"
                    value={commForm.emoji}
                    onChange={e => setCommForm(f => ({ ...f, emoji: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                    Commodity Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={commForm.label}
                    onChange={e => setCommForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Sesame Oil"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                  Pricing Section &amp; Costing Mode
                </label>
                <select
                  value={commForm.originSection || 'india'}
                  onChange={e => {
                    const sec = e.target.value as CommoditySection;
                    setCommForm(f => ({
                      ...f,
                      originSection: sec,
                      currency: sec === 'usa' ? 'USD' : sec === 'india_evoo_avo' ? 'INR' : f.currency,
                      packingCurrency: sec === 'usa' ? 'USD' : 'INR',
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="india">India Filling &amp; Export (INR Packing + FOB/CIF/DDP)</option>
                  <option value="india_evoo_avo">
                    Indian Section — EVOO &amp; Avocado (INR Bulk + India Filling)
                  </option>
                  <option value="usa">USA Pricelist (USA Filling · Direct USD Product + USD Packing)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                    Bulk Buying Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={commForm.defaultPrice}
                    onChange={e =>
                      setCommForm(f => ({ ...f, defaultPrice: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                    Bulk Currency
                  </label>
                  <select
                    value={commForm.currency}
                    onChange={e =>
                      setCommForm(f => ({ ...f, currency: e.target.value as 'INR' | 'USD' }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="INR">INR (₹/kg)</option>
                    <option value="USD">USD ($/kg)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                    Basic Customs Duty 1
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={commForm.basicDuty}
                    onChange={e =>
                      setCommForm(f => ({ ...f, basicDuty: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                    Duty 1 Basis
                  </label>
                  <select
                    value={commForm.dutyType}
                    onChange={e =>
                      setCommForm(f => ({ ...f, dutyType: e.target.value as DutyBasisType }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="%">% of FOB</option>
                    <option value="$/kg">$ per kg ($/kg)</option>
                    <option value="cents/kg">Cents per kg (¢/kg)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    Basic Customs Duty 2 (Per Kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={commForm.basicDutyPerKg ?? 0}
                    onChange={e =>
                      setCommForm(f => ({
                        ...f,
                        basicDutyPerKg: Math.max(0, parseFloat(e.target.value) || 0),
                      }))
                    }
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/20 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    Per-Kg Duty Unit
                  </label>
                  <select
                    value={commForm.basicDutyPerKgUnit || '$/kg'}
                    onChange={e =>
                      setCommForm(f => ({
                        ...f,
                        basicDutyPerKgUnit: e.target.value as PerKgDutyUnit,
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/20 font-bold"
                  >
                    <option value="$/kg">$ per kg ($/kg)</option>
                    <option value="cents/kg">Cents per kg (¢/kg)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                    Specific Gravity / Density (kg/L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={commForm.density}
                    onChange={e =>
                      setCommForm(f => ({ ...f, density: parseFloat(e.target.value) || 0.91 }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                    HS Tariff Code
                  </label>
                  <input
                    type="text"
                    value={commForm.hsCode}
                    onChange={e => setCommForm(f => ({ ...f, hsCode: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!commForm.isBlend}
                  onChange={e => setCommForm(f => ({ ...f, isBlend: e.target.checked }))}
                  className="accent-teal-600"
                />
                <span>Enable Dual-Oil Blending Slider for this commodity</span>
              </label>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                {editingCommodityKey && commodityKeys.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCommodity(editingCommodityKey)}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Delete Commodity
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCommodityModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    Save Commodity
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PORT PROFILES MANAGER MODAL */}
      {portModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Destination Port Profiles (Edit Ocean Freight, Drayage &amp; US Tariff Status)
              </h3>
              <button
                type="button"
                onClick={() => setPortModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {Object.entries(ports).map(([pKey, port]) => (
                <div key={pKey} className="p-2.5 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={port.name}
                      onChange={e =>
                        onUpdatePorts({
                          ...ports,
                          [pKey]: { ...port, name: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    />
                  </div>
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Ocean $:</span>
                    <input
                      type="number"
                      value={port.oceanFreight}
                      onChange={e =>
                        onUpdatePorts({
                          ...ports,
                          [pKey]: { ...port, oceanFreight: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Dray $:</span>
                    <input
                      type="number"
                      value={port.drayage}
                      onChange={e =>
                        onUpdatePorts({
                          ...ports,
                          [pKey]: { ...port, drayage: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={port.isUS}
                        onChange={e =>
                          onUpdatePorts({
                            ...ports,
                            [pKey]: { ...port, isUS: e.target.checked },
                          })
                        }
                      />
                      <span>US</span>
                    </label>
                    {Object.keys(ports).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...ports };
                          delete next[pKey];
                          onUpdatePorts(next);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Port */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-2 items-end text-xs">
              <div className="col-span-5">
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">New Port Name</label>
                <input
                  type="text"
                  value={newPortForm.name}
                  onChange={e => setNewPortForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Port of Miami, FL, USA"
                  className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Ocean ($)</label>
                <input
                  type="number"
                  value={newPortForm.oceanFreight}
                  onChange={e =>
                    setNewPortForm(f => ({ ...f, oceanFreight: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Drayage ($)</label>
                <input
                  type="number"
                  value={newPortForm.drayage}
                  onChange={e =>
                    setNewPortForm(f => ({ ...f, drayage: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div className="col-span-1 flex items-center pb-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPortForm.isUS}
                    onChange={e => setNewPortForm(f => ({ ...f, isUS: e.target.checked }))}
                  />
                  <span>US</span>
                </label>
              </div>
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newPortForm.name.trim()) return;
                    const k = `PORT_${Date.now().toString().slice(-4)}`;
                    onUpdatePorts({
                      ...ports,
                      [k]: { ...newPortForm, key: k, name: newPortForm.name.trim() },
                    });
                    setNewPortForm({
                      key: '',
                      name: '',
                      oceanFreight: 7500,
                      drayage: 1200,
                      isUS: true,
                    });
                    SoundEngine.play('pop');
                  }}
                  className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  + Add Port
                </button>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => onUpdatePorts(PORT_PROFILES)}
                className="text-xs text-slate-500 hover:underline"
              >
                Reset Ports to Defaults
              </button>
              <button
                type="button"
                onClick={() => setPortModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
