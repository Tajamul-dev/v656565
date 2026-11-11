import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderRecord } from '../types';

/**
 * PDF export in the exact Global Futura house format:
 *
 *  1) Production Sheet (landscape matrix):
 *     rows = Party Name, columns = SKU (Brand + Pack Size), cell = pallets,
 *     last column = "Total of", last row = "Total".
 *
 *  2) Pending Orders (per SKU sections):
 *     For each SKU: header table [Party Name | BRAND | Pallet | Label | Status | Remarks],
 *     rows per party, then a "Total <pack>" row. Commodity title at the end.
 */

const BRAND_FALLBACK = 'Rajdhani';

function deriveBrand(order: OrderRecord): string {
  // Brand is the part of the SKU name before the pack size (e.g. "Rajdhani Mustard Oil 1L x 12" -> Rajdhani)
  const m = order.skuName.match(/^(.+?)\s+(?:Oil|Honey|Ghee)/i);
  return m ? m[1] : BRAND_FALLBACK;
}

/** Save a document with a graceful download */
function save(doc: jsPDF, filename: string) {
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

// ---------------------------------------------------------------------------
// 3) Generic tabular export (BOM / Dispatch / Master Sheet) — same PDF house style
// ---------------------------------------------------------------------------
export function exportTablePDF(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 40, 34);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 44,
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [241, 241, 241], textColor: 20, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 30, right: 30 },
  });

  save(doc, filename);
}

// ---------------------------------------------------------------------------
// 1) Production Sheet — landscape party × SKU matrix
// ---------------------------------------------------------------------------
export function exportProductionSheetPDF(orders: OrderRecord[], filename = 'Production Sheet') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  // Distinct SKU columns in first-seen order, parties sorted alphabetically
  const skuColumns: string[] = [];
  orders.forEach(o => {
    if (!skuColumns.includes(o.skuName)) skuColumns.push(o.skuName);
  });

  const partyMap = new Map<string, OrderRecord[]>();
  orders.forEach(o => {
    const list = partyMap.get(o.partyName) || [];
    list.push(o);
    partyMap.set(o.partyName, list);
  });
  const parties = Array.from(partyMap.keys()).sort((a, b) => a.localeCompare(b));

  const head = [['Total of', ...skuColumns]];
  const body: (string | number)[][] = parties.map(party => {
    const row: (string | number)[] = [party];
    let total = 0;
    skuColumns.forEach(sku => {
      const cells = (partyMap.get(party) || []).filter(o => o.skuName === sku);
      const qty = cells.reduce((a, o) => a + (o.planPallets || 0), 0);
      total += qty;
      row.push(qty ? Number(qty.toFixed(2)) : '');
    });
    row.push(Number(total.toFixed(2)));
    return row;
  });

  // Grand-total row
  const totalsRow: (string | number)[] = ['Total'];
  let grand = 0;
  skuColumns.forEach(sku => {
    const t = orders.filter(o => o.skuName === sku).reduce((a, o) => a + (o.planPallets || 0), 0);
    grand += t;
    totalsRow.push(t ? Number(t.toFixed(2)) : '');
  });
  totalsRow.push(Number(grand.toFixed(2)));
  body.push(totalsRow);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Production Sheet', 40, 34);

  autoTable(doc, {
    head,
    body,
    startY: 44,
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { cellWidth: 90, fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 30, right: 30 },
  });

  save(doc, filename);
}

// ---------------------------------------------------------------------------
// 2) Pending Orders — one section per SKU, grouped commodity-wise
// ---------------------------------------------------------------------------
export function exportPendingOrdersPDF(
  orders: OrderRecord[],
  commodityLabel: string,
  filename?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  // Group orders by SKU name, preserving first-seen order
  const skuMap = new Map<string, OrderRecord[]>();
  orders.forEach(o => {
    const list = skuMap.get(o.skuName) || [];
    list.push(o);
    skuMap.set(o.skuName, list);
  });

  let firstOnPage = true;
  let cursorY = 40;

  skuMap.forEach((rows, skuName) => {
    const sectionHeight = 46 + rows.length * 18 + 40;
    if (!firstOnPage && cursorY + sectionHeight > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      firstOnPage = true;
      cursorY = 40;
    }

    const section: any[][] = rows.map(o => [
      o.partyName,
      deriveBrand(o),
      Number((o.planPallets || 0).toFixed(2)),
      'Available',
      o.status,
      o.remarks || '',
    ]);
    const packTotal = rows.reduce((a, o) => a + (o.planPallets || 0), 0);
    section.push([
      { content: `Total of ${skuName}`, colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: Number(packTotal.toFixed(2)).toString(), styles: { fontStyle: 'bold' } },
      { content: '', colSpan: 3 },
    ]);

    autoTable(doc, {
      head: [['Party Name', 'BRAND', 'Pallet', 'Label', 'Status', 'Remarks']],
      body: section,
      startY: cursorY,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [241, 241, 241], textColor: 20, fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'right' },
        4: { cellWidth: 80 },
        5: { cellWidth: 120 },
      },
      margin: { left: 30, right: 30 },
      didDrawPage: () => {
        if (firstOnPage) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(commodityLabel, 30, 28);
        }
      },
    });

    const lastTable = (doc as any).lastAutoTable;
    cursorY = (lastTable ? lastTable.finalY : cursorY) + 22;
    firstOnPage = false;
  });

  save(doc, filename || `Pending Orders - ${commodityLabel}`);
}
