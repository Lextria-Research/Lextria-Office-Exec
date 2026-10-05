// src/features/dispatches/BatchDispatchModal.tsx
import React, { useState } from 'react';
import { mockStore, CarrierType, DocType } from '../../lib/mockData';
import { clock } from '../../lib/clock';
import { ReceiptScannerModal } from '../../components/camera/ReceiptScannerModal';
import { uploadDocument, generateFileName, resolveFolderPath } from '../../lib/files';
import { Layers, Plus, Trash2, Camera, Check, X, AlertCircle } from 'lucide-react';

interface BatchRow {
  id: string;
  tracking_id: string;
  project_code_id: string;
  doc_type: DocType;
  cost: number;
  particulars: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BatchDispatchModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const addressBook = mockStore.getAddressBook();
  const projectCodes = mockStore.getProjectCodes();

  // Common Batch Settings
  const [recipientId, setRecipientId] = useState(addressBook[1]?.id || addressBook[0]?.id || '');
  const [carrier, setCarrier] = useState<CarrierType>('INDIA_SPEED_POST');
  const [bookingDate, setBookingDate] = useState(clock.todayISO());
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'FIRM_UPI'>('CASH');

  // Shared Receipt
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [attachedReceiptPdf, setAttachedReceiptPdf] = useState<{ blob: Blob; pages: number } | null>(null);

  // Rows (initialize with 3 rows, allow quick adding up to 10+)
  const [rows, setRows] = useState<BatchRow[]>([
    {
      id: 'row-1',
      tracking_id: 'EK100000001IN',
      project_code_id: projectCodes[0]?.id || '',
      doc_type: 'FORMS_FOR_SIGNATURE',
      cost: 45,
      particulars: 'Form 14 software copyright batch submission 1',
    },
    {
      id: 'row-2',
      tracking_id: 'EK100000002IN',
      project_code_id: projectCodes[1]?.id || '',
      doc_type: 'FORMS_FOR_SIGNATURE',
      cost: 45,
      particulars: 'Form 14 software copyright batch submission 2',
    },
    {
      id: 'row-3',
      tracking_id: 'EK100000003IN',
      project_code_id: projectCodes[2]?.id || '',
      doc_type: 'FORMS_FOR_SIGNATURE',
      cost: 45,
      particulars: 'Form 14 software copyright batch submission 3',
    },
  ]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const nextNum = rows.length + 1;
    const baseTracking = carrier.includes('SPEED') ? 'EK' : 'RK';
    const num = Math.floor(100000000 + Math.random() * 900000000);

    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${nextNum}`,
        tracking_id: `${baseTracking}${num}IN`,
        project_code_id: projectCodes[nextNum % projectCodes.length]?.id || '',
        doc_type: 'FORMS_FOR_SIGNATURE',
        cost: 45,
        particulars: `Copyright filing batch entry #${nextNum}`,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, field: keyof BatchRow, value: any) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handlePopulate10Dispatches = () => {
    const baseTracking = carrier.includes('SPEED') ? 'EK' : 'RK';
    const newRows: BatchRow[] = [];
    for (let i = 1; i <= 10; i++) {
      const num = 500000000 + i * 1111;
      newRows.push({
        id: `row-auto-${i}`,
        tracking_id: `${baseTracking}${num}IN`,
        project_code_id: projectCodes[(i - 1) % projectCodes.length]?.id || '',
        doc_type: 'FORMS_FOR_SIGNATURE',
        cost: 45,
        particulars: `Batch copyright filing document set #${i}`,
      });
    }
    setRows(newRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId) {
      alert('Recipient is required.');
      return;
    }
    if (rows.length === 0) {
      alert('Add at least one dispatch row.');
      return;
    }

    // 1. Submit batch dispatches
    const createdDispatches = mockStore.createBatchDispatches(
      {
        booking_date: bookingDate,
        carrier,
        recipient_id: recipientId,
        payment_mode: paymentMode,
      },
      rows.map((r) => ({
        tracking_id: r.tracking_id.trim().toUpperCase(),
        project_code_id: r.project_code_id,
        doc_type: r.doc_type,
        cost: r.cost,
        particulars: r.particulars,
      }))
    );

    // 2. If shared receipt was attached, upload once and link across batch
    if (attachedReceiptPdf && createdDispatches.length > 0) {
      const firstDisp = createdDispatches[0];
      const firstCode = projectCodes.find((p) => p.id === rows[0]?.project_code_id);
      const fileName = generateFileName(
        firstCode?.code || 'OFFICE',
        'BATCH_RECEIPT',
        `BATCH_${rows.length}_ITEMS`,
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
        fileName,
        category: 'Postal & Courier',
        projectCodeId: firstCode?.id || null,
        folderPath,
      });

      // Link scan to each created dispatch in batch
      createdDispatches.forEach((d) => {
        mockStore.addScanToDispatch(d.id, 'BOOKING_RECEIPT', docRecord.id, fileName);
      });
    }

