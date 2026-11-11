import {
  PackingSpec,
  CommercialParams,
  MasterRowCalculation,
  ReverseCalculationResult,
  ReverseStep,
  PackingOrder,
  InventoryItem,
  MaterialKey,
  Commodity,
} from '../types';
import { COMMODITIES_CONFIG, KG_TO_LBS, getUnitsPerCase, PACKING_MATERIALS_LIST } from './constants';

export function fmt(v: number): number {
  return Math.round(v * 100) / 100;
}

export function fmtStr(v: number): string {
  return fmt(v).toFixed(2);
}

export function kgToLbs(kg: number): number {
  return fmt(kg * KG_TO_LBS);
}

export function roundUpToStep(value: number, step: number): number {
  if (step <= 0) return fmt(value);
  const rounded = Math.ceil(value / step) * step;
  return Math.round(rounded * 100) / 100;
}

export function formatVolume(ltr: number): string {
  const flOz = ltr * 33.814;
  const ml = ltr * 1000;
  if (ltr < 1) {
    return `${Math.round(ml)} ml (${fmt(flOz).toFixed(1)} fl oz)`;
  }
  return `${fmt(ltr).toFixed(2)} L (${fmt(flOz).toFixed(1)} fl oz)`;
}

export function formatVolumeShort(ltr: number): string {
  const flOz = ltr * 33.814;
  const ml = ltr * 1000;
  if (ltr < 1) {
    return `${Math.round(ml)} ml / ${fmt(flOz).toFixed(1)} oz`;
  }
  return `${fmt(ltr).toFixed(2)} L / ${fmt(flOz).toFixed(1)} oz`;
}

export function getDefaultTarePerUnit(type: string): number {
  const upper = (type || '').toUpperCase();
  if (upper.includes('GLASS')) return 0.22;
  if (upper.includes('HDPE')) return 0.08;
  if (upper.includes('TIN')) return 0.12;
  return 0.035;
}

