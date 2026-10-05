// src/features/home/HomeScreen.tsx
import React, { useState, useSyncExternalStore } from 'react';
import { mockStore } from '../../lib/mockData';
import { clock } from '../../lib/clock';
import { formatINR } from '../../lib/currency';
import { NewDispatchModal } from '../dispatches/NewDispatchModal';
import { BatchDispatchModal } from '../dispatches/BatchDispatchModal';
import { AddExpenseModal } from '../petty-cash/AddExpenseModal';
import { NavLink } from 'react-router-dom';
import {
  Send,
  DollarSign,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  Smartphone,
  Key,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const dispatches = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getDispatches()
  );

  // Subscribe to cash entries to reactively update cash balance
  useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getCashEntries()
  );

  const [isNewDispatchOpen, setIsNewDispatchOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Computed metrics
  const todayISO = clock.todayISO();
  const bookedToday = dispatches.filter((d) => d.booking_date === todayISO).length;
  const inTransitCount = dispatches.filter((d) => d.status === 'IN_TRANSIT').length;
  const overdueCount = dispatches.filter(
    (d) =>
      (d.status === 'BOOKED' || d.status === 'IN_TRANSIT') &&
      clock.daysAgo(d.booking_date) >= 7
  ).length;

  // Reactive petty cash balance (Phase 2 benchmark ₹962)
  const cashBalance = mockStore.getCashBalance();
  const lowBalanceThreshold = 300.0;

  // Reactive subscriptions
  const officeRequests = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getOfficeRequests()
  );

  const custodyItems = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getCustodyItems()
  );

  const projectCodes = mockStore.getProjectCodes();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Low Balance Warning */}
      {cashBalance < lowBalanceThreshold && (
        <div className="bg-amber-500 text-white p-3.5 rounded-xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">
              Low Petty Cash Float Alert: Current balance is {formatINR(cashBalance)} (below threshold ₹300). Request a top-up from Finance.
            </span>
          </div>
          <NavLink
            to="/petty-cash"
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shrink-0"
          >
            Request Top-Up
          </NavLink>
        </div>
      )}

      {/* Quick Action Bar (Phone-first big tap targets) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Quick Actions (At Post Office / Notary / Desk)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setIsNewDispatchOpen(true)}
            className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 transition text-teal-800 dark:text-teal-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Book Dispatch</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBatchOpen(true)}
            className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 transition text-slate-800 dark:text-slate-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Batch Dispatch</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition text-emerald-800 dark:text-emerald-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Add Cash Expense</span>
          </button>

          <NavLink
            to="/custody"
            className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition text-indigo-800 dark:text-indigo-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Receive Document</span>
          </NavLink>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Booked Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Booked Today</span>
            <Send className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
            {bookedToday}
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1">
            {clock.todayDisplay()}
          </div>
        </div>

        {/* Pending Deliveries > 7 Days */}
        <NavLink
          to="/dispatches?filter=overdue"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-400 rounded-xl p-4 shadow-xs transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Overdue &gt; 7 Days</span>
            <Clock className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
            {overdueCount}
          </div>
          <div className="text-[11px] text-red-500 mt-1">Follow-up needed</div>
        </NavLink>

        {/* Petty Cash Book Balance */}
        <NavLink
          to="/petty-cash"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 rounded-xl p-4 shadow-xs transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Petty Cash Balance</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatINR(cashBalance)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Computed float balance</div>
        </NavLink>

        {/* Active Errands */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Today&apos;s Errands</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
            {officeRequests.filter((e) => e.status !== 'DONE').length} Open
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Notary &amp; field tasks</div>
        </div>
      </div>

      {/* Main Grid: Errands & Custody Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Errands List (2 columns on lg) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                Today&apos;s Staff Errand Requests
              </h3>
            </div>
            <NavLink
              to="/errands"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <div className="space-y-3">
            {officeRequests.map((errand) => {
              const pc = projectCodes.find((p) => p.id === errand.project_code_id);
              return (
                <div
                  key={errand.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {errand.title}
                      </span>
                      {pc && (
                        <span className="text-[10px] font-mono font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded">
                          {pc.code}
                        </span>
                      )}
                      {errand.priority === 'URGENT' && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 px-1.5 py-0.5 rounded">
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Requested by <strong>{errand.requested_by_name}</strong> • Target:{' '}
                      {errand.needed_by ? clock.formatDisplay(errand.needed_by) : 'Today'}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      errand.status === 'DONE'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/70 dark:text-green-300'
                        : errand.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                    }`}
                  >
                    {errand.status.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current DSC & OTP Phone Custody Holders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Active Custody Tokens
              </h3>
            </div>
            <NavLink
              to="/custody"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <p className="text-[11px] text-slate-500">
            Live holder status for DSC digital signature USBs and the office OTP verification mobile phone.
          </p>

          <div className="space-y-3">
            {custodyItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1"
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {item.item_type === 'PHONE' ? (
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Key className="w-4 h-4 text-indigo-600" />
                  )}
                  <span>{item.item_name}</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>
                    Holder: <strong>{item.current_holder_name || 'In Office Safe'}</strong>
                  </span>
                  <span className="text-slate-400 font-mono">
                    {item.status === 'AVAILABLE' ? 'Available' : 'Checked Out'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewDispatchModal isOpen={isNewDispatchOpen} onClose={() => setIsNewDispatchOpen(false)} />
      <BatchDispatchModal isOpen={isBatchOpen} onClose={() => setIsBatchOpen(false)} />
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
};
