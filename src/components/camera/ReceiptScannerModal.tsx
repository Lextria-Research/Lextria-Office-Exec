// src/components/camera/ReceiptScannerModal.tsx
import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Check, X, FileText, AlertCircle } from 'lucide-react';
import { imagesToPdf } from '../../lib/files';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (pdfBlob: Blob, pageCount: number) => void;
  onCaptureComplete?: (docId: string, fileName: string) => void;
  onUploadComplete?: (docId: string, fileName: string) => void;
  defaultKind?: string;
  category?: string;
  title?: string;
}

export const ReceiptScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onComplete,
  onCaptureComplete,
  onUploadComplete,
  title = 'Capture & Stitch Receipt (PDF)',
}) => {
  const [capturedImages, setCapturedImages] = useState<{ url: string; blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: { url: string; blob: Blob }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newItems.push({
        url: URL.createObjectURL(file),
        blob: file,
      });
    }
    setCapturedImages((prev) => [...prev, ...newItems]);
  };

  const handleRemove = (index: number) => {
    setCapturedImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].url);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleGeneratePdf = async () => {
    if (capturedImages.length === 0) return;
    setIsProcessing(true);
    try {
      const blobs = capturedImages.map((img) => img.blob);
      const pdfBlob = await imagesToPdf(blobs);
      if (onComplete) onComplete(pdfBlob, capturedImages.length);
      const generatedDocId = `doc-scan-${Date.now()}`;
      if (onCaptureComplete) onCaptureComplete(generatedDocId, 'scanned_receipt.pdf');
      if (onUploadComplete) onUploadComplete(generatedDocId, 'scanned_receipt.pdf');
      onClose();
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Could not combine images into PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-lg p-3 text-xs text-teal-900 dark:text-teal-200 flex gap-2.5">
            <AlertCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <div>
              <strong>Phone Multi-Page Mode:</strong> Take one or more photos of the receipt,
              postal stamps, or acknowledgment pages. The app automatically stitches them into a
              single clean PDF.
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-teal-500/50 hover:border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl transition cursor-pointer"
            >
              <Camera className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Snap Photo (Camera)
              </span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl transition cursor-pointer"
            >
              <Upload className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choose Images / PDF
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Image Gallery */}
          {capturedImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                <span>Pages Captured ({capturedImages.length})</span>
                <span className="text-teal-600 dark:text-teal-400">Will stitch in sequence</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {capturedImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-3/4 flex items-center justify-center"
                  >
                    <img
                      src={img.url}
                      alt={`Page ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                      P.{idx + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-md opacity-90 hover:opacity-100 transition"
                      title="Remove page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={capturedImages.length === 0 || isProcessing}
            onClick={handleGeneratePdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            {isProcessing ? (
              <span>Stitching PDF...</span>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Combine & Attach PDF ({capturedImages.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
