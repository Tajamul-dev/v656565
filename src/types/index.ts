export type ModuleId =
  | 'dashboard'
  | 'packing'
  | 'inventory'
  | 'oilcost'
  | 'access'
  // Legacy modules retained from previous version
  | 'orders'
  | 'dispatch'
  | 'mastersheet';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'sales_exec'
  | 'warehouse_mgr'
  | 'viewer'
  | 'owner'
  | 'editor'
  | 'operator';

export interface UserPermissions {
  dashboardView: boolean;
  packingView: boolean;
  packingEdit: boolean;
  inventoryView: boolean;
  inventoryEdit: boolean;
  oilcostView: boolean;
  oilcostEditMaster: boolean;
  oilcostCreateEditPI: boolean;
  oilcostOverrideFloor: boolean;
  canClearData: boolean;
  canManageAccess: boolean;
  // Legacy module visibility (Order Dashboard / Dispatches / Master Sheet)
  ordersView?: boolean;
  dispatchView?: boolean;
  mastersheetView?: boolean;
}

export interface StaffMemberAccess {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'sales_exec' | 'warehouse_mgr' | 'viewer';
  department: string;
  title: string;
  responsibilities: string;
  active: boolean;
  permissions: UserPermissions;
  updatedAt: string;
  updatedBy: string;
}

export interface FloorPricePolicy {
  minFloorMarginPct: number;
  enforceStrictFloor: boolean;
  showLandedBreakEvenToSales: boolean;
}

export interface User {
  email: string;
  name: string;
  initials: string;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}

export type PriorityLevel = 'urgent' | 'priority' | 'advance' | 'partial' | 'normal';

export type MaterialKey = 'preform' | 'bottle' | 'cap' | 'wad' | 'cst' | 'carton' | 'label' | 'pallet';

export type MaterialStatus = 'notstarted' | 'available' | 'ordered' | 'delivery' | 'received' | 'approved' | 'na';

export interface MaterialStatusEntry {
  status: MaterialStatus;
  date?: string;
  notes?: string;
}

export interface PackingOrder {
  id: string;
  container: string;
  customer: string;
  item: string;
  sku: string;
  brand: string;
  qty: number; // in Cartons/Cases
  priority: PriorityLevel;
  materials: Record<MaterialKey, MaterialStatusEntry>;
  remarks: string;
  archived?: boolean;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'Packaging' | 'Raw Material' | 'Finished Goods';
  materialType: MaterialKey | 'none';
  linkedSku: string;
  unit: string;
  quantity: number;
  minLevel: number;
  cost: number;
  notes: string;
  updatedAt?: string;
}

export type DutyBasisType = '%' | 'cents/kg' | '$/kg';
export type PerKgDutyUnit = '$/kg' | 'cents/kg';
export type CommoditySection = 'india' | 'india_evoo_avo' | 'usa';

export interface Commodity {
  key: string;
  label: string;
  emoji: string;
  defaultPrice: number;
  currency: 'INR' | 'USD';
  basicDuty: number;
  dutyType: DutyBasisType;
  basicDutyPerKg?: number;
  basicDutyPerKgUnit?: PerKgDutyUnit;
  density: number;
  hsCode: string;
  isBlend?: boolean;
  originSection?: CommoditySection;
  packingCurrency?: 'INR' | 'USD';
  defaultProfitMargin?: number;
  blendNote?: string;
}

export interface PortProfile {
  key: string;
  name: string;
  oceanFreight: number;
  drayage: number;
  isUS: boolean;
}

