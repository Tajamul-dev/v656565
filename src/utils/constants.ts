import { Commodity, PackingSpec, MaterialKey, PortProfile, PoSellerConfig } from '../types';

export const KG_TO_LBS = 2.20462;
export const LTR_TO_FLOZ = 33.814;
export const MAX_CONTAINER_PAYLOAD_KG = 26000;
export const MAX_CONTAINER_PAYLOAD_LBS = 57320;

export const GLOBAL_FUTURA_LOGO_PATH = '/assets/po_template/image1.png';
export const GLOBAL_FUTURA_STAMP_PATH = '/assets/po_template/image2.png';

export const DEFAULT_BANK_DETAILS_TEXT = `Bank Details :-
Beneficiary Name : GLOBAL FUTURA INC
Bank Name: BANK OF AMERICA
Bank Address: 222 BROADWAY NEW YORK 10038 USA
Swift Code: BOFAUS3N
Account No. : 483076079459
Wire Routing Number : 026009593
ACH Routing Number : 021000322`;

export const DEFAULT_PO_SELLER_CONFIG: PoSellerConfig = {
  documentTitle: 'PROFORMA INVOICE',
  companyName: 'GLOBAL FUTURA INC',
  companyAddress: '500 N, BROADWAY SUITE 163 JERICHO, NY 11753',
  companyPhone: 'Phone: +1 (347) 446-2333',
  companyEmail: 'E-mail : marketing@globaloils.us',
  companyTaxIdLabel: 'Tax ID',
  companyTaxId: '88-4093389',
  noteHeader: 'Note:',
  bankDetailsText: DEFAULT_BANK_DETAILS_TEXT,
  signatoryLabel: 'Auth. Signatory',
  showStamp: true,
  customLogoUrl: GLOBAL_FUTURA_LOGO_PATH,
};

export const PACKING_MATERIALS_LIST: { key: MaterialKey; label: string; short: string; emoji: string }[] = [
  { key: 'preform', label: 'Preform', short: 'PRE', emoji: '🧪' },
  { key: 'bottle',  label: 'Bottle',  short: 'BOT', emoji: '🍾' },
  { key: 'cap',     label: 'Cap',     short: 'CAP', emoji: '🔴' },
  { key: 'wad',     label: 'Wad',     short: 'WAD', emoji: '💿' },
  { key: 'cst',     label: 'Shrink Tube', short: 'CST', emoji: '🎞️' },
  { key: 'carton',  label: 'Carton',  short: 'CTN', emoji: '📦' },
  { key: 'label',   label: 'Label',   short: 'LBL', emoji: '🏷️' },
  { key: 'pallet',  label: 'Pallet',  short: 'PAL', emoji: '🪵' },
];