    onSuccess?.();
    onClose();
  };

  const totalCost = rows.reduce((sum, r) => sum + (parseFloat(String(r.cost)) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                Batch Dispatch Entry (Multiple Postal/Courier Items)
              </h3>
              <p className="text-[11px] text-slate-500">
                Single recipient & shared receipt with multiple matter tracking rows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Step 1: Fixed recipient, carrier, date, receipt */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Step 1: Common Destination & Postage Settings</span>
              <button
                type="button"
                onClick={handlePopulate10Dispatches}
                className="text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold"
              >
                + Auto-fill 10 Dispatches for Acceptance Test
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Office *
                </label>
                <select
                  required
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                >
                  {addressBook.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.name} ({addr.type.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Carrier *
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value as CarrierType)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="INDIA_SPEED_POST">India Speed Post</option>
                  <option value="INDIA_REGISTERED_POST">India Registered Post</option>
                  <option value="PRIVATE_COURIER_SPEED">Private Courier Express</option>
                  <option value="PROFESSIONAL_COURIER">Professional Courier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Booking Date *
                </label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Shared receipt capture */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-teal-600" />
                <span className="text-slate-700 dark:text-slate-300">
                  {attachedReceiptPdf
                    ? `Shared Batch Receipt Attached (${attachedReceiptPdf.pages} pages stitched)`
                    : 'Shared Post Office Receipt Photo (Optional)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-teal-600 hover:border-teal-500"
              >
                {attachedReceiptPdf ? 'Re-take Receipt' : 'Snap Receipt'}
              </button>
            </div>
          </div>

          {/* Step 2: Tabular Dispatches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Step 2: Dispatch Rows ({rows.length} items — Total: ₹{totalCost.toFixed(2)})
              </h4>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 px-3 py-1 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-xs font-semibold rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Tracking ID *</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Project Code *</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Document Type</th>
                    <th className="py-2.5 px-3 w-24">Cost (₹)</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Particulars</th>
                    <th className="py-2.5 px-3 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          required
                          value={row.tracking_id}
                          onChange={(e) =>
                            handleUpdateRow(idx, 'tracking_id', e.target.value.toUpperCase())
                          }
                          className="w-full px-2 py-1 text-xs font-mono font-semibold uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={row.project_code_id}
                          onChange={(e) => handleUpdateRow(idx, 'project_code_id', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        >
                          {projectCodes.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} — {p.title.slice(0, 18)}...
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={row.doc_type}
                          onChange={(e) => handleUpdateRow(idx, 'doc_type', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        >
                          <option value="FORMS_FOR_SIGNATURE">Forms for Signature</option>
                          <option value="CERTIFICATE">Certificate</option>
                          <option value="POA">Power of Attorney</option>
                          <option value="LEGAL_NOTICE">Legal Notice</option>
                          <option value="COVER_LETTER">Cover Letter</option>
                          <option value="ORIGINALS">Originals</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={row.cost}
                          onChange={(e) =>
                            handleUpdateRow(idx, 'cost', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.particulars}
                          onChange={(e) => handleUpdateRow(idx, 'particulars', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          disabled={rows.length <= 1}
                          onClick={() => handleRemoveRow(idx)}
                          className="text-slate-400 hover:text-red-500 disabled:opacity-30 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              Each row will write an individual event to <code>core.matter_events</code>.
            </span>
            <div className="flex items-center gap-2">
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
                <span>Book All ({rows.length}) Dispatches</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onComplete={(blob, pages) => setAttachedReceiptPdf({ blob, pages })}
        title="Capture Shared Batch Receipt (PDF)"
      />
    </div>
  );
};
