// src/features/custody/CustodyView.tsx
import React, { useState, useMemo, useSyncExternalStore } from 'react';
import {
  mockStore,
  PhysicalDocument,
  CustodyItem,
  CustodyLog,
} from '../../lib/mockData';
import { getStoredUser, getViewAsRole } from '../../lib/auth';
import { clock } from '../../lib/clock';
import { currency } from '../../lib/currency';
import {
  Briefcase,
  Key,
  Smartphone,
  Shield,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  FileText,
  Camera,
  Archive,
  Send,
  AlertCircle,
  X,
  UserCheck,
  Check,
} from 'lucide-react';
import { ReceiptScannerModal } from '../../components/camera/ReceiptScannerModal';

export const CustodyView: React.FC = () => {
  const user = getStoredUser();
  const simulatedRole = getViewAsRole();
  const effectiveRole = simulatedRole || user?.role || 'OFFICE_EXEC';
  const isOfficeExecOrAdmin = effectiveRole === 'OFFICE_EXEC' || effectiveRole === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'TOKENS' | 'LOGS'>('DOCUMENTS');

  // Subscriptions to reactive store
  const physicalDocs = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getPhysicalDocuments()
  );

  const custodyItems = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getCustodyItems()
  );

  const custodyLogs = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getCustodyLogs()
  );

  const projectCodes = mockStore.getProjectCodes();
  const staffUsers = [
    { id: 'usr-associate-1', name: 'Meera Rao', role: 'ASSOCIATE' },
    { id: 'usr-drafter-1', name: 'Vikram Seth', role: 'DRAFTER' },
    { id: 'usr-paralegal-1', name: 'Priya Nair', role: 'PARALEGAL' },
    { id: 'usr-office-exec-1', name: 'Suresh Kumar', role: 'OFFICE_EXEC' },
    { id: 'usr-partner-1', name: 'Rajesh Varma', role: 'SUPER_ADMIN' },
    { id: 'usr-finance-1', name: 'Ramesh Patel', role: 'FINANCE' },
  ];

  // Document Filters
  const [docSearch, setDocSearch] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('ALL');

  // Modals state
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedCustodyItem, setSelectedCustodyItem] = useState<CustodyItem | null>(null);

  // Status transition modal state
  const [transitioningDoc, setTransitioningDoc] = useState<PhysicalDocument | null>(null);
  const [newStatusChoice, setNewStatusChoice] = useState<PhysicalDocument['status']>('NOTARIZED');
  const [transitionNotaryCost, setTransitionNotaryCost] = useState('60');
  const [transitionLocation, setTransitionLocation] = useState('Office Safe Shelf B1');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // New Document Form State
  const [docProjectCodeId, setDocProjectCodeId] = useState(projectCodes[0]?.id || '');
  const [docName, setDocName] = useState('Signed Form 1 Application Declaration');
  const [docNature, setDocNature] = useState<'ORIGINAL' | 'COPY'>('ORIGINAL');
  const [pagesCount, setPagesCount] = useState(4);
  const [copiesCount, setCopiesCount] = useState(2);
  const [currentLocation, setCurrentLocation] = useState('Office Safe Shelf A1');
  const [initialStatus, setInitialStatus] = useState<PhysicalDocument['status']>('RECEIVED');
  const [docNotes, setDocNotes] = useState('');

  // Check-out Form State
  const [checkoutStaffId, setCheckoutStaffId] = useState(staffUsers[0]?.id || '');
  const [checkoutPurpose, setCheckoutPurpose] = useState('Patent Form 1 digital signature on Indian Patent Office portal');
  const [checkoutExpectedReturn, setCheckoutExpectedReturn] = useState('2026-10-05T18:00');

  // Check-in Form State
  const [checkinNotes, setCheckinNotes] = useState('Verified key returned intact & locked in safe');

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return physicalDocs.filter((d) => {
      if (docStatusFilter !== 'ALL' && d.status !== docStatusFilter) return false;
      if (docSearch) {
        const q = docSearch.toLowerCase();
        const pc = projectCodes.find((p) => p.id === d.project_code_id);
        const matchName = d.doc_name.toLowerCase().includes(q);
        const matchCode = pc?.code.toLowerCase().includes(q) || false;
        const matchLoc = d.current_location.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchLoc) return false;
      }
      return true;
    });
  }, [physicalDocs, docStatusFilter, docSearch, projectCodes]);

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    mockStore.addPhysicalDocument({
      project_code_id: docProjectCodeId || null,
      doc_name: docName,
      doc_nature: docNature,
      pages_count: pagesCount,
      copies_count: copiesCount,
      current_location: currentLocation,
      status: initialStatus,
      notes: docNotes,
    });
    setIsAddDocOpen(false);
    setDocNotes('');
  };

  const handleOpenCheckOut = (item: CustodyItem) => {
    setSelectedCustodyItem(item);
    setIsCheckOutOpen(true);
  };

  const handleConfirmCheckOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustodyItem) return;
    const staff = staffUsers.find((s) => s.id === checkoutStaffId);
    mockStore.checkoutCustodyItem(
      selectedCustodyItem.id,
      staff ? `${staff.name} (${staff.role})` : 'Staff Member',
      checkoutStaffId,
      checkoutPurpose,
      checkoutExpectedReturn ? new Date(checkoutExpectedReturn).toISOString() : undefined
    );
    setIsCheckOutOpen(false);
  };

  const handleOpenCheckIn = (item: CustodyItem) => {
    setSelectedCustodyItem(item);
    setIsCheckInOpen(true);
  };

  const handleConfirmCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustodyItem) return;
    mockStore.checkinCustodyItem(selectedCustodyItem.id, checkinNotes);
    setIsCheckInOpen(false);
  };

  const handleConfirmTransition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitioningDoc) return;
    mockStore.updatePhysicalDocumentStatus(transitioningDoc.id, newStatusChoice, {
      current_location: transitionLocation,
      notary_cost: newStatusChoice === 'NOTARIZED' ? parseFloat(transitionNotaryCost) || 0 : undefined,
    });
    setTransitioningDoc(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Document &amp; Custody Register
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 rounded-full">
              schema: office
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Original client documents, Form 1 declarations, notary workflows, DSC digital tokens, and office verification phone
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOfficeExecOrAdmin && (
            <>
              <button
                onClick={() => setIsAddDocOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Receive Document
              </button>
            </>
          )}
        </div>
      </div>

      {/* Prominent Active Custody Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {custodyItems.map((item) => {
          const isHeld = item.status === 'CHECKED_OUT';
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                isHeld
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`p-2 rounded-lg ${
                    item.item_type === 'PHONE'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                  }`}
                >
                  {item.item_type === 'PHONE' ? <Smartphone className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {item.item_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {item.identifier}
                  </p>
                  <div className="mt-1.5 text-xs">
                    {isHeld ? (
                      <span className="text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        {item.current_holder_name}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        Office Safe (Available)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isOfficeExecOrAdmin && (
                <div>
                  {isHeld ? (
                    <button
                      onClick={() => handleOpenCheckIn(item)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-2xs"
                    >
                      Check In
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenCheckOut(item)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                    >
                      Check Out
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('DOCUMENTS')}
          className={`pb-2.5 transition flex items-center gap-2 ${
            activeTab === 'DOCUMENTS'
              ? 'border-b-2 border-teal-600 text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Physical Documents ({physicalDocs.length})
        </button>
        <button
          onClick={() => setActiveTab('TOKENS')}
          className={`pb-2.5 transition flex items-center gap-2 ${
            activeTab === 'TOKENS'
              ? 'border-b-2 border-teal-600 text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          DSC &amp; Phone Custody ({custodyItems.length})
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`pb-2.5 transition flex items-center gap-2 ${
            activeTab === 'LOGS'
              ? 'border-b-2 border-teal-600 text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Custody Audit History ({custodyLogs.length})
        </button>
      </div>

      {/* TAB 1: PHYSICAL DOCUMENTS */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Search document name, matter code, or location..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-teal-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={docStatusFilter}
                onChange={(e) => setDocStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">All Document Statuses</option>
                <option value="RECEIVED">Received</option>
                <option value="SENT_FOR_NOTARY">Sent for Notary</option>
                <option value="NOTARIZED">Notarized</option>
                <option value="SCANNED_UPLOADED">Scanned &amp; Uploaded</option>
                <option value="RETURNED_TO_CLIENT">Returned to Client</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Document Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => {
              const pc = projectCodes.find((p) => p.id === doc.project_code_id);
              return (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {pc && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 rounded-md">
                            {pc.code}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            doc.doc_nature === 'ORIGINAL'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {doc.doc_nature}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {doc.pages_count} pages • {doc.copies_count} copies
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {doc.doc_name}
                      </h3>
                      {pc && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Client: {pc.client_name}
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                        doc.status === 'NOTARIZED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : doc.status === 'SENT_FOR_NOTARY'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                          : doc.status === 'SCANNED_UPLOADED'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {doc.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Current Custody Location:</span>
                      <strong className="text-slate-900 dark:text-slate-100">{doc.current_location}</strong>
                    </div>
                    {doc.notary_cost > 0 && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Notary Attestation Fee:</span>
                        <strong className="font-mono text-slate-900 dark:text-slate-100">
                          {currency.formatINR(doc.notary_cost)}
                        </strong>
                      </div>
                    )}
                    {doc.scan_file_name && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Scan Document:</span>
                        <span className="font-mono text-[11px] text-teal-600 truncate max-w-[200px]">
                          {doc.scan_file_name}
                        </span>
                      </div>
                    )}
                    {doc.notes && (
                      <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200 dark:border-slate-700">
                        "{doc.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  {isOfficeExecOrAdmin && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {doc.status === 'RECEIVED' && (
                        <button
                          onClick={() => {
                            setTransitioningDoc(doc);
                            setNewStatusChoice('SENT_FOR_NOTARY');
                            setTransitionLocation('With Suresh (Advocate Notary Desk)');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                        >
                          Send for Notary
                        </button>
                      )}

                      {(doc.status === 'SENT_FOR_NOTARY' || doc.status === 'RECEIVED') && (
                        <button
                          onClick={() => {
                            setTransitioningDoc(doc);
                            setNewStatusChoice('NOTARIZED');
                            setTransitionLocation('Office Safe Shelf B1');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                        >
                          Mark Notarized (₹60)
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setTransitioningDoc(doc);
                          setNewStatusChoice('SCANNED_UPLOADED');
                          setTransitionLocation('Office Safe (Scanned & Filed)');
                          setIsScannerOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Scan / Upload
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TOKENS & PHONE CUSTODY */}
      {activeTab === 'TOKENS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {custodyItems.map((item) => {
            const isHeld = item.status === 'CHECKED_OUT';
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`p-3 rounded-xl ${
                      item.item_type === 'PHONE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400'
                    }`}
                  >
                    {item.item_type === 'PHONE' ? <Smartphone className="w-6 h-6" /> : <Key className="w-6 h-6" />}
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      isHeld
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                    }`}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {item.item_name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    Identifier: {item.identifier}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Current Custody Holder:</span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {item.current_holder_name || 'In Office Safe (Keybox)'}
                    </strong>
                  </div>

                  {isHeld && (
                    <>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Purpose:</span>
                        <p className="text-slate-700 dark:text-slate-300">{item.purpose}</p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span>Expected Return:</span>
                        <strong className="text-slate-700 dark:text-slate-300">
                          {item.expected_return ? clock.formatDisplay(item.expected_return) : 'Today'}
                        </strong>
                      </div>
                    </>
                  )}
                </div>

                {isOfficeExecOrAdmin && (
                  <div>
                    {isHeld ? (
                      <button
                        onClick={() => handleOpenCheckIn(item)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                      >
                        Check In to Office Safe
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenCheckOut(item)}
                        className="w-full py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition"
                      >
                        Check Out to Staff
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY LOG */}
      {activeTab === 'LOGS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Purpose &amp; Return Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {custodyLogs.map((log) => {
                const item = custodyItems.find((i) => i.id === log.custody_item_id);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          log.action === 'CHECK_OUT'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {item?.item_name || 'Custody Item'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {log.holder_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {clock.formatDisplay(log.action_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {log.purpose || log.notes || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Receive Physical Document */}
      {isAddDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-600" />
                Receive Physical Document
              </h3>
              <button onClick={() => setIsAddDocOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Linked Project Code *
                </label>
                <select
                  value={docProjectCodeId}
                  onChange={(e) => setDocProjectCodeId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                >
                  {projectCodes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.title} ({p.client_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title / Description *
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nature *
                  </label>
                  <select
                    value={docNature}
                    onChange={(e) => setDocNature(e.target.value as 'ORIGINAL' | 'COPY')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5"
                  >
                    <option value="ORIGINAL">Original</option>
                    <option value="COPY">Copy</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pages
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pagesCount}
                    onChange={(e) => setPagesCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Copies
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={copiesCount}
                    onChange={(e) => setCopiesCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custody Location in Office *
                </label>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="e.g. Received via courier from client Bangalore office"
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDocOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save &amp; Emit DOC_RECEIVED
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Check Out Item */}
      {isCheckOutOpen && selectedCustodyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                Check Out: {selectedCustodyItem.item_name}
              </h3>
              <button onClick={() => setIsCheckOutOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckOut} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue To Staff Member *
                </label>
                <select
                  value={checkoutStaffId}
                  onChange={(e) => setCheckoutStaffId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  {staffUsers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Operational Purpose *
                </label>
                <textarea
                  value={checkoutPurpose}
                  onChange={(e) => setCheckoutPurpose(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expected Return Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={checkoutExpectedReturn}
                  onChange={(e) => setCheckoutExpectedReturn(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCheckOutOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Confirm Check-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Check In Item */}
      {isCheckInOpen && selectedCustodyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Return to Safe: {selectedCustodyItem.item_name}
              </h3>
              <button onClick={() => setIsCheckInOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckIn} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-slate-500 text-[11px]">Returning Holder:</span>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedCustodyItem.current_holder_name}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Verification &amp; Storage Notes
                </label>
                <input
                  type="text"
                  value={checkinNotes}
                  onChange={(e) => setCheckinNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Confirm Check-In to Safe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Transition Document Status */}
      {transitioningDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Update Document Status
              </h3>
              <button onClick={() => setTransitioningDoc(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransition} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-slate-500 text-[11px]">Document:</span>
                <p className="font-bold text-slate-900 dark:text-slate-100">{transitioningDoc.doc_name}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Status *
                </label>
                <select
                  value={newStatusChoice}
                  onChange={(e) => setNewStatusChoice(e.target.value as PhysicalDocument['status'])}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="RECEIVED">Received</option>
                  <option value="SENT_FOR_NOTARY">Sent for Notary</option>
                  <option value="NOTARIZED">Notarized (Emits DOC_NOTARIZED)</option>
                  <option value="SCANNED_UPLOADED">Scanned &amp; Uploaded</option>
                  <option value="RETURNED_TO_CLIENT">Returned to Client</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              {newStatusChoice === 'NOTARIZED' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notary Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={transitionNotaryCost}
                    onChange={(e) => setTransitionNotaryCost(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    ℹ️ Marking as Notarized automatically creates a <code>DOC_NOTARIZED</code> timeline event for linked matter!
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Updated Location
                </label>
                <input
                  type="text"
                  value={transitionLocation}
                  onChange={(e) => setTransitionLocation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTransitioningDoc(null)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-page Camera Scanner Modal */}
      {isScannerOpen && transitioningDoc && (
        <ReceiptScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onCaptureComplete={(docId: string, fileName: string) => {
            mockStore.updatePhysicalDocumentStatus(transitioningDoc.id, 'SCANNED_UPLOADED', {
              scan_document_id: docId,
              scan_file_name: fileName,
              current_location: 'Office Safe (Scanned & Uploaded)',
            });
            setIsScannerOpen(false);
            setTransitioningDoc(null);
          }}
          title={`Scan ${transitioningDoc.doc_name}`}
        />
      )}
    </div>
  );
};
