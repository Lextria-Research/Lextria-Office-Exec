// src/lib/supabaseSync.ts
// Supabase Data Layer: Fetches from and writes to Supabase schemas 'office' and 'core'.
// Active by default (DATA_MODE=supabase).
import { supabase, officeDb, coreDb, DATA_MODE, isSupabaseConfigured } from './supabase';
import type {
  AddressBookEntry,
  DispatchRecord,
  CashEntry,
  CashAllocation,
  PettyCashTopupRequest,
  PettyCashCount,
  PhysicalDocument,
  CustodyItem,
  CustodyLog,
  OfficeRequest,
  ProjectCodeRecord,
  MatterEvent
} from './mockData';

export const isLiveMode = () => DATA_MODE !== 'mock' && isSupabaseConfigured;

export async function fetchAllFromSupabase() {
  if (!isLiveMode()) return null;

  try {
    const [
      { data: addressBook },
      { data: dispatches },
      { data: cashEntries },
      { data: physicalDocs },
      { data: custodyItems },
      { data: custodyLog },
      { data: officeRequests },
      { data: projectCodes },
      { data: topups },
      { data: counts },
      { data: events },
    ] = await Promise.all([
      officeDb.from('address_book').select('*'),
      officeDb.from('dispatches').select('*, dispatch_project_links(project_code_id)'),
      officeDb.from('cash_entries').select('*, cash_allocations(*)'),
      officeDb.from('physical_documents').select('*'),
      officeDb.from('custody_items').select('*'),
      officeDb.from('custody_log').select('*'),
      officeDb.from('office_requests').select('*'),
      coreDb.from('project_codes').select('*'),
      coreDb.from('petty_cash_topup_requests').select('*'),
      coreDb.from('petty_cash_counts').select('*'),
      coreDb.from('matter_events').select('*'),
    ]);

    return {
      addressBook: addressBook || [],
      dispatches: (dispatches || []).map((d: any) => ({
        ...d,
        project_codes: (d.dispatch_project_links || []).map((l: any) => l.project_code_id),
      })),
      cashEntries: (cashEntries || []).map((c: any) => ({
        ...c,
        allocations: c.cash_allocations || [],
        entry_type: c.type,
      })),
      physicalDocs: physicalDocs || [],
      custodyItems: custodyItems || [],
      custodyLog: custodyLog || [],
      officeRequests: officeRequests || [],
      projectCodes: projectCodes || [],
      topups: (topups || []).map((t: any) => ({
        ...t,
        approved_by: t.decided_by,
        approved_at: t.decided_at,
      })),
      counts: counts || [],
      events: events || [],
    };
  } catch (err) {
    console.warn('Failed to load from Supabase:', err);
    return null;
  }
}

// Write functions for Supabase tables
export async function dbAddCashEntry(entry: CashEntry, allocations: CashAllocation[]) {
  if (!isLiveMode()) return;
  try {
    const { data: inserted, error: e1 } = await officeDb.from('cash_entries').insert({
      id: entry.id,
      seed_ref: entry.seed_ref || null,
      entry_date: entry.entry_date,
      type: entry.type || entry.entry_type,
      category: entry.category,
      description: entry.description,
      amount: entry.amount,
      payment_mode: entry.payment_mode,
      paid_by: entry.paid_by || null,
      receipt_document_id: entry.receipt_document_id || null,
      linked_dispatch_id: entry.linked_dispatch_id || null,
      recoverable: entry.recoverable ?? entry.is_recoverable ?? null,
      affects_petty_cash_balance: entry.affects_petty_cash_balance !== false,
      status: entry.status || 'ACTIVE',
      cancel_reason: entry.cancel_reason || null,
      balance_after: entry.balance_after,
    }).select().single();

    if (e1) console.error('Error inserting cash entry:', e1);

    if (allocations.length > 0) {
      const allocRows = allocations.map(a => ({
        cash_entry_id: entry.id,
        project_code_id: a.project_code_id,
        amount: a.amount,
      }));
      const { error: e2 } = await officeDb.from('cash_allocations').insert(allocRows);
      if (e2) console.error('Error inserting cash allocations:', e2);
    }

    // Cross-app: write to core.recoverable_costs if flagged
    if (entry.recoverable) {
      for (const a of allocations) {
        await coreDb.from('recoverable_costs').insert({
          source_app: 'OFFICE',
          source_type: 'OFFICE_EXPENSE',
          source_id: entry.id,
          project_code_id: a.project_code_id,
          cost_date: entry.entry_date,
          category: entry.category,
          description: entry.description,
          amount: a.amount,
          has_evidence: Boolean(entry.receipt_document_id),
          evidence_document_id: entry.receipt_document_id || null,
          posting_status: 'PENDING_FINANCE',
        });
      }
    }
  } catch (err) {
    console.error('dbAddCashEntry error:', err);
  }
}

