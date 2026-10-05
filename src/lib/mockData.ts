// src/lib/mockData.ts
// Local and reactive data store initialized with the synthetic seed data package.
// Fully compatible with Supabase schema structures and operations.

import { clock } from './clock';
import {
  SEED_PROJECT_CODES,
  SEED_ADDRESS_BOOK,
  SEED_DISPATCHES,
  SEED_CASH_ENTRIES,
  SEED_TOPUP_REQUESTS,
  SEED_CASH_COUNTS,
  SEED_PHYSICAL_DOCS,
  SEED_CUSTODY_ITEMS,
  SEED_CUSTODY_LOG,
  SEED_OFFICE_REQUESTS,
  SEED_SCANS,
} from './seedData';
import {
  fetchAllFromSupabase,
  dbAddCashEntry,
  dbAddDispatch,
  dbUpdateDispatchStatus,
  dbAddOfficeRequest,
  dbUpdateOfficeRequest,
  dbAddCustodyLog,
  dbAddTopupRequest,
  dbAddCashCount,
  dbAddAddressBookEntry,
  isLiveMode
} from './supabaseSync';

export function makeUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface AddressBookEntry {
  id: string;
  seed_ref?: string | null;
  name: string;
  organization?: string | null;  // SCHEMA.md: "organization"
  organisation?: string | null;  // UI alias
  address: string;              // SCHEMA.md: "address"
  full_address?: string;        // UI alias
  pin?: string | null;
  phone?: string | null;
  email?: string | null;
  type: 'GOVT_OFFICE' | 'CLIENT' | 'INVENTOR' | 'COURT' | 'OPPOSITE_PARTY' | 'VENDOR' | 'OTHER';
  linked_client_id?: string | null;
  times_used: number;
  last_used?: string | null;
}

export type CarrierType =
  | 'INDIA_SPEED_POST'
  | 'INDIA_REGISTERED_POST'
  | 'POSTAL_AD'
  | 'PRIVATE_COURIER_SPEED'
  | 'PRIVATE_COURIER_REGISTERED'
  | 'PROFESSIONAL_COURIER'
  | 'BUS_PARCEL'
  | 'HAND_DELIVERY'
  | 'OTHER';

export type DispatchStatus =
  | 'BOOKED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'RETURNED'
  | 'LOST'
  | 'REPOSTED';

export type DocType =
  | 'LEGAL_NOTICE'
  | 'POA'
  | 'COVER_LETTER'
  | 'RTI'
  | 'OFFICE_ACTION_REPLY'
  | 'FORMS_FOR_SIGNATURE'
  | 'CERTIFICATE'
  | 'ORIGINALS'
  | 'OTHER';

export interface ProjectCodeRecord {
  id: string;
  code: string;
  client_id?: string;
  client_code?: string;
  client_name: string;
  title: string;
  department: string;
}

export interface DispatchRecord {
  id: string;
  seed_ref?: string | null;
  serial_no: number;
  direction: 'OUTWARD' | 'INWARD';
  booking_date: string; // ISO YYYY-MM-DD
  carrier: CarrierType;
  tracking_id: string;
  sender_address_id?: string | null;   // SCHEMA.md exact
  sender_id?: string | null;           // UI alias
  recipient_address_id: string;        // SCHEMA.md exact
  recipient_id?: string;               // UI alias
  document_type: DocType;              // SCHEMA.md exact
  doc_type?: DocType;                  // UI alias
  particulars?: string | null;
  status: DispatchStatus;
  delivered_on?: string | null;
  ad_card_received: boolean;
  cost: number;
  cash_entry_id?: string | null;       // SCHEMA.md exact
  payment_mode: 'CASH' | 'FIRM_UPI' | 'OTHER' | 'CREDIT_NOTE';
  legal_evidence: boolean;
  batch_id?: string | null;
  reposted_from_id?: string | null;
  return_reason?: string | null;
  project_codes: string[]; // project_code_ids
  created_by?: string | null;
  created_at: string;
}

export interface DispatchScan {
  id: string;
  dispatch_id: string;
  kind: 'BOOKING_RECEIPT' | 'DOCUMENT_COPY' | 'PROOF_OF_DELIVERY' | 'AD_CARD' | 'ACKNOWLEDGEMENT' | 'TRACKING_HISTORY' | 'OTHER';
  document_id: string;
  file_name: string;
  created_at: string;
}

export interface MatterEvent {
  id: string;
  project_code_id: string;
  event_code?: string | null;
  title: string;
  detail?: string | null;
  occurred_at: string;
  source_app: 'OFFICE' | 'LITIGATOR' | 'FINANCE' | 'IP_LEDGER';
  client_visible: boolean;
  client_label?: string | null;
  metadata: Record<string, unknown>;
}

export interface InAppNotification {
  id: string;
  user_id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  source_app: string;
  created_at: string;
  read_at?: string | null;
}

// ---------------------------------------------------------------------
// Phase 2: Petty Cash & Finance Integration Interfaces
// ---------------------------------------------------------------------

export interface CashCategory {
  code: string;
  label: string;
  is_recoverable_default: boolean;
  display_order: number;
}

export interface CashAllocation {
  id: string;
  seed_ref?: string | null;
  cash_entry_id: string;
  project_code_id: string;
  amount: number;
  doc_count?: number | null;
  recoverable_cost_id?: string | null;
}

export interface CashEntry {
  id: string;
  seed_ref?: string | null;
  entry_no: number;                          // UI helper
  entry_date: string;
  type: 'TOP_UP' | 'EXPENSE' | 'REFUND_IN';  // SCHEMA.md exact
  entry_type?: 'TOP_UP' | 'EXPENSE' | 'REFUND_IN'; // UI alias
  category: string;
  description: string;
  amount: number;
  payment_mode: 'CASH' | 'FIRM_UPI';
  paid_by?: string | null;                    // SCHEMA.md exact
  receipt_document_id?: string | null;
  receipt_file_name?: string | null;          // UI helper
  linked_dispatch_id?: string | null;
  recoverable?: boolean | null;               // SCHEMA.md exact
  is_recoverable?: boolean | null;            // UI alias
  affects_petty_cash_balance: boolean;        // SCHEMA.md exact
  status: 'ACTIVE' | 'CANCELLED' | 'REVERSED';
  cancel_reason?: string | null;
  balance_after?: number | null;              // SCHEMA.md exact
  allocations: CashAllocation[];
  linked_topup_request_id?: string | null;   // UI helper
  created_at: string;
}

export interface RecoverableCost {
  id: string;
  source_app: 'OFFICE' | 'TASK_MANAGER' | 'IP_LEDGER' | 'LITIGATOR' | 'FINANCE' | 'OTHER';
  source_type: 'OFFICE_EXPENSE' | 'EMPLOYEE_REIMBURSEMENT' | 'GOVT_FEE' | 'OTHER';
  source_id: string;
  project_code_id: string;
  client_id?: string | null;
  cost_date: string;
  category: string;
  description: string;
  amount: number;
  has_evidence: boolean;
  evidence_document_id?: string | null;
  posting_status: 'PENDING_FINANCE' | 'AUTO_POSTED' | 'NEEDS_REVIEW' | 'NOT_RECOVERABLE' | 'REVERSED';
  posted_at?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  reversal_of?: string | null;
  created_at: string;
}

export interface PettyCashTopupRequest {
  id: string;
  amount: number;
  reason: string;
  requested_by: string;
  requested_at: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'HANDED_OVER';
  decided_by?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
  handed_over_at?: string | null;
  office_cash_entry_id?: string | null;
}

