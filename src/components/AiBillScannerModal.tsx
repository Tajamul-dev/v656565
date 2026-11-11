import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Boxes,
  PackageCheck,
  RefreshCw,
  Plus,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { SoundEngine } from '../utils/audio';
import { MaterialKey } from '../types';

export interface ScannedBillItem {
  itemName: string;
  materialType: MaterialKey | 'raw_material' | 'spout' | 'sleeve' | 'ink' | 'none';
  matchedSku: string;
  quantity: number;
  unit: string;
  unitRate: number;
  totalAmount: number;
}

export interface ScannedBillData {
  vendorName: string;
  billNumber: string;
  billDate: string;
  documentType: string;
  targetContainer: string | null;
  summary: string;
  items: ScannedBillItem[];
  totalBillAmount: number;
}

interface AiBillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBillUpdates: (data: ScannedBillData) => void;
}

export const AiBillScannerModal: React.FC<AiBillScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyBillUpdates,
}) => {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [capturedFile, setCapturedFile] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; type: string; size: string; isPdf: boolean } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<ScannedBillData | null>(null);

  // Camera stream ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera when closing or switching mode
  useEffect(() => {
    if (!isOpen || mode !== 'camera' || capturedFile) {
      stopCamera();
    } else if (isOpen && mode === 'camera' && !capturedFile) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, capturedFile]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setAnalysisError(null);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraActive(false);
      setAnalysisError('Unable to access device camera. Please upload a PDF or image file instead.');
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    SoundEngine.play('pop');

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedFile(dataUrl);
      setFileMeta({
        name: `camera_bill_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: `${Math.round(dataUrl.length / 1024)} KB`,
        isPdf: false,
      });
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    SoundEngine.play('pop');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setCapturedFile(result);
      setFileMeta({
        name: file.name,
        type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        size: sizeStr,
        isPdf,
      });
      setAnalysisError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeWithAI = async () => {
    if (!capturedFile) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    SoundEngine.play('whoosh');

    try {
      const isPdf = fileMeta?.isPdf || capturedFile.startsWith('data:application/pdf');
      const mimeType = isPdf ? 'application/pdf' : (fileMeta?.type || 'image/jpeg');

      const res = await fetch('/api/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedFile,
          mimeType,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned ${res.status}`);
      }

      const data: ScannedBillData = await res.json();
      setScannedData(data);
      SoundEngine.play('success');
    } catch (err: any) {
      console.error('Bill analysis failed:', err);
      setAnalysisError(err.message || 'Failed to analyze bill document. Please verify network or API key.');
      SoundEngine.play('alert');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!scannedData) return;
    SoundEngine.play('success');
    onApplyBillUpdates(scannedData);
    handleResetAndClose();
  };

  const handleResetAndClose = () => {
    stopCamera();
    setCapturedFile(null);
    setFileMeta(null);
    setScannedData(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Scan Bill or PDF to Restock Inventory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1-click upload of supplier PDF bills, delivery notes, or camera photos to automatically restock warehouse inventory & packaging.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State 1: Image / PDF Capture / Upload */}
        {!scannedData && (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  SoundEngine.play('tick');
                  setCapturedFile(null);
                  setFileMeta(null);
                  setMode('upload');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PDF or Bill Image</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  SoundEngine.play('tick');
                  setCapturedFile(null);
                  setFileMeta(null);
                  setMode('camera');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'camera'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Use Device Camera</span>
              </button>
            </div>

            {/* Viewport for Camera */}
            {mode === 'camera' && !capturedFile && (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-slate-700">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="absolute bottom-4 px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Bill Picture</span>
                </button>
              </div>
            )}

            {/* Viewport for Upload (PDF or Image) */}
            {mode === 'upload' && !capturedFile && (
              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 text-center">
                  Select Bill of Materials or Supplier Invoice
                </span>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-1">
                  Supports PDF documents, JPG, PNG, WebP up to 25MB
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Delivery Challans, Goods Receipt Notes, Commercial Invoices
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* Preview of Captured File */}
            {capturedFile && (
              <div className="space-y-3">
                {fileMeta?.isPdf ? (
                  <div className="rounded-xl border-2 border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{fileMeta.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100">
                            PDF Ready
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {fileMeta.size} • Ready for Gemini AI Extraction
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.play('pop');
                        setCapturedFile(null);
                        setFileMeta(null);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 max-h-64 flex items-center justify-center">
                    <img
                      src={capturedFile}
                      alt="Captured Bill"
                      className="max-h-64 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.play('pop');
                        setCapturedFile(null);
                        setFileMeta(null);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-900/80 text-white text-xs font-bold hover:bg-slate-900 cursor-pointer"
                    >
                      Retake / Change
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleAnalyzeWithAI}
                    disabled={isAnalyzing}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>AI Parsing Bill...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Extract & Update Inventory with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {analysisError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong>Analysis Error:</strong> {analysisError}
                </div>
              </div>
            )}
          </div>
        )}

        {/* State 2: Parsed Result Review & Confirmation */}
        {scannedData && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                    Extracted from {scannedData.vendorName || 'Supplier Bill'} • #{scannedData.billNumber}
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    {scannedData.items.length} materials detected. Review below and confirm to restock inventory and sync packaging stages.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-emerald-800 dark:text-emerald-200">
                {scannedData.billDate}
              </span>
            </div>

            {/* Line Items List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2 text-right">Inward Qty</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scannedData.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {item.itemName}
                        {item.matchedSku && (
                          <span className="block text-[10px] font-mono text-purple-600 dark:text-purple-400">
                            {item.matchedSku}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 font-mono text-[10px] uppercase font-bold text-slate-500">
                        {item.materialType}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{item.quantity.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-500">
                        {item.unitRate > 0 ? `₹${item.unitRate}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {item.totalAmount > 0 ? `₹${item.totalAmount.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setScannedData(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                Scan Different File
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply & Restock Inventory (100% Synced)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