export function calculateMasterRow(
  pkg: PackingSpec,
  pricePerKg: number,
  oilKey: string,
  params: CommercialParams,
  commoditiesMap: Record<string, Commodity> = COMMODITIES_CONFIG
): MasterRowCalculation {
  const oil = commoditiesMap[oilKey] || COMMODITIES_CONFIG[oilKey] || COMMODITIES_CONFIG['mustard'];
  const isUsaDirectPricelist = oil.originSection === 'usa' || oil.packingCurrency === 'USD';
  const packingCurrency: 'INR' | 'USD' = isUsaDirectPricelist ? 'USD' : 'INR';
  const isUSD = oil.currency === 'USD';
  const safeExUSD = Math.max(0.0001, params.exRateUSD);
  const priceINR = isUSD ? pricePerKg * safeExUSD : pricePerKg;
  const priceUSD = isUSD ? pricePerKg : pricePerKg / safeExUSD;

  const hasCustomUsdProd =
    pkg.customNetProductCostUSD !== null &&
    pkg.customNetProductCostUSD !== undefined &&
    !Number.isNaN(pkg.customNetProductCostUSD) &&
    pkg.customNetProductCostUSD >= 0;

  const hasCustomInrProd =
    pkg.customNetProductCostINR !== null &&
    pkg.customNetProductCostINR !== undefined &&
    !Number.isNaN(pkg.customNetProductCostINR) &&
    pkg.customNetProductCostINR >= 0;

  const isCustomNetProductCost = isUsaDirectPricelist
    ? hasCustomUsdProd || hasCustomInrProd
    : hasCustomInrProd;

  const hasPack =
    pkg.hasPackingData ||
    pkg.bottleCost > 0 ||
    pkg.labelCost > 0 ||
    pkg.capCost > 0 ||
    pkg.cartonCost > 0 ||
    pkg.fillCost > 0 ||
    isCustomNetProductCost ||
    (pkg.customPriceOverride !== null && pkg.customPriceOverride !== undefined && pkg.customPriceOverride > 0);

  const bottleCostCase = fmt(pkg.bottleCost);
  const labelCostCase = fmt(pkg.labelCost);
  const capCostCase = fmt(pkg.capCost);
  const fillCostCase = fmt(pkg.fillCost || 0);
  const cartonBoxCostCase = fmt(pkg.cartonCost);

  const autoNetWeightKg = fmt(
    pkg.weightG && pkg.weightG > 0
      ? (pkg.weightG / 1000) * pkg.units
      : pkg.volume * (pkg.density || oil.density || params.density) * pkg.units
  );

  const isCustomNetWeight =
    pkg.customNetWeightKg !== null &&
    pkg.customNetWeightKg !== undefined &&
    !Number.isNaN(pkg.customNetWeightKg) &&
    pkg.customNetWeightKg > 0;

  const netWeightKg = isCustomNetWeight ? fmt(pkg.customNetWeightKg as number) : autoNetWeightKg;
  const netWeightLbs = kgToLbs(netWeightKg);

  const curMult =
    params.quoteCur === 'CAD'
      ? safeExUSD / Math.max(0.0001, params.exRateCAD)
      : params.quoteCur === 'INR'
      ? safeExUSD
      : 1;

  // Adjust container cartons based on size
  let ctns = pkg.cartons || 2000;
  if (params.containerSize === '40GP') ctns = Math.max(1, Math.round(ctns * 0.95));
  else if (params.containerSize === '20GP') ctns = Math.max(1, Math.round(ctns * 0.45));

  const autoNetOilCostUSD = fmt(netWeightKg * priceUSD);
  const autoNetOilCostINR = fmt(netWeightKg * priceINR);

  let netOilCostUSD = autoNetOilCostUSD;
  let netOilCostINR = autoNetOilCostINR;
  let netOilCostQuoteCur = 0;
  let totalPackagingCostCartonUSD = 0;
  let totalPackagingCostCartonINR = 0;
  let totalPackagingCostCartonQuoteCur = 0;
  let domTransportINR = 0;
  let totalFobCostINR = 0;
  let netFobPriceQuoteCur = 0;
  let baseOceanUSD = 0;

  if (isUsaDirectPricelist) {
    netOilCostUSD = hasCustomUsdProd
      ? fmt(pkg.customNetProductCostUSD as number)
      : hasCustomInrProd
      ? fmt((pkg.customNetProductCostINR as number) / safeExUSD)
      : autoNetOilCostUSD;
    netOilCostINR = fmt(netOilCostUSD * safeExUSD);
    netOilCostQuoteCur = fmt(netOilCostUSD * curMult);

    totalPackagingCostCartonUSD = fmt(
      (pkg.bottleCost + pkg.labelCost + pkg.capCost + (pkg.fillCost || 0)) * pkg.units + pkg.cartonCost
    );
    totalPackagingCostCartonINR = fmt(totalPackagingCostCartonUSD * safeExUSD);
    totalPackagingCostCartonQuoteCur = fmt(totalPackagingCostCartonUSD * curMult);

    domTransportINR =
      pkg.customDomTransportINR !== null && pkg.customDomTransportINR !== undefined
        ? fmt(pkg.customDomTransportINR)
        : 0;
    const domTransQuoteCur = domTransportINR > 0 ? fmt((domTransportINR / safeExUSD) * curMult) : 0;

    totalFobCostINR = fmt(netOilCostINR + totalPackagingCostCartonINR + domTransportINR);
    netFobPriceQuoteCur = fmt(netOilCostQuoteCur + totalPackagingCostCartonQuoteCur + domTransQuoteCur);

    baseOceanUSD =
      pkg.customOceanFreightUSD !== null && pkg.customOceanFreightUSD !== undefined
        ? pkg.customOceanFreightUSD
        : 0;
  } else {
    netOilCostINR = hasCustomInrProd ? fmt(pkg.customNetProductCostINR as number) : autoNetOilCostINR;
    netOilCostUSD = fmt(netOilCostINR / safeExUSD);
    netOilCostQuoteCur = fmt(netOilCostINR / Math.max(0.0001, params.activeExRate));

    totalPackagingCostCartonINR = fmt(
      (pkg.bottleCost + pkg.labelCost + pkg.capCost + (pkg.fillCost || 0)) * pkg.units + pkg.cartonCost
    );
    totalPackagingCostCartonUSD = fmt(totalPackagingCostCartonINR / safeExUSD);
    totalPackagingCostCartonQuoteCur = fmt(
      totalPackagingCostCartonINR / Math.max(0.0001, params.activeExRate)
    );

    domTransportINR =
      pkg.customDomTransportINR !== null && pkg.customDomTransportINR !== undefined
        ? fmt(pkg.customDomTransportINR)
        : fmt(params.domesticFreight / ctns);

    totalFobCostINR = fmt(netOilCostINR + totalPackagingCostCartonINR + domTransportINR);
    netFobPriceQuoteCur = fmt(totalFobCostINR / Math.max(0.0001, params.activeExRate));

    baseOceanUSD =
      pkg.customOceanFreightUSD !== null && pkg.customOceanFreightUSD !== undefined
        ? pkg.customOceanFreightUSD
        : params.oceanFreight / ctns;
  }

  const oceanFreightQuoteCur = fmt(baseOceanUSD * curMult);
  const cifQuoteCur = fmt(netFobPriceQuoteCur + oceanFreightQuoteCur);

  let autoTrumpDutyQuoteCur = 0;
  if (!isUsaDirectPricelist && params.isUSA) {
    autoTrumpDutyQuoteCur = fmt(netFobPriceQuoteCur * (params.reciprocalDuty / 100));
  }
  const isCustomReciprocalDuty =
    pkg.customReciprocalDutyUSD !== null &&
    pkg.customReciprocalDutyUSD !== undefined &&
    !Number.isNaN(pkg.customReciprocalDutyUSD) &&
    pkg.customReciprocalDutyUSD >= 0;
  const trumpDutyQuoteCur = isCustomReciprocalDuty
    ? fmt((pkg.customReciprocalDutyUSD as number) * curMult)
    : autoTrumpDutyQuoteCur;

  // Option 1: Primary Basic Customs Duty (%, ¢/kg, or $/kg)
  let autoPrimaryBasicDutyQuoteCur = 0;
  if (!isUsaDirectPricelist) {
    if (params.dutyType === 'cents/kg') {
      const dutyINR = (params.basicDuty / 100) * netWeightKg * safeExUSD;
      autoPrimaryBasicDutyQuoteCur = fmt(dutyINR / Math.max(0.0001, params.activeExRate));
    } else if (params.dutyType === '$/kg') {
      const dutyINR = params.basicDuty * netWeightKg * safeExUSD;
      autoPrimaryBasicDutyQuoteCur = fmt(dutyINR / Math.max(0.0001, params.activeExRate));
    } else {
      autoPrimaryBasicDutyQuoteCur = fmt(netFobPriceQuoteCur * (params.basicDuty / 100));
    }
  }
  const isCustomBasicDuty1 =
    pkg.customBasicDuty1USD !== null &&
    pkg.customBasicDuty1USD !== undefined &&
    !Number.isNaN(pkg.customBasicDuty1USD) &&
    pkg.customBasicDuty1USD >= 0;
  const primaryBasicDutyQuoteCur = isCustomBasicDuty1
    ? fmt((pkg.customBasicDuty1USD as number) * curMult)
    : autoPrimaryBasicDutyQuoteCur;

  // Option 2: Second Basic Customs Duty — Per Kg ($/kg or ¢/kg)
  const rawPerKgDuty = Number(params.basicDutyPerKg) || 0;
  const perKgUnit = params.basicDutyPerKgUnit || '$/kg';
  let autoBasicDutyPerKgQuoteCur = 0;
  if (!isUsaDirectPricelist && rawPerKgDuty > 0) {
    const perKgUSD = perKgUnit === 'cents/kg' ? rawPerKgDuty / 100 : rawPerKgDuty;
    const perKgINR = perKgUSD * netWeightKg * safeExUSD;
    autoBasicDutyPerKgQuoteCur = fmt(perKgINR / Math.max(0.0001, params.activeExRate));
  }
  const isCustomBasicDuty2 =
    pkg.customBasicDuty2USD !== null &&
    pkg.customBasicDuty2USD !== undefined &&
    !Number.isNaN(pkg.customBasicDuty2USD) &&
    pkg.customBasicDuty2USD >= 0;
  const basicDutyPerKgQuoteCur = isCustomBasicDuty2
    ? fmt((pkg.customBasicDuty2USD as number) * curMult)
    : autoBasicDutyPerKgQuoteCur;

  const basicDutyQuoteCur = fmt(primaryBasicDutyQuoteCur + basicDutyPerKgQuoteCur);

  const autoOtherCustomEntryFeeQuoteCur = isUsaDirectPricelist
    ? 0
    : fmt(netFobPriceQuoteCur * params.entryFeePercent);
  const isCustomEntryFee =
    pkg.customEntryFeeUSD !== null &&
    pkg.customEntryFeeUSD !== undefined &&
    !Number.isNaN(pkg.customEntryFeeUSD) &&
    pkg.customEntryFeeUSD >= 0;
  const otherCustomEntryFeeQuoteCur = isCustomEntryFee
    ? fmt((pkg.customEntryFeeUSD as number) * curMult)
    : autoOtherCustomEntryFeeQuoteCur;

  const autoDrayageQuoteCur = isUsaDirectPricelist
    ? 0
    : fmt((params.inlandDrayage / ctns) * curMult);
  const isCustomDrayage =
    pkg.customDrayageUSD !== null &&
    pkg.customDrayageUSD !== undefined &&
    !Number.isNaN(pkg.customDrayageUSD) &&
    pkg.customDrayageUSD >= 0;
  const drayageQuoteCur = isCustomDrayage
    ? fmt((pkg.customDrayageUSD as number) * curMult)
    : autoDrayageQuoteCur;

  const autoDutiesEntryDrayageQuoteCur = fmt(
    autoTrumpDutyQuoteCur +
      autoPrimaryBasicDutyQuoteCur +
      autoBasicDutyPerKgQuoteCur +
      autoOtherCustomEntryFeeQuoteCur +
      autoDrayageQuoteCur
  );
  const totalDutiesEntryDrayageQuoteCur = fmt(
    trumpDutyQuoteCur + basicDutyQuoteCur + otherCustomEntryFeeQuoteCur + drayageQuoteCur
  );
  const hasAnyDutyDrayageOverride =
    isCustomReciprocalDuty ||
    isCustomBasicDuty1 ||
    isCustomBasicDuty2 ||
    isCustomEntryFee ||
    isCustomDrayage;

  const subtotalLandedCostQuoteCur = fmt(cifQuoteCur + totalDutiesEntryDrayageQuoteCur);

  let quoteBaseQuoteCur = subtotalLandedCostQuoteCur;
  if (isUsaDirectPricelist) {
    quoteBaseQuoteCur = subtotalLandedCostQuoteCur;
  } else if (params.incoterm === 'EXW') {
    quoteBaseQuoteCur = fmt((netOilCostINR + totalPackagingCostCartonINR) / Math.max(0.0001, params.activeExRate));
  } else if (params.incoterm === 'FOB') {
    quoteBaseQuoteCur = netFobPriceQuoteCur;
  } else if (params.incoterm === 'CIF') {
    quoteBaseQuoteCur = cifQuoteCur;
  }

  const profitMarkupQuoteCur = fmt(quoteBaseQuoteCur * (params.profitMargin / 100));
  const finalPriceQuoteCur = fmt(quoteBaseQuoteCur + profitMarkupQuoteCur);
  const calculatedRoundedPrice = roundUpToStep(finalPriceQuoteCur, params.roundingStep);

  const isCustomPriceOverridden =
    pkg.customPriceOverride !== null &&
    pkg.customPriceOverride !== undefined &&
    !Number.isNaN(pkg.customPriceOverride) &&
    pkg.customPriceOverride > 0;

  const roundedQuotePrice = isCustomPriceOverridden
    ? fmt(pkg.customPriceOverride as number)
    : calculatedRoundedPrice;

  const tarePerUnit =
    pkg.tarePerUnitKg !== undefined && pkg.tarePerUnitKg >= 0
      ? pkg.tarePerUnitKg
      : getDefaultTarePerUnit(pkg.type);
  const cartonTare = pkg.cartonTareKg !== undefined && pkg.cartonTareKg >= 0 ? pkg.cartonTareKg : 0.65;

  const autoGrossWeightKg = fmt(netWeightKg + tarePerUnit * pkg.units + cartonTare);
  const isCustomGrossWeight =
    pkg.customGrossWeightKg !== null &&
    pkg.customGrossWeightKg !== undefined &&
    !Number.isNaN(pkg.customGrossWeightKg) &&
    pkg.customGrossWeightKg > 0;

  const grossWeight = isCustomGrossWeight
    ? fmt(pkg.customGrossWeightKg as number)
    : autoGrossWeightKg;

  const grossWeightLbs = kgToLbs(grossWeight);

  const totalUnits = ctns * pkg.units;
  const totalVolumeLtr = fmt(ctns * pkg.volume * pkg.units);
  const totalWeightKg = fmt(ctns * grossWeight);
  const totalWeightLbs = kgToLbs(totalWeightKg);

  return {
    id: pkg.id,
    sku: pkg.sku,
    volume: pkg.volume,
    units: pkg.units,
    type: pkg.type,
    oilKey,
    oilLabel: oil.label,
    isUsaDirectPricelist,
    packingCurrency,
    autoNetWeightKg,
    netWeightKg,
    netWeightLbs,
    autoGrossWeightKg,
    grossWeight,
    grossWeightLbs,
    isCustomNetWeight,
    isCustomGrossWeight,
    cartonsPerContainer: ctns,
    totalUnits,
    totalVolume: totalVolumeLtr,
    totalWeight: totalWeightKg,
    totalWeightLbs,
    bottleCostCase,
    labelCostCase,
    capCostCase,
    fillCostCase,
    cartonBoxCostCase,
    autoNetOilCostINR,
    netOilCostINR,
    autoNetOilCostUSD,
    netOilCostUSD,
    netOilCostQuoteCur,
    isCustomNetProductCost,
    totalPackagingCostCartonINR,
    totalPackagingCostCartonUSD,
    totalPackagingCostCartonQuoteCur,
    domTransportINR,
    totalFobCostINR,
    netFobPriceQuoteCur,
    oceanFreightQuoteCur,
    cifQuoteCur,
    autoTrumpDutyQuoteCur,
    trumpDutyQuoteCur,
    isCustomReciprocalDuty,
    autoPrimaryBasicDutyQuoteCur,
    primaryBasicDutyQuoteCur,
    isCustomBasicDuty1,
    autoBasicDutyPerKgQuoteCur,
    basicDutyPerKgQuoteCur,
    isCustomBasicDuty2,
    basicDutyQuoteCur,
    autoOtherCustomEntryFeeQuoteCur,
    otherCustomEntryFeeQuoteCur,
    isCustomEntryFee,
    autoDrayageQuoteCur,
    drayageQuoteCur,
    isCustomDrayage,
    autoDutiesEntryDrayageQuoteCur,
    totalDutiesEntryDrayageQuoteCur,
    hasAnyDutyDrayageOverride,
    subtotalLandedCostQuoteCur,
    profitMarkupQuoteCur,
    finalPriceQuoteCur,
    calculatedRoundedPrice,
    roundedQuotePrice,
    isCustomPriceOverridden,
    hasPackingData: hasPack,
    curSymbol: params.curSymbol,
  };
}

