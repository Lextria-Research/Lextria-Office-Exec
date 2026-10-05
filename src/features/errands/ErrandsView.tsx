// src/features/errands/ErrandsView.tsx
import React, { useState, useMemo, useSyncExternalStore } from 'react';
import { mockStore, OfficeRequest } from '../../lib/mockData';
import { getStoredUser, getViewAsRole } from '../../lib/auth';
import { clock } from '../../lib/clock';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Link as LinkIcon,
  Send,
  Banknote,
  FileText,
  User,
  Flame,
  Calendar,
} from 'lucide-react';

export const ErrandsView: React.FC = () => {
  const user = getStoredUser();
  const simulatedRole = getViewAsRole();
  const effectiveRole = simulatedRole || user?.role || 'OFFICE_EXEC';
  const isOfficeExecOrAdmin = effectiveRole === 'OFFICE_EXEC' || effectiveRole === 'SUPER_ADMIN';

  const requests = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getOfficeRequests()
  );

  const projectCodes = mockStore.getProjectCodes();
  const dispatches = mockStore.getDispatches();
  const cashEntries = mockStore.getCashEntries();
  const physicalDocs = mockStore.getPhysicalDocuments();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [completingRequest, setCompletingRequest] = useState<OfficeRequest | null>(null);

  // New Request Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<OfficeRequest['category']>('NOTARIZE');
  const [newProjectCodeId, setNewProjectCodeId] = useState(projectCodes[0]?.id || '');
  const [newPriority, setNewPriority] = useState<OfficeRequest['priority']>('NORMAL');
  const [newNeededBy, setNewNeededBy] = useState('2026-10-06T17:00');
  const [newDescription, setNewDescription] = useState('');

  // Complete Request Form
  const [completionNote, setCompletionNote] = useState('Completed as requested and verified.');
  const [linkedDispatchId, setLinkedDispatchId] = useState('');
  const [linkedCashId, setLinkedCashId] = useState('');
  const [linkedDocId, setLinkedDocId] = useState('');

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const pc = projectCodes.find((p) => p.id === r.project_code_id);
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q) || false;
        const matchRequester = r.requested_by_name.toLowerCase().includes(q);
        const matchCode = pc?.code.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchDesc && !matchRequester && !matchCode) return false;
      }
      return true;
    });
  }, [requests, statusFilter, priorityFilter, categoryFilter, searchQuery, projectCodes]);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    mockStore.createOfficeRequest({
      requested_by_id: user?.id || 'usr-tester-1',
      requested_by_name: user?.display_name || 'Staff Tester',
      requested_by_role: effectiveRole,
      project_code_id: newProjectCodeId || null,
      category: newCategory,
      title: newTitle,
      description: newDescription,
      priority: newPriority,
      needed_by: newNeededBy ? new Date(newNeededBy).toISOString() : undefined,
    });

    setIsNewRequestOpen(false);
    setNewTitle('');
    setNewDescription('');
  };

  const handleMarkComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRequest) return;

    mockStore.updateOfficeRequestStatus(completingRequest.id, 'DONE', {
      completion_note: completionNote,
      linked_dispatch_id: linkedDispatchId || undefined,
      linked_cash_entry_id: linkedCashId || undefined,
      linked_document_id: linkedDocId || undefined,
    });

    setCompletingRequest(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Staff Errand &amp; Field Requests
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 rounded-full">
              schema: office
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal firm requests for notary attestations, stamp paper procurement, court paper book dispatches, and physical collections
          </p>
        </div>

        <button
          onClick={() => setIsNewRequestOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Raise Errand Request
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Requests
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {requests.length}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-500 block tracking-wider">
            Open &amp; Pending
          </span>
          <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {requests.filter((r) => r.status === 'OPEN').length}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-indigo-500 block tracking-wider">
            In Progress
          </span>
          <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
            {requests.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'ACCEPTED').length}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-500 block tracking-wider">
            Completed (Done)
          </span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {requests.filter((r) => r.status === 'DONE').length}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search request title, requester, or matter code..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-teal-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done (Completed)</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Categories</option>
          <option value="NOTARIZE">Notarize</option>
          <option value="BUY_STAMP_PAPER">Buy Stamp Paper</option>
          <option value="COURIER">Courier / Post</option>
          <option value="COLLECT_ORIGINALS">Collect Originals</option>
          <option value="DELIVER">Hand Delivery</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.map((req) => {
          const pc = projectCodes.find((p) => p.id === req.project_code_id);
          const isUrgent = req.priority === 'URGENT';
          const isDone = req.status === 'DONE';

          return (
            <div
              key={req.id}
              className={`p-4 rounded-xl border bg-white dark:bg-slate-900 transition shadow-xs space-y-3 ${
                isDone
                  ? 'border-slate-200 dark:border-slate-800 opacity-80'
                  : isUrgent
                  ? 'border-red-300 dark:border-red-900/60 bg-red-50/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                      #{req.request_no}
                    </span>
                    {pc && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 rounded-md">
                        {pc.code}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-md">
                      {req.category.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        req.priority === 'URGENT'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300'
                          : req.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {req.priority === 'URGENT' && <Flame className="w-3 h-3" />}
                      {req.priority}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {req.title}
                  </h3>

                  {req.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {req.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      req.status === 'DONE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : req.status === 'IN_PROGRESS'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              </div>

              {/* Meta details & Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Requested By:</span>{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {req.requested_by_name} ({req.requested_by_role})
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400">Needed By:</span>{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {req.needed_by ? clock.formatDisplay(req.needed_by) : 'ASAP'}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400">Assigned To:</span>{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {req.assigned_to_name || 'Suresh Kumar'}
                  </strong>
                </div>
              </div>

              {/* Completion notes / Linked items */}
              {req.completion_note && (
                <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-lg text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Completion Note:</span>
                  </div>
                  <p className="text-[11px]">{req.completion_note}</p>
                </div>
              )}

              {/* Office Executive Action Buttons */}
              {isOfficeExecOrAdmin && !isDone && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {req.status === 'OPEN' && (
                    <button
                      onClick={() => mockStore.updateOfficeRequestStatus(req.id, 'IN_PROGRESS')}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold text-xs rounded-lg transition"
                    >
                      Accept &amp; Start
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setCompletingRequest(req);
                      setCompletionNote(`Completed ${req.title} successfully.`);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Complete &amp; Notify Requester
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Raise Errand Request */}
      {isNewRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-teal-600" />
                Raise Staff Errand Request
              </h3>
              <button onClick={() => setIsNewRequestOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Purchase ₹200 e-Stamp paper for agreement execution"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as OfficeRequest['category'])}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    <option value="NOTARIZE">Notarize Document</option>
                    <option value="BUY_STAMP_PAPER">Buy Stamp Paper</option>
                    <option value="COURIER">Post / Courier</option>
                    <option value="COLLECT_ORIGINALS">Collect Originals</option>
                    <option value="DELIVER">Hand Delivery</option>
                    <option value="OTHER">Other Errand</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority *
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as OfficeRequest['priority'])}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Immediate)</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Linked Project Code
                  </label>
                  <select
                    value={newProjectCodeId}
                    onChange={(e) => setNewProjectCodeId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                  >
                    <option value="">(None - General Office Overhead)</option>
                    {projectCodes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Needed By (Deadline)
                  </label>
                  <input
                    type="datetime-local"
                    value={newNeededBy}
                    onChange={(e) => setNewNeededBy(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Particulars &amp; Detailed Instructions
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Specify exact party names, stamp value, delivery address, or requirements..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewRequestOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Submit Errand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Complete & Link Errand */}
      {completingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Complete Errand #{completingRequest.request_no}
              </h3>
              <button onClick={() => setCompletingRequest(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkComplete} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-slate-500 text-[11px]">Task:</span>
                <p className="font-bold text-slate-900 dark:text-slate-100">{completingRequest.title}</p>
                <p className="text-slate-500 text-[11px]">
                  Requester: {completingRequest.requested_by_name} ({completingRequest.requested_by_role})
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Completion Note (Sent to Requester Notification) *
                </label>
                <textarea
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Resulting Dispatch (Optional)
                </label>
                <select
                  value={linkedDispatchId}
                  onChange={(e) => setLinkedDispatchId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                >
                  <option value="">(None)</option>
                  {dispatches.map((d) => (
                    <option key={d.id} value={d.id}>
                      #{d.serial_no} — {d.tracking_id} ({d.carrier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Resulting Cash Expense (Optional)
                </label>
                <select
                  value={linkedCashId}
                  onChange={(e) => setLinkedCashId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="">(None)</option>
                  {cashEntries.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.entry_no} — {c.category} (₹{c.amount}) - {c.description.slice(0, 30)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompletingRequest(null)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Complete &amp; Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
