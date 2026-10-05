import React, { useState, useMemo, useSyncExternalStore } from 'react';
import { mockStore, CashEntry } from '../../lib/mockData';
import { getStoredUser, getViewAsRole } from '../../lib/auth';
import { currency } from '../../lib/currency';
import { clock } from '../../lib/clock';
import {
  Banknote,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  RotateCcw,
  Receipt,
  FileText,
  CreditCard,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { AddExpenseModal } from './AddExpenseModal';
import { MonthlySummaryView } from './MonthlySummaryView';
import { TopupAndCountsView } from './TopupAndCountsView';

export const PettyCashView: React.FC = () => {
  const user = getStoredUser();
  const simulatedRole = getViewAsRole();
  const effectiveRole = simulatedRole || user?.role || 'OFFICE_EXEC';

  // Role permissions:
  // OFFICE_EXEC: full access
  // SUPER_ADMIN: full access
  // FINANCE: read petty cash book and dispatch costs
  // Other staff: CANNOT see the petty cash book
  const canViewCashBook =
    effectiveRole === 'OFFICE_EXEC' ||
    effectiveRole === 'SUPER_ADMIN' ||
    effectiveRole === 'FINANCE';

  const [activeTab, setActiveTab] = useState<'LEDGER' | 'SUMMARY' | 'TOPUPS' | 'RECOVERABLE'>('LEDGER');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Subscribe to reactive store
  const cashEntries = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getCashEntries()
  );

  const runningEntries = useMemo(() => {
    const chronological = [...cashEntries].sort((a, b) => a.entry_no - b.entry_no);
    let running = 0;
    const computed = chronological.map((entry) => {
      if (entry.status === 'ACTIVE') {
        if (entry.entry_type === 'TOP_UP' || entry.entry_type === 'REFUND_IN') {
          running += entry.amount;
        } else if (entry.entry_type === 'EXPENSE' && entry.payment_mode === 'CASH') {
          running -= entry.amount;
        }
      }
      return { entry, runningBalance: running };
    });
    return computed.reverse();
  }, [cashEntries]);

  const categories = mockStore.getCashCategories();
  const projectCodes = mockStore.getProjectCodes();
  const recoverableCosts = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getRecoverableCosts()
  );

  const currentBalance = useMemo(() => {
    return cashEntries
      .filter((e) => e.status === 'ACTIVE')
      .reduce((bal, e) => {
        if (e.entry_type === 'TOP_UP' || e.entry_type === 'REFUND_IN') {
          return bal + e.amount;
        }
        if (e.entry_type === 'EXPENSE' && e.payment_mode === 'CASH') {
          return bal - e.amount;
        }
        return bal;
      }, 0);
  }, [cashEntries]);

  const lowBalanceThreshold = 300.0;
  const isLowBalance = currentBalance < lowBalanceThreshold;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'ALL' | 'CASH' | 'FIRM_UPI'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  if (!canViewCashBook) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-2xl">
          <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Restricted Access
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            The firm's Petty Cash float book is restricted to Office Executives, Finance, and Super Admins.
          </p>
        </div>
      </div>
    );
  }

  // Filtered rows
  const filteredRunningList = runningEntries.filter(({ entry }) => {
    if (selectedCategory !== 'ALL' && entry.category !== selectedCategory) return false;
    if (selectedPaymentMode !== 'ALL' && entry.payment_mode !== selectedPaymentMode) return false;
    if (selectedMonth !== 'ALL' && !entry.entry_date.startsWith(selectedMonth)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = entry.description.toLowerCase().includes(q);
      const matchNo = entry.entry_no.toString().includes(q);
      const matchAlloc = entry.allocations.some((a) => {
        const pc = projectCodes.find((p) => p.id === a.project_code_id);
        return (
          pc?.code.toLowerCase().includes(q) ||
          pc?.client_name.toLowerCase().includes(q)
        );
      });
      return matchDesc || matchNo || matchAlloc;
    }

    return true;
  });

  const handleReverseEntry = (entryId: string) => {
    const reason = prompt('Reason for reversing / cancelling this cash entry:');
    if (reason && reason.trim()) {
      mockStore.reverseCashEntry(entryId, reason.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Petty Cash Ledger
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 rounded-full">
              schema: office
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Office float book with running computed balance, receipt verification, and automated Finance recovery
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Cash Balance Display */}
          <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Computed Float Balance
            </span>
            <span
              className={`text-lg font-mono font-extrabold ${
                isLowBalance ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'
              }`}
            >
              {currency.formatINR(currentBalance)}
            </span>
          </div>

          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Low-Balance Warning Alert */}
      {isLowBalance && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-center justify-between gap-4 text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold">Low Petty Cash Float Warning</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Current float balance is <strong>{currency.formatINR(currentBalance)}</strong>, which is below the safe threshold of {currency.formatINR(lowBalanceThreshold)}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('TOPUPS')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs shrink-0"
          >
            Request Top-up
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'LEDGER'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Float Book Ledger ({cashEntries.length})
        </button>

        <button
          onClick={() => setActiveTab('SUMMARY')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'SUMMARY'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Monthly Summary & Export
        </button>

        <button
          onClick={() => setActiveTab('TOPUPS')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'TOPUPS'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Top-ups & Weekly Counts
        </button>

        <button
          onClick={() => setActiveTab('RECOVERABLE')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'RECOVERABLE'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Recoverable Costs ({recoverableCosts.length})
        </button>
      </div>

      {/* Tab 1: Ledger Table */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search description, #, or matter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 shadow-2xs"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 shadow-2xs"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value as any)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 shadow-2xs"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="CASH">Physical Cash</option>
              <option value="FIRM_UPI">Firm UPI (Account)</option>
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 shadow-2xs"
            >
              <option value="ALL">All Months</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
            </select>
          </div>

          {/* Ledger Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-4">Description & Allocations</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3 text-right">In (₹)</th>
                    <th className="py-3 px-3 text-right">Out (₹)</th>
                    <th className="py-3 px-3 text-right">Float Balance</th>
                    <th className="py-3 px-3 text-center">Receipt</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredRunningList.map(({ entry, runningBalance }) => {
                    const isTopUp = entry.entry_type === 'TOP_UP' || entry.entry_type === 'REFUND_IN';
                    const isReversed = entry.status === 'REVERSED';

                    return (
                      <tr
                        key={entry.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          isReversed ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-500">
                          #{entry.entry_no}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {clock.formatDisplay(entry.entry_date)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isTopUp
                                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {entry.category.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {entry.description}
                          </p>

                          {/* Allocation pills if recoverable */}
                          {entry.allocations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {entry.allocations.map((a) => {
                                const pc = projectCodes.find((p) => p.id === a.project_code_id);
                                return (
                                  <span
                                    key={a.id}
                                    className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-900"
                                  >
                                    <strong>{pc?.code}</strong>: {currency.formatINR(a.amount)}
                                    <span className="text-slate-400">({pc?.client_code})</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {entry.cancel_reason && (
                            <p className="text-[10px] text-red-600 dark:text-red-400 italic mt-0.5">
                              Reversal reason: {entry.cancel_reason}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {entry.payment_mode === 'FIRM_UPI' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-900">
                              <CreditCard className="w-3 h-3" />
                              Firm UPI
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              <Banknote className="w-3 h-3" />
                              Cash
                            </span>
                          )}
                        </td>

                        {/* In (Top-up) */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                          {isTopUp ? currency.formatINR(entry.amount) : '—'}
                        </td>

                        {/* Out (Expense) */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {!isTopUp ? currency.formatINR(entry.amount) : '—'}
                        </td>

                        {/* Running Balance */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {entry.payment_mode === 'FIRM_UPI' ? (
                            <span className="text-indigo-400 text-[11px] font-normal" title="Firm UPI does not alter cash balance">
                              (UPI) {currency.formatINR(runningBalance)}
                            </span>
                          ) : (
                            currency.formatINR(runningBalance)
                          )}
                        </td>

                        {/* Evidence */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {entry.receipt_document_id || entry.receipt_file_name ? (
                            <span
                              title={entry.receipt_file_name || 'Receipt PDF'}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 dark:bg-green-950/60 dark:text-green-300 px-2 py-0.5 rounded-full"
                            >
                              <Receipt className="w-3 h-3" />
                              Attached
                            </span>
                          ) : entry.is_recoverable ? (
                            <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                              No Receipt
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">N/A</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {!isReversed && (
                            <button
                              onClick={() => handleReverseEntry(entry.id)}
                              title="Reverse / Cancel entry with reason"
                              className="text-slate-400 hover:text-amber-600 p-1 rounded-md"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Summary */}
      {activeTab === 'SUMMARY' && <MonthlySummaryView />}

      {/* Tab 3: Top-ups & Weekly Counts */}
      {activeTab === 'TOPUPS' && <TopupAndCountsView />}

      {/* Tab 4: Recoverable Costs Cross-App View */}
      {activeTab === 'RECOVERABLE' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recoverable Expenses Sent to Finance (`core.recoverable_costs`)
              </h3>
              <p className="text-xs text-slate-500">
                Money spent on clients' behalf. Finance reviews these and posts them to client invoices.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {recoverableCosts.length} Items Sent
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recoverableCosts.map((cost) => {
              const pc = projectCodes.find((p) => p.id === cost.project_code_id);
              return (
                <div key={cost.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900">
                        {pc?.code}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {cost.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Date: {clock.formatDisplay(cost.cost_date)}</span>
                      <span>Client: {pc?.client_name || cost.client_id}</span>
                      <span>Evidence: {cost.has_evidence ? '✓ Receipt attached' : '✗ No receipt'}</span>
                      {cost.review_note && (
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          Note: "{cost.review_note}"
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 block">
                      {currency.formatINR(cost.amount)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cost.posting_status === 'AUTO_POSTED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300'
                          : cost.posting_status === 'PENDING_FINANCE'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : cost.posting_status === 'NEEDS_REVIEW'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      {cost.posting_status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};
