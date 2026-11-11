import React, { useState } from 'react';
import { SavedProformaInvoice, ProformaItem, ProformaExtraRow } from '../types';
import {
  DEFAULT_BANK_DETAILS_TEXT,
  DEFAULT_PO_SELLER_CONFIG,
  GLOBAL_FUTURA_LOGO_PATH,
  GLOBAL_FUTURA_STAMP_PATH,
  formatPoProductDescription,
} from '../utils/constants';
import { fmt, fmtStr } from '../utils/calculations';
import { Plus, Trash2 } from 'lucide-react';

interface ProformaTemplateDocumentProps {
  invoice: SavedProformaInvoice;
  editable?: boolean;
  onChange?: (updated: SavedProformaInvoice) => void;
  minRows?: number;
}

export const ProformaTemplateDocument: React.FC<ProformaTemplateDocumentProps> = ({
  invoice,
  editable = false,
  onChange,
  minRows = 8,
}) => {
  const [logoErr, setLogoErr] = useState(false);
  const [stampErr, setStampErr] = useState(false);

  const curSymbol = invoice.curSymbol || '$';
  const documentTitle = invoice.documentTitle ?? DEFAULT_PO_SELLER_CONFIG.documentTitle;
  const companyAddress = invoice.companyAddress ?? DEFAULT_PO_SELLER_CONFIG.companyAddress;
  const companyPhone = invoice.companyPhone ?? DEFAULT_PO_SELLER_CONFIG.companyPhone;
  const companyEmail = invoice.companyEmail ?? DEFAULT_PO_SELLER_CONFIG.companyEmail;
  const companyTaxIdLabel = invoice.companyTaxIdLabel ?? DEFAULT_PO_SELLER_CONFIG.companyTaxIdLabel;
  const companyTaxId = invoice.companyTaxId ?? DEFAULT_PO_SELLER_CONFIG.companyTaxId;

  const shipToName = invoice.shipToName !== undefined ? invoice.shipToName : invoice.buyerName;
  const shipToAddress = invoice.shipToAddress !== undefined ? invoice.shipToAddress : invoice.buyerAddress;
  const shipToAttention = invoice.shipToAttention !== undefined ? invoice.shipToAttention : invoice.buyerAttention;

  const noteHeader = invoice.noteHeader ?? DEFAULT_PO_SELLER_CONFIG.noteHeader;
  const bankDetailsText = invoice.bankDetailsText ?? DEFAULT_BANK_DETAILS_TEXT;
  const signatoryLabel = invoice.signatoryLabel ?? DEFAULT_PO_SELLER_CONFIG.signatoryLabel;
  const showStamp = invoice.showStamp !== undefined ? invoice.showStamp : true;
  const logoUrl = invoice.customLogoUrl || GLOBAL_FUTURA_LOGO_PATH;

  const items = invoice.items || [];
  const extraSummaryRows = invoice.extraSummaryRows || [];

  const updateField = <K extends keyof SavedProformaInvoice>(field: K, value: SavedProformaInvoice[K]) => {
    if (!onChange) return;
    onChange({ ...invoice, [field]: value });
  };

  const recalcInvoiceWithItems = (nextItems: ProformaItem[], nextExtras: ProformaExtraRow[] = extraSummaryRows) => {
    if (!onChange) return;
    const totalQty = nextItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
    const subTotal = fmt(nextItems.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0));
    const extrasDelta = fmt(nextExtras.reduce((sum, ex) => sum + (Number(ex.numericAmount) || 0), 0));
    const totalUSD = fmt(subTotal + extrasDelta);
    const totalINR = fmt(totalUSD * (invoice.activeExRate || 95.5));
    onChange({
      ...invoice,
      items: nextItems,
      extraSummaryRows: nextExtras,
      subTotal,
      totalQty,
      totalUSD,
      totalINR,
    });
  };

  const handleUpdateItem = (idx: number, patch: Partial<ProformaItem>) => {
    const nextItems = items.map((item, i) => {
      if (i !== idx) return item;
      const merged = { ...item, ...patch };
      if (patch.qty !== undefined || patch.unitPrice !== undefined) {
        merged.lineTotal = fmt((Number(merged.qty) || 0) * (Number(merged.unitPrice) || 0));
      }
      return merged;
    });
    recalcInvoiceWithItems(nextItems);
  };

  const handleAddBlankRow = () => {
    const newItem: ProformaItem = {
      id: Date.now(),
      srNo: items.length + 1,
      skuId: 0,
      oilKey: 'custom',
      oilLabel: 'Custom Item',
      sku: 'Custom Pack',
      customDescription: 'Product Description ( Pack Size X Units )',
      volume: 1,
      units: 12,
      qty: 100,
      unitPrice: 0,
      lineTotal: 0,
      grossWeight: 12,
      grossWeightLbs: 26.46,
      netWeightKg: 10.92,
      netWeightLbs: 24.07,
    };
    recalcInvoiceWithItems([...items, newItem]);
  };

  const handleRemoveItem = (idx: number) => {
    const nextItems = items.filter((_, i) => i !== idx);
    recalcInvoiceWithItems(nextItems);
  };

  const handleUpdateExtraRow = (rowIdx: number, patch: Partial<ProformaExtraRow>) => {
    const padded: ProformaExtraRow[] = Array.from({ length: Math.max(7, extraSummaryRows.length) }, (_, i) => {
      return (
        extraSummaryRows[i] || {
          id: `extra-${i}`,
          label: '',
          valueText: '',
          numericAmount: 0,
        }
      );
    });
    padded[rowIdx] = { ...padded[rowIdx], ...patch };
    recalcInvoiceWithItems(items, padded);
  };

  const computedSubTotal =
    invoice.subTotal !== undefined
      ? invoice.subTotal
      : fmt(items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0));

  const computedExtrasTotal = fmt(
    extraSummaryRows.reduce((s, r) => s + (Number(r.numericAmount) || 0), 0)
  );

  const computedGrandTotal =
    extraSummaryRows.length > 0
      ? fmt(computedSubTotal + computedExtrasTotal)
      : fmt(invoice.totalUSD ?? computedSubTotal);

  const displayRowCount = Math.max(minRows, items.length);
  const blankRowIndices = Array.from(
    { length: Math.max(0, displayRowCount - items.length) },
    (_, i) => i
  );

  const summaryMiddleRows = Array.from({ length: 7 }, (_, i) => {
    if (extraSummaryRows[i]) return extraSummaryRows[i];
    if (i === 0 && invoice.deliveryTerms) {
      return { id: 'auto-del', label: 'Delivery Terms', valueText: invoice.deliveryTerms, numericAmount: 0 };
    }
    if (i === 1 && invoice.paymentTerms) {
      return { id: 'auto-pay', label: 'Payment Terms', valueText: invoice.paymentTerms, numericAmount: 0 };
    }
    return { id: `empty-${i}`, label: '', valueText: '', numericAmount: 0 };
  });

  const formatAttentionDisplay = (val: string) => {
    if (!val || !val.trim()) return '';
    return val.toLowerCase().startsWith('kind attn') ? val : `Kind Attn: ${val}`;
  };

  return (
    <div
      className="bg-white text-black w-full max-w-[840px] mx-auto shadow-sm border border-slate-300 print:border-none print:shadow-none print:max-w-none select-text"
      style={{ fontFamily: "'Arial Narrow', Arial, Helvetica, sans-serif" }}
    >
      <div className="px-5 pt-4 pb-6 print:px-2 print:pt-1 print:pb-2">
        {/* TOP BORDER LINE (Row 2 bottom border in Blank PO.xlsx) */}
        <div className="border-t border-slate-400 mb-2" />

        {/* TOP HEADER: Logo on Left (Cols B-C), Address/Contact on Right (Cols E-G) */}
        <div className="grid grid-cols-12 gap-4 items-center pb-3">
          <div className="col-span-6 flex items-center">
            {!logoErr ? (
              <div className="w-[265px] h-[74px] overflow-hidden bg-white flex items-center justify-start">
                <img
                  src={logoUrl}
                  alt="Global Futura Inc - Be Our Partner"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoErr(true)}
                  className="w-full h-full object-cover object-center scale-[1.03]"
                />
              </div>
            ) : (
              <div className="py-2">
                <div className="text-2xl font-black tracking-wider text-[#990000]">GLOBAL</div>
                <div className="text-base font-extrabold tracking-widest text-black">FUTURA INC</div>
                <div className="text-[10px] tracking-[0.2em] text-slate-600 uppercase">Be Our Partner</div>
              </div>
            )}
          </div>

          <div
            className="col-span-6 text-[12px] leading-[1.38] font-bold text-black space-y-0.5 pl-2"
            style={{ fontFamily: 'Calibri, Arial, sans-serif' }}
          >
            {editable ? (
              <>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={e => updateField('companyAddress', e.target.value)}
                  className="w-full px-1.5 py-0.5 border border-dashed border-amber-400 rounded bg-amber-50/40 font-bold text-[12px] focus:outline-none focus:border-blue-600"
                />
                <input
                  type="text"
                  value={companyPhone}
                  onChange={e => updateField('companyPhone', e.target.value)}
                  className="w-full px-1.5 py-0.5 border border-dashed border-amber-400 rounded bg-amber-50/40 font-bold text-[12px] focus:outline-none focus:border-blue-600"
                />
                <input
                  type="text"
                  value={companyEmail}
                  onChange={e => updateField('companyEmail', e.target.value)}
                  className="w-full px-1.5 py-0.5 border border-dashed border-amber-400 rounded bg-amber-50/40 font-bold text-[12px] focus:outline-none focus:border-blue-600"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={companyTaxIdLabel}
                    onChange={e => updateField('companyTaxIdLabel', e.target.value)}
                    className="w-24 px-1.5 py-0.5 border border-dashed border-amber-400 rounded bg-amber-50/40 font-bold text-[12px] focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    value={companyTaxId}
                    onChange={e => updateField('companyTaxId', e.target.value)}
                    className="flex-1 px-1.5 py-0.5 border border-dashed border-amber-400 rounded bg-amber-50/40 font-bold text-[12px] text-right focus:outline-none focus:border-blue-600"
                  />
                </div>
              </>
            ) : (
              <>
                <div>{companyAddress}</div>
                <div>{companyPhone}</div>
                <div>{companyEmail}</div>
                <div className="flex items-center justify-between pr-2">
                  <span>{companyTaxIdLabel}</span>
                  <span>{companyTaxId}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* DOCUMENT TITLE (Row 8-9: PROFORMA INVOICE in #003366 20pt Bold) */}
        <div className="pt-1 pb-1">
          {editable ? (
            <input
              type="text"
              value={documentTitle}
              onChange={e => updateField('documentTitle', e.target.value)}
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
              className="text-[24px] font-bold text-[#003366] tracking-wide w-full text-center border border-dashed border-amber-400 rounded bg-amber-50/30 py-0.5 focus:outline-none focus:border-blue-600"
            />
          ) : (
            <h1
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
              className="text-[24px] font-bold text-[#003366] tracking-wide text-center leading-tight"
            >
              {documentTitle}
            </h1>
          )}
        </div>

        {/* P.I. NUMBER & DATE BOX (Rows 10-11, right-aligned Cols F-G) */}
        <div className="flex justify-end mb-2">
          <div className="w-[290px] grid grid-cols-2 border border-[#003366]">
            <div className="bg-[#003366] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 text-center border-r border-white/30">
              P.I. NUMBER
            </div>
            <div className="bg-[#003366] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 text-center">
              DATE
            </div>
            <div className="px-2 py-1 text-center text-[12.5px] font-bold text-black border-r border-slate-300 bg-white min-h-[26px] flex items-center justify-center">
              {editable ? (
                <input
                  type="text"
                  value={invoice.piNumber}
                  onChange={e => updateField('piNumber', e.target.value)}
                  className="w-full text-center font-bold text-[12px] border-b border-dashed border-amber-400 bg-amber-50/40 focus:outline-none"
                />
              ) : (
                invoice.piNumber
              )}
            </div>
            <div className="px-2 py-1 text-center text-[12.5px] font-bold text-black bg-white min-h-[26px] flex items-center justify-center">
              {editable ? (
                <input
                  type="text"
                  value={invoice.dateLong || invoice.date}
                  onChange={e => updateField('dateLong', e.target.value)}
                  className="w-full text-center font-bold text-[12px] border-b border-dashed border-amber-400 bg-amber-50/40 focus:outline-none"
                />
              ) : (
                invoice.dateLong || invoice.date
              )}
            </div>
          </div>
        </div>

        {/* MAIN FRAMED SHEET BODY (Columns A..H framed in #D7E7F5 Ice-Blue like Blank PO.xlsx) */}
        <div className="bg-[#D7E7F5] p-[7px]">
          {/* SECTION 1: CUSTOMER & SHIP TO (Rows 13..22) */}
          <div className="grid grid-cols-12 gap-0">
            {/* Row 13: Navy Header Bar */}
            <div className="col-span-6 bg-[#003366] text-white font-bold text-[12.5px] tracking-wide px-3 py-1.5 uppercase">
              CUSTOMER
            </div>
            <div className="col-span-6 bg-[#003366] text-white font-bold text-[12.5px] tracking-wide px-3 py-1.5 uppercase">
              SHIP TO
            </div>

            {/* Left Column: CUSTOMER | Center Ice-Blue Gutter | Right Column: SHIP TO */}
            <div className="col-span-12 grid grid-cols-12">
              {/* CUSTOMER BLOCK */}
              <div className="col-span-6 pr-2">
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-800 px-1.5 py-1 bg-[#D7E7F5]">
                  COMPANY NAME
                </div>
                <div className="bg-white px-2.5 py-1.5 min-h-[28px] text-[13px] font-bold text-black flex items-center">
                  {editable ? (
                    <input
                      type="text"
                      value={invoice.buyerName}
                      onChange={e => updateField('buyerName', e.target.value)}
                      placeholder="Customer Company Name"
                      className="w-full font-bold text-[13px] border-b border-dashed border-amber-400 bg-amber-50/30 focus:outline-none"
                    />
                  ) : (
                    invoice.buyerName
                  )}
                </div>

                <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-800 px-1.5 py-1 bg-[#D7E7F5]">
                  ADDRESS
                </div>
                <div className="bg-white px-2.5 py-1.5 min-h-[48px] text-[12.5px] text-black whitespace-pre-line leading-snug">
                  {editable ? (
                    <textarea
                      rows={2}
                      value={invoice.buyerAddress}
                      onChange={e => updateField('buyerAddress', e.target.value)}
                      placeholder="Street Address, City, State, ZIP"
                      className="w-full text-[12.5px] border border-dashed border-amber-400 rounded bg-amber-50/30 p-1 focus:outline-none resize-none"
                    />
                  ) : (
                    invoice.buyerAddress
                  )}
                </div>

                <div className="h-[10px] bg-[#D7E7F5]" />

                <div className="bg-white px-2.5 py-1 min-h-[26px] text-[12.5px] font-semibold text-black flex items-center">
                  {editable ? (
                    <input
                      type="text"
                      value={invoice.buyerAttention}
                      onChange={e => updateField('buyerAttention', e.target.value)}
                      placeholder="Kind Attn: Contact Person"
                      className="w-full text-[12.5px] border-b border-dashed border-amber-400 bg-amber-50/30 focus:outline-none"
                    />
                  ) : (
                    formatAttentionDisplay(invoice.buyerAttention)
                  )}
                </div>
              </div>

              {/* SHIP TO BLOCK */}
              <div className="col-span-6 pl-2">
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-800 px-1.5 py-1 bg-[#D7E7F5]">
                  COMPANY NAME
                </div>
                <div className="bg-white px-2.5 py-1.5 min-h-[28px] text-[13px] font-bold text-black flex items-center">
                  {editable ? (
                    <input
                      type="text"
                      value={shipToName}
                      onChange={e => updateField('shipToName', e.target.value)}
                      placeholder="Ship To Company Name"
                      className="w-full font-bold text-[13px] border-b border-dashed border-amber-400 bg-amber-50/30 focus:outline-none"
                    />
                  ) : (
                    shipToName
                  )}
                </div>

                <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-800 px-1.5 py-1 bg-[#D7E7F5]">
                  ADDRESS
                </div>
                <div className="bg-white px-2.5 py-1.5 min-h-[48px] text-[12.5px] text-black whitespace-pre-line leading-snug">
                  {editable ? (
                    <textarea
                      rows={2}
                      value={shipToAddress}
                      onChange={e => updateField('shipToAddress', e.target.value)}
                      placeholder="Ship To Street, City, State, ZIP"
                      className="w-full text-[12.5px] border border-dashed border-amber-400 rounded bg-amber-50/30 p-1 focus:outline-none resize-none"
                    />
                  ) : (
                    shipToAddress
                  )}
                </div>

                <div className="h-[10px] bg-[#D7E7F5]" />

                <div className="bg-white px-2.5 py-1 min-h-[26px] text-[12.5px] font-semibold text-black flex items-center">
                  {editable ? (
                    <input
                      type="text"
                      value={shipToAttention}
                      onChange={e => updateField('shipToAttention', e.target.value)}
                      placeholder="Kind Attn / Destination Port / Contact"
                      className="w-full text-[12.5px] border-b border-dashed border-amber-400 bg-amber-50/30 focus:outline-none"
                    />
                  ) : (
                    formatAttentionDisplay(shipToAttention)
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ice-Blue Spacer Strip (Rows 21..23 in Blank PO.xlsx) */}
          <div className="h-3.5 bg-[#D7E7F5]" />

          {/* SECTION 2: LINE ITEMS TABLE (Rows 24..32+) */}
          <div className="bg-white">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#003366] text-white font-bold text-[12px]">
                  <th className="py-2 px-2 w-[68px] text-center border border-[#003366]">Sr. No.</th>
                  <th className="py-2 px-3 text-left border border-[#003366]">Product Description</th>
                  <th className="py-1.5 px-2 w-[105px] text-center leading-tight border border-[#003366]">
                    Quantity
                    <span className="block text-[11px] font-normal">( case )</span>
                  </th>
                  <th className="py-1.5 px-2 w-[115px] text-center leading-tight border border-[#003366]">
                    Price
                    <span className="block text-[11px] font-normal">per Case</span>
                  </th>
                  <th className="py-2 px-3 w-[125px] text-right border border-[#003366]">Amount</th>
                  {editable && (
                    <th className="py-2 px-1.5 w-8 text-center bg-[#003366] no-print" title="Remove">
                      ×
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const defaultDesc = formatPoProductDescription(
                    item.oilLabel,
                    item.sku,
                    item.volume,
                    item.units
                  );
                  const descValue =
                    item.customDescription !== undefined ? item.customDescription : defaultDesc;
                  const srDisplay = item.srNo !== undefined ? item.srNo : idx + 1;

                  return (
                    <tr key={item.id || idx} className="h-[34px]">
                      <td className="border border-slate-500 px-2 py-1 text-center font-bold tabular-nums text-black">
                        {editable ? (
                          <input
                            type="text"
                            value={srDisplay}
                            onChange={e => handleUpdateItem(idx, { srNo: e.target.value })}
                            className="w-10 text-center font-bold border-b border-dashed border-amber-400 bg-amber-50/40 focus:outline-none"
                          />
                        ) : (
                          srDisplay
                        )}
                      </td>
                      <td className="border border-slate-500 px-3 py-1 font-bold text-[13.5px] text-black">
                        {editable ? (
                          <input
                            type="text"
                            value={descValue}
                            onChange={e => handleUpdateItem(idx, { customDescription: e.target.value })}
                            className="w-full font-bold border-b border-dashed border-amber-400 bg-amber-50/40 px-1 focus:outline-none"
                          />
                        ) : (
                          descValue
                        )}
                      </td>
                      <td className="border border-slate-500 px-2 py-1 text-center font-bold tabular-nums text-black">
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            value={item.qty}
                            onChange={e =>
                              handleUpdateItem(idx, { qty: Math.max(0, parseFloat(e.target.value) || 0) })
                            }
                            className="w-20 text-center font-bold border-b border-dashed border-amber-400 bg-amber-50/40 focus:outline-none"
                          />
                        ) : item.qty > 0 ? (
                          item.qty.toLocaleString()
                        ) : (
                          ''
                        )}
                      </td>
                      <td className="border border-slate-500 px-2.5 py-1 text-right font-bold tabular-nums text-black">
                        {editable ? (
                          <div className="flex items-center justify-end gap-0.5">
                            <span className="text-slate-500 text-xs">{curSymbol}</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e =>
                                handleUpdateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                              }
                              className="w-20 text-right font-bold border-b border-dashed border-amber-400 bg-amber-50/40 focus:outline-none"
                            />
                          </div>
                        ) : item.unitPrice > 0 ? (
                          `${curSymbol}${fmtStr(item.unitPrice)}`
                        ) : (
                          ''
                        )}
                      </td>
                      <td className="border border-slate-500 px-3 py-1 text-right font-bold tabular-nums text-black">
                        {item.lineTotal > 0 || (editable && item.qty > 0)
                          ? `${curSymbol}${fmtStr(item.lineTotal)}`
                          : ''}
                      </td>
                      {editable && (
                        <td className="border border-slate-300 px-1 text-center no-print">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {/* Blank Grid Padding Rows to preserve exact 8-row Blank PO.xlsx structure */}
                {blankRowIndices.map(bIdx => (
                  <tr key={`blank-${bIdx}`} className="h-[34px]">
                    <td className="border border-slate-500 px-2 py-1 text-center">&nbsp;</td>
                    <td className="border border-slate-500 px-3 py-1">&nbsp;</td>
                    <td className="border border-slate-500 px-2 py-1 text-center">&nbsp;</td>
                    <td className="border border-slate-500 px-2.5 py-1 text-right">&nbsp;</td>
                    <td className="border border-slate-500 px-3 py-1 text-right">&nbsp;</td>
                    {editable && <td className="border border-slate-200 no-print" />}
                  </tr>
                ))}
              </tbody>
            </table>

            {editable && (
              <div className="p-1.5 bg-slate-50 border-x border-b border-slate-400 flex justify-end no-print">
                <button
                  type="button"
                  onClick={handleAddBlankRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#003366] text-white text-[11px] font-bold hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Custom Row
                </button>
              </div>
            )}
          </div>

          {/* Row 33: Ice-Blue Horizontal Divider Band */}
          <div className="h-2.5 bg-[#D7E7F5]" />

          {/* SECTION 3: NOTE / BANK DETAILS (Left Cols B-D) & SUB TOTAL -> TOTAL AMOUNT (Right Cols E-G) */}
          <div className="grid grid-cols-12 bg-white">
            {/* Left 7 Cols: Note: Header + Bank Details Box */}
            <div className="col-span-7 flex flex-col border-r border-slate-500">
              <div className="bg-[#003366] text-white font-bold text-[12.5px] px-3 py-1">
                {editable ? (
                  <input
                    type="text"
                    value={noteHeader}
                    onChange={e => updateField('noteHeader', e.target.value)}
                    className="bg-transparent border-b border-dashed border-amber-300 text-white font-bold w-full focus:outline-none"
                  />
                ) : (
                  noteHeader
                )}
              </div>
              <div className="p-2.5 flex-1 text-[11.5px] leading-[1.45] text-black whitespace-pre-line font-medium">
                {editable ? (
                  <textarea
                    rows={8}
                    value={bankDetailsText}
                    onChange={e => updateField('bankDetailsText', e.target.value)}
                    className="w-full text-[11.5px] leading-[1.42] border border-dashed border-amber-400 rounded bg-amber-50/30 p-1.5 focus:outline-none"
                  />
                ) : (
                  <div>
                    <div>{bankDetailsText}</div>
                    {(invoice.incoterm || invoice.portName) && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[11px] text-slate-800">
                        <strong>Terms:</strong> {invoice.incoterm} · {invoice.portName}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Sub Total + 7 Grid Rows + Total Amount */}
            <div className="col-span-5 flex flex-col">
              {/* Row 34: Sub Total */}
              <div className="grid grid-cols-12 border-t border-r border-b border-slate-500 min-h-[28px] items-center">
                <div className="col-span-7 px-2.5 py-1 font-bold text-[12px] text-black border-r border-slate-500">
                  Sub Total
                </div>
                <div className="col-span-5 px-2.5 py-1 text-right font-bold text-[12.5px] tabular-nums text-black">
                  {`${curSymbol}${fmtStr(computedSubTotal)}`}
                </div>
              </div>

              {/* Rows 35..41: 7 Grid Rows (for Delivery/Payment terms, Freight, Discount, or Blank PO spacing) */}
              {summaryMiddleRows.map((sRow, rIdx) => (
                <div
                  key={sRow.id || rIdx}
                  className="grid grid-cols-12 border-r border-b border-slate-500 min-h-[22px] items-center text-[11px]"
                >
                  <div className="col-span-7 px-2 py-0.5 font-semibold text-slate-800 border-r border-slate-500 truncate">
                    {editable ? (
                      <input
                        type="text"
                        value={extraSummaryRows[rIdx]?.label ?? sRow.label}
                        placeholder={rIdx === 0 ? 'Label (e.g. Freight / Terms)' : ''}
                        onChange={e =>
                          handleUpdateExtraRow(rIdx, {
                            label: e.target.value,
                            valueText: extraSummaryRows[rIdx]?.valueText ?? sRow.valueText,
                          })
                        }
                        className="w-full text-[11px] bg-transparent border-b border-dashed border-transparent focus:border-amber-400 focus:bg-amber-50/30 focus:outline-none"
                      />
                    ) : (
                      sRow.label || '\u00A0'
                    )}
                  </div>
                  <div className="col-span-5 px-2 py-0.5 text-right font-bold tabular-nums text-black truncate">
                    {editable ? (
                      <input
                        type="text"
                        value={
                          extraSummaryRows[rIdx]?.valueText !== undefined
                            ? extraSummaryRows[rIdx].valueText
                            : sRow.valueText
                        }
                        placeholder={rIdx === 0 ? 'Value / $0.00' : ''}
                        onChange={e => {
                          const raw = e.target.value;
                          const parsedNum = parseFloat(raw.replace(/[^0-9.-]/g, ''));
                          const isPureMoney = /^[+-]?\$?\d+(\.\d+)?$/.test(raw.trim());
                          handleUpdateExtraRow(rIdx, {
                            label: extraSummaryRows[rIdx]?.label ?? sRow.label,
                            valueText: raw,
                            numericAmount: isPureMoney && !Number.isNaN(parsedNum) ? parsedNum : 0,
                          });
                        }}
                        className="w-full text-right text-[11px] bg-transparent border-b border-dashed border-transparent focus:border-amber-400 focus:bg-amber-50/30 focus:outline-none"
                      />
                    ) : (
                      sRow.valueText ||
                      (sRow.numericAmount
                        ? `${sRow.numericAmount < 0 ? '-' : ''}${curSymbol}${fmtStr(Math.abs(sRow.numericAmount))}`
                        : '\u00A0')
                    )}
                  </div>
                </div>
              ))}

              {/* Rows 42..43: Total Amount */}
              <div className="grid grid-cols-12 border-r border-b border-slate-500 min-h-[38px] items-center bg-slate-50/60 mt-auto">
                <div className="col-span-7 px-2.5 py-1.5 font-bold text-[13px] text-black border-r border-slate-500 h-full flex items-center">
                  Total Amount
                </div>
                <div className="col-span-5 px-2.5 py-1.5 text-right font-bold text-[14px] tabular-nums text-black h-full flex items-center justify-end">
                  {`${curSymbol}${fmtStr(computedGrandTotal)}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: STAMP & AUTHORIZED SIGNATORY (Rows 45..52, Right Aligned) */}
        <div className="pt-4 pr-3 flex justify-end">
          <div className="flex flex-col items-center text-center min-w-[200px]">
            {showStamp && !stampErr ? (
              <img
                src={GLOBAL_FUTURA_STAMP_PATH}
                alt="For Global Futura Inc Authorized Stamp & Signature"
                referrerPolicy="no-referrer"
                onError={() => setStampErr(true)}
                className="h-[108px] w-auto object-contain select-none"
              />
            ) : (
              <div className="h-[72px] flex items-end justify-center pb-2 text-xs font-bold text-[#003366]">
                FOR GLOBAL FUTURA INC
              </div>
            )}

            {editable ? (
              <input
                type="text"
                value={signatoryLabel}
                onChange={e => updateField('signatoryLabel', e.target.value)}
                className="mt-1 text-center text-[13px] font-semibold text-black border-b border-dashed border-amber-400 bg-amber-50/40 focus:outline-none w-40"
              />
            ) : (
              <div className="mt-1 text-[13px] font-medium text-black">{signatoryLabel}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
