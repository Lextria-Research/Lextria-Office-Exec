// src/features/petty-cash/MonthlySummaryView.tsx
import React, { useState } from 'react';
import { mockStore, CashEntry, CashCategory } from '../../lib/mockData';
import { currency } from '../../lib/currency';
import { clock } from '../../lib/clock';
import {
  Download,
  PieChart,
  Users,
  Calendar,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const MonthlySummaryView: React.FC = () => {
  const entries = mockStore.getCashEntries();
  const categories = mockStore.getCashCategories();
  const projectCodes = mockStore.getProjectCodes();

  // Month selector (default current month e.g. "2026-10")
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Filter entries for the selected month
  const monthEntries = entries.filter((e) => e.entry_date.startsWith(selectedMonth));

  // Compute metrics for this month
  const totalTopUps = monthEntries
    .filter((e) => e.entry_type === 'TOP_UP' && e.status === 'ACTIVE')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalCashExpenses = monthEntries
    .filter((e) => e.entry_type === 'EXPENSE' && e.payment_mode === 'CASH' && e.status === 'ACTIVE')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalFirmUpiExpenses = monthEntries
    .filter((e) => e.entry_type === 'EXPENSE' && e.payment_mode === 'FIRM_UPI' && e.status === 'ACTIVE')
    .reduce((sum, e) => sum + e.amount, 0);

  // Group by category
  const categorySummary = categories.map((cat) => {
    const catEntries = monthEntries.filter(
      (e) => e.category === cat.code && e.entry_type === 'EXPENSE' && e.status === 'ACTIVE'
    );
    const total = catEntries.reduce((sum, e) => sum + e.amount, 0);
    return {
      category: cat,
      count: catEntries.length,
      total,
    };
  }).filter((c) => c.count > 0 || c.total > 0);

  // Group by client and project code from allocations
  interface ClientSpend {
    clientId: string;
    clientName: string;
    projectCode: string;
    projectTitle: string;
    totalAmount: number;
    count: number;
  }

  const clientSpendsMap = new Map<string, ClientSpend>();

  monthEntries
    .filter((e) => e.entry_type === 'EXPENSE' && e.status === 'ACTIVE')
    .forEach((e) => {
      e.allocations.forEach((alloc) => {
        const pc = projectCodes.find((p) => p.id === alloc.project_code_id);
        const key = `${pc?.client_code || 'OTHER'}_${pc?.code || 'UNKNOWN'}`;

        const existing = clientSpendsMap.get(key) || {
          clientId: pc?.client_code || 'N/A',
          clientName: pc?.client_name || 'General / Unassigned',
          projectCode: pc?.code || 'Overhead',
          projectTitle: pc?.title || 'General Legal Spend',
          totalAmount: 0,
          count: 0,
        };

        existing.totalAmount += alloc.amount;
        existing.count += 1;
        clientSpendsMap.set(key, existing);
      });
    });

  const clientSpends = Array.from(clientSpendsMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      'Entry No',
      'Date',
      'Type',
      'Category',
      'Description',
      'Payment Mode',
      'Amount (INR)',
      'Recoverable',
      'Project Codes & Allocations',
      'Status',
    ];

    const rows = monthEntries.map((e) => [
      e.entry_no,
      e.entry_date,
      e.entry_type,
      e.category,
      `"${e.description.replace(/"/g, '""')}"`,
      e.payment_mode,
      e.amount.toFixed(2),
      e.is_recoverable ? 'YES' : 'NO',
      `"${e.allocations
        .map((a) => {
          const pc = projectCodes.find((p) => p.id === a.project_code_id);
          return `${pc?.code || a.project_code_id}: Rs.${a.amount}`;
        })
        .join('; ')}"`,
      e.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Lextria_Petty_Cash_Summary_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Month Selector & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Monthly Finance Reconciliation
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown by category, client recovery, and exportable ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-teal-600"
          >
            <option value="2026-09">September 2026</option>
            <option value="2026-10">October 2026</option>
            <option value="2026-08">August 2026</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Export to Excel / CSV
          </button>
        </div>
      </div>

      {/* Top Level Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Cash Top-ups</span>
          <p className="text-xl font-mono font-bold text-teal-600 dark:text-teal-400 mt-1">
            {currency.formatINR(totalTopUps)}
          </p>
          <span className="text-[11px] text-slate-400">Added to physical drawer</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-medium text-slate-500">Physical Cash Out (Disbursed)</span>
          <p className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
            {currency.formatINR(totalCashExpenses)}
          </p>
          <span className="text-[11px] text-slate-400">Deducted from float</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-medium text-slate-500">Firm UPI Paid (Direct Account)</span>
          <p className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {currency.formatINR(totalFirmUpiExpenses)}
          </p>
          <span className="text-[11px] text-indigo-500">Recoverable, float untouched</span>
        </div>
      </div>

      {/* Category Breakdown & Client Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <PieChart className="w-4 h-4 text-teal-600" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Expenses by Category ({selectedMonth})
            </h4>
          </div>

          {categorySummary.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No expenses recorded in {selectedMonth}.
            </p>
          ) : (
            <div className="space-y-3">
              {categorySummary.map((item) => (
                <div
                  key={item.category.code}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.category.label}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {item.count} entries • {item.category.is_recoverable_default ? 'Client Recoverable' : 'Office Overhead'}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                    {currency.formatINR(item.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client & Project Code Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Users className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Recoverable Spend by Client & Matter
            </h4>
          </div>

          {clientSpends.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No client-allocated spend in {selectedMonth}.
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {clientSpends.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900">
                        {item.projectCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {item.clientName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                      {item.projectTitle} ({item.count} items)
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                    {currency.formatINR(item.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
