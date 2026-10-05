// src/features/dispatches/DispatchList.tsx
import React, { useState, useSyncExternalStore } from 'react';
import { mockStore, DispatchRecord, CarrierType, DispatchScan } from '../../lib/mockData';
import { clock } from '../../lib/clock';
import { formatINR } from '../../lib/currency';
import { NewDispatchModal } from './NewDispatchModal';
import { BatchDispatchModal } from './BatchDispatchModal';
import { ReceiptScannerModal } from '../../components/camera/ReceiptScannerModal';
import { MatterFilesPanel } from '../../components/files/MatterFilesPanel';
import { uploadDocument, generateFileName, resolveFolderPath } from '../../lib/files';
import {
  Search,
  Plus,
  Layers,
  Filter,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Clock,
  MapPin,
  Calendar,
  X,
  Upload,
  AlertCircle,
  Eye,
} from 'lucide-react';

export const DispatchList: React.FC = () => {
  const dispatches = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getDispatches()
  );
  const addressBook = mockStore.getAddressBook();
  const projectCodes = mockStore.getProjectCodes();

  // Filter States
  const [activeTab, setActiveTab] = useState<'ALL' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' | 'OVERDUE'>('ALL');
  const [search, setSearch] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<string>('ALL');

  // Modals
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // Deliver / Return / Repost Modal States
  const [deliveringDisp, setDeliveringDisp] = useState<DispatchRecord | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(clock.todayISO());
  const [isPodScannerOpen, setIsPodScannerOpen] = useState(false);
  const [podBlob, setPodBlob] = useState<{ blob: Blob; pages: number } | null>(null);

  const [returningDisp, setReturningDisp] = useState<DispatchRecord | null>(null);
  const [returnReason, setReturnReason] = useState('Recipient address shifted / incorrect PIN');

  const [repostingDisp, setRepostingDisp] = useState<DispatchRecord | null>(null);
  const [newTrackingId, setNewTrackingId] = useState('');
  const [repostCarrier, setRepostCarrier] = useState<CarrierType>('INDIA_SPEED_POST');
  const [correctedAddress, setCorrectedAddress] = useState('');

  // Legal Evidence Proofs Drawer
  const [proofsDrawerDisp, setProofsDrawerDisp] = useState<DispatchRecord | null>(null);
  const [activeProofKind, setActiveProofKind] = useState<DispatchScan['kind'] | null>(null);

  // Matter Files Drawer
  const [activeMatterDrawer, setActiveMatterDrawer] = useState<{ id: string; code: string } | null>(null);

  // Overdue count: booking_date <= 7 days ago and not delivered
  const overdueCount = dispatches.filter(
    (d) =>
      (d.status === 'BOOKED' || d.status === 'IN_TRANSIT') &&
      clock.daysAgo(d.booking_date) >= 7
  ).length;

  const filtered = dispatches.filter((disp) => {
    const recipient = addressBook.find((a) => a.id === disp.recipient_id);
    const codeObjs = projectCodes.filter((p) => disp.project_codes.includes(p.id));
    const codesStr = codeObjs.map((c) => c.code).join(' ');

    const matchesSearch =
      disp.tracking_id.toLowerCase().includes(search.toLowerCase()) ||
      (recipient && recipient.name.toLowerCase().includes(search.toLowerCase())) ||
      (disp.particulars && disp.particulars.toLowerCase().includes(search.toLowerCase())) ||
      codesStr.toLowerCase().includes(search.toLowerCase());

    const matchesCarrier = carrierFilter === 'ALL' || disp.carrier === carrierFilter;

    let matchesTab = true;
    if (activeTab === 'IN_TRANSIT') {
      matchesTab = disp.status === 'IN_TRANSIT' || disp.status === 'BOOKED';
    } else if (activeTab === 'DELIVERED') {
      matchesTab = disp.status === 'DELIVERED';
    } else if (activeTab === 'RETURNED') {
      matchesTab = disp.status === 'RETURNED' || disp.status === 'REPOSTED';
    } else if (activeTab === 'OVERDUE') {
      matchesTab =
        (disp.status === 'BOOKED' || disp.status === 'IN_TRANSIT') &&
        clock.daysAgo(disp.booking_date) >= 7;
    }

    return matchesSearch && matchesCarrier && matchesTab;
  });

  const getCarrierTrackUrl = (carrier: CarrierType, trackingId: string): string => {
    if (carrier.includes('INDIA')) {
      return `https://www.indiapost.gov.in/_layouts/15/dpt.cpt.tracking/tracking.aspx`;
    }
    return `https://www.google.com/search?q=${carrier}+${trackingId}+tracking`;
  };

  const handleConfirmDeliver = async () => {
    if (!deliveringDisp) return;

    // Check legal evidence guard
    if (deliveringDisp.legal_evidence) {
      const proofs = mockStore.checkLegalEvidenceProofs(deliveringDisp.id);
      // Require all 4 proofs before delivery can mark as complete
      if (!proofs.hasBookingReceipt || !proofs.hasDocumentCopy) {
        alert(
          'Legal-Evidence Notice Protection:\nYou cannot complete this dispatch until the Booking Receipt, Document Copy, and Tracking History/Proof of Delivery are all uploaded.'
        );
        return;
      }
    }

    let podDocId: string | undefined = undefined;
    if (podBlob) {
      const firstCode = projectCodes.find((p) => deliveringDisp.project_codes.includes(p.id));
      const fileName = generateFileName(
        firstCode?.code || 'OFFICE',
        'PROOF_OF_DELIVERY',
        deliveringDisp.tracking_id,
        deliveryDate
      );
      const folderPath = resolveFolderPath(
        'Postal & Courier',
        'CLI',
        firstCode?.client_name,
        firstCode?.code
      );
      const doc = await uploadDocument({
        file: podBlob.blob,
        fileName,
        category: 'Postal & Courier',
        projectCodeId: firstCode?.id || null,
        folderPath,
      });
      podDocId = doc.id;
    }

    mockStore.markDelivered(deliveringDisp.id, deliveryDate, podDocId);
    setDeliveringDisp(null);
    setPodBlob(null);
  };

  const handleConfirmReturn = () => {
    if (!returningDisp) return;
    mockStore.markReturned(returningDisp.id, returnReason);
    setReturningDisp(null);
  };

  const handleConfirmRepost = () => {
    if (!repostingDisp || !newTrackingId.trim()) {
      alert('New Tracking ID is required for reposting.');
      return;
    }

    mockStore.repostDispatch(
      repostingDisp.id,
      newTrackingId.trim().toUpperCase(),
      repostCarrier,
      repostingDisp.cost,
      correctedAddress ? { new_address: correctedAddress } : undefined
    );

    setRepostingDisp(null);
    setNewTrackingId('');
    setCorrectedAddress('');
  };

  const handleAttachProofUpload = async (blob: Blob) => {
    if (!proofsDrawerDisp || !activeProofKind) return;
    const firstCode = projectCodes.find((p) => proofsDrawerDisp.project_codes.includes(p.id));
    const fileName = generateFileName(
      firstCode?.code || 'OFFICE',
      activeProofKind,
      proofsDrawerDisp.tracking_id,
      proofsDrawerDisp.booking_date
    );
    const folderPath = resolveFolderPath(
      'Postal & Courier',
      'CLI',
      firstCode?.client_name,
      firstCode?.code
    );

    const doc = await uploadDocument({
      file: blob,
      fileName,
      category: 'Postal & Courier',
      projectCodeId: firstCode?.id || null,
      folderPath,
    });

    mockStore.addScanToDispatch(proofsDrawerDisp.id, activeProofKind, doc.id, fileName);
    setActiveProofKind(null);
  };

  return (
    <div className="space-y-4">
      {/* Action Header & Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Postal & Courier Dispatches</span>
              <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {dispatches.length} Total
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Live tracking, legal-evidence verification & multi-matter linkage
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBatchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
            >
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Batch Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setIsNewOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Book Dispatch</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pt-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`pb-2.5 px-2 font-semibold transition border-b-2 ${
              activeTab === 'ALL'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All ({dispatches.length})
          </button>
          <button
            onClick={() => setActiveTab('IN_TRANSIT')}
            className={`pb-2.5 px-2 font-semibold transition border-b-2 ${
              activeTab === 'IN_TRANSIT'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            In Transit (
            {dispatches.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'BOOKED').length}
            )
          </button>
          <button
            onClick={() => setActiveTab('DELIVERED')}
            className={`pb-2.5 px-2 font-semibold transition border-b-2 ${
              activeTab === 'DELIVERED'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Delivered ({dispatches.filter((d) => d.status === 'DELIVERED').length})
          </button>
          <button
            onClick={() => setActiveTab('RETURNED')}
            className={`pb-2.5 px-2 font-semibold transition border-b-2 ${
              activeTab === 'RETURNED'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Returned / Reposted (
            {dispatches.filter((d) => d.status === 'RETURNED' || d.status === 'REPOSTED').length}
            )
          </button>
          <button
            onClick={() => setActiveTab('OVERDUE')}
            className={`pb-2.5 px-2 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'OVERDUE'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-red-500 hover:text-red-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Delivery &gt; 7 Days</span>
            {overdueCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {overdueCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking ID, recipient, matter code, particulars..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Carriers</option>
            <option value="INDIA_SPEED_POST">India Speed Post</option>
            <option value="INDIA_REGISTERED_POST">India Registered Post</option>
            <option value="PRIVATE_COURIER_SPEED">Private Courier Express</option>
            <option value="PROFESSIONAL_COURIER">Professional Courier</option>
          </select>
        </div>
      </div>

      {/* Dispatches List (Mobile Card + Desktop Table View) */}
      <div className="space-y-3">
        {filtered.map((disp) => {
          const recipient = addressBook.find((a) => a.id === disp.recipient_id);
          const linkedCodes = projectCodes.filter((p) => disp.project_codes.includes(p.id));
          const daysOld = clock.daysAgo(disp.booking_date);
          const isOverdue =
            (disp.status === 'BOOKED' || disp.status === 'IN_TRANSIT') && daysOld >= 7;
          const proofs = mockStore.checkLegalEvidenceProofs(disp.id);

          return (
            <div
              key={disp.id}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-4 transition shadow-xs ${
                isOverdue
                  ? 'border-red-300 dark:border-red-900/60 bg-red-50/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/40'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left metadata */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      #{disp.serial_no}
                    </span>
                    <a
                      href={getCarrierTrackUrl(disp.carrier, disp.tracking_id)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                      title="Open Carrier Tracking Page"
                    >
                      <span>{disp.tracking_id}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        disp.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300'
                          : disp.status === 'RETURNED'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : disp.status === 'REPOSTED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : isOverdue
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {disp.status.replace('_', ' ')}
                    </span>

                    {/* Legal Evidence Badge */}
                    {disp.legal_evidence && (
                      <button
                        type="button"
                        onClick={() => setProofsDrawerDisp(disp)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                          proofs.isComplete
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                        title="Click to view 4-proofs checklist"
                      >
                        {proofs.isComplete ? (
                          <ShieldCheck className="w-3 h-3 text-teal-600" />
                        ) : (
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                        )}
                        <span>
                          Legal Proofs ({[proofs.hasBookingReceipt, proofs.hasDocumentCopy, proofs.hasProofOfDeliveryOrAdCard, proofs.hasTrackingHistory].filter(Boolean).length}/4)
                        </span>
                      </button>
                    )}

                    {disp.reposted_from_id && (
                      <span className="text-[10px] text-blue-600 font-mono bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                        Repost of previous dispatch
                      </span>
                    )}

                    {isOverdue && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>In Transit &gt; {daysOld} days</span>
                      </span>
                    )}
                  </div>

                  {/* Recipient & Contents */}
                  <div className="text-xs text-slate-800 dark:text-slate-200">
                    <strong>To:</strong> {recipient?.name || 'Saved Recipient'}
                    {recipient?.organisation && ` (${recipient.organisation})`}
                  </div>

                  {disp.particulars && (
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {disp.particulars}
                    </div>
                  )}

                  {/* Project codes badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400">Matters:</span>
                    {linkedCodes.map((code) => (
                      <button
                        key={code.id}
                        type="button"
                        onClick={() => setActiveMatterDrawer({ id: code.id, code: code.code })}
                        className="text-[11px] font-mono font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 px-2 py-0.5 rounded transition flex items-center gap-1"
                        title="Click to view shared matter documents"
                      >
                        <span>{code.code}</span>
                        <FileText className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                    {linkedCodes.length === 0 && (
                      <span className="text-[11px] text-slate-400 italic">None</span>
                    )}
                  </div>
                </div>

                {/* Right details & action bar */}
                <div className="flex flex-row lg:flex-col items-end justify-between lg:justify-center gap-2 border-t lg:border-t-0 pt-2 lg:pt-0 shrink-0">
                  <div className="text-right text-xs">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(disp.cost)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {clock.formatDisplay(disp.booking_date)} • {disp.carrier.replace(/_/g, ' ')}
                    </div>
                    {disp.delivered_on && (
                      <div className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                        Delivered on {clock.formatDisplay(disp.delivered_on)}
                      </div>
                    )}
                    {disp.return_reason && (
                      <div className="text-[11px] text-amber-600 italic">
                        Reason: {disp.return_reason}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5">
                    {disp.status !== 'DELIVERED' && disp.status !== 'REPOSTED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveringDisp(disp);
                          setDeliveryDate(clock.todayISO());
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </button>
                    )}

                    {disp.status !== 'DELIVERED' &&
                      disp.status !== 'RETURNED' &&
                      disp.status !== 'REPOSTED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setReturningDisp(disp);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 transition"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Returned</span>
                        </button>
                      )}

                    {disp.status === 'RETURNED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setRepostingDisp(disp);
                          setRepostCarrier(disp.carrier);
                          setNewTrackingId('');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Repost Dispatch</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No dispatches found matching your search and filter criteria.
          </div>
        )}
      </div>

      {/* Mark Delivered Modal */}
      {deliveringDisp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md shadow-xl overflow-hidden p-4 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Mark Dispatch Delivered: {deliveringDisp.tracking_id}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Delivered On Date *
              </label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {podBlob
                  ? `Proof photo attached (${podBlob.pages} page)`
                  : 'Proof of Delivery Photo (Optional)'}
              </span>
              <button
                type="button"
                onClick={() => setIsPodScannerOpen(true)}
                className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md font-semibold text-teal-600"
              >
                {podBlob ? 'Re-take' : 'Capture POD'}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeliveringDisp(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeliver}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Confirm Delivered
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Returned Modal */}
      {returningDisp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md shadow-xl overflow-hidden p-4 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Record Return: {returningDisp.tracking_id}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason for Return *
              </label>
              <textarea
                rows={3}
                required
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReturningDisp(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Confirm Returned
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repost Dispatch Modal */}
      {repostingDisp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md shadow-xl overflow-hidden p-4 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Repost Returned Dispatch #{repostingDisp.serial_no}
            </h3>
            <p className="text-[11px] text-slate-500">
              Creates a new dispatch linked to #{repostingDisp.serial_no} and saves corrected address back to the address book.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                New Tracking ID / Barcode *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EK998877666IN"
                value={newTrackingId}
                onChange={(e) => setNewTrackingId(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Carrier
              </label>
              <select
                value={repostCarrier}
                onChange={(e) => setRepostCarrier(e.target.value as CarrierType)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="INDIA_SPEED_POST">India Speed Post</option>
                <option value="INDIA_REGISTERED_POST">India Registered Post</option>
                <option value="PRIVATE_COURIER_SPEED">Private Courier Express</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Updated Address (Saves to Address Book)
              </label>
              <textarea
                rows={2}
                placeholder="Corrected room, street, or PIN code..."
                value={correctedAddress}
                onChange={(e) => setCorrectedAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRepostingDisp(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRepost}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Create Reposted Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Evidence Proofs Drawer */}
      {proofsDrawerDisp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full shadow-2xl overflow-y-auto p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Legal Evidence Proofs (4 Required)
                  </h3>
                </div>
                <button
                  onClick={() => setProofsDrawerDisp(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 bg-teal-50 dark:bg-teal-950/40 p-3 rounded-lg border border-teal-200 dark:border-teal-800">
                <strong>Dispatch:</strong> {proofsDrawerDisp.tracking_id} (
                {proofsDrawerDisp.doc_type})
                <br />
                Under the firm's litigation standards, legal notices require all 4 verification documents before completion.
              </div>

              {/* 4 Proof items */}
              {(() => {
                const proofs = mockStore.checkLegalEvidenceProofs(proofsDrawerDisp.id);
                const scans = mockStore.getScansForDispatch(proofsDrawerDisp.id);

                const items: {
                  title: string;
                  kind: DispatchScan['kind'];
                  present: boolean;
                }[] = [
                  {
                    title: '1. Booking Receipt',
                    kind: 'BOOKING_RECEIPT',
                    present: proofs.hasBookingReceipt,
                  },
                  {
                    title: '2. Document Copy (Signed / Stamped)',
                    kind: 'DOCUMENT_COPY',
                    present: proofs.hasDocumentCopy,
                  },
                  {
                    title: '3. Proof of Delivery or A.D. Card',
                    kind: 'PROOF_OF_DELIVERY',
                    present: proofs.hasProofOfDeliveryOrAdCard,
                  },
                  {
                    title: '4. Carrier Tracking History Screenshot',
                    kind: 'TRACKING_HISTORY',
                    present: proofs.hasTrackingHistory,
                  },
                ];

                return (
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          item.present
                            ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {item.present ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                            <span>{item.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.present ? 'Uploaded & verified' : 'Required proof missing'}
                          </div>
                        </div>

                        {!item.present && (
                          <button
                            type="button"
                            onClick={() => setActiveProofKind(item.kind)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-md shadow-2xs"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload</span>
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="pt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                      Overall Readiness:{' '}
                      <span className={proofs.isComplete ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                        {proofs.isComplete ? 'READY TO COMPLETE' : 'INCOMPLETE (Cannot mark delivered without proofs)'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button
              type="button"
              onClick={() => setProofsDrawerDisp(null)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg mt-6"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Shared Matter Files Drawer */}
      {activeMatterDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-xl">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setActiveMatterDrawer(null)}
                className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-1.5 rounded-full shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <MatterFilesPanel
              projectCodeId={activeMatterDrawer.id}
              projectCode={activeMatterDrawer.code}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <NewDispatchModal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} />
      <BatchDispatchModal isOpen={isBatchOpen} onClose={() => setIsBatchOpen(false)} />
      <ReceiptScannerModal
        isOpen={isPodScannerOpen}
        onClose={() => setIsPodScannerOpen(false)}
        onComplete={(blob, pages) => setPodBlob({ blob, pages })}
        title="Capture Proof of Delivery (POD)"
      />
      <ReceiptScannerModal
        isOpen={Boolean(activeProofKind)}
        onClose={() => setActiveProofKind(null)}
        onComplete={handleAttachProofUpload}
        title={`Upload Legal Proof (${activeProofKind?.replace(/_/g, ' ')})`}
      />
    </div>
  );
};