export function reverseCalculate(
  targetPrice: number,
  skuRow: PackingSpec,
  commodityKey: string,
  catalogBulkPrice: number,
  bulkOverride: number | null,
  params: CommercialParams,
  profitTargetPct: number,
  commoditiesMap: Record<string, Commodity> = COMMODITIES_CONFIG
): ReverseCalculationResult {
  const oil = commoditiesMap[commodityKey] || COMMODITIES_CONFIG[commodityKey] || COMMODITIES_CONFIG['mustard'];
  const isUsaDirectPricelist = oil.originSection === 'usa' || oil.packingCurrency === 'USD';
  const safeExUSD = Math.max(0.0001, params.exRateUSD);
  const actualBulkPrice = bulkOverride !== null && bulkOverride > 0 ? bulkOverride : catalogBulkPrice;

  const netWeightKg =
    skuRow.customNetWeightKg && skuRow.customNetWeightKg > 0
      ? skuRow.customNetWeightKg
      : skuRow.weightG
      ? (skuRow.weightG / 1000) * skuRow.units
      : skuRow.volume * (skuRow.density || oil.density || 0.91) * skuRow.units;
  const netWeightKgF = fmt(Math.max(0.01, netWeightKg));

  const curMult =
    params.quoteCur === 'CAD'
      ? safeExUSD / Math.max(0.0001, params.exRateCAD)
      : params.quoteCur === 'INR'
      ? safeExUSD
      : 1;

  if (isUsaDirectPricelist) {
    const actualBulkUSD = oil.currency === 'USD' ? actualBulkPrice : actualBulkPrice / safeExUSD;
    const catalogBulkUSD = oil.currency === 'USD' ? catalogBulkPrice : catalogBulkPrice / safeExUSD;

    const hasSkuNetUsdOvr =
      (bulkOverride === null || bulkOverride <= 0) &&
      skuRow.customNetProductCostUSD !== null &&
      skuRow.customNetProductCostUSD !== undefined &&
      !Number.isNaN(skuRow.customNetProductCostUSD) &&
      skuRow.customNetProductCostUSD >= 0;

    const effectiveActualRateUSD = hasSkuNetUsdOvr
      ? fmt((skuRow.customNetProductCostUSD as number) / netWeightKgF)
      : fmt(actualBulkUSD);

    const packingUSD = fmt(
      (skuRow.bottleCost + skuRow.labelCost + skuRow.capCost + (skuRow.fillCost || 0)) * skuRow.units +
        skuRow.cartonCost
    );

    const steps: ReverseStep[] = [];
    steps.push({
      step: 1,
      label: "Client's Target Price per Carton",
      value: targetPrice,
      cur: params.curSymbol,
      isPrice: true,
    });

    const baseBeforeProfit = fmt(targetPrice / (1 + profitTargetPct / 100));
    steps.push({
      step: 2,
      label: `Remove Target Profit (${fmtStr(profitTargetPct)}%)`,
      value: -fmt(targetPrice - baseBeforeProfit),
      cur: params.curSymbol,
      sub: `Base before profit: ${params.curSymbol}${fmtStr(baseBeforeProfit)}`,
    });

    const baseUSD = fmt(baseBeforeProfit / Math.max(0.0001, curMult));
    if (params.quoteCur !== 'USD') {
      steps.push({
        step: 3,
        label: `Convert Base to USD`,
        value: baseUSD,
        cur: '$',
        isTotal: true,
      });
    }

    steps.push({
      step: steps.length + 1,
      label: 'Remove USA Packaging Cost',
      value: -packingUSD,
      cur: '$',
    });

    const maxBulkCostUSD = fmt(baseUSD - packingUSD);
    const maxBulkPricePerKg = fmt(maxBulkCostUSD / netWeightKgF);

    steps.push({
      step: steps.length + 1,
      label: `÷ Net Product Weight (${fmtStr(netWeightKgF)} kg) → Max Bulk Price`,
      value: maxBulkPricePerKg,
      cur: '$/kg',
      isFinal: true,
    });

    const profitPerKgReal = fmt(maxBulkPricePerKg - effectiveActualRateUSD);
    const profitPerCarton = fmt(profitPerKgReal * netWeightKgF);
    const profitPct =
      effectiveActualRateUSD > 0 ? fmt((profitPerKgReal / effectiveActualRateUSD) * 100) : 0;

    let verdict: 'accept' | 'caution' | 'reject' = 'reject';
    if (profitPct >= 10) verdict = 'accept';
    else if (profitPct >= 4) verdict = 'caution';

    const forwardCalc = calculateMasterRow(
      { ...skuRow, customPriceOverride: null },
      actualBulkPrice,
      commodityKey,
      { ...params, profitMargin: profitTargetPct },
      commoditiesMap
    );

    return {
      targetPrice,
      baseBeforeProfit,
      maxBulkPricePerKg,
      actualBulkPrice: effectiveActualRateUSD,
      catalogBulkPrice: fmt(catalogBulkUSD),
      profitPerKg: profitPerKgReal,
      profitPerCarton,
      profitPct,
      verdict,
      minAcceptablePrice: forwardCalc.calculatedRoundedPrice,
      netWeightKg: netWeightKgF,
      packingINR: fmt(packingUSD * safeExUSD),
      domTransportINR: 0,
      fob: baseBeforeProfit,
      fobINR: fmt(baseUSD * safeExUSD),
      steps,
      sku: skuRow.sku,
      skuId: skuRow.id,
      commodityKey,
      commodityLabel: oil.label,
      volume: skuRow.volume,
      units: skuRow.units,
      bulkCurrencySymbol: '$',
    };
  }

  const priceINR_actual = oil.currency === 'USD' ? actualBulkPrice * safeExUSD : actualBulkPrice;
  const priceINR_catalog = oil.currency === 'USD' ? catalogBulkPrice * safeExUSD : catalogBulkPrice;

  const hasSkuNetCostOvr =
    (bulkOverride === null || bulkOverride <= 0) &&
    skuRow.customNetProductCostINR !== null &&
    skuRow.customNetProductCostINR !== undefined &&
    !Number.isNaN(skuRow.customNetProductCostINR) &&
    skuRow.customNetProductCostINR >= 0;

  const effectiveActualRateINR = hasSkuNetCostOvr
    ? fmt((skuRow.customNetProductCostINR as number) / netWeightKgF)
    : priceINR_actual;

  const packingINR = fmt(
    (skuRow.bottleCost + skuRow.labelCost + skuRow.capCost + (skuRow.fillCost || 0)) * skuRow.units + skuRow.cartonCost
  );

  let ctns = skuRow.cartons || 2000;
  if (params.containerSize === '40GP') ctns = Math.max(1, Math.round(ctns * 0.95));
  else if (params.containerSize === '20GP') ctns = Math.max(1, Math.round(ctns * 0.45));

  const domTransportINR =
    skuRow.customDomTransportINR !== null && skuRow.customDomTransportINR !== undefined
      ? fmt(skuRow.customDomTransportINR)
      : fmt(params.domesticFreight / ctns);

  const steps: ReverseStep[] = [];
  steps.push({
    step: 1,
    label: "Client's Target Price per Carton",
    value: targetPrice,
    cur: params.curSymbol,
    isPrice: true,
  });

  const baseBeforeProfit = fmt(targetPrice / (1 + profitTargetPct / 100));
  steps.push({
    step: 2,
    label: `Remove Target Profit (${fmtStr(profitTargetPct)}%)`,
    value: -fmt(targetPrice - baseBeforeProfit),
    cur: params.curSymbol,
    sub: `Base before profit: ${params.curSymbol}${fmtStr(baseBeforeProfit)}`,
  });

  let fobQuoteCur = 0;

  if (params.incoterm === 'DDP') {
    const drayageQuoteCur =
      skuRow.customDrayageUSD !== null &&
      skuRow.customDrayageUSD !== undefined &&
      !Number.isNaN(skuRow.customDrayageUSD) &&
      skuRow.customDrayageUSD >= 0
        ? fmt(skuRow.customDrayageUSD * curMult)
        : fmt((params.inlandDrayage / ctns) * curMult);
    steps.push({ step: 3, label: 'Remove Destination Drayage', value: -drayageQuoteCur, cur: params.curSymbol });

    const afterDrayage = fmt(baseBeforeProfit - drayageQuoteCur);
    const oFreightQuoteCur =
      skuRow.customOceanFreightUSD !== null &&
      skuRow.customOceanFreightUSD !== undefined &&
      !Number.isNaN(skuRow.customOceanFreightUSD) &&
      skuRow.customOceanFreightUSD >= 0
        ? fmt(skuRow.customOceanFreightUSD * curMult)
        : fmt((params.oceanFreight / ctns) * curMult);
    const hasCustomRecip =
      skuRow.customReciprocalDutyUSD !== null &&
      skuRow.customReciprocalDutyUSD !== undefined &&
      !Number.isNaN(skuRow.customReciprocalDutyUSD) &&
      skuRow.customReciprocalDutyUSD >= 0;
    const hasCustomBasic1 =
      skuRow.customBasicDuty1USD !== null &&
      skuRow.customBasicDuty1USD !== undefined &&
      !Number.isNaN(skuRow.customBasicDuty1USD) &&
      skuRow.customBasicDuty1USD >= 0;
    const hasCustomEntry =
      skuRow.customEntryFeeUSD !== null &&
      skuRow.customEntryFeeUSD !== undefined &&
      !Number.isNaN(skuRow.customEntryFeeUSD) &&
      skuRow.customEntryFeeUSD >= 0;

    const hasCustomBasic2 =
      skuRow.customBasicDuty2USD !== null &&
      skuRow.customBasicDuty2USD !== undefined &&
      !Number.isNaN(skuRow.customBasicDuty2USD) &&
      skuRow.customBasicDuty2USD >= 0;

    const recipPct = hasCustomRecip ? 0 : params.isUSA ? params.reciprocalDuty / 100 : 0;
    const basicPct = hasCustomBasic1 ? 0 : params.dutyType === '%' ? params.basicDuty / 100 : 0;
    const entryPct = hasCustomEntry ? 0 : params.entryFeePercent;

    // Primary per-kg duty (if primary dutyType is cents/kg or $/kg, or overridden)
    const primaryPerKgUSD =
      params.dutyType === 'cents/kg'
        ? params.basicDuty / 100
        : params.dutyType === '$/kg'
        ? params.basicDuty
        : 0;
    const primaryPerKgINR = primaryPerKgUSD > 0 ? primaryPerKgUSD * netWeightKgF * safeExUSD : 0;
    const autoPrimaryPerKgQuoteCur =
      primaryPerKgINR > 0 ? fmt(primaryPerKgINR / Math.max(0.0001, params.activeExRate)) : 0;
    const fixedBasic1QuoteCur = hasCustomBasic1
      ? fmt((skuRow.customBasicDuty1USD as number) * curMult)
      : params.dutyType === '%'
      ? 0
      : autoPrimaryPerKgQuoteCur;

    // Second Basic Customs Duty (Per Kg)
    const rawPerKg2 = Number(params.basicDutyPerKg) || 0;
    const perKg2Unit = params.basicDutyPerKgUnit || '$/kg';
    const secondPerKgUSD = rawPerKg2 > 0 ? (perKg2Unit === 'cents/kg' ? rawPerKg2 / 100 : rawPerKg2) : 0;
    const secondPerKgINR = secondPerKgUSD > 0 ? secondPerKgUSD * netWeightKgF * safeExUSD : 0;
    const secondPerKgQuoteCur = hasCustomBasic2
      ? fmt((skuRow.customBasicDuty2USD as number) * curMult)
      : secondPerKgINR > 0
      ? fmt(secondPerKgINR / Math.max(0.0001, params.activeExRate))
      : 0;

    const fixedRecipQuoteCur = hasCustomRecip
      ? fmt((skuRow.customReciprocalDutyUSD as number) * curMult)
      : 0;
    const fixedEntryQuoteCur = hasCustomEntry
      ? fmt((skuRow.customEntryFeeUSD as number) * curMult)
      : 0;

    const totalFixedDutiesQuoteCur = fmt(
      fixedBasic1QuoteCur + secondPerKgQuoteCur + fixedRecipQuoteCur + fixedEntryQuoteCur
    );

    const denom = 1 + entryPct + basicPct + recipPct;
    fobQuoteCur = fmt((afterDrayage - oFreightQuoteCur - totalFixedDutiesQuoteCur) / denom);

    const entryFeeQuoteCur = hasCustomEntry ? fixedEntryQuoteCur : fmt(fobQuoteCur * entryPct);
    const recipDutyQuoteCur = hasCustomRecip ? fixedRecipQuoteCur : fmt(fobQuoteCur * recipPct);
    const primaryBasicDutyQuoteCur = hasCustomBasic1
      ? fixedBasic1QuoteCur
      : params.dutyType === '%'
      ? fmt(fobQuoteCur * basicPct)
      : autoPrimaryPerKgQuoteCur;

    steps.push({ step: 4, label: 'Remove Custom Entry Fee', value: -entryFeeQuoteCur, cur: params.curSymbol });
    if (params.isUSA || hasCustomRecip) {
      steps.push({
        step: 5,
        label: hasCustomRecip
          ? 'Remove Reciprocal Duty (Custom Ovr)'
          : `Remove Reciprocal Duty (${fmtStr(params.reciprocalDuty)}%)`,
        value: -recipDutyQuoteCur,
        cur: params.curSymbol,
      });
    }
    const primaryBasisLabel = hasCustomBasic1
      ? 'Custom Ovr'
      : params.dutyType === 'cents/kg'
      ? `${fmtStr(params.basicDuty)}¢/kg`
      : params.dutyType === '$/kg'
      ? `$${fmtStr(params.basicDuty)}/kg`
      : `${fmtStr(params.basicDuty)}%`;
    const perKg2Label = hasCustomBasic2
      ? ' + Duty 2 Ovr'
      : rawPerKg2 > 0
      ? ` + ${perKg2Unit === 'cents/kg' ? `${fmtStr(rawPerKg2)}¢/kg` : `$${fmtStr(rawPerKg2)}/kg`}`
      : '';
    steps.push({
      step: 6,
      label: `Remove Basic Customs Duty (${primaryBasisLabel}${perKg2Label})`,
      value: -fmt(primaryBasicDutyQuoteCur + secondPerKgQuoteCur),
      cur: params.curSymbol,
    });

    steps.push({ step: 7, label: 'Remove Ocean Freight', value: -oFreightQuoteCur, cur: params.curSymbol });
  } else if (params.incoterm === 'CIF') {
    const oFreightQuoteCur = fmt((params.oceanFreight / ctns) * curMult);
    steps.push({ step: 3, label: 'Remove Ocean Freight', value: -oFreightQuoteCur, cur: params.curSymbol });
    fobQuoteCur = fmt(baseBeforeProfit - oFreightQuoteCur);
  } else {
    fobQuoteCur = baseBeforeProfit;
  }

  const fobINR = fmt(fobQuoteCur * params.activeExRate);
  steps.push({
    step: 8,
    label: `Convert FOB to INR (× ${fmtStr(params.activeExRate)})`,
    value: fobINR,
    cur: '₹',
    isTotal: true,
  });

  steps.push({ step: 9, label: 'Remove Packaging Cost', value: -packingINR, cur: '₹' });
  const afterPack = fmt(fobINR - packingINR);

  steps.push({ step: 10, label: 'Remove Domestic Transport', value: -domTransportINR, cur: '₹' });
  const maxBulkCostINR = fmt(afterPack - domTransportINR);
  const maxBulkPricePerKg = fmt(maxBulkCostINR / netWeightKgF);

  steps.push({
    step: 11,
    label: `÷ Net Product Weight (${fmtStr(netWeightKgF)} kg) → Max Bulk Price`,
    value: maxBulkPricePerKg,
    cur: '₹/kg',
    isFinal: true,
  });

  const profitPerKgReal = fmt(maxBulkPricePerKg - effectiveActualRateINR);
  const profitPerCarton = fmt(profitPerKgReal * netWeightKgF);
  const profitPct = effectiveActualRateINR > 0 ? fmt((profitPerKgReal / effectiveActualRateINR) * 100) : 0;

  let verdict: 'accept' | 'caution' | 'reject' = 'reject';
  if (profitPct >= 10) verdict = 'accept';
  else if (profitPct >= 4) verdict = 'caution';

  const forwardCalc = calculateMasterRow(
    { ...skuRow, customPriceOverride: null },
    actualBulkPrice,
    commodityKey,
    { ...params, profitMargin: profitTargetPct },
    commoditiesMap
  );
  const minAcceptable = forwardCalc.calculatedRoundedPrice;

  return {
    targetPrice,
    baseBeforeProfit,
    maxBulkPricePerKg,
    actualBulkPrice: effectiveActualRateINR,
    catalogBulkPrice: priceINR_catalog,
    profitPerKg: profitPerKgReal,
    profitPerCarton,
    profitPct,
    verdict,
    minAcceptablePrice: minAcceptable,
    netWeightKg: netWeightKgF,
    packingINR,
    domTransportINR,
    fob: fobQuoteCur,
    fobINR,
    steps,
    sku: skuRow.sku,
    skuId: skuRow.id,
    commodityKey,
    commodityLabel: oil.label,
    volume: skuRow.volume,
    units: skuRow.units,
    bulkCurrencySymbol: '₹',
  };
}