export interface PackingSpec {
  id: number;
  sku: string;
  volume: number; // In liters
  units: number;  // Units per carton
  cartons: number; // Standard cartons in 40' HQ container
  type: string;    // 'PET Bottle', 'HDPE Can', 'GLASS', 'Tin', etc.
  bottleCost: number; // in INR per unit (or USD per unit when packingCurrency === 'USD')
  labelCost: number;  // in INR per unit (or USD per unit when packingCurrency === 'USD')
  capCost: number;    // in INR per unit (or USD per unit when packingCurrency === 'USD')
  fillCost: number;   // in INR per unit (or USD per unit when packingCurrency === 'USD')
  cartonCost: number; // in INR per carton (or USD per carton when packingCurrency === 'USD')
  density?: number;
  weightG?: number;   // for Honey or weight-based SKUs (in grams per unit)
  tarePerUnitKg?: number; // Custom tare weight per unit in kg
  cartonTareKg?: number;  // Custom outer carton tare in kg (default 0.65)
  customNetWeightKg?: number | null; // Optional manual Net Weight override per case
  customGrossWeightKg?: number | null; // Optional manual Gross Weight override per case
  customNetProductCostINR?: number | null; // Optional manual Net Product Cost (INR) override per case
  customNetProductCostUSD?: number | null; // Optional manual Net Product Cost (USD) override per case for USA Pricelist
  customDomTransportINR?: number | null; // Optional manual Domestic Transport INR per case
  customOceanFreightUSD?: number | null; // Optional manual Ocean Freight USD per case
  customBasicDuty1USD?: number | null; // Optional manual Basic Customs Duty 1 USD per case
  customBasicDuty2USD?: number | null; // Optional manual Basic Customs Duty 2 (Per Kg) USD per case
  customReciprocalDutyUSD?: number | null; // Optional manual Reciprocal Tariff USD per case
  customEntryFeeUSD?: number | null; // Optional manual Customs Entry Fee USD per case
  customDrayageUSD?: number | null; // Optional manual Destination Drayage USD per case
  customPriceOverride?: number | null; // Optional manual Final Quoted Price override per carton
  hasPackingData: boolean;
}

export interface CommercialParams {
  quoteCur: 'USD' | 'CAD' | 'INR';
  curSymbol: string;
  activeExRate: number;
  exRateUSD: number;
  exRateCAD: number;
  oceanFreight: number;
  inlandDrayage: number;
  domesticFreight: number;
  reciprocalDuty: number;
  basicDuty: number;
  dutyType: DutyBasisType;
  basicDutyPerKg?: number;
  basicDutyPerKgUnit?: PerKgDutyUnit;
  entryFeePercent: number;
  profitMargin: number;
  density: number;
  incoterm: 'DDP' | 'CIF' | 'FOB' | 'EXW';
  isUSA: boolean;
  roundingStep: number;
  portName: string;
  containerSize: '40HQ' | '40GP' | '20GP';
}

export interface MasterRowCalculation {
  id: number;
  sku: string;
  volume: number;
  units: number;
  type: string;
  oilKey: string;
  oilLabel: string;
  isUsaDirectPricelist: boolean;
  packingCurrency: 'INR' | 'USD';
  autoNetWeightKg: number;
  netWeightKg: number;
  netWeightLbs: number;
  autoGrossWeightKg: number;
  grossWeight: number;
  grossWeightLbs: number;
  isCustomNetWeight: boolean;
  isCustomGrossWeight: boolean;
  cartonsPerContainer: number;
  totalUnits: number;
  totalVolume: number;
  totalWeight: number;
  totalWeightLbs: number;
  bottleCostCase: number;
  labelCostCase: number;
  capCostCase: number;
  fillCostCase: number;
  cartonBoxCostCase: number;
  autoNetOilCostINR: number;
  netOilCostINR: number;
  autoNetOilCostUSD: number;
  netOilCostUSD: number;
  netOilCostQuoteCur: number;
  isCustomNetProductCost: boolean;
  totalPackagingCostCartonINR: number;
  totalPackagingCostCartonUSD: number;
  totalPackagingCostCartonQuoteCur: number;
  domTransportINR: number;
  totalFobCostINR: number;
  netFobPriceQuoteCur: number;
  oceanFreightQuoteCur: number;
  cifQuoteCur: number;
  autoTrumpDutyQuoteCur: number;
  trumpDutyQuoteCur: number;
  isCustomReciprocalDuty: boolean;
  autoPrimaryBasicDutyQuoteCur: number;
  primaryBasicDutyQuoteCur: number;
  isCustomBasicDuty1: boolean;
  autoBasicDutyPerKgQuoteCur: number;
  basicDutyPerKgQuoteCur: number;
  isCustomBasicDuty2: boolean;
  basicDutyQuoteCur: number;
  autoOtherCustomEntryFeeQuoteCur: number;
  otherCustomEntryFeeQuoteCur: number;
  isCustomEntryFee: boolean;
  autoDrayageQuoteCur: number;
  drayageQuoteCur: number;
  isCustomDrayage: boolean;
  autoDutiesEntryDrayageQuoteCur: number;
  totalDutiesEntryDrayageQuoteCur: number;
  hasAnyDutyDrayageOverride: boolean;
  subtotalLandedCostQuoteCur: number;
  profitMarkupQuoteCur: number;
  finalPriceQuoteCur: number;
  calculatedRoundedPrice: number;
  roundedQuotePrice: number;
  isCustomPriceOverridden: boolean;
  hasPackingData: boolean;
  curSymbol: string;
}