export const COMMODITIES_CONFIG: Record<string, Commodity> = {
  // 1. India Filling & Export Costing (Existing Master Commodities)
  mustard:   { key: 'mustard',   label: 'Mustard Oil',     emoji: '🌼', defaultPrice: 175,  currency: 'INR', basicDuty: 19.0, dutyType: '%',        density: 0.91, hsCode: '1514.99.20', originSection: 'india', packingCurrency: 'INR' },
  sunflower: { key: 'sunflower', label: 'Sunflower Oil',   emoji: '🌻', defaultPrice: 190,  currency: 'INR', basicDuty: 3.4,  dutyType: '%',        density: 0.91, hsCode: '1512.19.00', originSection: 'india', packingCurrency: 'INR' },
  soybean:   { key: 'soybean',   label: 'Soybean Oil',     emoji: '🫘', defaultPrice: 150,  currency: 'INR', basicDuty: 19.0, dutyType: '%',        density: 0.91, hsCode: '1507.90.00', originSection: 'india', packingCurrency: 'INR' },
  canola:    { key: 'canola',    label: 'Canola Oil',      emoji: '🌿', defaultPrice: 180,  currency: 'INR', basicDuty: 6.4,  dutyType: '%',        density: 0.91, hsCode: '1514.19.00', originSection: 'india', packingCurrency: 'INR' },
  corn:      { key: 'corn',      label: 'Corn Oil',        emoji: '🌽', defaultPrice: 180,  currency: 'INR', basicDuty: 3.4,  dutyType: '%',        density: 0.91, hsCode: '1515.29.00', originSection: 'india', packingCurrency: 'INR' },
  vegetable: { key: 'vegetable', label: 'Vegetable Oil',   emoji: '🥗', defaultPrice: 165,  currency: 'INR', basicDuty: 19.0, dutyType: '%',        density: 0.91, hsCode: '1517.90.90', originSection: 'india', packingCurrency: 'INR' },
  blended:   { key: 'blended',   label: 'Blended Oil',     emoji: '🧪', defaultPrice: 184,  currency: 'INR', basicDuty: 6.4,  dutyType: '%',        density: 0.91, hsCode: '1517.90.90', isBlend: true, originSection: 'india', packingCurrency: 'INR' },
  peanut:    { key: 'peanut',    label: 'Groundnut Oil',   emoji: '🥜', defaultPrice: 190,  currency: 'INR', basicDuty: 7.5,  dutyType: 'cents/kg', density: 0.91, hsCode: '1508.90.00', originSection: 'india', packingCurrency: 'INR' },
  honey:     { key: 'honey',     label: 'Pure Honey',      emoji: '🍯', defaultPrice: 200,  currency: 'INR', basicDuty: 0,    dutyType: '%',        density: 1.42, hsCode: '0409.00.00', originSection: 'india', packingCurrency: 'INR' },
  olive:     { key: 'olive',     label: 'EV Olive Oil',    emoji: '🫒', defaultPrice: 5.35, currency: 'USD', basicDuty: 0,    dutyType: '%',        density: 0.91, hsCode: '1509.10.00', originSection: 'india', packingCurrency: 'INR' },
  avocado:   { key: 'avocado',   label: 'Avocado Oil',     emoji: '🥑', defaultPrice: 4.75, currency: 'USD', basicDuty: 0,    dutyType: '%',        density: 0.91, hsCode: '1515.90.80', originSection: 'india', packingCurrency: 'INR' },

  // 2. Indian Section — EV Olive Oil & Avocado Oil (INR Bulk + India Filling & Export Waterfall)
  olive_india: {
    key: 'olive_india',
    label: 'EV Olive Oil (Indian)',
    emoji: '🫒',
    defaultPrice: 505,
    currency: 'INR',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1509.10.00',
    originSection: 'india_evoo_avo',
    packingCurrency: 'INR',
  },
  avocado_india: {
    key: 'avocado_india',
    label: 'Avocado Oil (Indian)',
    emoji: '🥑',
    defaultPrice: 460,
    currency: 'INR',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1515.90.80',
    originSection: 'india_evoo_avo',
    packingCurrency: 'INR',
  },

  // 3. USA Pricelist (USA Filling Cost — Direct USD Product + USD Packing)
  usa_olive: {
    key: 'usa_olive',
    label: '100% EV Olive Oil (USA)',
    emoji: '🫒',
    defaultPrice: 5.35,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1509.10.00',
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 15,
    blendNote: '100% EVOO · 15% Margin',
  },
  usa_avocado: {
    key: 'usa_avocado',
    label: '100% Avocado Oil (USA)',
    emoji: '🥑',
    defaultPrice: 4.85,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1515.90.80',
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 15,
    blendNote: '100% Avocado · 15% Margin',
  },
  usa_blend_olive_canola: {
    key: 'usa_blend_olive_canola',
    label: 'Blended Olive (95% Canola / 5% EVOO)',
    emoji: '🧪',
    defaultPrice: 2.08,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1517.90.90',
    isBlend: true,
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 10,
    blendNote: '95% Canola ($1.91) + 5% EVOO ($5.35)',
  },
  usa_blend_olive_soy: {
    key: 'usa_blend_olive_soy',
    label: 'Blended Olive (95% Soy / 5% EVOO)',
    emoji: '🧪',
    defaultPrice: 2.11,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1517.90.90',
    isBlend: true,
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 10,
    blendNote: '95% Soybean ($1.94) + 5% EVOO ($5.35)',
  },
  usa_blend_avo_canola: {
    key: 'usa_blend_avo_canola',
    label: 'Blended Avocado (95% Canola / 5% Avo)',
    emoji: '🧪',
    defaultPrice: 2.06,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1517.90.90',
    isBlend: true,
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 10,
    blendNote: '95% Canola ($1.91) + 5% Avocado ($4.85)',
  },
  usa_blend_avo_soy: {
    key: 'usa_blend_avo_soy',
    label: 'Blended Avocado (95% Soy / 5% Avo)',
    emoji: '🧪',
    defaultPrice: 2.09,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1517.90.90',
    isBlend: true,
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 10,
    blendNote: '95% Soybean ($1.94) + 5% Avocado ($4.85)',
  },
  usa_canola: {
    key: 'usa_canola',
    label: 'Canola Oil (USA)',
    emoji: '🌿',
    defaultPrice: 1.96,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1514.19.00',
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 10,
    blendNote: '$0.8875 / lb · USA Filling',
  },
  usa_soybean: {
    key: 'usa_soybean',
    label: 'Soybean Oil (USA)',
    emoji: '🫘',
    defaultPrice: 1.96,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1507.90.00',
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 10,
    blendNote: '$0.8875 / lb · USA Filling',
  },
  usa_vegetable: {
    key: 'usa_vegetable',
    label: 'Vegetable Oil (USA)',
    emoji: '🥗',
    defaultPrice: 1.96,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1517.90.90',
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 10,
    blendNote: '$0.8875 / lb · USA Filling',
  },
  usa_corn: {
    key: 'usa_corn',
    label: 'Corn Oil (USA)',
    emoji: '🌽',
    defaultPrice: 2.09,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1515.29.00',
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 10,
    blendNote: '$0.95 / lb · USA Filling',
  },
  usa_sunflower: {
    key: 'usa_sunflower',
    label: 'Sunflower Oil (USA)',
    emoji: '🌻',
    defaultPrice: 2.05,
    currency: 'USD',
    basicDuty: 0,
    dutyType: '%',
    density: 0.91,
    hsCode: '1512.19.00',
    originSection: 'usa',
    packingCurrency: 'USD',
    defaultProfitMargin: 10,
    blendNote: '$0.93 / lb · USA Filling',
  },
};

export const COMMODITY_KEYS = Object.keys(COMMODITIES_CONFIG);