export function computeWaterfallAvailability(
  orders: PackingOrder[],
  inventory: InventoryItem[]
): Record<string, Record<MaterialKey, { req: number; stock: number; isReady: boolean; isNA: boolean }>> {
  const ledger: Record<MaterialKey, number> = {
    preform: 0,
    bottle: 0,
    cap: 0,
    wad: 0,
    cst: 0,
    carton: 0,
    label: 0,
    pallet: 0,
  };

  inventory.forEach(item => {
    if (item.materialType !== 'none' && item.quantity > 0) {
      ledger[item.materialType] = (ledger[item.materialType] || 0) + item.quantity;
    }
  });

  const availabilityMap: Record<string, Record<MaterialKey, { req: number; stock: number; isReady: boolean; isNA: boolean }>> = {};

  orders.forEach(order => {
    const orderAvail: Record<MaterialKey, { req: number; stock: number; isReady: boolean; isNA: boolean }> = {} as never;
    const cases = Number(order.qty) || 0;
    const unitsPerCase = getUnitsPerCase(order.sku);
    const requiredPieces = cases * unitsPerCase;

    PACKING_MATERIALS_LIST.forEach(pm => {
      const curEntry = order.materials?.[pm.key];
      const curStatus = curEntry?.status || 'notstarted';

      if (curStatus === 'na') {
        orderAvail[pm.key] = { req: 0, stock: 0, isReady: false, isNA: true };
        return;
      }

      let reqQty = requiredPieces;
      if (pm.key === 'carton') reqQty = cases;
      else if (pm.key === 'pallet') reqQty = Math.ceil(cases / 50);

      const manuallyFulfilled = ['received', 'approved', 'available'].includes(curStatus);
      const currentStock = ledger[pm.key] || 0;

      ledger[pm.key] -= reqQty;

      const isReady = manuallyFulfilled || currentStock >= reqQty;
      orderAvail[pm.key] = {
        req: reqQty,
        stock: currentStock,
        isReady,
        isNA: false,
      };
    });

    availabilityMap[order.id] = orderAvail;
  });

  return availabilityMap;
}

export function computePMProgress(order: PackingOrder): {
  pct: number;
  done: number;
  total: number;
  pendingMaterials: string[];
  isComplete: boolean;
} {
  let done = 0;
  let total = 0;
  const pending: string[] = [];

  PACKING_MATERIALS_LIST.forEach(pm => {
    const st = order.materials?.[pm.key]?.status || 'notstarted';
    if (st === 'na') return;
    total++;
    if (['available', 'received', 'approved'].includes(st)) {
      done++;
    } else {
      pending.push(pm.label);
    }
  });

  const pct = total > 0 ? Math.round((done / total) * 100) : 100;
  return {
    pct,
    done,
    total,
    pendingMaterials: pending,
    isComplete: pending.length === 0 && total > 0,
  };
}