export interface ProformaItem {
  id: number;
  srNo?: number | string;
  skuId: number;
  oilKey: string;
  oilLabel: string;
  sku: string;
  customDescription?: string;
  volume: number;
  units: number;
  qty: number; // Cartons / Cases
  unitPrice: number;
  lineTotal: number;
  grossWeight: number;
  grossWeightLbs: number;
  netWeightKg: number;
  netWeightLbs: number;
  pallets?: number; // Legacy: Pallets load
}

export interface ProformaExtraRow {
  id: string;
  label: string;
  valueText: string;
  numericAmount: number; // Positive adds to total, negative subtracts, 0 is informational text
}

export interface PoSellerConfig {
  documentTitle: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyTaxIdLabel: string;
  companyTaxId: string;
  noteHeader: string;
  bankDetailsText: string;
  signatoryLabel: string;
  showStamp: boolean;
  customLogoUrl?: string;
}

export interface SavedProformaInvoice {
  piNumber: string;
  date: string;
  dateLong: string;
  timeCreated: string;
  savedAt: string;
  ownerEmail: string;
  ownerName: string;
  ownerInitials: string;
  // Seller / Template Header Fields
  documentTitle?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxIdLabel?: string;
  companyTaxId?: string;
  // Customer & Ship-To Fields (matching Blank PO template)
  buyerName: string;
  buyerShortName: string;
  buyerAddress: string;
  buyerAttention: string;
  shipToName?: string;
  shipToAddress?: string;
  shipToAttention?: string;
  // Executive & Commercial Terms
  mktExecName: string;
  mktExecShort: string;
  mktExecEmail: string;
  deliveryTerms: string;
  paymentTerms: string;
  incoterm: string;
  portName: string;
  quoteCur: string;
  curSymbol: string;
  activeExRate: number;
  roundingStep: number;
  // Line Items & Totals
  items: ProformaItem[];
  extraSummaryRows?: ProformaExtraRow[];
  subTotal?: number;
  totalQty: number;
  totalUSD: number;
  totalINR: number;
  // Footer / Bank / Stamp
  noteHeader?: string;
  bankDetailsText?: string;
  signatoryLabel?: string;
  showStamp?: boolean;
  customLogoUrl?: string;
  internalNote: string;
  // Legacy fields retained for PrintModal compatibility
  signatureAttachment?: DigitalSignatureData;
  totalPallets?: number;
}

export interface ReverseStep {
  step: number;
  label: string;
  value: number;
  cur: string;
  sub?: string;
  isPrice?: boolean;
  isTotal?: boolean;
  isFinal?: boolean;
}

export interface ReverseCalculationResult {
  targetPrice: number;
  baseBeforeProfit: number;
  maxBulkPricePerKg: number;
  actualBulkPrice: number;
  catalogBulkPrice: number;
  profitPerKg: number;
  profitPerCarton: number;
  profitPct: number;
  verdict: 'accept' | 'caution' | 'reject';
  minAcceptablePrice: number;
  netWeightKg: number;
  packingINR: number;
  domTransportINR: number;
  fob: number;
  fobINR: number;
  steps: ReverseStep[];
  sku: string;
  skuId: number;
  commodityKey: string;
  commodityLabel: string;
  volume: number;
  units: number;
  bulkCurrencySymbol?: string;
}

