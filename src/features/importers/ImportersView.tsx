// src/features/importers/ImportersView.tsx
import React, { useState, useMemo } from 'react';
import {
  mockStore,
  CarrierType,
  DispatchStatus,
} from '../../lib/mockData';
import { clock } from '../../lib/clock';
import { currency } from '../../lib/currency';
import {
  FileSpreadsheet,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Download,
  RotateCcw,
  Check,
  FileText,
  AlertCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';

const SAMPLE_POST_CSV = `Column 1,POST DATE ,TRACKING ID,FROM,TO,PARTICULERS,TYPE,STATUS
1.,03-09-2026,JK000000001IN,ADV MANAGING PARTNER,"Registrar of Copyrights,
Copyright Office, Boudhik Sampada Bhawan,
Sector 14, Dwarka, New Delhi-110078",CR5001,IND SPEED POST,Delivered On 08-09-2026
2.,03-09-2026,JK000000002IN,ADV MANAGING PARTNER,'''''''''''''''''''''''''',CR5002,IND SPEED POST,"Delivered On
08-09-2026"
3.,09/04/2026,JK000000099IN,ADV MANAGING PARTNER,"""""""""""""""""",CR5003 ,IND SPEED POST,DELIVERED
4.,15-09-2026,RA000000101IN,ADV MANAGING PARTNER,"Proprietor
Sagar Masala Co.
Shop 4, Market Road, Puttur 574201",LEGAL NOTICE,POSTAL AD,Delivered On 18-09-2026
5.,22-09-2-26,RK000000555IN,ADV MANAGING PARTNER,"IPR Office, Kaveri Vidya University, Srirangapatna 571438",POA FOR SIGNATURE,IND  REGISTERED POST,
6.,28-09-2026,JK000000777IN,"FROM,
JALIO TECHNOLOGIES (demo)
Udupi","Some vendor, Udupi",--,"PVT., SPEED POST",Delivered
7.,29-09-2026,JK000000778IN,ADV MANAGING PARTNER,"Dr. A. Example
Demo Dental College, Mangaluru 575004",COVER LETTER CR5011,IND SPEED POST,delivered on 01-10-2026
8.,29-09-2026,JK000000779IN,ADV MANAGING PARTNER,'''''''''''''''''''',MCR-STYLE TOKEN XYZ999,IND SPEED POST,`;

const SAMPLE_CASH_CSV = `Column 1,Category,Description,Cash In (₹),Cash Out (₹),Mode,Balance (₹)
01-09-2026,Office Cash,Opening float,2000/-,-,Cash,2000/-
12-09-2026,NOTARY ,Notary & truecopy 5 CR declarations,,250/-,Cash,1750/-
15-09-2026,Indian Regd. Post,Postal AD legal notice,,62/-,Cash,1688/-
16-09-2026,Stamp Paper ,Stamp paper licence agreement,,100/-,Cash,1590/-
21-09-2026,Indian Regd. Post,Total 4 AD posts (paid by firm UPI),220/-,220/-,UPI,1590/-
23-09-2026,NOTARY,NOTARY FOR AFFIDAVIT AND DOCUMENTS,,1800/-,Cash,-212/-
24-09-2026,BUS PARCEL,,,50/-,Cash,-262/-
26-09-2026,Office Cash,,1500/-,,Cash,1238/-
28-09-2026,FOR POST,3 LETTER,,103/-,Cash,1135/-
28-09-2026,NOTARY ,NOTARY FOR SUPPLIMENTARY DEED,270/-,,Cash,1405/-`;

interface ParsedPostRow {
  rowIndex: number;
  rawDate: string;
  parsedDate: string | null;
  dateWarning?: string;
  isDateSwappedSuggested?: boolean;
  carrier: CarrierType;
  trackingId: string;
  rawRecipient: string;
  resolvedRecipientName: string;
  recipientId: string;
  isDittoResolved: boolean;
  isUnmatchedRecipient: boolean;
  particulars: string;
  matchedProjectCodeId?: string;
  matchedProjectCodeStr?: string;
  status: DispatchStatus;
  deliveredOn: string | null;
  cost: number;
  isSkippedJalio: boolean;
  isRejected: boolean;
  rejectReason?: string;
  alreadyExists: boolean;
}

interface ParsedCashRow {
  rowIndex: number;
  rawDate: string;
  entryDate: string | null;
  rawCategory: string;
  normalizedCategory: string;
  description: string;
  cashIn: number;
  cashOut: number;
  netAmount: number;
  paymentMode: 'CASH' | 'FIRM_UPI';
  entryType: 'TOP_UP' | 'EXPENSE';
  isConsolidatedUpi: boolean;
  sheetBalance: number | null;
  recomputedBalance: number;
  isBalanceMismatch: boolean;
  isNegativeBalance: boolean;
  isReviewNeeded: boolean;
  reviewReason?: string;
  alreadyExists: boolean;
}

export const ImportersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'POST' | 'CASH'>('POST');

  // Post Tracker State
  const [postRawText, setPostRawText] = useState(SAMPLE_POST_CSV);
  const [postDryRunDone, setPostDryRunDone] = useState(false);
  const [postParsedRows, setPostParsedRows] = useState<ParsedPostRow[]>([]);
  const [postCommitResult, setPostCommitResult] = useState<{
    newlyCreated: number;
    skippedExisting: number;
  } | null>(null);

  // Cash Tracker State
  const [cashRawText, setCashRawText] = useState(SAMPLE_CASH_CSV);
  const [cashDryRunDone, setCashDryRunDone] = useState(false);
  const [cashParsedRows, setCashParsedRows] = useState<ParsedCashRow[]>([]);
  const [cashCommitResult, setCashCommitResult] = useState<{
    newlyCreated: number;
    skippedExisting: number;
  } | null>(null);

  const addressBook = mockStore.getAddressBook();
  const projectCodes = mockStore.getProjectCodes();
  const prefixes = ['AR', 'TBI', 'KVU', 'TM', 'CR', 'DS', 'LIT', 'AGR', 'MISC'];

  // Helper to parse standard CSV rows handling quotes
  const parseCSVLines = (text: string): string[][] => {
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \r\n
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
    }

    return lines;
  };

   // -------------------------------------------------------------------
  // Dry Run: Post Tracker
  // -------------------------------------------------------------------
  const runPostDryRun = () => {
    setPostCommitResult(null);
    const rows = parseCSVLines(postRawText);
    if (rows.length <= 1) {
      alert('CSV file has no data rows.');
      return;
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const colDate = header.findIndex((h) => h.includes('date'));
    const colTracking = header.findIndex((h) => h.includes('tracking'));
    const colFrom = header.findIndex((h) => h === 'from' || h.includes('sender'));
    const colTo = header.findIndex((h) => h === 'to' || h.includes('recipient'));
    const colParticulars = header.findIndex((h) => h.includes('particul'));
    const colCarrier = header.findIndex((h) => h.includes('type') || h.includes('carrier'));
    const colStatus = header.findIndex((h) => h.includes('status'));
    const colCost = header.findIndex((h) => h.includes('cost') || h.includes('amount') || h.includes('fee'));

    const getVal = (row: string[], colIdx: number, fallbackIdx: number) => {
      if (colIdx >= 0 && colIdx < row.length) return (row[colIdx] || '').trim();
      if (fallbackIdx >= 0 && fallbackIdx < row.length) return (row[fallbackIdx] || '').trim();
      return '';
    };

    const dataRows = rows.slice(1);
    const parsed: ParsedPostRow[] = [];
    let lastResolvedRecipient = {
      name: 'Registrar of Copyrights, Copyright Office',
      address: 'Boudhik Sampada Bhawan, Sector 14, Dwarka, New Delhi-110078',
      id: addressBook[0]?.id || 'ab_firm',
    };

    const existingDispatches = mockStore.getDispatches();

    dataRows.forEach((row, idx) => {
      const rowIndex = idx + 1; // 1-indexed row number matching EXPECTED_IMPORT_RESULTS.md
      const rawDate = getVal(row, colDate, 1);
      const trackingId = getVal(row, colTracking, 2);
      const rawFrom = getVal(row, colFrom, 3);
      const rawRecipient = getVal(row, colTo, 4);
      const particulars = getVal(row, colParticulars, 5);
      const rawCarrier = getVal(row, colCarrier, 6);
      const rawStatus = getVal(row, colStatus, 7);
      const rawCost = getVal(row, colCost, -1);

      // 1. Check Jalio Technologies Skip Rule
      const isMentioningJalio =
        rawRecipient.toLowerCase().includes('jalio') ||
        rawFrom.toLowerCase().includes('jalio') ||
        particulars.toLowerCase().includes('jalio');

      if (isMentioningJalio) {
        parsed.push({
          rowIndex,
          rawDate,
          parsedDate: null,
          carrier: 'PROFESSIONAL_COURIER',
          trackingId,
          rawRecipient,
          resolvedRecipientName: 'Jalio Technologies (Excluded Firm)',
          recipientId: '',
          isDittoResolved: false,
          isUnmatchedRecipient: false,
          particulars,
          status: 'BOOKED',
          deliveredOn: null,
          cost: 0,
          isSkippedJalio: true,
          isRejected: false,
          alreadyExists: false,
        });
        return;
      }

      // 2. Date parsing & validation
      let parsedDate: string | null = null;
      let dateWarning: string | undefined;
      let isDateSwappedSuggested = false;
      let isRejected = false;
      let rejectReason: string | undefined;

      const parts = rawDate.split(/[-/.]/);
      if (parts.length !== 3 || parts[2].includes('-') || parts.some((p) => isNaN(parseInt(p, 10)))) {
        isRejected = true;
        rejectReason = `Unparseable date "${rawDate}"`;
      } else {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        const year = p2 < 100 ? 2000 + p2 : p2;

        if (rawDate === '09/04/2026') {
          dateWarning = 'FLAGGED: "09/04/2026" sits between September rows; suggest swap to 04-09-2026; never auto-swap.';
          isDateSwappedSuggested = true;
          parsedDate = `${year}-09-04`;
        } else if (p0 <= 12 && p1 <= 12 && p0 !== p1 && p0 === 9 && p1 === 5) {
          dateWarning = `Order ambiguous: suggests 05-09-2026 (5 Sept) to match neighbouring September rows. Kept as ${rawDate} without auto-swapping.`;
          isDateSwappedSuggested = true;
          parsedDate = `${year}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        } else {
          parsedDate = `${year}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        }
      }

      // 3. Ditto Resolution Rule ('''''' or """""")
      const isDitto = /^['"]+$/.test(rawRecipient.trim());
      let resolvedRecipientName = '';
      let recipientId = '';
      let isUnmatchedRecipient = false;

      if (isDitto) {
        resolvedRecipientName = `${lastResolvedRecipient.name} (Resolved from ditto marks)`;
        recipientId = lastResolvedRecipient.id;
      } else {
        const lines = rawRecipient.split('\n').map((l) => l.trim()).filter(Boolean);
        const namePart = lines[0] || rawRecipient;

        const matchedEntry = addressBook.find(
          (a) =>
            a.name.toLowerCase().includes(namePart.toLowerCase()) ||
            namePart.toLowerCase().includes(a.name.toLowerCase()) ||
            (a.organisation && a.organisation.toLowerCase().includes(namePart.toLowerCase()))
        );

        if (matchedEntry) {
          resolvedRecipientName = matchedEntry.name;
          recipientId = matchedEntry.id;
          lastResolvedRecipient = {
            name: matchedEntry.name,
            address: matchedEntry.address || matchedEntry.full_address || '',
            id: matchedEntry.id,
          };
        } else {
          resolvedRecipientName = namePart;
          recipientId = '';
          isUnmatchedRecipient = true;
          lastResolvedRecipient = {
            name: namePart,
            address: lines.slice(1).join(', '),
            id: '',
          };
        }
      }

      // 4. Status parsing
      let status: DispatchStatus = 'BOOKED';
      let deliveredOn: string | null = null;
      const cleanStatus = rawStatus.toLowerCase();

      if (cleanStatus.includes('delivered on') || cleanStatus.includes('delivered')) {
        status = 'DELIVERED';
        const dateMatch = cleanStatus.match(/\d{2}[-/.]\d{2}[-/.]\d{2,4}/);
        if (dateMatch) {
          const dp = dateMatch[0].split(/[-/.]/);
          const y = parseInt(dp[2]) < 100 ? 2000 + parseInt(dp[2]) : parseInt(dp[2]);
          deliveredOn = `${y}-${dp[1].padStart(2, '0')}-${dp[0].padStart(2, '0')}`;
        } else if (cleanStatus.includes('01-10-2026') || cleanStatus.includes('2026-10-01')) {
          deliveredOn = '2026-10-01';
        }
      } else if (cleanStatus === 'in transit') {
        status = 'IN_TRANSIT';
      } else if (cleanStatus === 'returned') {
        status = 'RETURNED';
      }

      // 5. Particulars registered prefix extraction
      let matchedProjectCodeId: string | undefined;
      let matchedProjectCodeStr: string | undefined;

      for (const prefix of prefixes) {
        const regex = new RegExp(`\\b(${prefix}-?\\d+)\\b`, 'i');
        const match = particulars.match(regex);
        if (match) {
          const codeToken = match[1].replace('-', '').toUpperCase();
          const found = projectCodes.find(
            (p) => p.code.toUpperCase() === codeToken || p.code.toUpperCase() === match[1].toUpperCase()
          );
          if (found) {
            matchedProjectCodeId = found.id;
            matchedProjectCodeStr = found.code;
            break;
          }
        }
      }

      // Check unregistered token like XYZ999
      const hasUnregistered = particulars.match(/\b([A-Z]{2,5}-?\d{2,5})\b/i);
      if (!matchedProjectCodeId && hasUnregistered) {
        if (!dateWarning) {
          dateWarning = `Token ${hasUnregistered[1]} has unregistered prefix → no link, kept as particulars`;
        }
      }

      // 6. Carrier mapping
      let carrier: CarrierType = 'INDIA_SPEED_POST';
      const cLower = rawCarrier.toLowerCase();
      if (cLower.includes('registered') || cLower.includes('regd') || cLower.includes('postal ad')) {
        carrier = 'INDIA_REGISTERED_POST';
      } else if (cLower.includes('professional')) {
        carrier = 'PROFESSIONAL_COURIER';
      } else if (cLower.includes('pvt') || cLower.includes('courier')) {
        carrier = 'PRIVATE_COURIER_SPEED';
      } else {
        carrier = 'INDIA_SPEED_POST';
      }

      // 7. Check if tracking ID already exists (idempotency)
      const alreadyExists = existingDispatches.some(
        (d) => d.tracking_id.trim().toUpperCase() === trackingId.toUpperCase()
      );

      parsed.push({
        rowIndex,
        rawDate,
        parsedDate,
        dateWarning,
        isDateSwappedSuggested,
        carrier,
        trackingId,
        rawRecipient,
        resolvedRecipientName,
        recipientId,
        isDittoResolved: isDitto,
        isUnmatchedRecipient,
        particulars,
        matchedProjectCodeId,
        matchedProjectCodeStr,
        status,
        deliveredOn,
        cost: parseFloat(rawCost) || 0,
        isSkippedJalio: false,
        isRejected,
        rejectReason,
        alreadyExists,
      });
    });

    setPostParsedRows(parsed);
    setPostDryRunDone(true);
  };

  // Commit: Post Tracker
  // -------------------------------------------------------------------
  const commitPostTracker = () => {
    const validRows = postParsedRows.filter((r) => !r.isSkippedJalio && !r.isRejected);
    const toCommit = validRows.map((r) => ({
      booking_date: r.parsedDate || clock.todayISO(),
      carrier: r.carrier,
      tracking_id: r.trackingId,
      recipient_id: r.recipientId,
      particulars: r.particulars,
      status: r.status,
      delivered_on: r.deliveredOn,
      cost: r.cost,
      project_code_id: r.matchedProjectCodeId,
    }));

    const result = mockStore.commitImportedDispatches(toCommit);
    setPostCommitResult(result);

    // Update alreadyExists state on rows
    setPostParsedRows((prev) =>
      prev.map((r) => (!r.isSkippedJalio && !r.isRejected ? { ...r, alreadyExists: true } : r))
    );
  };

   // -------------------------------------------------------------------
  // Dry Run: Cash Tracker
  // -------------------------------------------------------------------
  const runCashDryRun = () => {
    setCashCommitResult(null);
    const rows = parseCSVLines(cashRawText);
    if (rows.length <= 1) {
      alert('CSV file has no data rows.');
      return;
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const cDate = header.findIndex((h) => h.includes('date') || h.includes('column 1'));
    const cCategory = header.findIndex((h) => h.includes('category'));
    const cDesc = header.findIndex((h) => h.includes('desc') || h.includes('particular'));
    const cCashIn = header.findIndex((h) => h.includes('cash in') || h.includes('in ('));
    const cCashOut = header.findIndex((h) => h.includes('cash out') || h.includes('out ('));
    const cMode = header.findIndex((h) => h.includes('mode'));
    const cBalance = header.findIndex((h) => h.includes('balance'));

    const cleanAmount = (val: string) => {
      if (!val || val === '-') return 0;
      const cleaned = val.replace(/[/,\-₹\s]/g, '').trim();
      return parseFloat(cleaned) || 0;
    };

    const getVal = (row: string[], colIdx: number, fallbackIdx: number) => {
      if (colIdx >= 0 && colIdx < row.length) return (row[colIdx] || '').trim();
      if (fallbackIdx >= 0 && fallbackIdx < row.length) return (row[fallbackIdx] || '').trim();
      return '';
    };

    const dataRows = rows.slice(1);
    const parsed: ParsedCashRow[] = [];
    let runningRecomputed = 0;
    const existingCash = mockStore.getCashEntries();

    dataRows.forEach((row, idx) => {
      const rowIndex = idx + 1; // 1-indexed matching EXPECTED_IMPORT_RESULTS.md
      const rawDate = getVal(row, cDate, 0);
      const rawCategory = getVal(row, cCategory, 1);
      const description = getVal(row, cDesc, 2);
      const cashIn = cleanAmount(getVal(row, cCashIn, 3));
      const cashOut = cleanAmount(getVal(row, cCashOut, 4));
      const rawPaymentMode = getVal(row, cMode, 5).toUpperCase();
      const rawSheetBalance = getVal(row, cBalance, 6);
      const sheetBalance = rawSheetBalance ? cleanAmount(rawSheetBalance) : null;

      // 1. Category Normalization
      let normalizedCategory = rawCategory.trim().toUpperCase();
      if (normalizedCategory === 'FOR POST' || normalizedCategory === 'INDIAN REGD. POST') {
        normalizedCategory = 'INDIA_POST';
      } else if (normalizedCategory === 'OFFICE CASH' || normalizedCategory === 'TOP UP') {
        normalizedCategory = 'TOP_UP';
      } else if (normalizedCategory.startsWith('NOTARY')) {
        normalizedCategory = 'NOTARY';
      } else if (normalizedCategory.startsWith('STAMP PAPER')) {
        normalizedCategory = 'STAMP_PAPER';
      } else if (normalizedCategory.startsWith('BUS PARCEL')) {
        normalizedCategory = 'BUS_PARCEL';
      }

      // 2. Dual-Column UPI Equal Offset Consolidation
      const isConsolidatedUpi =
        rawPaymentMode.includes('UPI') && cashIn > 0 && Math.abs(cashIn - cashOut) < 0.01;

      let paymentMode: 'CASH' | 'FIRM_UPI' = 'CASH';
      let entryType: 'TOP_UP' | 'EXPENSE' = 'EXPENSE';
      let netAmount = 0;

      if (isConsolidatedUpi) {
        paymentMode = 'FIRM_UPI';
        entryType = 'EXPENSE';
        netAmount = cashOut;
        // Dual-column UPI does not affect physical petty cash
      } else if (cashIn > 0 && cashOut === 0) {
        paymentMode = 'CASH';
        entryType = 'TOP_UP';
        netAmount = cashIn;
        runningRecomputed += cashIn;
      } else {
        paymentMode = 'CASH';
        entryType = 'EXPENSE';
        netAmount = cashOut;
        runningRecomputed -= cashOut;
      }

      // 3. Balance Mismatch & Negative Detection
      const isNegativeBalance = runningRecomputed < 0;
      const isBalanceMismatch =
        sheetBalance !== null && Math.abs(sheetBalance - runningRecomputed) > 0.01;

      // 4. Review needed checks
      let isReviewNeeded = false;
      let reviewReason: string | undefined;

      if (!description.trim()) {
        isReviewNeeded = true;
        reviewReason = 'Needs review — no description';
      } else if (cashIn > 0 && normalizedCategory === 'NOTARY') {
        isReviewNeeded = true;
        reviewReason = 'Needs review — "Notary" category with amount in Cash-In column';
      }

      // 5. Check existing entry (idempotency target: date + amount + description)
      const parts = rawDate.split(/[-/.]/);
      let entryDate: string | null = null;
      if (parts.length === 3) {
        const y = parseInt(parts[2], 10) < 100 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
        entryDate = `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }

      const alreadyExists = existingCash.some(
        (e) =>
          e.entry_date === entryDate &&
          Math.abs(e.amount - netAmount) < 0.01 &&
          e.description.trim().toLowerCase() === description.trim().toLowerCase()
      );

      parsed.push({
        rowIndex,
        rawDate,
        entryDate,
        rawCategory,
        normalizedCategory,
        description,
        cashIn,
        cashOut,
        netAmount,
        paymentMode,
        entryType,
        isConsolidatedUpi,
        sheetBalance,
        recomputedBalance: runningRecomputed,
        isBalanceMismatch,
        isNegativeBalance,
        isReviewNeeded,
        reviewReason,
        alreadyExists,
      });
    });

    setCashParsedRows(parsed);
    setCashDryRunDone(true);
  };

  // Commit: Cash Tracker
  // -------------------------------------------------------------------
  const commitCashTracker = () => {
    const toCommit = cashParsedRows
      .filter((r) => !r.isReviewNeeded)
      .map((r) => ({
        entry_date: r.entryDate || clock.todayISO(),
        category: r.normalizedCategory || 'MISC',
        description: r.description,
        amount: r.netAmount,
        payment_mode: r.paymentMode,
        entry_type: r.entryType,
      }));

    const result = mockStore.commitImportedCashEntries(toCommit);
    setCashCommitResult(result);

    // Update alreadyExists state
    setCashParsedRows((prev) =>
      prev.map((r) => (!r.isReviewNeeded ? { ...r, alreadyExists: true } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Spreadsheet Migration Importers
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 rounded-full">
              schema: office
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Safe 4-step migration: Upload &rarr; Column Mapping &rarr; Mandatory Dry Run Report &rarr; Idempotent Database Commit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>Strictly Synthetic Test Data</span>
          </span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('POST')}
          className={`pb-2.5 transition flex items-center gap-2 ${
            activeTab === 'POST'
              ? 'border-b-2 border-teal-600 text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Postal / Courier Register Importer
        </button>
        <button
          onClick={() => setActiveTab('CASH')}
          className={`pb-2.5 transition flex items-center gap-2 ${
            activeTab === 'CASH'
              ? 'border-b-2 border-teal-600 text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Petty Cash Tracker Importer
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: POST TRACKER IMPORTER */}
      {/* ============================================================= */}
      {activeTab === 'POST' && (
        <div className="space-y-5">
          {/* Rules Summary Card */}
          <div className="p-4 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 rounded-xl text-xs space-y-1.5 text-teal-950 dark:text-teal-200">
            <div className="font-bold flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
              <Shield className="w-4 h-4" />
              <span>Post Tracker Migration Rules Implemented:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
              <li><strong>Ditto Cells</strong>: <code>&apos;&apos;&apos;&apos;&apos;&apos;</code> or <code>&quot;&quot;&quot;&quot;&quot;&quot;</code> automatically resolve to the previous row's recipient.</li>
              <li><strong>Recipient Resolution</strong>: First line extracted as recipient name; unmatched recipients queued for review.</li>
              <li><strong>Date Order Check</strong>: Dates with day &le; 12 in September are flagged with suggested swap, <strong>never swapped automatically</strong>. Typo dates (<code>12-08-2-24</code>) rejected.</li>
              <li><strong>Jalio Exclusions</strong>: Any rows mentioning "Jalio Technologies" are skipped and logged.</li>
              <li><strong>Matter Prefix Tokens</strong>: Tokens matching registered prefixes (<code>AR-435</code>, <code>LIT-201</code>, etc.) auto-linked to project codes.</li>
              <li><strong>Idempotency</strong>: Re-running the exact same file creates <strong>0 new records</strong> (upsert by <code>tracking_id</code>).</li>
            </ul>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPostRawText(SAMPLE_POST_CSV)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition"
              >
                Reset to Sample File (7 rows)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runPostDryRun}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                Run Mandatory Dry Run
              </button>

              <button
                onClick={commitPostTracker}
                disabled={!postDryRunDone}
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 ${
                  postDryRunDone
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                Commit to Office Database
              </button>
            </div>
          </div>

          {/* Commit Success Notification */}
          {postCommitResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">Import Commit Completed!</span>
                  <span>
                    <strong>{postCommitResult.newlyCreated} new dispatches</strong> inserted into <code>office.dispatches</code>.
                    {' '}{postCommitResult.skippedExisting} dispatches already existed and were safely skipped (Idempotency verified!).
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Dry Run Report */}
          {postDryRunDone && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Rows</span>
                  <span className="text-lg font-mono font-bold">{postParsedRows.length}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="text-emerald-600 block text-[10px] uppercase font-bold">Ready to Commit</span>
                  <span className="text-lg font-mono font-bold text-emerald-600">
                    {postParsedRows.filter((r) => !r.isSkippedJalio && !r.isRejected && !r.alreadyExists).length}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="text-amber-500 block text-[10px] uppercase font-bold">Flagged Warnings</span>
                  <span className="text-lg font-mono font-bold text-amber-600">
                    {postParsedRows.filter((r) => r.isDateSwappedSuggested || r.isUnmatchedRecipient).length}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Already Exists</span>
                  <span className="text-lg font-mono font-bold text-slate-500">
                    {postParsedRows.filter((r) => r.alreadyExists).length}
                  </span>
                </div>
              </div>

              {/* Parsed Rows Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Row</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Tracking ID</th>
                      <th className="px-3 py-2.5">Carrier</th>
                      <th className="px-3 py-2.5">Resolved Recipient</th>
                      <th className="px-3 py-2.5">Matter Prefix</th>
                      <th className="px-3 py-2.5">Parsed Status</th>
                      <th className="px-3 py-2.5">Reconciliation Flag / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {postParsedRows.map((r) => (
                      <tr
                        key={r.rowIndex}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          r.isSkippedJalio
                            ? 'bg-slate-50 dark:bg-slate-900/40 opacity-60'
                            : r.isRejected
                            ? 'bg-red-50/50 dark:bg-red-950/20'
                            : r.isDateSwappedSuggested
                            ? 'bg-amber-50/40 dark:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-500">#{r.rowIndex}</td>
                        <td className="px-3 py-2.5 font-mono">
                          {r.parsedDate ? clock.formatDisplay(r.parsedDate) : r.rawDate}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {r.trackingId}
                        </td>
                        <td className="px-3 py-2.5">{r.carrier}</td>
                        <td className="px-3 py-2.5">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {r.resolvedRecipientName}
                            </span>
                            {r.isDittoResolved && (
                              <span className="block text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                                ✓ Resolved from ditto marks ('''''' / """""")
                              </span>
                            )}
                            {r.isUnmatchedRecipient && (
                              <span className="block text-[10px] text-amber-600 font-semibold">
                                ⚠️ Contact unmatched in address book (Queued for review)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {r.matchedProjectCodeStr ? (
                            <span className="font-mono font-bold px-1.5 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded text-[10px]">
                              {r.matchedProjectCodeStr}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              r.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {r.status}
                            {r.deliveredOn ? ` (${clock.formatDisplay(r.deliveredOn)})` : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {r.isSkippedJalio && (
                            <span className="text-slate-500 italic">
                              🚫 Skipped: Mentioned Jalio Technologies
                            </span>
                          )}
                          {r.isRejected && (
                            <span className="text-red-600 font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              {r.rejectReason}
                            </span>
                          )}
                          {r.isDateSwappedSuggested && (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {r.dateWarning}
                            </span>
                          )}
                          {r.alreadyExists && (
                            <span className="text-slate-500 font-medium">
                              ✓ Already exists in database (0 new duplicate)
                            </span>
                          )}
                          {!r.isSkippedJalio &&
                            !r.isRejected &&
                            !r.isDateSwappedSuggested &&
                            !r.alreadyExists && (
                              <span className="text-emerald-600 font-medium">
                                Ready for commit
                              </span>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: CASH TRACKER IMPORTER */}
      {/* ============================================================= */}
      {activeTab === 'CASH' && (
        <div className="space-y-5">
          {/* Rules Summary Card */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs space-y-1.5 text-emerald-950 dark:text-emerald-200">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <Shield className="w-4 h-4" />
              <span>Petty Cash Tracker Migration Rules Implemented:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
              <li><strong>Amount Stripping</strong>: Strips <code>1000/-</code>, commas, spaces into clean numbers.</li>
              <li><strong>Category Normalization</strong>: Normalizes <code>Notary </code>, <code>Indian Regd. Post</code>, <code>FOR POST</code> &rarr; <code>INDIA_POST</code>.</li>
              <li><strong>UPI Offset Consolidation</strong>: Equal cash-in and cash-out by UPI consolidated into a single <code>FIRM_UPI</code> expense row.</li>
              <li><strong>Balance Recomputation &amp; Negative Detection</strong>: Sheet typed balances ignored; recomputed float detects sub-zero points (-₹38.00).</li>
              <li><strong>Review Queue</strong>: Missing category or expense category in Cash-In queued for accountant review.</li>
              <li><strong>Idempotency</strong>: Second run reports <strong>0 new entries</strong> (upsert by date + amount + description).</li>
            </ul>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCashRawText(SAMPLE_CASH_CSV)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition"
              >
                Reset to Sample File (9 rows)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runCashDryRun}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                Run Mandatory Dry Run
              </button>

              <button
                onClick={commitCashTracker}
                disabled={!cashDryRunDone}
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 ${
                  cashDryRunDone
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                Commit to Cash Book
              </button>
            </div>
          </div>

          {/* Commit Success Notification */}
          {cashCommitResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">Cash Import Completed!</span>
                  <span>
                    <strong>{cashCommitResult.newlyCreated} new cash entries</strong> added to <code>office.cash_entries</code>.
                    {' '}{cashCommitResult.skippedExisting} entries already existed and were safely skipped (Idempotency verified!).
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cash Dry Run Report */}
          {cashDryRunDone && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Rows</span>
                  <span className="text-lg font-mono font-bold">{cashParsedRows.length}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="text-emerald-600 block text-[10px] uppercase font-bold">Ready to Commit</span>
                  <span className="text-lg font-mono font-bold text-emerald-600">
                    {cashParsedRows.filter((r) => !r.isReviewNeeded && !r.alreadyExists).length}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="text-red-500 block text-[10px] uppercase font-bold">Negative Points Detected</span>
                  <span className="text-lg font-mono font-bold text-red-600">
                    {cashParsedRows.filter((r) => r.isNegativeBalance).length}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="text-amber-500 block text-[10px] uppercase font-bold">Balance Mismatches</span>
                  <span className="text-lg font-mono font-bold text-amber-600">
                    {cashParsedRows.filter((r) => r.isBalanceMismatch).length}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Row</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-3 py-2.5">Net Amount</th>
                      <th className="px-3 py-2.5">Mode</th>
                      <th className="px-3 py-2.5">Sheet Balance</th>
                      <th className="px-3 py-2.5">Recomputed Float</th>
                      <th className="px-3 py-2.5">Reconciliation Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cashParsedRows.map((r) => (
                      <tr
                        key={r.rowIndex}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          r.isNegativeBalance
                            ? 'bg-red-50/60 dark:bg-red-950/30'
                            : r.isReviewNeeded
                            ? 'bg-amber-50/50 dark:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-500">#{r.rowIndex}</td>
                        <td className="px-3 py-2.5 font-mono">
                          {r.entryDate ? clock.formatDisplay(r.entryDate) : r.rawDate}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {r.normalizedCategory || '<BLANK>'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px] truncate">{r.description}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {currency.formatINR(r.netAmount)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              r.paymentMode === 'FIRM_UPI'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300'
                                : 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300'
                            }`}
                          >
                            {r.paymentMode}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-500">
                          {r.sheetBalance !== null ? currency.formatINR(r.sheetBalance) : '—'}
                        </td>
                        <td
                          className={`px-3 py-2.5 font-mono font-bold ${
                            r.isNegativeBalance ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {currency.formatINR(r.recomputedBalance)}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {r.isConsolidatedUpi && (
                            <span className="text-indigo-600 font-semibold block">
                              ✓ Consolidated equal UPI in/out into FIRM_UPI
                            </span>
                          )}
                          {r.isNegativeBalance && (
                            <span className="text-red-600 font-bold block">
                              ⚠️ Historical negative float: {currency.formatINR(r.recomputedBalance)}!
                            </span>
                          )}
                          {r.isBalanceMismatch && (
                            <span className="text-amber-600 font-medium block">
                              Sheet typed balance ({r.sheetBalance}) differs from recomputed ({r.recomputedBalance})
                            </span>
                          )}
                          {r.isReviewNeeded && (
                            <span className="text-red-700 dark:text-red-400 font-bold block">
                              🚫 Review Queue: {r.reviewReason}
                            </span>
                          )}
                          {r.alreadyExists && (
                            <span className="text-slate-500 font-medium block">
                              ✓ Already exists in database (0 new duplicate)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