export interface PettyCashCount {
  id: string;
  count_date: string;
  counted_by: string;
  physical_cash: number;
  book_balance: number;
  variance: number;
  note?: string | null;
  finance_signoff_by?: string | null;
  finance_signoff_at?: string | null;
  finance_note?: string | null;
}

// ---------------------------------------------------------------------
// Phase 3: Custody, Errands, and Documents
// ---------------------------------------------------------------------

export interface PhysicalDocument {
  id: string;
  seed_ref?: string | null;
  project_code_id?: string | null;
  project_code?: string | null;        // display helper
  document: string;                    // SCHEMA.md exact
  doc_name: string;                    // UI alias
  original_or_copy: 'ORIGINAL' | 'COPY'; // SCHEMA.md exact
  doc_nature: 'ORIGINAL' | 'COPY';     // UI alias
  status:
    | 'REQUESTED_FROM_CLIENT'
    | 'RECEIVED'
    | 'SENT_FOR_NOTARY'
    | 'NOTARIZED'
    | 'SCANNED_UPLOADED'
    | 'RETURNED_TO_CLIENT'
    | 'ARCHIVED';
  pages?: number | null;               // SCHEMA.md exact
  pages_count: number;                 // UI alias
  copies_count: number;                // UI operational addition
  current_location: string;            // UI operational addition
  notary_cost: number;                 // UI operational addition
  notary_cash_entry_id?: string | null;
  scan_document_id?: string | null;
  scan_file_name?: string | null;      // UI helper
  notarized_at?: string | null;        // UI helper
  received_at?: string | null;         // UI helper
  notes?: string | null;
  created_at: string;
  updated_at: string;                  // SCHEMA.md exact
}

export interface CustodyItem {
  id: string;
  seed_ref?: string | null;
  item: string;                         // SCHEMA.md exact
  item_name: string;                    // UI alias
  identifier: string;                   // UI alias
  type: 'DSC' | 'PHONE' | 'OTHER';      // SCHEMA.md exact (DSC not DSC_TOKEN)
  item_type: string;                    // UI alias
  status: 'AVAILABLE' | 'CHECKED_OUT' | 'MAINTENANCE' | 'RETIRED';
  current_holder_id?: string | null;
  current_holder_name?: string | null;
  checked_out_at?: string | null;
  expected_return?: string | null;
  purpose?: string | null;              // UI operational addition
}

export interface CustodyLog {
  id: string;
  seed_ref?: string | null;
  custody_item_id: string;
  holder_user_id: string;               // SCHEMA.md exact
  holder_id?: string | null;            // UI alias
  holder_name?: string | null;          // display helper
  out_at: string;                       // SCHEMA.md exact
  expected_return?: string | null;
  in_at?: string | null;                // SCHEMA.md exact (null = still checked out)
  action?: 'CHECK_OUT' | 'CHECK_IN';    // UI operational addition
  action_at?: string;                   // UI alias
  purpose?: string | null;              // UI operational addition
  notes?: string | null;                // UI operational addition
  created_at?: string;                  // UI operational addition
}

export interface OfficeRequest {
  id: string;
  seed_ref?: string | null;
  request_no?: number;                  // UI helper
  project_code_id?: string | null;
  project_code?: string | null;         // display helper
  requested_by: string;                 // SCHEMA.md exact
  requested_by_id?: string;             // UI alias
  requested_by_name: string;            // display helper
  requested_by_role?: string | null;    // display helper
  title: string;                        // UI helper
  category: string;                     // UI helper
  description: string;                  // SCHEMA.md exact (single field, no separate title)
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  due_date?: string | null;             // SCHEMA.md exact
  needed_by?: string | null;            // UI alias
  status: 'OPEN' | 'ACCEPTED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  accepted_by?: string | null;          // SCHEMA.md exact
  accepted_by_name?: string | null;     // display helper
  completed_links?: Record<string, unknown> | null; // SCHEMA.md exact
  completion_note?: string | null;      // UI helper
  completion_notes?: string | null;     // UI helper
  completed_at?: string | null;         // UI helper
  linked_dispatch_id?: string | null;   // UI helper
  linked_cash_entry_id?: string | null; // UI helper
  linked_document_id?: string | null;   // UI helper
  assigned_to_id?: string | null;       // UI helper
  assigned_to_name?: string | null;     // UI helper
  attachment_doc_ids?: string[];        // UI helper
  request_type?: string | null;         // operational classification
  created_at: string;
}

// Initial Data mapped directly from docs/seed-data/seed/*.json
const INITIAL_ADDRESS_BOOK: AddressBookEntry[] = SEED_ADDRESS_BOOK as AddressBookEntry[];

const INITIAL_PROJECT_CODES: ProjectCodeRecord[] = SEED_PROJECT_CODES as ProjectCodeRecord[];

const INITIAL_DISPATCHES: DispatchRecord[] = SEED_DISPATCHES as DispatchRecord[];

const INITIAL_SCANS: DispatchScan[] = [...(SEED_SCANS as any[])];

const INITIAL_EVENTS: MatterEvent[] = [
  {
    id: 'evt_001',
    project_code_id: 'pc_LIT5002',
    event_code: 'NOTICE_SERVED',
    title: 'Legal notice dispatched via Postal AD',
    detail: 'Tracking ID: RA000000101IN. Dispatched to Sagar Masala Co.',
    occurred_at: '2026-09-15T10:00:00+05:30',
    source_app: 'OFFICE',
    client_visible: true,
    client_label: 'Legal notice dispatched via Postal AD',
    metadata: { tracking_id: 'RA000000101IN', carrier: 'POSTAL_AD' },
  },
  {
    id: 'evt_002',
    project_code_id: 'pc_LIT5002',
    event_code: 'NOTICE_DELIVERED',
    title: 'Legal notice delivered & signed',
    detail: 'Tracking ID: RA000000101IN. AD card signed.',
    occurred_at: '2026-09-18T14:30:00+05:30',
    source_app: 'OFFICE',
    client_visible: true,
    client_label: 'Legal notice delivered & signed',
    metadata: { tracking_id: 'RA000000101IN' },
  },
];

const INITIAL_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif_001',
    user_id: 'u_oe',
    title: 'Pending Delivery Alert (>7 Days)',
    body: 'Dispatch RK000000202IN (Kaveri Vidya University IPR Office) has been in transit for over 7 days.',
    link: '/dispatches',
    source_app: 'OFFICE',
    created_at: '2026-10-05T08:00:00+05:30',
  },
  {
    id: 'notif_002',
    user_id: 'u_oe',
    title: 'Pending Top-Up Request',
    body: 'Top-up request for ₹1,500 submitted to Finance.',
    link: '/petty-cash',
    source_app: 'OFFICE',
    created_at: '2026-10-05T09:15:00+05:30',
  },
];