export interface NegotiationRecord {
  negoNumber: string;
  timestamp: string;
  dateLong: string;
  timeString: string;
  ownerEmail: string;
  ownerName: string;
  ownerInitials: string;
  clientName: string;
  reference: string;
  commodityKey: string;
  commodityLabel: string;
  sku: string;
  skuId: number;
  volume: number;
  units: number;
  netWeightKg: number;
  targetPrice: number;
  baseBeforeProfit: number;
  maxBulkPricePerKg: number;
  actualBulkPrice: number;
  catalogBulkPrice: number;
  profitPerKg: number;
  profitPerCarton: number;
  profitPct: number;
  verdict: 'accept' | 'caution' | 'reject';
  minAcceptablePrice: number;
  quoteCur: string;
  curSymbol: string;
  incoterm: string;
  portName: string;
  internalNote: string;
  steps: ReverseStep[];
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  actionType: 'create' | 'update' | 'delete' | 'view' | 'system';
  module: string;
  summary: string;
  userEmail: string;
}

// ---- Legacy types retained for Dispatch / Master Sheet / Orders modules ----

export interface DigitalSignatureData {
  dataUrl: string;
  signerName: string;
  signerTitle: string;
  signedAt: string;
  deviceToken: string;
  verifiedHash: string;
}

export interface PartyBomRequirement {
  type: 'bottle' | 'cap' | 'wad' | 'label' | 'carton' | 'shrink' | 'raw_material';
  code: string;
  desc: string;
  consPerCase: number;
  requiredQty: number;
  availableQty: number;
  balanceStk: number;
  shortExcess: number; // negative means shortage / left to buy new
  uom: string;
  status: 'sufficient' | 'deficit' | 'critical';
}

export interface OrderRecord {
  id: string;
  partyCode: string;
  partyName: string;
  poNo: string;
  poDate: string;
  poExp: string;
  month: string;
  skuCode: string;
  skuName: string;
  packSize: number;
  packUnit: string;
  qtyPerCs: number;
  planCs: number;
  planKg: number;
  planLtr: number;
  planPallets: number;
  fillingCs: number;
  dispatchedCs: number;
  balanceCs: number;
  status: 'In Production' | 'Partially Filled' | 'Ready for Dispatch' | 'Completed' | 'Pending RM';
  remarks?: string;
  palletSize?: string;
  bom: PartyBomRequirement[];
  invoiceAttachment?: { name: string; size: string; uploadedAt: string };
}

export interface DispatchRecord {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  month: string;
  productCode: string;
  productName: string;
  batchNo: string;
  casePack: number;
  dispatchCs: number;
  dispatchNos: number;
  packSize: number;
  dispatchMt: number;
  dispatchLocation: string;
  palletSpec?: string;
  palletConfig?: string;
  mfg?: string;
  exp?: string;
  moisture?: string;
  hmf?: string;
  color?: string;
  specialInstructions?: string;
}

export interface MasterSheetItem {
  partyCode: string;
  partyName: string;
  skuCode: string;
  skuName: string;
  packSize: number;
  qtyPerCs: number;
  mrp?: string | number;
  mrpIndicator?: string;
  palletRequirement?: string;
  notes?: string;
}

export interface MaterialDeductionItem {
  inventoryId: string;
  materialName: string;
  materialType: string;
  qtyDeducted: number;
  unit: string;
  prevStock: number;
  newStock: number;
  isDeficit: boolean;
}

export interface OrderDeductionRecord {
  id: string;
  orderId: string;
  poNo: string;
  partyCode: string;
  partyName: string;
  skuCode: string;
  skuName: string;
  cases: number;
  timestamp: string;
  materialsDeducted: MaterialDeductionItem[];
  invoiceAttachment?: { name: string; size: string; uploadedAt: string };
}