export async function dbAddDispatch(dispatch: DispatchRecord, projectCodes: string[]) {
  if (!isLiveMode()) return;
  try {
    const { error: e1 } = await officeDb.from('dispatches').insert({
      id: dispatch.id,
      seed_ref: dispatch.seed_ref || null,
      serial_no: dispatch.serial_no,
      direction: dispatch.direction,
      booking_date: dispatch.booking_date,
      carrier: dispatch.carrier,
      tracking_id: dispatch.tracking_id,
      sender_address_id: dispatch.sender_address_id || dispatch.sender_id || null,
      recipient_address_id: dispatch.recipient_address_id || dispatch.recipient_id,
      document_type: dispatch.document_type || dispatch.doc_type,
      particulars: dispatch.particulars || null,
      status: dispatch.status,
      delivered_on: dispatch.delivered_on || null,
      ad_card_received: dispatch.ad_card_received === true,
      cost: dispatch.cost,
      cash_entry_id: dispatch.cash_entry_id || null,
      legal_evidence: dispatch.legal_evidence === true,
      batch_id: dispatch.batch_id || null,
      reposted_from_id: dispatch.reposted_from_id || null,
      return_reason: dispatch.return_reason || null,
    });
    if (e1) console.error('Error inserting dispatch:', e1);

    if (projectCodes.length > 0) {
      const linkRows = projectCodes.map(pcId => ({
        dispatch_id: dispatch.id,
        project_code_id: pcId,
      }));
      const { error: e2 } = await officeDb.from('dispatch_project_links').insert(linkRows);
      if (e2) console.error('Error inserting dispatch links:', e2);
    }

    // Cross-app: write DISPATCH_BOOKED event to core.matter_events
    for (const pcId of projectCodes) {
      await coreDb.from('matter_events').insert({
        project_code_id: pcId,
        event_code: 'DISPATCH_BOOKED',
        title: `Dispatched via ${dispatch.carrier}`,
        detail: `Tracking: ${dispatch.tracking_id} (${dispatch.direction})`,
        source_app: 'OFFICE',
        client_visible: true,
        client_label: `Documents dispatched via ${dispatch.carrier.replace(/_/g, ' ')}`,
        metadata: { tracking_id: dispatch.tracking_id, carrier: dispatch.carrier },
      });
    }
  } catch (err) {
    console.error('dbAddDispatch error:', err);
  }
}

export async function dbUpdateDispatchStatus(dispatchId: string, status: string, extra?: Record<string, any>) {
  if (!isLiveMode()) return;
  try {
    await officeDb.from('dispatches').update({ status, ...extra }).eq('id', dispatchId);

    // Cross-app event
    if (status === 'DELIVERED' || status === 'RETURNED') {
      const { data: links } = await officeDb.from('dispatch_project_links').select('project_code_id').eq('dispatch_id', dispatchId);
      for (const l of links || []) {
        await coreDb.from('matter_events').insert({
          project_code_id: l.project_code_id,
          event_code: status === 'DELIVERED' ? 'DISPATCH_DELIVERED' : 'DISPATCH_RETURNED',
          title: `Dispatch ${status}`,
          source_app: 'OFFICE',
          client_visible: true,
          client_label: status === 'DELIVERED' ? 'Documents delivered' : 'Dispatch returned to office',
          metadata: { dispatch_id: dispatchId, ...extra },
        });
      }
    }
  } catch (err) {
    console.error('dbUpdateDispatchStatus error:', err);
  }
}

