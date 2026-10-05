// src/features/petty-cash/TopupAndCountsView.tsx
import React, { useState } from 'react';
import { mockStore, PettyCashTopupRequest, PettyCashCount } from '../../lib/mockData';
import { getStoredUser, getViewAsRole } from '../../lib/auth';
import { currency } from '../../lib/currency';
import { clock } from '../../lib/clock';
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Plus,
  HandCoins,
  Scale,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Lock,
} from 'lucide-react';

export const TopupAndCountsView: React.FC = () => {
  const user = getStoredUser();
  const simulatedRole = getViewAsRole();
  const effectiveRole = simulatedRole || user?.role || 'OFFICE_EXEC';
  const isFinanceOrAdmin = effectiveRole === 'FINANCE' || effectiveRole === 'SUPER_ADMIN';

  const topups = mockStore.getTopupRequests();
  const weeklyCounts = mockStore.getWeeklyCounts();
  const currentCashBalance = mockStore.getCashBalance();

  // Modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);

  // New Request Form
  const [requestAmount, setRequestAmount] = useState<number>(1000);
  const [requestReason, setRequestReason] = useState<string>('');

  // Weekly Count Form
  const [countDate, setCountDate] = useState<string>(clock.todayISO());
  const [physicalCash, setPhysicalCash] = useState<number>(currentCashBalance);
  const [countNote, setCountNote] = useState<string>('');

  const variance = physicalCash - currentCashBalance;

  // Handlers
  const handleCreateTopupRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestAmount <= 0 || !requestReason.trim()) return;

    mockStore.createTopupRequest(
      requestAmount,
      requestReason,
      user?.email || 'office.exec@test.lextria.local'
    );

    setRequestReason('');
    setRequestAmount(1000);
    setIsRequestModalOpen(false);
  };

  const handleDecideTopup = (requestId: string, approved: boolean) => {
    const note = prompt(
      approved ? 'Optional approval note for Office Exec:' : 'Reason for rejection:'
    );
    mockStore.decideTopupRequest(
      requestId,
      approved,
      user?.email || 'finance.lead@test.lextria.local',
      note || undefined
    );
  };

  const handleConfirmHandover = (requestId: string) => {
    if (
      window.confirm(
        'Confirm that you have received physical cash float from the Finance desk? This will immediately add to your petty cash ledger balance.'
      )
    ) {
      try {
        mockStore.confirmTopupHandover(requestId);
      } catch (err: unknown) {
        alert((err as Error).message || 'Failed to confirm handover');
      }
    }
  };

  const handleCreateWeeklyCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (variance !== 0 && !countNote.trim()) {
      alert('A note is required explaining any variance between physical cash and book balance.');
      return;
    }

    mockStore.addWeeklyCount(
      countDate,
      physicalCash,
      user?.email || 'office.exec@test.lextria.local',
      countNote
    );

    setCountNote('');
    setIsCountModalOpen(false);
  };

  const handleFinanceSignoff = (countId: string) => {
    const financeNote = prompt('Finance sign-off note (optional):');
    mockStore.signoffWeeklyCount(
      countId,
      user?.email || 'finance.lead@test.lextria.local',
      financeNote || undefined
    );
  };

  return (
    <div className="space-y-8">
      {/* Top-up Requests Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Petty Cash Float Top-up Requests (`core.petty_cash_topup_requests`)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Office Executive requests float &rarr; Finance approves &rarr; Office Executive confirms physical cash received
            </p>
          </div>

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Request Float Top-up
          </button>
        </div>

        {topups.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No top-up requests yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topups.map((req) => (
              <div
                key={req.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                      {currency.formatINR(req.amount)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'HANDED_OVER'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300'
                          : req.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : req.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300">{req.reason}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span>Requested: {clock.formatDisplay(req.requested_at)}</span>
                    {req.decided_by && (
                      <span>
                        • Decided by {req.decided_by} ({req.decision_note || 'No notes'})
                      </span>
                    )}
                    {req.handed_over_at && (
                      <span className="text-green-600 font-semibold">
                        • Handed Over & Recorded in Ledger
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons based on role and status */}
                <div className="flex items-center gap-2">
                  {/* Finance approval actions */}
                  {req.status === 'REQUESTED' && isFinanceOrAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecideTopup(req.id, true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecideTopup(req.id, false)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-100"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Office Exec confirmation of handover */}
                  {req.status === 'APPROVED' && (
                    <button
                      onClick={() => handleConfirmHandover(req.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs animate-pulse"
                    >
                      <HandCoins className="w-4 h-4" />
                      Confirm Cash Received
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Physical Cash Counts Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Weekly Physical Drawer Counts (`core.petty_cash_counts`)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Office counts physical safe float &rarr; variance calculated &rarr; Finance reviews & signs off
            </p>
          </div>

          <button
            onClick={() => setIsCountModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Record Weekly Count
          </button>
        </div>

        {weeklyCounts.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No weekly counts recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {weeklyCounts.map((cnt) => (
              <div
                key={cnt.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                      Count Date: {clock.formatDisplay(cnt.count_date)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cnt.finance_signoff_by
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {cnt.finance_signoff_by ? 'FINANCE SIGNED OFF' : 'AWAITING SIGNOFF'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span>
                      Physical: <strong>{currency.formatINR(cnt.physical_cash)}</strong>
                    </span>
                    <span>
                      Book Balance: <strong>{currency.formatINR(cnt.book_balance)}</strong>
                    </span>
                    <span
                      className={`font-bold ${
                        cnt.variance === 0
                          ? 'text-green-600'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      Variance: {cnt.variance > 0 ? `+${cnt.variance}` : cnt.variance}
                    </span>
                  </div>

                  {cnt.note && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                      Note: {cnt.note}
                    </p>
                  )}

                  {cnt.finance_signoff_by && (
                    <div className="text-[11px] text-green-700 dark:text-green-400 flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Signed off by {cnt.finance_signoff_by} on{' '}
                      {clock.formatDisplay(cnt.finance_signoff_at!)}
                      {cnt.finance_note && ` (${cnt.finance_note})`}
                    </div>
                  )}
                </div>

                {/* Sign-off button for Finance */}
                {!cnt.finance_signoff_by && isFinanceOrAdmin && (
                  <button
                    onClick={() => handleFinanceSignoff(cnt.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-2xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Finance Sign-off
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Request Top-up */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Raise Float Top-up Request
            </h3>
            <p className="text-xs text-slate-500">
              Request will be routed to the Finance team (`core.petty_cash_topup_requests`).
            </p>

            <form onSubmit={handleCreateTopupRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Required Amount (₹) *
                </label>
                <input
                  type="number"
                  step="50"
                  min="100"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justification / Upcoming Expenses *
                </label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g. Courier and notary float replenishment for high-volume patent filings this week"
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-2xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Weekly Count Entry */}
      {isCountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Record Weekly Physical Cash Count
            </h3>
            <p className="text-xs text-slate-500">
              Physical cash counted in the office safe vs system computed book balance.
            </p>

            <form onSubmit={handleCreateWeeklyCount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Count Date *
                </label>
                <input
                  type="date"
                  value={countDate}
                  onChange={(e) => setCountDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Physical Cash Counted (₹) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={physicalCash}
                  onChange={(e) => setPhysicalCash(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono font-bold"
                  required
                />
              </div>

              {/* Book balance & Variance display */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Book Balance:</span>
                  <span className="font-bold">{currency.formatINR(currentCashBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Variance:</span>
                  <span
                    className={`font-bold ${
                      variance === 0 ? 'text-green-600' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {variance === 0
                      ? '₹0.00 (Exact Match)'
                      : `${variance > 0 ? '+' : ''}${currency.formatINR(variance)}`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes {variance !== 0 ? '(Required for discrepancies)' : '(Optional)'}
                </label>
                <textarea
                  value={countNote}
                  onChange={(e) => setCountNote(e.target.value)}
                  placeholder={
                    variance !== 0
                      ? 'Explain why physical cash differs from book balance...'
                      : 'e.g. Clean weekly count, notes in safe'
                  }
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  required={variance !== 0}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCountModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs"
                >
                  Save Count Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