export const PORT_PROFILES: Record<string, PortProfile> = {
  US_NY:  { key: 'US_NY',  name: 'Port of New York / Newark, USA', oceanFreight: 7800, drayage: 1250, isUS: true },
  US_SAV: { key: 'US_SAV', name: 'Port of Savannah, GA, USA', oceanFreight: 7600, drayage: 1200, isUS: true },
  US_LGB: { key: 'US_LGB', name: 'Port of Long Beach / LA, USA', oceanFreight: 7100, drayage: 1150, isUS: true },
  US_HOU: { key: 'US_HOU', name: 'Port of Houston, TX, USA', oceanFreight: 7900, drayage: 1300, isUS: true },
  CA_MTR: { key: 'CA_MTR', name: 'Port of Montreal, Canada', oceanFreight: 8200, drayage: 1400, isUS: false },
  CA_VAN: { key: 'CA_VAN', name: 'Port of Vancouver, Canada', oceanFreight: 7400, drayage: 1300, isUS: false },
  CA_TOR: { key: 'CA_TOR', name: 'Toronto Container Terminal, Canada', oceanFreight: 8500, drayage: 1500, isUS: false },
  GY_GEO: { key: 'GY_GEO', name: 'Georgetown, Guyana', oceanFreight: 11580, drayage: 0, isUS: false },
  IT_GEN: { key: 'IT_GEN', name: 'Port of Genoa, Italy', oceanFreight: 4000, drayage: 950, isUS: false },
  CUSTOM: { key: 'CUSTOM', name: 'Custom Port / Direct Terminal', oceanFreight: 7500, drayage: 1200, isUS: false },
};

export const SKU_UNITS_MAP: Record<string, number> = {
  '250 ML (8.45 oz) x 24 PET': 24,
  '500 ML (16.9 oz) x 12 PET': 12,
  '500 ML (16.9 oz) x 24 PET': 24,
  '750 ML (25.4 oz) x 12 PET': 12,
  '946 ml (32 oz) x 12 PET': 12,
  '1 L (33.8 oz) x 12 PET': 12,
  '1.18 L (40 oz) x 12 PET': 12,
  '2 L (67.6 oz) x 6 PET': 6,
  '2 L (67.6 oz) x 6 HDPE': 6,
  '2.84 L (96 oz) x 6 HDPE': 6,
  '3 L (101.4 oz) x 6 PET': 6,
  '3 L (101.4 oz) x 4 PET': 4,
  '3.79 L (128 oz / 1 Gal) x 4 HDPE': 4,
  '3.79 L (128 oz / 1 Gal) x 4 Tin': 4,
  '5 L (169 oz) x 4 PET': 4,
  '5 L (169 oz) x 4 HDPE': 4,
  '14.75 L (3.9 Gal) x 2 HDPE': 2,
  '32.5 LBS HDPE Jug': 1,
  '35 LBS HDPE Jug': 1,
};

