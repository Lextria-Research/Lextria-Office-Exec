// src/features/dispatches/NewDispatchModal.tsx
import React, { useState } from 'react';
import { mockStore, CarrierType, DocType } from '../../lib/mockData';
import { clock } from '../../lib/clock';
import { uploadDocument, generateFileName, resolveFolderPath } from '../../lib/files';
import { ReceiptScannerModal } from '../../components/camera/ReceiptScannerModal';
import { Camera, Barcode, Check, X, FileCheck, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NewDispatchModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const addressBook = mockStore.getAddressBook();
  const projectCodes = mockStore.getProjectCodes();

  // Form Fields
  const [direction, setDirection] = useState<'OUTWARD' | 'INWARD'>('OUTWARD');
  const [bookingDate, setBookingDate] = useState(clock.todayISO());
  const [recipientId, setRecipientId] = useState(addressBook[1]?.id || addressBook[0]?.id || '');
  const [carrier, setCarrier] = useState<CarrierType>('INDIA_SPEED_POST');
  const [trackingId, setTrackingId] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [docType, setDocType] = useState<DocType>('LEGAL_NOTICE');
  const [particulars, setParticulars] = useState('');
  const [cost, setCost] = useState('45');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'FIRM_UPI'>('CASH');
  const [legalEvidence, setLegalEvidence] = useState(false);

  // Receipt Scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [attachedReceiptPdf, setAttachedReceiptPdf] = useState<{ blob: Blob; pages: number } | null>(null);

  const [recordInPettyCash, setRecordInPettyCash] = useState(true);

  if (!isOpen) return null;

  const handleDocTypeChange = (dt: DocType) => {
    setDocType(dt);
    if (dt === 'LEGAL_NOTICE') {
      setLegalEvidence(true);
    }
  };

  const handleToggleCode = (codeId: string) => {
    setSelectedCodes((prev) =>
      prev.includes(codeId) ? prev.filter((id) => id !== codeId) : [...prev, codeId]
    );
  };

  const handleScanBarcode = () => {
    // Generate simulated India Post tracking barcode or prompt
    const prefix = carrier.includes('SPEED') ? 'EK' : 'RK';
    const num = Math.floor(100000000 + Math.random() * 900000000);
    const mockBarcode = `${prefix}${num}IN`;
    setTrackingId(mockBarcode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) {
      alert('Tracking ID is required.');
      return;
    }
    if (!recipientId) {
      alert('Recipient is required.');
      return;
    }

    const firstCodeId = selectedCodes[0];
    const firstCode = projectCodes.find((p) => p.id === firstCodeId);
    const costNum = parseFloat(cost) || 0;

    // 1. Create dispatch
    const disp = mockStore.createDispatch({
      direction,
      booking_date: bookingDate,
      carrier,
      tracking_id: trackingId.trim().toUpperCase(),
      sender_address_id: addressBook[0]?.id || null,
      sender_id: addressBook[0]?.id || null, // Lextria main desk
      recipient_address_id: recipientId,
      recipient_id: recipientId,
      document_type: docType,
      doc_type: docType,
      particulars: particulars.trim() || null,
      status: 'BOOKED',
      ad_card_received: false,
      cost: costNum,
      payment_mode: paymentMode,
      legal_evidence: legalEvidence,
      project_codes: selectedCodes,
    });

    let uploadedDocId: string | null = null;
    let uploadedFileName: string | null = null;

    // 2. If receipt PDF was attached, upload it
    if (attachedReceiptPdf) {
      uploadedFileName = generateFileName(
        firstCode?.code || 'OFFICE',
        'BOOKING_RECEIPT',
        disp.tracking_id,
        bookingDate
      );
      const folderPath = resolveFolderPath(
        'Postal & Courier',
        'CLI',
        firstCode?.client_name,
        firstCode?.code
      );

      const docRecord = await uploadDocument({
        file: attachedReceiptPdf.blob,
        fileName: uploadedFileName,
        category: 'Postal & Courier',
        projectCodeId: firstCodeId || null,
        folderPath,
      });

      uploadedDocId = docRecord.id;
      mockStore.addScanToDispatch(disp.id, 'BOOKING_RECEIPT', docRecord.id, uploadedFileName);
    }

    // 3. If cost > 0 and record in petty cash is checked, create linked cash entry
    if (recordInPettyCash && costNum > 0) {
      const isPost = carrier.includes('POST');
      const catCode = isPost ? 'INDIA_POST' : 'PRIVATE_COURIER';
      const equalShare = selectedCodes.length > 0 ? Number((costNum / selectedCodes.length).toFixed(2)) : costNum;
      const allocs = selectedCodes.map((pcId, idx) => ({
        project_code_id: pcId,
        amount:
          idx === selectedCodes.length - 1
            ? Number((costNum - equalShare * (selectedCodes.length - 1)).toFixed(2))
            : equalShare,
        doc_count: 1,
      }));

      try {
        mockStore.addExpense({
          entry_date: bookingDate,
          category: catCode,
          description: `Postage charges for dispatch ${disp.tracking_id} (${docType.replace(/_/g, ' ')})`,
          amount: costNum,
          payment_mode: paymentMode,
          receipt_document_id: uploadedDocId,
          receipt_file_name: uploadedFileName,
          linked_dispatch_id: disp.id,
          is_recoverable: selectedCodes.length > 0,
          allocations: allocs,
        });
      } catch {
        // Continue even if low balance warning
      }
    }

    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              New Postal / Courier Dispatch
            </h3>
            <p className="text-[11px] text-slate-500">Phone-first booking & receipt capture</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Direction & Booking Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Direction
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'OUTWARD' | 'INWARD')}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="OUTWARD">Outward (Post Office / Courier)</option>
                <option value="INWARD">Inward (Received at Office)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Booking Date
              </label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Recipient Picker (Address Book Autocomplete, Most-Used First) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Recipient (from Address Book) *
              </label>
              <span className="text-[11px] text-teal-600 dark:text-teal-400">
                Sorted by most frequently used
              </span>
            </div>
            <select
              required
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {addressBook.map((addr) => (
                <option key={addr.id} value={addr.id}>
                  {addr.name} ({addr.type.replace('_', ' ')}) — {addr.times_used} uses
                </option>
              ))}
            </select>
          </div>

          {/* Carrier & Tracking ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Carrier *
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value as CarrierType)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="INDIA_SPEED_POST">India Speed Post</option>
                <option value="INDIA_REGISTERED_POST">India Registered Post</option>
                <option value="POSTAL_AD">Postal with A.D. Card</option>
                <option value="PRIVATE_COURIER_SPEED">Private Courier (Speed / Express)</option>
                <option value="PRIVATE_COURIER_REGISTERED">Private Courier (Registered)</option>
                <option value="PROFESSIONAL_COURIER">Professional Courier</option>
                <option value="BUS_PARCEL">Bus Parcel Service</option>
                <option value="HAND_DELIVERY">Hand Delivery</option>
                <option value="OTHER">Other Carrier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tracking ID / Barcode *
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  placeholder="e.g. JK000000001IN"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 text-xs font-mono font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 uppercase"
                />
                <button
                  type="button"
                  onClick={handleScanBarcode}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  title="Simulate / Scan Barcode"
                >
                  <Barcode className="w-4 h-4 text-teal-600" />
                  <span className="hidden sm:inline">Scan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Project Codes (Multi-Select Join) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Linked Project Codes (One or More Matters)
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg max-h-28 overflow-y-auto">
              {projectCodes.map((p) => {
                const isSelected = selectedCodes.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleToggleCode(p.id)}
                    className={`text-xs px-2.5 py-1 rounded-md transition font-mono ${
                      isSelected
                        ? 'bg-teal-600 text-white font-semibold shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-teal-500'
                    }`}
                  >
                    {p.code} ({p.title.slice(0, 18)}...)
                  </button>
                );
              })}
            </div>
            {selectedCodes.length > 1 && (
              <p className="text-[11px] text-teal-600 mt-1">
                Note: File is stored once in WorkDrive under the first matter's folder and linked to all {selectedCodes.length} project codes.
              </p>
            )}
          </div>

          {/* Document Type & Legal Evidence Flag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Document Contents Type *
              </label>
              <select
                value={docType}
                onChange={(e) => handleDocTypeChange(e.target.value as DocType)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="LEGAL_NOTICE">Legal Notice / Cease & Desist</option>
                <option value="POA">Power of Attorney (POA)</option>
                <option value="COVER_LETTER">Cover Letter / Formal Filing</option>
                <option value="RTI">RTI Application</option>
                <option value="OFFICE_ACTION_REPLY">Office Action Reply / FER</option>
                <option value="FORMS_FOR_SIGNATURE">Forms for Signature</option>
                <option value="CERTIFICATE">Registration Certificate</option>
                <option value="ORIGINALS">Original Legal Documents</option>
                <option value="OTHER">Other Documents</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={legalEvidence}
                  onChange={(e) => setLegalEvidence(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Legal Evidence Dispatch
                </span>
              </label>
            </div>
          </div>

          {legalEvidence && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-2.5 text-xs text-amber-900 dark:text-amber-200 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Legal-Evidence Rule:</strong> Requires 4 mandatory proofs (Booking Receipt, Document Copy, Proof of Delivery/AD card, and Tracking History screenshot) before it can be marked complete.
              </div>
            </div>
          )}

          {/* Particulars Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Particulars Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Infringement notice sent to opposite party regarding patents..."
              value={particulars}
              onChange={(e) => setParticulars(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Cost & Payment Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Postage / Courier Cost (₹)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as 'CASH' | 'FIRM_UPI')}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="CASH">Office Cash (Petty Cash)</option>
                <option value="FIRM_UPI">Firm UPI (Cost tracking only)</option>
              </select>
            </div>
          </div>

          {parseFloat(cost) > 0 && (
            <label className="flex items-center gap-2 p-2.5 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 rounded-lg text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={recordInPettyCash}
                onChange={(e) => setRecordInPettyCash(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="font-semibold text-teal-900 dark:text-teal-200">
                Record ₹{cost} in Petty Cash Book (pre-fills project codes as allocation)
              </span>
            </label>
          )}

          {/* Receipt Photo / Scanner Attachment */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-teal-600" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {attachedReceiptPdf
                    ? `Receipt PDF Attached (${attachedReceiptPdf.pages} page${attachedReceiptPdf.pages > 1 ? 's' : ''})`
                    : 'Photograph Postal Receipt'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {attachedReceiptPdf
                    ? 'Ready for WorkDrive upload'
                    : 'Snap camera photos; stitches into PDF automatically'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-teal-500 text-teal-700 dark:text-teal-300 text-xs font-semibold rounded-lg shadow-2xs transition"
            >
              {attachedReceiptPdf ? 'Re-take' : 'Capture Receipt'}
            </button>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Check className="w-4 h-4" />
              <span>Book Dispatch</span>
            </button>
          </div>
        </form>
      </div>

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onComplete={(blob, pages) => setAttachedReceiptPdf({ blob, pages })}
      />
    </div>
  );
};