const INITIAL_CASH_CATEGORIES: CashCategory[] = [
  { code: 'NOTARY', label: 'Notary Charges', is_recoverable_default: true, display_order: 1 },
  { code: 'TRUE_COPY_XEROX', label: 'True Copy / Xerox', is_recoverable_default: true, display_order: 2 },
  { code: 'STAMP_PAPER', label: 'Non-Judicial / Judicial Stamp Paper', is_recoverable_default: true, display_order: 3 },
  { code: 'INDIA_POST', label: 'Speed Post / Regd Post Postage', is_recoverable_default: true, display_order: 4 },
  { code: 'PRIVATE_COURIER', label: 'Private Courier Charges', is_recoverable_default: true, display_order: 5 },
  { code: 'BUS_PARCEL', label: 'Bus Parcel Freight', is_recoverable_default: true, display_order: 6 },
  { code: 'POSTAL_ORDER', label: 'Indian Postal Order (IPO)', is_recoverable_default: true, display_order: 7 },
  { code: 'PRINTING_STATIONERY', label: 'Printing & Stationery', is_recoverable_default: false, display_order: 8 },
  { code: 'LOCAL_CONVEYANCE', label: 'Local Travel / Conveyance', is_recoverable_default: false, display_order: 9 },
  { code: 'OFFICE_SUPPLIES', label: 'Office Supplies / Pantry', is_recoverable_default: false, display_order: 10 },
  { code: 'MISC', label: 'Miscellaneous Float Spend', is_recoverable_default: false, display_order: 11 },
  { code: 'FLOAT', label: 'Float Top-Up / Cash-In', is_recoverable_default: false, display_order: 12 },
];

const INITIAL_CASH_ENTRIES: CashEntry[] = (SEED_CASH_ENTRIES as any[]) as CashEntry[];

const INITIAL_RECOVERABLE_COSTS: RecoverableCost[] = [];
let _rcIdx = 1;
for (const ce of SEED_CASH_ENTRIES) {
  if (ce.recoverable && ce.allocations) {
    for (const alloc of ce.allocations) {
      INITIAL_RECOVERABLE_COSTS.push({
        id: `rc_${_rcIdx++}`,
        source_app: 'OFFICE',
        source_type: 'OFFICE_EXPENSE',
        source_id: ce.id,
        project_code_id: alloc.project_code_id,
        cost_date: ce.entry_date,
        category: ce.category,
        description: ce.description,
        amount: alloc.amount,
        has_evidence: !!ce.receipt_document_id,
        evidence_document_id: ce.receipt_document_id || null,
        posting_status: 'AUTO_POSTED',
        posted_at: `${ce.entry_date}T18:00:00+05:30`,
        review_note: 'Verified against receipt voucher',
        created_at: ce.created_at || `${ce.entry_date}T10:00:00+05:30`,
      });
    }
  }
}

const INITIAL_TOPUPS: PettyCashTopupRequest[] = (SEED_TOPUP_REQUESTS as any[]) as PettyCashTopupRequest[];

const INITIAL_COUNTS: PettyCashCount[] = (SEED_CASH_COUNTS as any[]) as PettyCashCount[];

const INITIAL_PHYSICAL_DOCS: PhysicalDocument[] = (SEED_PHYSICAL_DOCS as any[]) as PhysicalDocument[];

const INITIAL_CUSTODY_ITEMS: CustodyItem[] = (SEED_CUSTODY_ITEMS as any[]) as CustodyItem[];

const INITIAL_CUSTODY_LOGS: CustodyLog[] = (SEED_CUSTODY_LOG as any[]) as CustodyLog[];

const INITIAL_OFFICE_REQUESTS: OfficeRequest[] = (SEED_OFFICE_REQUESTS as any[]) as OfficeRequest[];

class MockStore {
  addressBook: AddressBookEntry[] = [...INITIAL_ADDRESS_BOOK];
  projectCodes = [...INITIAL_PROJECT_CODES];
  dispatches: DispatchRecord[] = [...INITIAL_DISPATCHES];
  scans: DispatchScan[] = [...INITIAL_SCANS];
  events: MatterEvent[] = [...INITIAL_EVENTS];
  notifications: InAppNotification[] = [...INITIAL_NOTIFICATIONS];

  // Phase 2 Petty Cash fields
  cashCategories: CashCategory[] = [...INITIAL_CASH_CATEGORIES];
  cashEntries: CashEntry[] = [...INITIAL_CASH_ENTRIES];
  recoverableCosts: RecoverableCost[] = [...INITIAL_RECOVERABLE_COSTS];
  topupRequests: PettyCashTopupRequest[] = [...INITIAL_TOPUPS];
  weeklyCounts: PettyCashCount[] = [...INITIAL_COUNTS];
  lowBalanceThreshold: number = 300.0;

  // Phase 3 Custody, Errands, Documents
  physicalDocs: PhysicalDocument[] = [...INITIAL_PHYSICAL_DOCS];
  custodyItems: CustodyItem[] = [...INITIAL_CUSTODY_ITEMS];
  custodyLog: CustodyLog[] = [...INITIAL_CUSTODY_LOGS];
  officeRequests: OfficeRequest[] = [...INITIAL_OFFICE_REQUESTS];

  get custodyLogs(): CustodyLog[] {
    return this.custodyLog;
  }
  set custodyLogs(val: CustodyLog[]) {
    this.custodyLog = val;
  }

  listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.sortAll();
    this.initSupabaseSync();
  }

  async initSupabaseSync() {
    if (!isLiveMode()) return;
    try {
      const data = await fetchAllFromSupabase();
      if (!data) return;
      if (data.addressBook.length > 0) this.addressBook = data.addressBook as AddressBookEntry[];
      if (data.dispatches.length > 0) this.dispatches = data.dispatches as DispatchRecord[];
      if (data.cashEntries.length > 0) this.cashEntries = data.cashEntries as CashEntry[];
      if (data.physicalDocs.length > 0) this.physicalDocs = data.physicalDocs as PhysicalDocument[];
      if (data.custodyItems.length > 0) this.custodyItems = data.custodyItems as CustodyItem[];
      if (data.custodyLog.length > 0) this.custodyLog = data.custodyLog as CustodyLog[];
      if (data.officeRequests.length > 0) this.officeRequests = data.officeRequests as OfficeRequest[];
      if (data.projectCodes.length > 0) this.projectCodes = data.projectCodes as ProjectCodeRecord[];
      if (data.topups.length > 0) this.topupRequests = data.topups as PettyCashTopupRequest[];
      if (data.counts.length > 0) this.weeklyCounts = data.counts as PettyCashCount[];
      if (data.events.length > 0) this.events = data.events as MatterEvent[];
      this.notify();
    } catch (e) {
      console.warn('Supabase sync initial load error:', e);
    }
  }

  private sortAll() {
    this.addressBook.sort((a, b) => b.times_used - a.times_used);
    this.dispatches.sort((a, b) => b.serial_no - a.serial_no);
    this.cashEntries.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
    this.topupRequests.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
    this.weeklyCounts.sort((a, b) => new Date(b.count_date).getTime() - new Date(a.count_date).getTime());
    this.officeRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    this.physicalDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.sortAll();
    this.addressBook = [...this.addressBook];
    this.dispatches = [...this.dispatches];
    this.events = [...this.events];
    this.notifications = [...this.notifications];
    this.scans = [...this.scans];
    this.cashCategories = [...this.cashCategories];
    this.cashEntries = [...this.cashEntries];
    this.recoverableCosts = [...this.recoverableCosts];
    this.topupRequests = [...this.topupRequests];
    this.weeklyCounts = [...this.weeklyCounts];
    this.physicalDocs = [...this.physicalDocs];
    this.custodyItems = [...this.custodyItems];
    this.custodyLog = [...this.custodyLog];
    this.officeRequests = [...this.officeRequests];
    this.saveToStorage();
    this.listeners.forEach((l) => l());
  }

  loadFromStorage() {
    try {
      const MOCK_STORAGE_VER = 'v2_synthetic_seed_20261005';
      const curVer = localStorage.getItem('lextria_mock_version');
      if (curVer !== MOCK_STORAGE_VER) {
        localStorage.clear();
        localStorage.setItem('lextria_mock_version', MOCK_STORAGE_VER);
        return;
      }

      const storedAb = localStorage.getItem('lextria_mock_address_book');
      if (storedAb) this.addressBook = JSON.parse(storedAb);

      const storedDisp = localStorage.getItem('lextria_mock_dispatches');
      if (storedDisp) this.dispatches = JSON.parse(storedDisp);

      const storedScans = localStorage.getItem('lextria_mock_scans');
      if (storedScans) this.scans = JSON.parse(storedScans);

      const storedEv = localStorage.getItem('lextria_mock_events');
      if (storedEv) this.events = JSON.parse(storedEv);

      const storedNotif = localStorage.getItem('lextria_mock_notifs');
      if (storedNotif) this.notifications = JSON.parse(storedNotif);

      const storedCash = localStorage.getItem('lextria_mock_cash_entries');
      if (storedCash) this.cashEntries = JSON.parse(storedCash);

      const storedRc = localStorage.getItem('lextria_mock_recoverable_costs');
      if (storedRc) this.recoverableCosts = JSON.parse(storedRc);

      const storedTopups = localStorage.getItem('lextria_mock_topup_requests');
      if (storedTopups) this.topupRequests = JSON.parse(storedTopups);

      const storedCounts = localStorage.getItem('lextria_mock_weekly_counts');
      if (storedCounts) this.weeklyCounts = JSON.parse(storedCounts);

      const storedPdocs = localStorage.getItem('lextria_mock_physical_docs');
      if (storedPdocs) this.physicalDocs = JSON.parse(storedPdocs);

      const storedCust = localStorage.getItem('lextria_mock_custody_items');
      if (storedCust) this.custodyItems = JSON.parse(storedCust);

      const storedClogs = localStorage.getItem('lextria_mock_custody_log');
      if (storedClogs) this.custodyLog = JSON.parse(storedClogs);

      const storedReqs = localStorage.getItem('lextria_mock_office_requests');
      if (storedReqs) this.officeRequests = JSON.parse(storedReqs);
    } catch {
      // Use defaults
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('lextria_mock_address_book', JSON.stringify(this.addressBook));
      localStorage.setItem('lextria_mock_dispatches', JSON.stringify(this.dispatches));
      localStorage.setItem('lextria_mock_scans', JSON.stringify(this.scans));
      localStorage.setItem('lextria_mock_events', JSON.stringify(this.events));
      localStorage.setItem('lextria_mock_notifs', JSON.stringify(this.notifications));
      localStorage.setItem('lextria_mock_cash_entries', JSON.stringify(this.cashEntries));
      localStorage.setItem('lextria_mock_recoverable_costs', JSON.stringify(this.recoverableCosts));
      localStorage.setItem('lextria_mock_topup_requests', JSON.stringify(this.topupRequests));
      localStorage.setItem('lextria_mock_weekly_counts', JSON.stringify(this.weeklyCounts));
      localStorage.setItem('lextria_mock_physical_docs', JSON.stringify(this.physicalDocs));
      localStorage.setItem('lextria_mock_custody_items', JSON.stringify(this.custodyItems));
      localStorage.setItem('lextria_mock_custody_log', JSON.stringify(this.custodyLog));
      localStorage.setItem('lextria_mock_office_requests', JSON.stringify(this.officeRequests));
    } catch {
      // ignore storage errors
    }
  }

  // Address book methods
  getAddressBook() {
    return this.addressBook;
  }

  addAddressBookEntry(entry: Omit<AddressBookEntry, 'id' | 'times_used' | 'last_used'>): AddressBookEntry {
    const newEntry: AddressBookEntry = {
      ...entry,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-a000-${Date.now().toString(16).padStart(12, '0')}`,
      times_used: 1,
      last_used: clock.nowISO(),
    };
    this.addressBook.unshift(newEntry);
    this.notify();
    dbAddAddressBookEntry(newEntry);
    return newEntry;
  }

  touchAddressBookEntry(id: string) {
    const entry = this.addressBook.find((a) => a.id === id);
    if (entry) {
      entry.times_used += 1;
      entry.last_used = clock.nowISO();
      this.notify();
    }
  }

  // Project codes
  getProjectCodes() {
    return this.projectCodes;
  }

  // Dispatches
  getDispatches() {
    return this.dispatches;
  }

  getDispatch(id: string) {
    return this.dispatches.find((d) => d.id === id);
  }

  createDispatch(data: Partial<DispatchRecord> & {
    direction: 'OUTWARD' | 'INWARD';
    booking_date: string;
    carrier: CarrierType;
    tracking_id: string;
    recipient_address_id?: string;
    recipient_id?: string;
    document_type?: DocType;
    doc_type?: DocType;
    project_codes: string[];
    cost?: number;
    payment_mode?: 'CASH' | 'FIRM_UPI' | 'OTHER' | 'CREDIT_NOTE';
    legal_evidence?: boolean;
    particulars?: string | null;
    sender_address_id?: string | null;
    sender_id?: string | null;
  }): DispatchRecord {
    const nextSerial = this.dispatches.reduce((max, d) => Math.max(max, d.serial_no), 0) + 1;
    const recipient_address_id = data.recipient_address_id || data.recipient_id || '';
    const sender_address_id = data.sender_address_id ?? data.sender_id ?? null;
    const document_type = data.document_type || data.doc_type || 'OTHER';

    const dispId = isLiveMode() ? makeUuid() : `disp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newDisp: DispatchRecord = {
      ...data,
      id: dispId,
      serial_no: nextSerial,
      direction: data.direction,
      booking_date: data.booking_date,
      carrier: data.carrier,
      tracking_id: data.tracking_id,
      recipient_address_id,
      recipient_id: recipient_address_id,
      sender_address_id,
      sender_id: sender_address_id,
      document_type,
      doc_type: document_type,
      particulars: data.particulars || null,
      status: (data.status as DispatchStatus) || 'BOOKED',
      ad_card_received: Boolean(data.ad_card_received),
      cost: data.cost ?? 0,
      payment_mode: data.payment_mode || 'CASH',
      legal_evidence: Boolean(data.legal_evidence),
      project_codes: data.project_codes || [],
      created_at: clock.nowISO(),
    };
    this.dispatches.unshift(newDisp);
    this.touchAddressBookEntry(recipient_address_id);

    if (isLiveMode()) {
      dbAddDispatch(newDisp, newDisp.project_codes);
    }

    // Cross-app contract: Write core.matter_events
    if (newDisp.project_codes.length > 0) {
      const recipient = this.addressBook.find((a) => a.id === recipient_address_id);
      const recipientName = recipient?.name || 'Recipient';
      const carrierLabel = newDisp.carrier.replace(/_/g, ' ');

      newDisp.project_codes.forEach((pCodeId) => {
        this.events.unshift({
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          project_code_id: pCodeId,
          event_code: 'DISPATCH_BOOKED',
          title: `Documents booked via ${carrierLabel}`,
          detail: `Tracking ID: ${newDisp.tracking_id}. Contents: ${document_type}`,
          occurred_at: clock.nowISO(),
          source_app: 'OFFICE',
          client_visible: true,
          // Client-safe label omitting street address
          client_label: `Documents posted to ${recipientName} — ${carrierLabel}`,
          metadata: {
            tracking_id: newDisp.tracking_id,
            carrier: newDisp.carrier,
            doc_type: document_type,
          },
        });
      });
    }

    this.notify();
    return newDisp;
  }

  createBatchDispatches(
    base: {
      booking_date: string;
      carrier: CarrierType;
      recipient_id: string;
      sender_id?: string | null;
      payment_mode: 'CASH' | 'FIRM_UPI' | 'CREDIT_NOTE' | 'OTHER';
    },
    items: {
      tracking_id: string;
      project_code_id: string;
      doc_type: DocType;
      cost: number;
      particulars?: string;
    }[]
  ): DispatchRecord[] {
    const created: DispatchRecord[] = [];
    const batchId = `batch-${Date.now()}`;

    for (const item of items) {
      const nextSerial = this.dispatches.reduce((max, d) => Math.max(max, d.serial_no), 0) + 1;
      const dispId = isLiveMode() ? makeUuid() : `disp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const disp: DispatchRecord = {
        id: dispId,
        serial_no: nextSerial,
        direction: 'OUTWARD',
        booking_date: base.booking_date,
        carrier: base.carrier,
        tracking_id: item.tracking_id,
        sender_address_id: base.sender_id || null,
        sender_id: base.sender_id || null,
        recipient_address_id: base.recipient_id,
        recipient_id: base.recipient_id,
        document_type: item.doc_type,
        doc_type: item.doc_type,
        particulars: item.particulars || null,
        status: 'BOOKED',
        ad_card_received: false,
        cost: item.cost,
        payment_mode: base.payment_mode,
        legal_evidence: item.doc_type === 'LEGAL_NOTICE',
        batch_id: batchId,
        project_codes: item.project_code_id ? [item.project_code_id] : [],
        created_at: clock.nowISO(),
      };
      this.dispatches.unshift(disp);
      created.push(disp);

      if (isLiveMode()) {
        dbAddDispatch(disp, disp.project_codes);
      }

      // Write matter event
      if (item.project_code_id) {
        const recipient = this.addressBook.find((a) => a.id === base.recipient_id);
        this.events.unshift({
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          project_code_id: item.project_code_id,
          event_code: 'DISPATCH_BOOKED',
          title: `Documents booked via ${base.carrier.replace(/_/g, ' ')}`,
          detail: `Tracking ID: ${item.tracking_id}`,
          occurred_at: clock.nowISO(),
          source_app: 'OFFICE',
          client_visible: true,
          client_label: `Documents posted to ${recipient?.name || 'Office'} — ${base.carrier.replace(/_/g, ' ')}`,
          metadata: { tracking_id: item.tracking_id, batch_id: batchId },
        });
      }
    }

    this.touchAddressBookEntry(base.recipient_id);
    this.notify();
    return created;
  }

  markDelivered(dispatchId: string, deliveredOn: string, proofDocId?: string) {
    const disp = this.dispatches.find((d) => d.id === dispatchId);
    if (!disp) return;

    disp.status = 'DELIVERED';
    disp.delivered_on = deliveredOn;

    if (isLiveMode()) {
      dbUpdateDispatchStatus(dispatchId, 'DELIVERED', { delivered_on: deliveredOn });
    }

    if (proofDocId) {
      this.scans.push({
        id: `scan-${Date.now()}`,
        dispatch_id: dispatchId,
        kind: 'PROOF_OF_DELIVERY',
        document_id: proofDocId,
        file_name: `POD_${disp.tracking_id}.pdf`,
        created_at: clock.nowISO(),
      });
    }

    // Write DISPATCH_DELIVERED to core.matter_events
    disp.project_codes.forEach((pCodeId) => {
      this.events.unshift({
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        project_code_id: pCodeId,
        event_code: 'DISPATCH_DELIVERED',
        title: 'Dispatch delivered',
        detail: `Delivered on ${clock.formatDisplay(deliveredOn)}. Tracking ID: ${disp.tracking_id}`,
        occurred_at: clock.nowISO(),
        source_app: 'OFFICE',
        client_visible: true,
        client_label: 'Documents delivered',
        metadata: { tracking_id: disp.tracking_id, delivered_on: deliveredOn },
      });
    });

    this.notify();
  }

  markReturned(dispatchId: string, reason: string) {
    const disp = this.dispatches.find((d) => d.id === dispatchId);
    if (!disp) return;

    disp.status = 'RETURNED';
    disp.return_reason = reason;

    if (isLiveMode()) {
      dbUpdateDispatchStatus(dispatchId, 'RETURNED', { return_reason: reason });
    }

    // Write DISPATCH_RETURNED to core.matter_events
    disp.project_codes.forEach((pCodeId) => {
      this.events.unshift({
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        project_code_id: pCodeId,
        event_code: 'DISPATCH_RETURNED',
        title: 'Dispatch returned by carrier',
        detail: `Reason: ${reason}. Tracking ID: ${disp.tracking_id}`,
        occurred_at: clock.nowISO(),
        source_app: 'OFFICE',
        client_visible: false, // Internal notice
        client_label: 'Dispatch returned',
        metadata: { tracking_id: disp.tracking_id, reason },
      });
    });

    this.notify();
  }

  repostDispatch(
    originalDispatchId: string,
    newTrackingId: string,
    carrier: CarrierType,
    cost: number,
    updatedAddress?: { recipient_id?: string; new_address?: string }
  ): DispatchRecord | null {
    const original = this.dispatches.find((d) => d.id === originalDispatchId);
    if (!original) return null;

    let targetRecipientId = original.recipient_id;
    if (updatedAddress?.recipient_id) {
      targetRecipientId = updatedAddress.recipient_id;
    } else if (updatedAddress?.new_address) {
      // update address in address book
      const recipient = this.addressBook.find((a) => a.id === original.recipient_id);
      if (recipient) {
        recipient.full_address = updatedAddress.new_address;
      }
    }

    const nextSerial = this.dispatches.reduce((max, d) => Math.max(max, d.serial_no), 0) + 1;
    const reposted: DispatchRecord = {
      ...original,
      id: `disp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serial_no: nextSerial,
      booking_date: clock.todayISO(),
      carrier: carrier || original.carrier,
      tracking_id: newTrackingId,
      recipient_id: targetRecipientId,
      status: 'BOOKED',
      delivered_on: null,
      ad_card_received: false,
      cost: cost,
      reposted_from_id: original.id,
      return_reason: null,
      created_at: clock.nowISO(),
    };

    original.status = 'REPOSTED';
    this.dispatches.unshift(reposted);

    this.notify();
    return reposted;
  }

  // Scans & Evidence checking
  getScansForDispatch(dispatchId: string) {
    return this.scans.filter((s) => s.dispatch_id === dispatchId);
  }

  addScanToDispatch(dispatchId: string, kind: DispatchScan['kind'], documentId: string, fileName: string) {
    this.scans.push({
      id: `scan-${Date.now()}`,
      dispatch_id: dispatchId,
      kind,
      document_id: documentId,
      file_name: fileName,
      created_at: clock.nowISO(),
    });
    this.notify();
  }

  /**
   * Check if a legal-evidence dispatch has all 4 required proofs:
   * 1. BOOKING_RECEIPT
   * 2. DOCUMENT_COPY
   * 3. PROOF_OF_DELIVERY (or AD_CARD)
   * 4. TRACKING_HISTORY
   */
  checkLegalEvidenceProofs(dispatchId: string): {
    hasBookingReceipt: boolean;
    hasDocumentCopy: boolean;
    hasProofOfDeliveryOrAdCard: boolean;
    hasTrackingHistory: boolean;
    isComplete: boolean;
  } {
    const scans = this.getScansForDispatch(dispatchId);
    const hasBookingReceipt = scans.some((s) => s.kind === 'BOOKING_RECEIPT');
    const hasDocumentCopy = scans.some((s) => s.kind === 'DOCUMENT_COPY');
    const hasProofOfDeliveryOrAdCard = scans.some(
      (s) => s.kind === 'PROOF_OF_DELIVERY' || s.kind === 'AD_CARD'
    );
    const hasTrackingHistory = scans.some((s) => s.kind === 'TRACKING_HISTORY');

    return {
      hasBookingReceipt,
      hasDocumentCopy,
      hasProofOfDeliveryOrAdCard,
      hasTrackingHistory,
      isComplete:
        hasBookingReceipt &&
        hasDocumentCopy &&
        hasProofOfDeliveryOrAdCard &&
        hasTrackingHistory,
    };
  }

  // Matter Timeline
  getEventsForProject(projectCodeId: string) {
    return this.events.filter((e) => e.project_code_id === projectCodeId);
  }

  // Notifications
  getNotifications() {
    return this.notifications;
  }

  markNotificationRead(id: string) {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, read_at: clock.nowISO() } : n
    );
    this.saveToStorage();
    this.notify();
  }

  // ---------------------------------------------------------------------
  // Phase 2: Petty Cash Methods
  // ---------------------------------------------------------------------
  getCashCategories() {
    return this.cashCategories;
  }

  getCashEntries() {
    return this.cashEntries;
  }

  getCashBalance(): number {
    return this.cashEntries
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
  }

  getRunningBalanceList(): { entry: CashEntry; runningBalance: number }[] {
    // Chronological order from oldest to newest
    const chronological = [...this.cashEntries].sort((a, b) => a.entry_no - b.entry_no);
    let running = 0;
    const computed = chronological.map((entry) => {
      if (entry.status === 'ACTIVE') {
        if (entry.entry_type === 'TOP_UP' || entry.entry_type === 'REFUND_IN') {
          running += entry.amount;
        } else if (entry.entry_type === 'EXPENSE' && entry.payment_mode === 'CASH') {
          running -= entry.amount;
        }
        // FIRM_UPI does not modify running cash float
      }
      return { entry, runningBalance: running };
    });

    // Return newest first for ledger presentation
    return computed.reverse();
  }

  addExpense(data: {
    entry_date: string;
    category: string;
    description: string;
    amount: number;
    payment_mode: 'CASH' | 'FIRM_UPI';
    receipt_document_id?: string | null;
    receipt_file_name?: string | null;
    linked_dispatch_id?: string | null;
    is_recoverable: boolean;
    allocations: { project_code_id: string; amount: number; doc_count?: number }[];
  }): CashEntry {
    if (data.payment_mode === 'CASH') {
      const currentBalance = this.getCashBalance();
      if (data.amount > currentBalance) {
        throw new Error(
          `Expense of ₹${data.amount.toFixed(2)} would make petty cash balance negative (Current balance: ₹${currentBalance.toFixed(2)}). Request a top-up first.`
        );
      }
    }

    const nextEntryNo = this.cashEntries.reduce((max, e) => Math.max(max, e.entry_no), 0) + 1;
    const entryId = isLiveMode() ? makeUuid() : `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Generate allocations and corresponding core.recoverable_costs
    const createdAllocations: CashAllocation[] = [];

    for (const alloc of data.allocations) {
      const allocId = isLiveMode() ? makeUuid() : `al-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let recCostId: string | null = null;

      if (data.is_recoverable) {
        recCostId = isLiveMode() ? makeUuid() : `rc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const pCode = this.projectCodes.find((p) => p.id === alloc.project_code_id);
        this.recoverableCosts.unshift({
          id: recCostId,
          source_app: 'OFFICE',
          source_type: 'OFFICE_EXPENSE',
          source_id: entryId,
          project_code_id: alloc.project_code_id,
          client_id: pCode?.client_id || null,
          cost_date: data.entry_date,
          category: data.category,
          description: data.description,
          amount: alloc.amount,
          has_evidence: Boolean(data.receipt_document_id),
          evidence_document_id: data.receipt_document_id || null,
          posting_status: 'PENDING_FINANCE',
          created_at: clock.nowISO(),
        });
      }

      createdAllocations.push({
        id: allocId,
        cash_entry_id: entryId,
        project_code_id: alloc.project_code_id,
        amount: alloc.amount,
        doc_count: alloc.doc_count || 1,
        recoverable_cost_id: recCostId,
      });
    }

    const newEntry: CashEntry = {
      id: entryId,
      entry_no: nextEntryNo,
      entry_date: data.entry_date,
      type: 'EXPENSE',
      entry_type: 'EXPENSE',
      category: data.category,
      description: data.description,
      amount: data.amount,
      payment_mode: data.payment_mode,
      paid_by: 'u_oe',
      receipt_document_id: data.receipt_document_id || null,
      receipt_file_name: data.receipt_file_name || null,
      linked_dispatch_id: data.linked_dispatch_id || null,
      recoverable: data.is_recoverable,
      is_recoverable: data.is_recoverable,
      affects_petty_cash_balance: data.payment_mode === 'CASH',
      status: 'ACTIVE',
      allocations: createdAllocations,
      created_at: clock.nowISO(),
    };

    this.cashEntries.unshift(newEntry);
    this.notify();

    if (isLiveMode()) {
      dbAddCashEntry(newEntry, createdAllocations);
    }
    return newEntry;
  }

  reverseCashEntry(entryId: string, reason: string) {
    const entry = this.cashEntries.find((e) => e.id === entryId);
    if (!entry) return;

    entry.status = 'REVERSED';
    entry.cancel_reason = reason;

    // Create reversals in core.recoverable_costs
    const relatedCosts = this.recoverableCosts.filter(
      (c) => c.source_id === entryId && c.posting_status !== 'REVERSED'
    );
    relatedCosts.forEach((orig) => {
      this.recoverableCosts.unshift({
        ...orig,
        id: `rc-rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        amount: -orig.amount,
        posting_status: 'REVERSED',
        reversal_of: orig.id,
        review_note: `Reversal requested by Office Executive: ${reason}`,
        created_at: clock.nowISO(),
      });
    });

    this.notify();
  }

  getTopupRequests() {
    return this.topupRequests;
  }

  createTopupRequest(amount: number, reason: string, requestedBy: string): PettyCashTopupRequest {
    const newReq: PettyCashTopupRequest = {
      id: isLiveMode() ? makeUuid() : `t-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount,
      reason,
      requested_by: requestedBy,
      requested_at: clock.nowISO(),
      status: 'REQUESTED',
    };
    this.topupRequests.unshift(newReq);
    this.notify();
    if (isLiveMode()) {
      dbAddTopupRequest(newReq);
    }
    return newReq;
  }

  decideTopupRequest(
    requestId: string,
    approved: boolean,
    decidedBy: string,
    note?: string
  ) {
    const req = this.topupRequests.find((r) => r.id === requestId);
    if (!req) return;

    req.status = approved ? 'APPROVED' : 'REJECTED';
    req.decided_by = decidedBy;
    req.decided_at = clock.nowISO();
    req.decision_note = note || null;
    this.notify();
  }

  confirmTopupHandover(requestId: string): CashEntry {
    const req = this.topupRequests.find((r) => r.id === requestId);
    if (!req || req.status !== 'APPROVED') {
      throw new Error('Only approved top-up requests can be marked as handed over.');
    }

    const nextEntryNo = this.cashEntries.reduce((max, e) => Math.max(max, e.entry_no ?? 0), 0) + 1;
    const entryId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const topupEntry: CashEntry = {
      id: entryId,
      entry_no: nextEntryNo,
      entry_date: clock.todayISO(),
      type: 'TOP_UP',
      entry_type: 'TOP_UP',
      category: 'MISC',
      description: `Petty cash top-up float received (Ref: ${req.reason})`,
      amount: req.amount,
      payment_mode: 'CASH',
      paid_by: req.requested_by,
      linked_topup_request_id: req.id,
      recoverable: false,
      is_recoverable: false,
      affects_petty_cash_balance: true,
      status: 'ACTIVE',
      allocations: [],
      created_at: clock.nowISO(),
    };

    this.cashEntries.unshift(topupEntry);
    req.status = 'HANDED_OVER';
    req.handed_over_at = clock.nowISO();
    req.office_cash_entry_id = entryId;

    this.notify();
    return topupEntry;
  }

  getWeeklyCounts() {
    return this.weeklyCounts;
  }

  addWeeklyCount(
    countDate: string,
    physicalCash: number,
    countedBy: string,
    note?: string
  ): PettyCashCount {
    const bookBalance = this.getCashBalance();
    const variance = physicalCash - bookBalance;

    const newCount: PettyCashCount = {
      id: isLiveMode() ? makeUuid() : `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      count_date: countDate,
      counted_by: countedBy,
      physical_cash: physicalCash,
      book_balance: bookBalance,
      variance,
      note: note || null,
    };

    this.weeklyCounts.unshift(newCount);
    this.notify();
    if (isLiveMode()) {
      dbAddCashCount(newCount);
    }
    return newCount;
  }

  signoffWeeklyCount(countId: string, signedBy: string, financeNote?: string) {
    const count = this.weeklyCounts.find((c) => c.id === countId);
    if (!count) return;

    count.finance_signoff_by = signedBy;
    count.finance_signoff_at = clock.nowISO();
    count.finance_note = financeNote || null;
    this.notify();
  }

  getRecoverableCosts() {
    return this.recoverableCosts;
  }

  // ---------------------------------------------------------------------
  // Phase 3: Physical Documents, Custody Items, Errands & Importers
  // ---------------------------------------------------------------------

  getPhysicalDocuments() {
    return this.physicalDocs;
  }

  addPhysicalDocument(data: {
    project_code_id?: string | null;
    doc_name: string;
    doc_nature: 'ORIGINAL' | 'COPY';
    pages_count: number;
    copies_count: number;
    current_location: string;
    status: PhysicalDocument['status'];
    notary_cost?: number;
    scan_document_id?: string | null;
    scan_file_name?: string | null;
    notes?: string | null;
  }): PhysicalDocument {
    const docId = `pdoc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newDoc: PhysicalDocument = {
      id: docId,
      project_code_id: data.project_code_id || null,
      document: data.doc_name,
      doc_name: data.doc_name,
      original_or_copy: data.doc_nature,
      doc_nature: data.doc_nature,
      pages: data.pages_count || 1,
      pages_count: data.pages_count || 1,
      copies_count: data.copies_count || 1,
      current_location: data.current_location || 'Office Safe',
      status: data.status || 'RECEIVED',
      notary_cost: data.notary_cost || 0.0,
      notary_cash_entry_id: null,
      scan_document_id: data.scan_document_id || null,
      scan_file_name: data.scan_file_name || null,
      notes: data.notes || null,
      received_at: clock.nowISO(),
      notarized_at: data.status === 'NOTARIZED' ? clock.nowISO() : null,
      created_at: clock.nowISO(),
      updated_at: clock.nowISO(),
    };

    this.physicalDocs.unshift(newDoc);

    // Cross-app contract: DOC_RECEIVED event
    if (data.project_code_id && newDoc.status === 'RECEIVED') {
      const pc = this.projectCodes.find((p) => p.id === data.project_code_id);
      this.events.unshift({
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        project_code_id: data.project_code_id,
        event_code: 'DOC_RECEIVED',
        title: `Physical document received: ${data.doc_name}`,
        detail: `Deposited at ${data.current_location} (${data.pages_count} pages, ${data.doc_nature})`,
        occurred_at: clock.nowISO(),
        source_app: 'OFFICE',
        client_visible: true,
        client_label: `Original documents received from client (${pc?.code})`,
        metadata: { doc_id: docId, doc_nature: data.doc_nature },
      });
    }

    this.notify();
    return newDoc;
  }

  updatePhysicalDocumentStatus(
    docId: string,
    newStatus: PhysicalDocument['status'],
    details?: {
      current_location?: string;
      notary_cost?: number;
      scan_document_id?: string;
      scan_file_name?: string;
      notes?: string;
    }
  ) {
    const doc = this.physicalDocs.find((d) => d.id === docId);
    if (!doc) return;

    doc.status = newStatus;
    if (details?.current_location) doc.current_location = details.current_location;
    if (details?.notary_cost !== undefined) doc.notary_cost = details.notary_cost;
    if (details?.scan_document_id) doc.scan_document_id = details.scan_document_id;
    if (details?.scan_file_name) doc.scan_file_name = details.scan_file_name;
    if (details?.notes) doc.notes = details.notes;

    if (newStatus === 'NOTARIZED') {
      doc.notarized_at = clock.nowISO();
      // Cross-app contract: DOC_NOTARIZED event
      if (doc.project_code_id) {
        const pc = this.projectCodes.find((p) => p.id === doc.project_code_id);
        this.events.unshift({
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          project_code_id: doc.project_code_id,
          event_code: 'DOC_NOTARIZED',
          title: `Document notarized: ${doc.doc_name}`,
          detail: `Notarisation attestation complete. Stored at ${doc.current_location}`,
          occurred_at: clock.nowISO(),
          source_app: 'OFFICE',
          client_visible: true,
          client_label: `Documents notarized by advocate notary (${pc?.code})`,
          metadata: { doc_id: doc.id, notary_cost: doc.notary_cost },
        });
      }
    }

    this.notify();
  }

  getCustodyItems() {
    return this.custodyItems;
  }

  getCustodyLog() {
    return this.custodyLog;
  }

  getCustodyLogs() {
    return this.custodyLog;
  }

  checkoutCustodyItem(
    itemId: string,
    holderName: string,
    holderId?: string,
    purpose?: string,
    expectedReturn?: string
  ) {
    const item = this.custodyItems.find((i) => i.id === itemId);
    if (!item) return;

    item.status = 'CHECKED_OUT';
    item.current_holder_id = holderId || null;
    item.current_holder_name = holderName;
    item.checked_out_at = clock.nowISO();
    item.expected_return = expectedReturn || null;
    item.purpose = purpose || null;

    const logId = isLiveMode() ? makeUuid() : `cl_${Date.now()}`;
    const newLog: CustodyLog = {
      id: logId,
      custody_item_id: item.id,
      holder_user_id: holderId || 'u_oe',
      holder_name: holderName,
      out_at: clock.nowISO(),
      expected_return: expectedReturn || null,
      in_at: null,
      action: 'CHECK_OUT',
      action_at: clock.nowISO(),
      purpose: purpose || null,
      created_at: clock.nowISO(),
    };

    this.custodyLog.unshift(newLog);
    this.notify();

    if (isLiveMode()) {
      dbAddCustodyLog(newLog);
    }
  }

  checkinCustodyItem(itemId: string, notes?: string) {
    const item = this.custodyItems.find((i) => i.id === itemId);
    if (!item) return;

    const previousHolder = item.current_holder_name || 'Holder';

    item.status = 'AVAILABLE';
    item.current_holder_id = null;
    item.current_holder_name = null;
    item.checked_out_at = null;
    item.expected_return = null;
    item.purpose = null;

    // Mark active log as returned (in_at)
    const activeLog = this.custodyLog.find((l) => l.custody_item_id === item.id && !l.in_at);
    if (activeLog) {
      activeLog.in_at = clock.nowISO();
      activeLog.notes = notes || 'Returned to Office Safe';
    } else {
      this.custodyLog.unshift({
        id: `cl_${Date.now()}`,
        custody_item_id: item.id,
        holder_user_id: 'u_oe',
        holder_name: previousHolder,
        out_at: clock.nowISO(),
        in_at: clock.nowISO(),
        action: 'CHECK_IN',
        action_at: clock.nowISO(),
        notes: notes || 'Returned to Office Safe',
        created_at: clock.nowISO(),
      });
    }

    this.notify();
  }

  getOfficeRequests() {
    return this.officeRequests;
  }

  createOfficeRequest(data: {
    requested_by_id: string;
    requested_by_name: string;
    requested_by_role?: string;
    project_code_id?: string | null;
    category: OfficeRequest['category'];
    title: string;
    description?: string;
    priority: OfficeRequest['priority'];
    needed_by?: string;
  }): OfficeRequest {
    const nextReqNo = this.officeRequests.reduce((max, r) => Math.max(max, r.request_no ?? 0), 100) + 1;
    const reqId = isLiveMode() ? makeUuid() : `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newReq: OfficeRequest = {
      id: reqId,
      request_no: nextReqNo,
      requested_by: data.requested_by_id,
      requested_by_id: data.requested_by_id,
      requested_by_name: data.requested_by_name,
      requested_by_role: data.requested_by_role || 'STAFF',
      project_code_id: data.project_code_id || null,
      category: data.category,
      title: data.title,
      description: data.description || data.title,
      priority: data.priority,
      due_date: data.needed_by || null,
      needed_by: data.needed_by || null,
      status: 'OPEN',
      accepted_by: null,
      assigned_to_id: 'usr-office-exec-1',
      assigned_to_name: 'Suresh Kumar',
      linked_dispatch_id: null,
      linked_cash_entry_id: null,
      linked_document_id: null,
      attachment_doc_ids: [],
      completion_note: null,
      completed_at: null,
      created_at: clock.nowISO(),
    };

    this.officeRequests.unshift(newReq);
    this.notify();

    if (isLiveMode()) {
      dbAddOfficeRequest(newReq);
    }
    return newReq;
  }

  updateOfficeRequestStatus(
    requestId: string,
    status: OfficeRequest['status'],
    details?: {
      completion_note?: string;
      linked_dispatch_id?: string;
      linked_cash_entry_id?: string;
      linked_document_id?: string;
    }
  ) {
    const req = this.officeRequests.find((r) => r.id === requestId);
    if (!req) return;

    req.status = status;
    if (details?.completion_note) req.completion_note = details.completion_note;
    if (details?.linked_dispatch_id) req.linked_dispatch_id = details.linked_dispatch_id;
    if (details?.linked_cash_entry_id) req.linked_cash_entry_id = details.linked_cash_entry_id;
    if (details?.linked_document_id) req.linked_document_id = details.linked_document_id;

    if (status === 'DONE') {
      req.completed_at = clock.nowISO();
      // Notify the requester in core.notifications
      this.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: req.requested_by || req.requested_by_id || 'u_oe',
        title: `Errand Completed: ${req.title}`,
        body: `Suresh Kumar has completed your request #${req.request_no}. Note: ${details?.completion_note || 'Task finished successfully.'}`,
        source_app: 'OFFICE',
        created_at: clock.nowISO(),
      });
    }

    this.notify();

    if (isLiveMode()) {
      dbUpdateOfficeRequest(requestId, {
        status,
        completion_note: details?.completion_note || null,
        completed_at: req.completed_at || null,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Importer Commit Methods (Idempotent)
  // ---------------------------------------------------------------------

  commitImportedDispatches(dispatchesToCommit: {
    booking_date: string;
    carrier: CarrierType;
    tracking_id: string;
    recipient_id: string;
    particulars: string;
    status: DispatchStatus;
    delivered_on?: string | null;
    cost: number;
    project_code_id?: string | null;
  }[]): { newlyCreated: number; skippedExisting: number } {
    let newlyCreated = 0;
    let skippedExisting = 0;

    for (const d of dispatchesToCommit) {
      // Check for existing tracking ID
      const existing = this.dispatches.find((existingDisp) => existingDisp.tracking_id.trim().toUpperCase() === d.tracking_id.trim().toUpperCase());
      if (existing) {
        skippedExisting++;
        continue;
      }

      const nextSerial = this.dispatches.reduce((max, cur) => Math.max(max, cur.serial_no), 0) + 1;
      const newDisp: DispatchRecord = {
        id: `disp-imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        serial_no: nextSerial,
        direction: 'OUTWARD',
        booking_date: d.booking_date,
        carrier: d.carrier,
        tracking_id: d.tracking_id,
        recipient_address_id: d.recipient_id,
        recipient_id: d.recipient_id,
        document_type: 'OTHER',
        doc_type: 'OTHER',
        particulars: d.particulars,
        status: d.status,
        delivered_on: d.delivered_on || null,
        ad_card_received: false,
        cost: d.cost,
        payment_mode: 'CASH',
        legal_evidence: false,
        project_codes: d.project_code_id ? [d.project_code_id] : [],
        created_at: clock.nowISO(),
      };

      this.dispatches.unshift(newDisp);
      this.touchAddressBookEntry(d.recipient_id);
      newlyCreated++;
    }

    if (newlyCreated > 0) {
      this.notify();
    }
    return { newlyCreated, skippedExisting };
  }

  commitImportedCashEntries(entriesToCommit: {
    entry_date: string;
    category: string;
    description: string;
    amount: number;
    payment_mode: 'CASH' | 'FIRM_UPI';
    entry_type: 'TOP_UP' | 'EXPENSE';
  }[]): { newlyCreated: number; skippedExisting: number } {
    let newlyCreated = 0;
    let skippedExisting = 0;

    for (const item of entriesToCommit) {
      // Check for matching date + amount + description
      const existing = this.cashEntries.find(
        (e) =>
          e.entry_date === item.entry_date &&
          Math.abs(e.amount - item.amount) < 0.01 &&
          e.description.trim().toLowerCase() === item.description.trim().toLowerCase()
      );

      if (existing) {
        skippedExisting++;
        continue;
      }

      const nextEntryNo = this.cashEntries.reduce((max, cur) => Math.max(max, cur.entry_no ?? 0), 0) + 1;
      const newEntry: CashEntry = {
        id: `c-imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        entry_no: nextEntryNo,
        entry_date: item.entry_date,
        type: item.entry_type,
        entry_type: item.entry_type,
        category: item.category,
        description: item.description,
        amount: item.amount,
        payment_mode: item.payment_mode,
        recoverable: false,
        is_recoverable: false, // Imported entries start unallocated
        affects_petty_cash_balance: item.payment_mode === 'CASH',
        status: 'ACTIVE',
        allocations: [],
        created_at: clock.nowISO(),
      };

      this.cashEntries.unshift(newEntry);
      newlyCreated++;
    }

    if (newlyCreated > 0) {
      this.notify();
    }
    return { newlyCreated, skippedExisting };
  }
}

export const mockStore = new MockStore();
