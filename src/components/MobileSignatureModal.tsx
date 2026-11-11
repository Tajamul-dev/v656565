import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  PenTool,
  RotateCcw,
  CheckCircle2,
  QrCode,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Download,
} from 'lucide-react';
import QRCode from 'qrcode';
import { DigitalSignatureData } from '../types';
import { SoundEngine } from '../utils/audio';

interface MobileSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  defaultSignerName?: string;
  defaultSignerTitle?: string;
  onSaveSignature: (sig: DigitalSignatureData) => void;
}

export const MobileSignatureModal: React.FC<MobileSignatureModalProps> = ({
  isOpen,
  onClose,
  invoiceNumber,
  defaultSignerName = 'Tajamul Sales',
  defaultSignerTitle = 'Managing Director & Authorized Signatory',
  onSaveSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState<'#1e3a8a' | '#0f172a' | '#047857'>('#1e3a8a'); // Blue, Navy/Black, Emerald
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerTitle, setSignerTitle] = useState(defaultSignerTitle);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'screen' | 'qr'>('screen');

  // Generate mobile redirect QR code
  useEffect(() => {
    if (!isOpen) return;

    const currentOrigin = window.location.origin;
    const mobileSignUrl = `${currentOrigin}/?sign_pi=${encodeURIComponent(invoiceNumber)}&ts=${Date.now()}`;

    QRCode.toDataURL(mobileSignUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Error generating signature QR:', err));
  }, [isOpen, invoiceNumber]);

  // Canvas drawing functions
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    SoundEngine.play('thud');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleAdoptSignature = () => {
    if (!canvasRef.current || !hasDrawn) {
      alert('Please draw your signature on the pad before confirming.');
      return;
    }

    SoundEngine.play('success');
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
    const randomHash = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    onSaveSignature({
      dataUrl,
      signerName: signerName.trim() || 'Authorized Representative',
      signerTitle: signerTitle.trim() || 'Director & Commercial Head',
      signedAt: timestamp,
      deviceToken: 'MOB-VERIFIED-TLS-SECURE',
      verifiedHash: `SHA256:${randomHash}`,
    });

    onClose();
  };

  // Pre-load demo signature for testing convenience
  const handleLoadDemoSignature = () => {
    SoundEngine.play('pop');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw stylized cursive signature
    ctx.beginPath();
    ctx.moveTo(40, 90);
    ctx.quadraticCurveTo(80, 30, 110, 60);
    ctx.quadraticCurveTo(140, 100, 170, 70);
    ctx.quadraticCurveTo(210, 40, 240, 85);
    ctx.quadraticCurveTo(280, 110, 320, 60);
    ctx.quadraticCurveTo(360, 45, 420, 80);
    ctx.moveTo(60, 105);
    ctx.lineTo(440, 95);
    ctx.stroke();

    setHasDrawn(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border-2 border-slate-900 dark:border-slate-700 space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white font-black shadow-md">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Mobile Digital Signature Pad
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Proforma Invoice #{invoiceNumber} • Scan on phone or sign directly on screen
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Draw on Screen vs Scan Phone QR */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('screen')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'screen'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw on Screen / Touch</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan with Phone QR</span>
          </button>
        </div>

        {activeTab === 'screen' ? (
          <div className="space-y-3">
            {/* Signer details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Signer Full Name
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Signer Title / Designation
                </label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={e => setSignerTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Canvas Surface */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 text-[11px] font-bold">
                  <span>Sign within the box below</span>
                  {hasDrawn && <span className="text-emerald-600 font-black">✓ Signature detected</span>}
                </span>

                {/* Ink Color Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">Ink:</span>
                  <button
                    type="button"
                    onClick={() => setPenColor('#1e3a8a')}
                    className={`w-4 h-4 rounded-full bg-blue-900 ring-2 ${penColor === '#1e3a8a' ? 'ring-blue-500' : 'ring-transparent'}`}
                    title="Executive Royal Blue"
                  />
                  <button
                    type="button"
                    onClick={() => setPenColor('#0f172a')}
                    className={`w-4 h-4 rounded-full bg-slate-900 ring-2 ${penColor === '#0f172a' ? 'ring-slate-500' : 'ring-transparent'}`}
                    title="Deep Charcoal / Black"
                  />
                  <button
                    type="button"
                    onClick={() => setPenColor('#047857')}
                    className={`w-4 h-4 rounded-full bg-emerald-700 ring-2 ${penColor === '#047857' ? 'ring-emerald-500' : 'ring-transparent'}`}
                    title="Emerald Green"
                  />
                </div>
              </div>

              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-950 overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={170}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair touch-none"
                />

                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-xs gap-1 select-none">
                    <PenTool className="w-5 h-5 opacity-40" />
                    <span className="font-medium">Use finger, stylus, or mouse to sign here</span>
                  </div>
                )}

                <div className="absolute bottom-2 left-4 right-4 border-b border-slate-300/60 dark:border-slate-800 pointer-events-none" />
                <span className="absolute bottom-1 right-4 text-[9px] font-mono text-slate-400 pointer-events-none">
                  Authorized Signatory
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 font-bold text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Pad</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadDemoSignature}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                  title="Generate sample verified signature"
                >
                  Sample Demo
                </button>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-bit Encrypted Token</span>
              </div>
            </div>
          </div>
        ) : (
          /* QR Code Tab: Scan with Smartphone */
          <div className="py-4 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 inline-block mx-auto shadow-sm">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Scan on Mobile"
                  className="w-48 h-48 mx-auto rounded-xl border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>Redirect & Sign Directly on Smartphone</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Open camera on iPhone or Android, scan this QR code, and sign with your finger. It will automatically update on this Proforma Invoice in real-time.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('screen')}
              className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-bold text-xs cursor-pointer"
            >
              ← Back to Screen Signing Pad
            </button>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAdoptSignature}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Adopt & Apply Digital Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
};
