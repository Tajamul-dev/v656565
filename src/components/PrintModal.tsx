import React, { useState, useEffect } from 'react';
import { SavedProformaInvoice } from '../types';
import { BrandLogo } from './BrandLogo';
import { fmtStr, formatVolumeShort } from '../utils/calculations';
import { Printer, X, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { SoundEngine } from '../utils/audio';

interface PrintModalProps {
  invoice: SavedProformaInvoice | null;
  onClose: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({ invoice, onClose }) => {
  const [signatureQrUrl, setSignatureQrUrl] = useState<string>('');

  useEffect(() => {
    if (!invoice) return;
    const origin = window.location.origin;
    const targetUrl = `${origin}/?sign_pi=${encodeURIComponent(invoice.piNumber)}&ts=${Date.now()}`;
    QRCode.toDataURL(targetUrl, { width: 140, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(url => setSignatureQrUrl(url))
      .catch(err => console.error('QR generation err:', err));
  }, [invoice]);

  if (!invoice) return null;

  const handlePrint = () => {
    SoundEngine.play('print');
    window.print();
  };

  const totalPallets =
    invoice.totalPallets ||
    invoice.items.reduce((s, i) => s + (i.pallets || Math.ceil(i.qty / 75)), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 my-auto">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase tracking-wider text-slate-700">
              Official Proforma Invoice Preview
            </span>
            <span className="text-xs text-slate-400 font-mono">({invoice.piNumber})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable Invoice Document */}
        <div className="space-y-6 text-xs font-sans print:text-[10.5px]">
          {/* Top Header */}
          <div className="flex justify-between items-start border-b-4 border-red-700 pb-4">
            <div className="flex items-center gap-4">
              <BrandLogo size="lg" />
              <div>
                <h2 className="text-lg font-black text-red-800 tracking-tight leading-none">
                  GLOBAL FUTURA INC.
                </h2>
                <p className="text-slate-600 font-medium text-[11px] mt-1 leading-tight">
                  500 N Broadway, Suite 163, Jericho, NY 11753, USA
                </p>
                <p className="text-slate-500 text-[10px] leading-tight">
                  📞 +1 (347) 446-2333 • ✉️ marketing@globaloils.us • Tax ID: 88-4093389
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xl font-black text-slate-900 tracking-tight">
                PROFORMA INVOICE
              </div>
              <div className="text-sm font-black font-mono text-red-700 mt-0.5">
                {invoice.piNumber}
              </div>
              <div className="text-slate-500 font-bold mt-1 text-[11px]">
                Date: {invoice.dateLong || invoice.date}
              </div>
            </div>
          </div>

          {/* Incoterm & Destination Bar */}
          <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-lg font-bold text-slate-700 text-[11px]">
            <span>Commercial Terms: <strong>{invoice.incoterm}</strong></span>
            <span>Destination Port: <strong>{invoice.portName}</strong></span>
            <span>Currency: <strong>{invoice.quoteCur} ({invoice.curSymbol})</strong></span>
            <span>Executive: <strong>{invoice.mktExecName}</strong></span>
          </div>

          {/* Buyer & Delivery Grid */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3">
            <div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                Billed & Shipped To (Customer)
              </div>
              <div className="font-black text-sm text-slate-900">{invoice.buyerName}</div>
              <div className="text-slate-600 mt-0.5 whitespace-pre-line">{invoice.buyerAddress}</div>
              {invoice.buyerAttention && (
                <div className="mt-1 text-slate-700">
                  <strong>Kind Attention:</strong> {invoice.buyerAttention}
                </div>
              )}
            </div>

            <div className="border-l border-slate-200 pl-4 space-y-1.5">
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                Delivery & Settlement Details
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Delivery Terms:</span>{' '}
                <span className="font-bold">{invoice.deliveryTerms}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Payment Terms:</span>{' '}
                <span className="font-bold">{invoice.paymentTerms}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table with Cases and Pallets */}
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-black text-[10px] uppercase">
                <th className="border border-slate-400 py-2 px-2 w-10 text-center">#</th>
                <th className="border border-slate-400 py-2 px-3 text-left">Product Description</th>
                <th className="border border-slate-400 py-2 px-2 text-center w-24">Qty (Cases)</th>
                <th className="border border-slate-400 py-2 px-2 text-center w-20">Pallets</th>
                <th className="border border-slate-400 py-2 px-3 text-right w-28">Price / Case</th>
                <th className="border border-slate-400 py-2 px-3 text-right w-32">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => {
                const pallets = item.pallets || Math.ceil(item.qty / 75);
                return (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="border border-slate-300 py-2 px-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 py-2 px-3 font-semibold">
                      <span className="font-bold text-slate-900">{item.sku}</span>
                      <span className="text-slate-500 text-[11px] block">
                        {item.oilLabel} • {formatVolumeShort(item.volume)} • {item.units} pcs/case
                      </span>
                    </td>
                    <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold">
                      {item.qty.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold text-amber-700">
                      {pallets} plts
                    </td>
                    <td className="border border-slate-300 py-2 px-3 text-right font-mono font-bold">
                      {invoice.curSymbol}{fmtStr(item.unitPrice)}
                    </td>
                    <td className="border border-slate-300 py-2 px-3 text-right font-mono font-black text-slate-900">
                      {invoice.curSymbol}{fmtStr(item.lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black">
                <td colSpan={2} className="border border-slate-300 py-2.5 px-3 text-right uppercase">
                  Total Order Quantity
                </td>
                <td className="border border-slate-300 py-2.5 px-2 text-center font-mono">
                  {invoice.totalQty.toLocaleString()} cases
                </td>
                <td className="border border-slate-300 py-2.5 px-2 text-center font-mono text-amber-800">
                  {totalPallets} plts
                </td>
                <td className="border border-slate-300 py-2.5 px-3 text-right uppercase">
                  Grand Total
                </td>
                <td className="border border-slate-300 py-2.5 px-3 text-right font-mono text-sm text-emerald-800 font-black">
                  {invoice.curSymbol}{fmtStr(invoice.totalUSD)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Bank of America Wire Details */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 font-black text-[10px] uppercase text-slate-700 tracking-wider">
              Banking & Wire Settlement Instructions
            </div>
            <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div><span className="text-slate-500">Beneficiary:</span> <strong>GLOBAL FUTURA INC</strong></div>
              <div><span className="text-slate-500">Bank Name:</span> <strong>BANK OF AMERICA</strong></div>
              <div><span className="text-slate-500">Account #:</span> <strong className="font-mono">483076079459</strong></div>
              <div><span className="text-slate-500">Swift Code:</span> <strong className="font-mono">BOFAUS3N</strong></div>
              <div><span className="text-slate-500">ACH Routing #:</span> <strong className="font-mono">021000322</strong></div>
              <div><span className="text-slate-500">Wire Routing #:</span> <strong className="font-mono">026009593</strong></div>
              <div className="col-span-2 text-slate-500 text-[10px] mt-1">
                Bank Address: 222 Broadway, New York, NY 10038, United States
              </div>
            </div>
          </div>

          {/* Signatures with Digital Phone Signature Capture / QR Stamping */}
          <div className="flex justify-between items-end pt-6">
            <div className="w-56 text-center border-t border-slate-400 pt-1.5">
              <div className="font-bold text-slate-700 text-xs">Buyer Acceptance</div>
              <div className="text-[10px] text-slate-400 font-medium">Authorized Signatory & Stamp</div>
            </div>

            <div className="w-64 text-center">
              {invoice.signatureAttachment ? (
                <div className="flex flex-col items-center">
                  <img
                    src={invoice.signatureAttachment.dataUrl}
                    alt="Authorized Signature"
                    className="h-14 max-h-14 max-w-[220px] object-contain mb-1"
                  />
                  <div className="border-t border-slate-700 w-full pt-1 text-center">
                    <div className="font-black text-red-900 text-xs">
                      {invoice.signatureAttachment.signerName}
                    </div>
                    <div className="text-[9.5px] text-slate-600 font-semibold">
                      {invoice.signatureAttachment.signerTitle}
                    </div>
                    <div className="text-[8.5px] text-emerald-700 font-mono flex items-center justify-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                      <span>Mobile Verified • {invoice.signatureAttachment.signedAt}</span>
                    </div>
                    <div className="text-[7.5px] font-mono text-slate-400 truncate max-w-full">
                      {invoice.signatureAttachment.verifiedHash}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-400 pt-1.5 flex flex-col items-center">
                  {signatureQrUrl && (
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={signatureQrUrl}
                        alt="Mobile Signature QR"
                        className="w-14 h-14 border border-slate-300 rounded shadow-xs"
                      />
                      <div className="text-left text-[9px] text-slate-500 leading-tight">
                        <span className="font-bold text-slate-800 block">📱 Scan to Sign</span>
                        <span>Sign on smartphone to auto-update</span>
                      </div>
                    </div>
                  )}
                  <div className="font-black text-red-800 text-xs">For GLOBAL FUTURA INC.</div>
                  <div className="text-[10px] text-slate-500 font-medium">Authorized Signatory</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