export async function dbAddOfficeRequest(req: OfficeRequest) {
  if (!isLiveMode()) return;
  try {
    await officeDb.from('office_requests').insert({
      id: req.id,
      seed_ref: req.seed_ref || null,
      project_code_id: req.project_code_id || null,
      requested_by: req.requested_by,
      description: req.description,
      priority: req.priority,
      due_date: req.due_date || req.needed_by || null,
      status: req.status,
      accepted_by: req.accepted_by || null,
      completed_links: req.completed_links || null,
      request_type: req.request_type || 'ERRAND',
    });
  } catch (err) {
    console.error('dbAddOfficeRequest error:', err);
  }
}

export async function dbUpdateOfficeRequest(id: string, updates: Partial<OfficeRequest>) {
  if (!isLiveMode()) return;
  try {
    await officeDb.from('office_requests').update(updates).eq('id', id);
  } catch (err) {
    console.error('dbUpdateOfficeRequest error:', err);
  }
}

export async function dbAddCustodyLog(log: CustodyLog) {
  if (!isLiveMode()) return;
  try {
    await officeDb.from('custody_log').insert({
      id: log.id,
      seed_ref: log.seed_ref || null,
      custody_item_id: log.custody_item_id,
      holder_user_id: log.holder_user_id,
      out_at: log.out_at,
      expected_return: log.expected_return || null,
      in_at: log.in_at || null,
      purpose: log.purpose || null,
      notes: log.notes || null,
    });

    // Update custody item status
    const newStatus = log.in_at ? 'AVAILABLE' : 'CHECKED_OUT';
    await officeDb.from('custody_items').update({ status: newStatus }).eq('id', log.custody_item_id);
  } catch (err) {
    console.error('dbAddCustodyLog error:', err);
  }
}

// Cross-app core tables: petty cash top-ups and cash counts
export async function dbAddTopupRequest(tr: PettyCashTopupRequest) {
  if (!isLiveMode()) return;
  try {
    await coreDb.from('petty_cash_topup_requests').insert({
      id: tr.id,
      amount: tr.amount,
      reason: tr.reason,
      requested_by: tr.requested_by,
      requested_at: tr.requested_at,
      status: tr.status,
      decided_by: tr.decided_by || null,
      decided_at: tr.decided_at || null,
      decision_note: tr.decision_note || null,
      handed_over_at: tr.handed_over_at || null,
      office_cash_entry_id: tr.office_cash_entry_id || null,
    });
  } catch (err) {
    console.error('dbAddTopupRequest error:', err);
  }
}

export async function dbAddCashCount(cc: PettyCashCount) {
  if (!isLiveMode()) return;
  try {
    await coreDb.from('petty_cash_counts').insert({
      id: cc.id,
      count_date: cc.count_date,
      counted_by: cc.counted_by,
      physical_cash: cc.physical_cash,
      book_balance: cc.book_balance,
      note: cc.note || null,
      finance_signoff_by: cc.finance_signoff_by || null,
      finance_signoff_at: cc.finance_signoff_at || null,
      finance_note: cc.finance_note || null,
    });
  } catch (err) {
    console.error('dbAddCashCount error:', err);
  }
}

export async function dbAddAddressBookEntry(entry: AddressBookEntry) {
  if (!isLiveMode()) return;
  try {
    await officeDb.from('address_book').insert({
      id: entry.id,
      seed_ref: entry.seed_ref || null,
      name: entry.name,
      organization: entry.organization || entry.organisation || null,
      address: entry.address || entry.full_address,
      pin: entry.pin || null,
      phone: entry.phone || null,
      email: entry.email || null,
      type: entry.type,
      linked_client_id: entry.linked_client_id || null,
      times_used: entry.times_used || 0,
      last_used: entry.last_used || null,
    });
  } catch (err) {
    console.error('dbAddAddressBookEntry error:', err);
  }
}
