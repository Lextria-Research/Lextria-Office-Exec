// src/features/petty-cash/AddExpenseModal.tsx
import React, { useState } from 'react';
import { mockStore, CashCategory } from '../../lib/mockData';
import { clock } from '../../lib/clock';
import { currency } from '../../lib/currency';
import {
  X,
  Plus,
  Trash2,
  Camera,
  AlertTriangle,
  Receipt,
  CreditCard,
  Banknote,
  Split,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { ReceiptScannerModal } from '../../components/camera/ReceiptScannerModal';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDispatchId?: string;
  initialProjectCodes?: string[];
  initialCost?: number;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDispatchId,
  initialProjectCodes = [],
  initialCost = 0,
}) => {
  const categories = mockStore.getCashCategories();
  const projectCodes = mockStore.getProjectCodes();
  const currentCashBalance = mockStore.getCashBalance();

  const [entryDate, setEntryDate] = useState<string>(clock.todayISO());
  const [category, setCategory] = useState<string>('NOTARY');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<number>(initialCost || 0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'FIRM_UPI'>('CASH');
  const [isRecoverable, setIsRecoverable] = useState<boolean>(true);
  const [receiptDocId, setReceiptDocId] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Allocation state
  type SplitMode = 'EQUAL' | 'DOC_COUNT' | 'CUSTOM';
  const [splitMode, setSplitMode] = useState<SplitMode>('EQUAL');

  interface AllocationRow {
    project_code_id: string;
    doc_count: number;
    amount: number;
  }

  const [allocations, setAllocations] = useState<AllocationRow[]>(() => {
    if (initialProjectCodes.length > 0) {
      const perItem = initialCost > 0 ? Number((initialCost / initialProjectCodes.length).toFixed(2)) : 0;
      return initialProjectCodes.map((pcId) => ({
        project_code_id: pcId,
        doc_count: 1,
        amount: perItem,
      }));
    }
    return [
      {
        project_code_id: projectCodes[0]?.id || '',
        doc_count: 1,
        amount: initialCost || 0,
      },
    ];
  });

  if (!isOpen) return null;

  // Handle category change
  const handleCategoryChange = (catCode: string) => {
    setCategory(catCode);
    const catObj = categories.find((c) => c.code === catCode);
    if (catObj) {
      setIsRecoverable(catObj.is_recoverable_default);
    }
  };

  // Recalculate allocations based on split mode
  const recalculateSplits = (newMode: SplitMode, rows: AllocationRow[], totalAmt: number) => {
    if (rows.length === 0) return rows;

    if (newMode === 'EQUAL') {
      const equalShare = Number((totalAmt / rows.length).toFixed(2));
      return rows.map((r, idx) => {
        // assign any rounding pennies to the last row
        if (idx === rows.length - 1) {
          const rest = rows.slice(0, rows.length - 1).reduce((sum, item) => sum + equalShare, 0);
          return { ...r, amount: Number((totalAmt - rest).toFixed(2)) };
        }
        return { ...r, amount: equalShare };
      });
    }

    if (newMode === 'DOC_COUNT') {
      const totalDocs = rows.reduce((sum, r) => sum + (r.doc_count || 1), 0);
      if (totalDocs === 0) return rows;
      let allocatedSoFar = 0;
      return rows.map((r, idx) => {
        if (idx === rows.length - 1) {
          return { ...r, amount: Number((totalAmt - allocatedSoFar).toFixed(2)) };
        }
        const rowAmt = Number(((r.doc_count / totalDocs) * totalAmt).toFixed(2));
        allocatedSoFar += rowAmt;
        return { ...r, amount: rowAmt };
      });
    }

    return rows;
  };

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (isRecoverable) {
      setAllocations((prev) => recalculateSplits(splitMode, prev, val));
    }
  };

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode);
    setAllocations((prev) => recalculateSplits(mode, prev, amount));
  };

  const addAllocationRow = () => {
    const unusedPc = projectCodes.find(
      (pc) => !allocations.some((a) => a.project_code_id === pc.id)
    );
    const nextPcId = unusedPc ? unusedPc.id : projectCodes[0]?.id || '';
    const updated = [...allocations, { project_code_id: nextPcId, doc_count: 1, amount: 0 }];
    setAllocations(recalculateSplits(splitMode, updated, amount));
  };

  const removeAllocationRow = (index: number) => {
    const updated = allocations.filter((_, i) => i !== index);
    setAllocations(recalculateSplits(splitMode, updated, amount));
  };

  const updateAllocationRow = (index: number, field: keyof AllocationRow, val: string | number) => {
    const updated = allocations.map((row, i) => {
      if (i === index) {
        return { ...row, [field]: val };
      }
      return row;
    });

    if (field === 'doc_count' && splitMode === 'DOC_COUNT') {
      setAllocations(recalculateSplits('DOC_COUNT', updated, amount));
    } else {
      setAllocations(updated);
    }
  };

  // Validation
  const isNegativeCashBlocked = paymentMode === 'CASH' && amount > currentCashBalance;
  const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const allocationMismatch = isRecoverable && Math.abs(totalAllocated - amount) > 0.05;

  const canSubmit =
    amount > 0 &&
    description.trim().length > 0 &&
    !isNegativeCashBlocked &&
    (!isRecoverable || (allocations.length > 0 && !allocationMismatch));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      mockStore.addExpense({
        entry_date: entryDate,
        category,
        description,
        amount,
        payment_mode: paymentMode,
        receipt_document_id: receiptDocId,
        receipt_file_name: receiptFileName,
        linked_dispatch_id: initialDispatchId || null,
        is_recoverable: isRecoverable,
        allocations: isRecoverable ? allocations : [],
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to record expense');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 rounded-lg">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Record Petty Cash Expense
                </h2>
                <p className="text-xs text-slate-500">
                  Current Float Balance: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{currency.formatINR(currentCashBalance)}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Negative balance guard warning */}
            {isNegativeCashBlocked && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-3 text-red-800 dark:text-red-300">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Insufficient Petty Cash Float</p>
                  <p>
                    An expense of {currency.formatINR(amount)} exceeds your current cash balance of {currency.formatINR(currentCashBalance)}.
                    <strong> Cash balance cannot go negative. Please request a top-up from Finance first.</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Date & Payment Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      paymentMode === 'CASH'
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-800 dark:text-teal-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Physical Cash
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('FIRM_UPI')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      paymentMode === 'FIRM_UPI'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-800 dark:text-indigo-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Firm UPI
                  </button>
                </div>
              </div>
            </div>

            {paymentMode === 'FIRM_UPI' && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                ℹ️ <strong>Firm UPI mode:</strong> Recorded for cost recovery & client ledger posting, but does <strong>not</strong> deduct from your physical cash balance.
              </p>
            )}

            {/* Category & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-600"
                >
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label} {c.is_recoverable_default ? '(Recoverable)' : '(Overhead)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={amount || ''}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-teal-600"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description / Purpose *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Notarisation of Form 1 declarations and powers of attorney"
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-600"
                required
              />
            </div>

            {/* Receipt upload & camera capture */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Receipt Photo / Proof
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {receiptDocId
                      ? `Attached: ${receiptFileName || 'Receipt PDF'}`
                      : 'Optional for overhead, strongly recommended for client recovery'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-600" />
                  {receiptDocId ? 'Retake Photo' : 'Snap Receipt'}
                </button>
              </div>

              {!receiptDocId && isRecoverable && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Saving without a receipt sets <code>has_evidence = false</code> in Finance client billing review.
                </p>
              )}
            </div>

            {/* Recoverable & Allocation Section */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Client Cost Recovery (`core.recoverable_costs`)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Allocate this spend to specific project codes to bill the client.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecoverable}
                    onChange={(e) => setIsRecoverable(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded-sm focus:ring-teal-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Recoverable from client
                  </span>
                </label>
              </div>

              {isRecoverable && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  {/* Split mode buttons */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Allocation Split Mode:
                    </span>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleSplitModeChange('EQUAL')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                          splitMode === 'EQUAL'
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Equal Split
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSplitModeChange('DOC_COUNT')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                          splitMode === 'DOC_COUNT'
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        By Doc Count
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSplitModeChange('CUSTOM')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                          splitMode === 'CUSTOM'
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Custom ₹
                      </button>
                    </div>
                  </div>

                  {/* Allocation Rows */}
                  <div className="space-y-2">
                    {allocations.map((row, index) => {
                      const pc = projectCodes.find((p) => p.id === row.project_code_id);
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                        >
                          <div className="flex-1">
                            <select
                              value={row.project_code_id}
                              onChange={(e) =>
                                updateAllocationRow(index, 'project_code_id', e.target.value)
                              }
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono"
                            >
                              {projectCodes.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} — {p.title}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                              Client: {pc?.client_name || 'Client'} ({pc?.client_code})
                            </span>
                          </div>

                          {splitMode === 'DOC_COUNT' && (
                            <div className="w-20">
                              <input
                                type="number"
                                min="1"
                                value={row.doc_count || 1}
                                onChange={(e) =>
                                  updateAllocationRow(index, 'doc_count', parseInt(e.target.value) || 1)
                                }
                                placeholder="Docs"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-900 dark:text-slate-100 text-center"
                              />
                              <span className="text-[9px] text-slate-500 text-center block">
                                Docs
                              </span>
                            </div>
                          )}

                          <div className="w-24">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={row.amount}
                              disabled={splitMode !== 'CUSTOM'}
                              onChange={(e) =>
                                updateAllocationRow(index, 'amount', parseFloat(e.target.value) || 0)
                              }
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right"
                            />
                            <span className="text-[9px] text-slate-500 text-right block">
                              ₹ Amount
                            </span>
                          </div>

                          {allocations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAllocationRow(index)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={addAllocationRow}
                      className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Project Code
                    </button>

                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-bold ${
                          allocationMismatch
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Allocated: {currency.formatINR(totalAllocated)} / {currency.formatINR(amount)}
                      </span>
                      {allocationMismatch && (
                        <p className="text-[10px] text-red-600">
                          Sum must match total expense amount
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                Record Expense
              </button>
            </div>
          </form>
        </div>
      </div>

      {isScannerOpen && (
        <ReceiptScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onUploadComplete={(docId: string, fileName: string) => {
            setReceiptDocId(docId);
            setReceiptFileName(fileName);
            setIsScannerOpen(false);
          }}
          defaultKind="BOOKING_RECEIPT"
          category="Petty Cash"
        />
      )}
    </>
  );
};