export function getUnitsPerCase(skuString: string): number {
  if (SKU_UNITS_MAP[skuString]) return SKU_UNITS_MAP[skuString];
  if (/\b(32\.5|35)\s*LBS\b/i.test(skuString)) return 1;
  const match = skuString.match(/x\s*(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return 12;
}

export function formatPoProductDescription(oilLabel: string, sku: string, volume: number, units: number): string {
  const flOz = Math.round(volume * LTR_TO_FLOZ * 10) / 10;
  // Format cleanly in Blank PO style e.g. "Mustard Oil - 1 L ( 33.8 Fl oz X 12 pcs )"
  if (sku && sku.trim()) {
    return `${oilLabel} ( ${sku} )`;
  }
  return `${oilLabel} ( ${flOz} Fl oz X ${units} pcs )`;
}

export const REFINED_SEED_PACKING_RAW = [
  { sku: '250 ML (8.45 oz) x 24 PET', units: 24, cartons: 3500, type: 'PET Bottle', bottle: 3.5, cap: 0.75, label: 1.0, fill: 0, carton: 30.0, volume: 0.25 },
  { sku: '500 ML (16.9 oz) x 12 PET', units: 12, cartons: 3500, type: 'PET Bottle', bottle: 5.75, cap: 0.75, label: 2.0, fill: 0, carton: 30.0, volume: 0.5 },
  { sku: '500 ML (16.9 oz) x 24 PET', units: 24, cartons: 2100, type: 'PET Bottle', bottle: 5.75, cap: 0.75, label: 2.0, fill: 0, carton: 35.0, volume: 0.5 },
  { sku: '946 ml (32 oz) x 12 PET', units: 12, cartons: 2200, type: 'PET Bottle', bottle: 11.0, cap: 1.75, label: 2.0, fill: 0, carton: 35.0, volume: 0.946 },
  { sku: '1 L (33.8 oz) x 12 PET', units: 12, cartons: 2100, type: 'PET Bottle', bottle: 7.5, cap: 1.5, label: 3.0, fill: 0, carton: 35.0, volume: 1.0 },
  { sku: '1.18 L (40 oz) x 12 PET', units: 12, cartons: 1950, type: 'PET Bottle', bottle: 15.0, cap: 2.0, label: 2.0, fill: 0, carton: 35.0, volume: 1.18 },
  { sku: '2 L (67.6 oz) x 6 PET', units: 6, cartons: 2100, type: 'PET Bottle', bottle: 9.25, cap: 2.5, label: 4.0, fill: 0, carton: 35.0, volume: 2.0 },
  { sku: '2 L (67.6 oz) x 6 HDPE', units: 6, cartons: 2000, type: 'HDPE Can', bottle: 38.0, cap: 2.5, label: 4.0, fill: 0, carton: 35.0, volume: 2.0 },
  { sku: '2.84 L (96 oz) x 6 HDPE', units: 6, cartons: 1550, type: 'HDPE Can', bottle: 40.0, cap: 2.0, label: 5.0, fill: 0, carton: 40.0, volume: 2.84 },
  { sku: '3 L (101.4 oz) x 6 PET', units: 6, cartons: 1500, type: 'PET Bottle', bottle: 21.0, cap: 4.5, label: 6.0, fill: 0, carton: 40.0, volume: 3.0 },
  { sku: '3.79 L (128 oz / 1 Gal) x 4 HDPE', units: 4, cartons: 1700, type: 'HDPE Can', bottle: 45.0, cap: 2.0, label: 5.0, fill: 0, carton: 40.0, volume: 3.79 },
  { sku: '5 L (169 oz) x 4 PET', units: 4, cartons: 1350, type: 'PET Bottle', bottle: 21.0, cap: 4.5, label: 6.0, fill: 0, carton: 40.0, volume: 5.0 },
  { sku: '5 L (169 oz) x 4 HDPE', units: 4, cartons: 1350, type: 'HDPE Can', bottle: 52.0, cap: 4.0, label: 6.0, fill: 0, carton: 40.0, volume: 5.0 },
  { sku: '14.75 L (3.9 Gal) x 2 HDPE', units: 2, cartons: 1400, type: 'HDPE Can', bottle: 190.0, cap: 0, label: 8.0, fill: 0, carton: 45.0, volume: 14.75 },
];

export const INDIA_EVOO_AVO_PACKING_RAW = [
  { sku: '250 ML (8.45 oz) x 24 PET', units: 24, cartons: 3500, type: 'PET Bottle', bottle: 3.5, cap: 0.75, label: 1.0, fill: 0, carton: 30.0, volume: 0.25 },
  { sku: '500 ML (16.9 oz) x 12 PET', units: 12, cartons: 3500, type: 'PET Bottle', bottle: 5.75, cap: 0.75, label: 2.0, fill: 0, carton: 30.0, volume: 0.5 },
  { sku: '750 ML (25.4 oz) x 12 PET', units: 12, cartons: 2400, type: 'PET Bottle', bottle: 6.75, cap: 1.25, label: 2.5, fill: 0, carton: 35.0, volume: 0.75 },
  { sku: '1 L (33.8 oz) x 12 PET', units: 12, cartons: 2100, type: 'PET Bottle', bottle: 7.5, cap: 1.5, label: 3.0, fill: 0, carton: 35.0, volume: 1.0 },
  { sku: '2 L (67.6 oz) x 6 PET', units: 6, cartons: 2100, type: 'PET Bottle', bottle: 9.25, cap: 2.5, label: 4.0, fill: 0, carton: 35.0, volume: 2.0 },
  { sku: '3 L (101.4 oz) x 4 PET', units: 4, cartons: 2100, type: 'PET Bottle', bottle: 21.0, cap: 4.5, label: 5.0, fill: 0, carton: 45.0, volume: 3.0 },
  { sku: '3.79 L (128 oz / 1 Gal) x 4 Tin', units: 4, cartons: 1650, type: 'Tin Packing', bottle: 74.0, cap: 4.0, label: 0, fill: 0, carton: 45.0, volume: 3.79 },
  { sku: '5 L (169 oz) x 4 PET', units: 4, cartons: 1350, type: 'PET Bottle', bottle: 21.0, cap: 4.5, label: 6.0, fill: 0, carton: 40.0, volume: 5.0 },
];

export const MUSTARD_PACKING_RAW = [
  { sku: '250 ML (8.45 oz) x 24 PET', units: 24, cartons: 3500, type: 'PET Bottle', bottle: 3.5, cap: 0.75, label: 1.0, fill: 0, carton: 30.0, volume: 0.25 },
  { sku: '500 ML (16.9 oz) x 12 PET', units: 12, cartons: 3500, type: 'PET Bottle', bottle: 5.75, cap: 0.75, label: 2.0, fill: 0, carton: 30.0, volume: 0.5 },
  { sku: '500 ML (16.9 oz) x 24 PET', units: 24, cartons: 2100, type: 'PET Bottle', bottle: 5.75, cap: 0.75, label: 2.0, fill: 0, carton: 35.0, volume: 0.5 },
  { sku: '1 L (33.8 oz) x 12 PET', units: 12, cartons: 2100, type: 'PET Bottle', bottle: 7.5, cap: 1.5, label: 3.0, fill: 0, carton: 35.0, volume: 1.0 },
  { sku: '2 L (67.6 oz) x 6 PET', units: 6, cartons: 2100, type: 'PET Bottle', bottle: 9.25, cap: 2.5, label: 4.0, fill: 0, carton: 35.0, volume: 2.0 },
  { sku: '2 L (67.6 oz) x 6 HDPE', units: 6, cartons: 2000, type: 'HDPE Can', bottle: 38.0, cap: 2.5, label: 4.0, fill: 0, carton: 35.0, volume: 2.0 },
  { sku: '3 L (101.4 oz) x 6 PET', units: 6, cartons: 1500, type: 'PET Bottle', bottle: 21.0, cap: 4.5, label: 6.0, fill: 0, carton: 40.0, volume: 3.0 },
  { sku: '5 L (169 oz) x 4 PET', units: 4, cartons: 1350, type: 'PET Bottle', bottle: 21.0, cap: 4.5, label: 6.0, fill: 0, carton: 40.0, volume: 5.0 },
  { sku: '5 L (169 oz) x 4 HDPE', units: 4, cartons: 1350, type: 'HDPE Can', bottle: 52.0, cap: 4.0, label: 6.0, fill: 0, carton: 40.0, volume: 5.0 },
  { sku: '946 ml (32 oz) x 12 PET', units: 12, cartons: 2200, type: 'PET Bottle', bottle: 11.0, cap: 1.75, label: 2.0, fill: 0, carton: 35.0, volume: 0.946 },
  { sku: '1.18 L (40 oz) x 12 PET', units: 12, cartons: 1900, type: 'PET Bottle', bottle: 15.0, cap: 2.0, label: 2.0, fill: 0, carton: 35.0, volume: 1.18 },
];

export const BLENDED_PACKING_RAW = [
  { sku: '1 L (33.8 oz) x 12 PET', units: 12, cartons: 2150, type: 'PET Bottle', bottle: 9.2, cap: 1.75, label: 3.0, fill: 0, carton: 45.0, volume: 1.0 },
  { sku: '2 L (67.6 oz) x 6 PET', units: 6, cartons: 2150, type: 'PET Bottle', bottle: 21.0, cap: 4.5, label: 4.5, fill: 0, carton: 45.0, volume: 2.0 },
  { sku: '3 L (101.4 oz) x 4 PET', units: 4, cartons: 2150, type: 'PET Bottle', bottle: 21.0, cap: 4.5, label: 5.0, fill: 0, carton: 45.0, volume: 3.0 },
  { sku: '3.79 L (128 oz / 1 Gal) x 4 Tin', units: 4, cartons: 1650, type: 'Tin Packing', bottle: 74.0, cap: 4.0, label: 0, fill: 0, carton: 45.0, volume: 3.79 },
];

// USA FILLING COST.csv Exact Packing Templates (All costs in USD $)
type RawPackRow = {
  sku: string;
  units: number;
  cartons: number;
  type: string;
  bottle: number;
  cap: number;
  label: number;
  fill: number;
  carton: number;
  volume: number;
  weightG?: number;
};

export const USA_PURE_OLIVE_AVO_PACKING_RAW: RawPackRow[] = [
  { sku: '250 ml x 24', units: 24, cartons: 3500, type: 'Pet Bottle', bottle: 0.34, cap: 0.15, label: 0.16, fill: 0, carton: 1.00, volume: 0.25 },
  { sku: '500 ml x 12', units: 12, cartons: 3500, type: 'Pet Bottle', bottle: 0.34, cap: 0.15, label: 0.16, fill: 0, carton: 1.00, volume: 0.50 },
  { sku: '750 ml x 12', units: 12, cartons: 2400, type: 'Pet Bottle', bottle: 0.37, cap: 0.15, label: 0.16, fill: 0, carton: 1.00, volume: 0.75 },
  { sku: '1 Ltr x 12',  units: 12, cartons: 2100, type: 'Pet Bottle', bottle: 0.38, cap: 0.15, label: 0.16, fill: 0, carton: 1.00, volume: 1.00 },
];

export const USA_BLEND_WITH_CAP_PACKING_RAW: RawPackRow[] = [
  { sku: '1 Ltr x 12', units: 12, cartons: 2150, type: 'Pet Bottle', bottle: 0.35, cap: 0.15, label: 0.16, fill: 0, carton: 0.90, volume: 1.0 },
  { sku: '2 Ltr x 6',  units: 6,  cartons: 2150, type: 'Pet Bottle', bottle: 0.78, cap: 0.15, label: 0.16, fill: 0, carton: 0.90, volume: 2.0 },
  { sku: '3 Ltr x 4',  units: 4,  cartons: 2150, type: 'Pet Bottle', bottle: 1.20, cap: 0.15, label: 0.16, fill: 0, carton: 0.90, volume: 3.0 },
];

export const USA_BLEND_NO_CAP_PACKING_RAW: RawPackRow[] = [
  { sku: '1 Ltr x 12', units: 12, cartons: 2150, type: 'Pet Bottle', bottle: 0.35, cap: 0.00, label: 0.16, fill: 0, carton: 0.90, volume: 1.0 },
  { sku: '2 Ltr x 6',  units: 6,  cartons: 2150, type: 'Pet Bottle', bottle: 0.78, cap: 0.00, label: 0.16, fill: 0, carton: 0.90, volume: 2.0 },
  { sku: '3 Ltr x 4',  units: 4,  cartons: 2150, type: 'Pet Bottle', bottle: 1.20, cap: 0.00, label: 0.16, fill: 0, carton: 0.90, volume: 3.0 },
];

export const USA_SEED_40OZ_050_PACKING_RAW: RawPackRow[] = [
  { sku: '32 Oz x 12',        units: 12, cartons: 2200, type: 'Pet Bottle', bottle: 0.45, cap: 0.10, label: 0.18, fill: 0, carton: 2.00, volume: 0.945 },
  { sku: '40 Oz x 12',        units: 12, cartons: 1950, type: 'Pet Bottle', bottle: 0.50, cap: 0.10, label: 0.18, fill: 0, carton: 2.00, volume: 1.18 },
  { sku: '96 Oz x 6',         units: 6,  cartons: 1550, type: 'HDPE Cane',  bottle: 0.65, cap: 0.10, label: 0.25, fill: 0, carton: 2.00, volume: 2.84 },
  { sku: '128 Oz x 4',        units: 4,  cartons: 1700, type: 'HDPE Cane',  bottle: 1.10, cap: 0.15, label: 0.30, fill: 0, carton: 2.00, volume: 3.785 },
  { sku: '32.5 LBS HDPE Jug', units: 1,  cartons: 1400, type: 'HDPE Cane',  bottle: 2.50, cap: 0.00, label: 0.25, fill: 0, carton: 1.00, volume: 16.20, weightG: 14742 },
  { sku: '35 LBS HDPE Jug',   units: 1,  cartons: 1300, type: 'HDPE Cane',  bottle: 2.50, cap: 0.00, label: 0.25, fill: 0, carton: 1.00, volume: 17.45, weightG: 15876 },
];

export const USA_SEED_40OZ_055_PACKING_RAW: RawPackRow[] = [
  { sku: '32 Oz x 12',        units: 12, cartons: 2200, type: 'Pet Bottle', bottle: 0.45, cap: 0.10, label: 0.18, fill: 0, carton: 2.00, volume: 0.945 },
  { sku: '40 Oz x 12',        units: 12, cartons: 1950, type: 'Pet Bottle', bottle: 0.55, cap: 0.10, label: 0.18, fill: 0, carton: 2.00, volume: 1.18 },
  { sku: '96 Oz x 6',         units: 6,  cartons: 1550, type: 'HDPE Cane',  bottle: 0.65, cap: 0.10, label: 0.25, fill: 0, carton: 2.00, volume: 2.84 },
  { sku: '128 Oz x 4',        units: 4,  cartons: 1700, type: 'HDPE Cane',  bottle: 1.10, cap: 0.15, label: 0.30, fill: 0, carton: 2.00, volume: 3.785 },
  { sku: '32.5 LBS HDPE Jug', units: 1,  cartons: 1400, type: 'HDPE Cane',  bottle: 2.50, cap: 0.00, label: 0.25, fill: 0, carton: 1.00, volume: 16.20, weightG: 14742 },
  { sku: '35 LBS HDPE Jug',   units: 1,  cartons: 1300, type: 'HDPE Cane',  bottle: 2.50, cap: 0.00, label: 0.25, fill: 0, carton: 1.00, volume: 17.45, weightG: 15876 },
];

export const USA_VEGETABLE_PACKING_RAW: RawPackRow[] = [
  { sku: '32 Oz x 12', units: 12, cartons: 2200, type: 'Pet Bottle', bottle: 0.45, cap: 0.10, label: 0.18, fill: 0, carton: 2.00, volume: 0.945 },
  { sku: '40 Oz x 12', units: 12, cartons: 1950, type: 'Pet Bottle', bottle: 0.55, cap: 0.10, label: 0.18, fill: 0, carton: 2.00, volume: 1.18 },
  { sku: '96 Oz x 6',  units: 6,  cartons: 1550, type: 'HDPE Cane',  bottle: 0.65, cap: 0.10, label: 0.25, fill: 0, carton: 2.00, volume: 2.84 },
  { sku: '128 Oz x 4', units: 4,  cartons: 1700, type: 'HDPE Cane',  bottle: 1.10, cap: 0.15, label: 0.30, fill: 0, carton: 2.00, volume: 3.785 },
];

export const USA_SUNFLOWER_PACKING_RAW: RawPackRow[] = [
  { sku: '32 Oz x 12',        units: 12, cartons: 2200, type: 'Pet Bottle', bottle: 0.45, cap: 0.10, label: 0.18, fill: 0, carton: 2.00, volume: 0.945 },
  { sku: '40 Oz x 12',        units: 12, cartons: 1950, type: 'Pet Bottle', bottle: 0.50, cap: 0.10, label: 0.18, fill: 0, carton: 2.00, volume: 1.18 },
  { sku: '96 Oz x 6',         units: 6,  cartons: 1550, type: 'HDPE Cane',  bottle: 0.65, cap: 0.10, label: 0.25, fill: 0, carton: 2.00, volume: 2.84 },
  { sku: '128 Oz x 4',        units: 4,  cartons: 1700, type: 'HDPE Cane',  bottle: 1.10, cap: 0.15, label: 0.30, fill: 0, carton: 2.00, volume: 3.785 },
  { sku: '1 Ltr x 12',        units: 12, cartons: 2100, type: 'Pet Bottle', bottle: 0.45, cap: 0.15, label: 0.18, fill: 0, carton: 2.00, volume: 1.00 },
  { sku: '2 Ltr x 6',         units: 6,  cartons: 2100, type: 'Pet Bottle', bottle: 1.05, cap: 0.15, label: 0.25, fill: 0, carton: 2.00, volume: 2.00 },
  { sku: '5 Ltr x 4',         units: 4,  cartons: 1350, type: 'Pet Bottle', bottle: 1.05, cap: 0.15, label: 0.30, fill: 0, carton: 2.00, volume: 5.00 },
  { sku: '32.5 LBS HDPE Jug', units: 1,  cartons: 1400, type: 'HDPE Cane',  bottle: 2.50, cap: 0.00, label: 0.25, fill: 0, carton: 1.00, volume: 16.20, weightG: 14742 },
  { sku: '35 LBS HDPE Jug',   units: 1,  cartons: 1300, type: 'HDPE Cane',  bottle: 2.50, cap: 0.00, label: 0.25, fill: 0, carton: 1.00, volume: 17.45, weightG: 15876 },
];

export const HONEY_MASTER_PACKING_RAW = [
  { sku: '30 ml (1 oz) Round Glass x 96', units: 96, cartons: 3500, type: 'GLASS', bottle: 3.7, cap: 1.7, label: 2.18, fill: 0, carton: 52.8, volume: 0.030, weightG: 30 },
  { sku: '50 ml (1.7 oz) Square Glass x 120', units: 120, cartons: 3500, type: 'GLASS', bottle: 3.75, cap: 1.9, label: 0.96, fill: 0, carton: 75.6, volume: 0.050, weightG: 50 },
  { sku: '80 ml (2.7 oz) Glass Tea Mug x 48', units: 48, cartons: 2500, type: 'GLASS', bottle: 6.1, cap: 1.83, label: 1.54, fill: 0.78, carton: 37.44, volume: 0.080, weightG: 80 },
  { sku: '125 ml (4.2 oz) Octa Glass x 24', units: 24, cartons: 2100, type: 'GLASS', bottle: 6.7, cap: 2.7, label: 1.36, fill: 0.18, carton: 47.52, volume: 0.125, weightG: 125 },
  { sku: '250 ml (8.45 oz) Octa Glass x 24', units: 24, cartons: 2100, type: 'GLASS', bottle: 9.5, cap: 2.7, label: 1.62, fill: 0.18, carton: 48.24, volume: 0.250, weightG: 250 },
  { sku: '500 ml (16.9 oz) Octa Glass x 12', units: 12, cartons: 1800, type: 'GLASS', bottle: 12.6, cap: 2.6, label: 2.55, fill: 0.23, carton: 38.4, volume: 0.500, weightG: 500 },
  { sku: '750 ml (25.4 oz) Octa Glass x 6', units: 6, cartons: 1350, type: 'GLASS', bottle: 24.0, cap: 2.6, label: 2.89, fill: 0.23, carton: 25.74, volume: 0.750, weightG: 750 },
  { sku: '1 L (33.8 oz) Octa Glass x 6', units: 6, cartons: 1350, type: 'GLASS', bottle: 35.0, cap: 2.6, label: 3.2, fill: 0, carton: 30.96, volume: 1.000, weightG: 1000 },
  { sku: '250 ml (8.45 oz) Square Glass x 24', units: 24, cartons: 2100, type: 'GLASS', bottle: 5.8, cap: 3.25, label: 3.46, fill: 0, carton: 48.24, volume: 0.250, weightG: 250 },
  { sku: '500 ml (16.9 oz) Square Glass x 12', units: 12, cartons: 1800, type: 'GLASS', bottle: 8.75, cap: 3.8, label: 4.32, fill: 0, carton: 38.4, volume: 0.500, weightG: 500 },
  { sku: '1 L (33.8 oz) Square Glass x 6', units: 6, cartons: 1350, type: 'GLASS', bottle: 15.7, cap: 4.2, label: 3.26, fill: 0, carton: 34.98, volume: 1.000, weightG: 1000 },
  { sku: '250 ml (8.45 oz) Hexa Glass x 24', units: 24, cartons: 2100, type: 'GLASS', bottle: 6.7, cap: 2.45, label: 3.46, fill: 0, carton: 68.4, volume: 0.250, weightG: 250 },
  { sku: '500 ml (16.9 oz) Hexa Glass x 12', units: 12, cartons: 1800, type: 'GLASS', bottle: 8.45, cap: 3.0, label: 2.89, fill: 0, carton: 37.68, volume: 0.500, weightG: 500 },
  { sku: '1 L (33.8 oz) Hexa Glass x 6', units: 6, cartons: 1350, type: 'GLASS', bottle: 18.0, cap: 4.6, label: 3.17, fill: 0, carton: 21.0, volume: 1.000, weightG: 1000 },
  { sku: '1 kg Clip Glass x 6', units: 6, cartons: 1200, type: 'GLASS', bottle: 77.0, cap: 0, label: 2.99, fill: 1.64, carton: 34.98, volume: 0.704, weightG: 1000 },
  { sku: '3 kg Clip Glass x 4', units: 4, cartons: 800, type: 'GLASS', bottle: 125.0, cap: 0, label: 6.18, fill: 0, carton: 57.48, volume: 2.112, weightG: 3000 },
  { sku: '250 ml (8.45 oz) Reverse Squeeze x 24', units: 24, cartons: 2100, type: 'PET', bottle: 3.94, cap: 4.89, label: 1.94, fill: 0, carton: 39.36, volume: 0.250, weightG: 250 },
  { sku: '400 ml (13.5 oz) Reverse Squeeze x 12', units: 12, cartons: 1800, type: 'PET', bottle: 4.98, cap: 4.89, label: 2.3, fill: 0, carton: 32.4, volume: 0.400, weightG: 400 },
  { sku: '500 ml (16.9 oz) Reverse Squeeze x 12', units: 12, cartons: 1800, type: 'PET', bottle: 5.3, cap: 4.89, label: 3.27, fill: 0, carton: 30.96, volume: 0.500, weightG: 500 },
  { sku: '750 ml (25.4 oz) Reverse Squeeze x 8', units: 8, cartons: 1350, type: 'PET', bottle: 8.8, cap: 4.89, label: 1.72, fill: 0, carton: 23.84, volume: 0.750, weightG: 750 },
  { sku: '125 ml (4.2 oz) Hexa Pet x 48', units: 48, cartons: 3500, type: 'PET', bottle: 2.76, cap: 1.46, label: 1.4, fill: 0, carton: 53.76, volume: 0.125, weightG: 125 },
  { sku: '250 ml (8.45 oz) Hexa Pet x 24', units: 24, cartons: 2100, type: 'PET', bottle: 4.32, cap: 2.14, label: 1.6, fill: 0, carton: 39.6, volume: 0.250, weightG: 250 },
  { sku: '500 ml (16.9 oz) Hexa Pet x 12', units: 12, cartons: 1800, type: 'PET', bottle: 5.8, cap: 2.88, label: 2.07, fill: 0, carton: 32.64, volume: 0.500, weightG: 500 },
  { sku: '1 L (33.8 oz) Hexa Pet x 6', units: 6, cartons: 1350, type: 'PET', bottle: 9.9, cap: 4.28, label: 3.22, fill: 0, carton: 30.96, volume: 1.000, weightG: 1000 },
  { sku: '2 L (67.6 oz) Pet Jar x 4', units: 4, cartons: 1000, type: 'PET', bottle: 13.05, cap: 4.0, label: 3.4, fill: 0, carton: 30.88, volume: 2.000, weightG: 2000 },
  { sku: '340 ml (11.5 oz) Pet Squeezy x 12', units: 12, cartons: 1800, type: 'PET', bottle: 4.88, cap: 2.12, label: 1.86, fill: 0.21, carton: 30.0, volume: 0.340, weightG: 340 },
  { sku: '227 ml (7.7 oz) Pet Dome Squeeze x 24', units: 24, cartons: 2100, type: 'PET', bottle: 3.41, cap: 1.97, label: 1.63, fill: 0.21, carton: 43.92, volume: 0.227, weightG: 227 },
  { sku: '400 ml (13.5 oz) Pet Dome Squeeze x 12', units: 12, cartons: 1800, type: 'PET', bottle: 4.7, cap: 2.12, label: 1.81, fill: 0.21, carton: 29.4, volume: 0.400, weightG: 400 },
  { sku: '500 ml (16.9 oz) Pet Dome Squeeze x 12', units: 12, cartons: 1800, type: 'PET', bottle: 5.38, cap: 2.12, label: 3.01, fill: 0, carton: 30.0, volume: 0.500, weightG: 500 },
  { sku: '340 ml (11.5 oz) Pet Teddy Bear x 12', units: 12, cartons: 1800, type: 'PET', bottle: 3.95, cap: 2.7, label: 1.9, fill: 0, carton: 21.72, volume: 0.340, weightG: 340 },
  { sku: '2.5 L (84.5 oz) Jerry Cane White x 4', units: 4, cartons: 1000, type: 'HDPE', bottle: 31.0, cap: 0.5, label: 4.1, fill: 0, carton: 37.84, volume: 2.500, weightG: 2500 },
  { sku: '3 L (101.4 oz) Jerry Cane White x 4', units: 4, cartons: 1000, type: 'HDPE', bottle: 40.0, cap: 0.5, label: 3.8, fill: 0, carton: 44.0, volume: 3.000, weightG: 3000 },
  { sku: '5 L (169 oz) Bucket with Handle x 2', units: 2, cartons: 750, type: 'HDPE', bottle: 61.0, cap: 0, label: 7.77, fill: 0, carton: 55.88, volume: 5.000, weightG: 5000 },
  { sku: '5 L (169 oz) Jerry Can Round x 2', units: 2, cartons: 750, type: 'HDPE', bottle: 51.0, cap: 3.7, label: 4.32, fill: 0, carton: 26.22, volume: 5.000, weightG: 5000 },
  { sku: '850 ml (28.7 oz) Tin Multicolor x 6', units: 6, cartons: 1350, type: 'TIN', bottle: 17.5, cap: 2.5, label: 0.3, fill: 0, carton: 40.14, volume: 0.850, weightG: 850 },
];

export function buildInitialPackingData(): Record<string, PackingSpec[]> {
  const result: Record<string, PackingSpec[]> = {};

  COMMODITY_KEYS.forEach((key, keyIdx) => {
    let template: RawPackRow[] = REFINED_SEED_PACKING_RAW;
    if (key === 'mustard' || key === 'peanut') {
      template = MUSTARD_PACKING_RAW;
    } else if (key === 'blended') {
      template = BLENDED_PACKING_RAW;
    } else if (key === 'olive_india' || key === 'avocado_india') {
      template = INDIA_EVOO_AVO_PACKING_RAW;
    } else if (key === 'usa_olive' || key === 'usa_avocado') {
      template = USA_PURE_OLIVE_AVO_PACKING_RAW;
    } else if (key === 'usa_blend_olive_canola') {
      template = USA_BLEND_WITH_CAP_PACKING_RAW;
    } else if (
      key === 'usa_blend_olive_soy' ||
      key === 'usa_blend_avo_canola' ||
      key === 'usa_blend_avo_soy'
    ) {
      template = USA_BLEND_NO_CAP_PACKING_RAW;
    } else if (key === 'usa_canola' || key === 'usa_corn') {
      template = USA_SEED_40OZ_050_PACKING_RAW;
    } else if (key === 'usa_soybean') {
      template = USA_SEED_40OZ_055_PACKING_RAW;
    } else if (key === 'usa_vegetable') {
      template = USA_VEGETABLE_PACKING_RAW;
    } else if (key === 'usa_sunflower') {
      template = USA_SUNFLOWER_PACKING_RAW;
    } else if (key === 'honey') {
      result[key] = HONEY_MASTER_PACKING_RAW.map((h, i) => ({
        id: 10000 + i,
        sku: h.sku,
        volume: h.volume,
        units: h.units,
        cartons: h.cartons,
        type: h.type,
        bottleCost: h.bottle,
        labelCost: h.label,
        capCost: h.cap,
        fillCost: h.fill || 0,
        cartonCost: h.carton,
        weightG: h.weightG,
        density: 1.42,
        hasPackingData: true,
      }));
      return;
    }

    const groupOffset = keyIdx * 1000;
    result[key] = template.map((def, i) => ({
      id: def.sku.charCodeAt(0) * 100 + i + groupOffset,
      sku: def.sku,
      volume: def.volume,
      units: def.units,
      cartons: def.cartons,
      type: def.type,
      bottleCost: def.bottle,
      labelCost: def.label,
      capCost: def.cap,
      fillCost: def.fill || 0,
      cartonCost: def.carton,
      weightG: def.weightG,
      density: 0.91,
      hasPackingData: true,
    }));
  });

  return result;
}
