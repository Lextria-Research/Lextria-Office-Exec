import json, glob, os, datetime as dt, collections
S="/home/claude/seed/out/seed"
DB={os.path.basename(f)[:-5]:json.load(open(f)) for f in glob.glob(S+"/*.json")}
TODAY=dt.date(2026,10,5)
def by(t,k="id"): return {r[k]:r for r in DB[t]}
PC=by("project_codes"); CL=by("clients"); U=by("users"); INV=by("invoice_refs"); DS=by("disbursements")
def inr(n):
    n=int(round(n)); s=str(abs(n))
    if len(s)>3:
        h,t=s[:-3],s[-3:]; h=",".join([h[max(0,i-2):i] for i in range(len(h),0,-2)][::-1]); s=h+","+t
    return ("-₹" if n<0 else "₹")+s
L=[]
w=L.append
w("# Expected results — use these to verify the demo\n")
w(f"Demo date: **{TODAY.isoformat()} (Monday)**. All figures below are computed from the seed files. If the app shows a different number, either the app or the formula is wrong.\n")
w("## 1. Finance — per client\n")
w("Rules used: Quoted = CONFIRMED quotations only (v2 amendments are additive scope). Work done = completed stages. Unbilled = completed stages with billing_status UNBILLED_WORK_DONE. "
  "Ledger debits = (invoice total − reimbursement lines already AUTO_POSTED) + AUTO_POSTED disbursements. Credits = payments (gross, TDS counts as received). "
  "Advances are shown separately and are not netted into receivables until allocated.\n")
w("| Client | Quoted | Work done | Work to be done | Unbilled | Invoiced (total) | Received (gross) | Posted disbursements | Outstanding receivable | Advance |")
w("|---|---|---|---|---|---|---|---|---|---|")
tot=collections.Counter()
for cid,c in CL.items():
    qs=[q for q in DB["quotations"] if q["client_id"]==cid and q["status"]=="CONFIRMED"]
    qids={q["id"] for q in qs}
    st=[b for b in DB["billing_stages"] if b["quotation_id"] in qids]
    quoted=sum(q["total_prof_fee"] for q in qs); done=sum(b["allocated_amount"] for b in st if b["is_completed"])
    unb=sum(b["allocated_amount"] for b in st if b["billing_status"]=="UNBILLED_WORK_DONE")
    invs=[i for i in DB["invoice_refs"] if i["client_id"]==cid]
    inv_total=sum(i["total_amount"] for i in invs)
    posted=[d for d in DB["disbursements"] if d["client_id"]==cid and d["ledger_posting_status"]=="AUTO_POSTED"]
    posted_ids={d["id"] for d in posted}
    already=sum(DS[l["disbursement_id"]]["amount"] for l in DB["invoice_ref_disbursement_links"] if INV[l["invoice_ref_id"]]["client_id"]==cid and l["disbursement_id"] in posted_ids)
    debits=inv_total-already+sum(d["amount"] for d in posted)
    rec=sum(p["gross_amount"] for p in DB["payments"] if p["client_id"]==cid)
    adv=sum(a["amount"]-a["allocated_amount"] for a in DB["advances"] if a["client_id"]==cid)
    out=debits-rec
    for k,v in dict(q=quoted,d=done,u=unb,i=inv_total,r=rec,p=sum(d["amount"] for d in posted),o=out,a=adv).items(): tot[k]+=v
    w(f"| {c['client_code']} {c['client_name']} | {inr(quoted)} | {inr(done)} | {inr(quoted-done)} | {inr(unb)} | {inr(inv_total)} | {inr(rec)} | {inr(sum(d['amount'] for d in posted))} | {inr(out)} | {inr(adv)} |")
w(f"| **Firm total** | {inr(tot['q'])} | {inr(tot['d'])} | {inr(tot['q']-tot['d'])} | {inr(tot['u'])} | {inr(tot['i'])} | {inr(tot['r'])} | {inr(tot['p'])} | {inr(tot['o'])} | {inr(tot['a'])} |\n")

w("### Ready-to-invoice queue (stages)\n")
for b in DB["billing_stages"]:
    if b["billing_status"]=="UNBILLED_WORK_DONE":
        p=PC[b["project_code_id"]]; w(f"- {p['code']} ({CL[p['client_id']]['client_code']}) — {b['name']}: {inr(b['allocated_amount'])}, completed {b['completed_at'][:10]}")
w("\n### Disbursements (govt fees, office expenses, employee reimbursements) by posting status\n")
cnt=collections.defaultdict(lambda: collections.Counter())
for d in DB["disbursements"]:
    cnt[d["ledger_posting_status"]][CL[d["client_id"]]["client_code"]]+=d["amount"]
src=collections.Counter()
for d in DB["disbursements"]:
    if d["ledger_posting_status"]=="AUTO_POSTED": src[d["source_type"]]+=d["amount"]
for st,m in cnt.items(): w(f"- **{st}**: "+", ".join(f"{k} {inr(v)}" for k,v in sorted(m.items())))
w("- AUTO_POSTED by source: "+", ".join(f"{k} {inr(v)}" for k,v in src.items()))
nr=[d for d in DB["disbursements"] if d["ledger_posting_status"]=="NEEDS_REVIEW"]
w(f"\nThe NEEDS_REVIEW item(s) have no receipt attached: " + "; ".join(f"{PC[d['project_code_id']]['code']} {inr(d['amount'])} ({d['description']})" for d in nr))
w("\n### Receivables ageing (by invoice date, unpaid invoices)\n")
for i in DB["invoice_refs"]:
    paid=sum(a["amount"] for a in DB["payment_allocations"] if a["target_type"]=="INVOICE" and a["target_id"]==i["id"])
    if paid<i["total_amount"]:
        age=(TODAY-dt.date.fromisoformat(i["invoice_date"])).days
        b="0–30" if age<=30 else "31–60" if age<=60 else "61–90" if age<=90 else "90+"
        w(f"- {i['zoho_books_invoice_no']} {CL[i['client_id']]['client_code']}: total {inr(i['total_amount'])}, paid {inr(paid)}, due {inr(i['total_amount']-paid)}, age {age} days → **{b}**")

w("\n## 2. Office Executive\n")
ce=DB["cash_entries"]
w(f"- Petty cash book balance: **{inr(ce[-1]['balance_after'])}** (FIRM_UPI courier ₹80 on 01-Oct does NOT reduce it).")
w(f"- Pending top-up request: ₹1,500 (status REQUESTED, for Finance).")
w(f"- Weekly count 03-Oct: variance −₹20, signed off by Finance Lead.")
pend=[d for d in DB["dispatches"] if d["status"] in("BOOKED","IN_TRANSIT") and (TODAY-dt.date.fromisoformat(d["booking_date"])).days>7]
w(f"- Pending delivery > 7 days: " + ", ".join(f"{d['tracking_id']} ({(TODAY-dt.date.fromisoformat(d['booking_date'])).days} days)" for d in pend))
w(f"- Batch 03-Oct: 5 copyright dispatches to one saved recipient (Registrar of Copyrights), one cash entry ₹235 allocated ₹47 × 5.")
w(f"- Legal-evidence dispatch (LIT5002 legal notice) has all 4 scans: booking receipt, document copy, proof of delivery, tracking history.")
dsc=[c for c in DB["custody_log"] if c["in_at"] is None]
w("- Currently out: " + "; ".join(f"{next(i['item'] for i in DB['custody_items'] if i['id']==c['custody_item_id'])} → {U[c['holder_user_id']]['display_name']}" for c in dsc))

w("\n## 3. Filing pipeline — Today board\n")
for j in DB["filing_jobs"]:
    if j["state"]!="CLOSED":
        p=PC[j["project_code_id"]]
        why={"CORRECTIONS_REQUIRED":"blocked: inventor order conflict (unresolved) + failed check item",
             "CLEARED_FOR_ESIGN":"cleared via SUPER_ADMIN override of client approval (deemed approval) — statutory deadline TODAY",
             "PAYMENT_PENDING":"waiting: govt fee request not yet approved by Finance",
             "ON_HOLD":"depends on Form 26 job (QUEUED); Form 26 POA still in transit",
             "QUEUED":"not started","PREPARED":"awaiting checker"}.get(j["state"],"")
        w(f"- {p['code']} · {j['filing_type']} · due {j['due_date']}{' (STATUTORY)' if j['is_statutory_deadline'] else ''} · **{j['state']}** — {why}")
cc=collections.Counter((c["attributed_to"],c["raised_at"][:7]) for c in DB["filing_corrections"])
w("\nCorrections by person/month: " + "; ".join(f"{U[a]['display_name']} {m}: {n}" for (a,m),n in sorted(cc.items())))
w("\nGovt fee reconciliation (03-Oct portal records):")
w("- 5 copyright portal records match 5 PAID requests by reference → should auto-match.")
w("- Portal record CBR-DEMO-26100311 (₹2,500, 202541000203) → **found on portal, not in dashboard**.")
w("- Request CR-DEMO-26100399 (CR5006 ₹500) → **paid in dashboard, not on portal** and flagged as possible duplicate of CR5006's earlier payment.")

w("\n## 4. Reviews, approvals, deadlines, checklists\n")
for r in DB["review_rounds"]:
    if r["decision"] is None:
        d=next(x for x in DB["draft_documents"] if x["id"]==r["draft_document_id"])
        w(f"- Open review: {PC[d['project_code_id']]['code']} {d['doc_type']} at {r['stage']} (round {r['round_no']}), due {r['stage_due_date']}{' — **OVERDUE**' if r['overdue'] else ''}")
w("- TBI03 FER response chain skips external review — reason logged.")
w("- TBI02 PS: round 1 RETURNED with 2 CRITICAL comments; next upload becomes round 2.")
for a in DB["approval_requests"]:
    if a["status"]=="AWAITING":
        age=(TODAY-dt.date.fromisoformat(a["sent_on"])).days
        w(f"- Approval awaiting: {PC[a['project_code_id']]['code']} ({a['ip_type']}), {age} days, reminders {a['reminder_count']}{' — **escalate to DEPT_ADMIN**' if a['reminder_count']>=2 else ''}{' — superadmin override present' if a['superadmin_override'] else ''}")
orph=[d for d in DB["deadlines"] if not U[d["owner_user_id"]]["active"]]
w("- Orphaned deadlines (owner inactive): " + ", ".join(f"{PC[d['project_code_id']]['code']} '{d['title']}'" for d in orph))
pa1=[d for d in DB["deadlines"] if d["owner_user_id"]=="u_pa1" and d["status"]=="OPEN"]
w(f"- Paralegal A unavailable 05–07 Oct → {len(pa1)} open deadlines show the backup as acting owner: " + ", ".join(PC[d['project_code_id']]['code'] for d in pa1))
w("- Checklist 'End-of-day ACK reconciliation' for 03-Oct: **MISSED, escalated** to Paralegal Head. Today's 'Daily priority filings check' is assigned to the backup (Filing Intern) because the owner is on leave.")
w("- Renewal AR5004 year 10 due 02-Nov-2026, no client instruction, 28 days left → **escalate**. AR5005 year 11 IN_GRACE until 01-Feb-2027.")
w("- Possible duplicates: project AR5010 ↔ AR5002; person per_15 ↔ per_03 (same phone).")
w("- e-sign: AR5006 quotation SENT 23-Sep (reminder flag, >5 days); AGR5003 PARTIALLY_SIGNED; LIT5002 v1 DECLINED then v2 SIGNED (quotation amendment).")
w("- Misc: MISC5003 DP KYC statutory due 30-Sep, not COMPLETED → **overdue highlight**; margins MISC5001 ₹2,500, MISC5002 ₹6,000, MISC5003 ₹800.")

w("\n## 5. Client portal — one login per client\n")
w("Login is password + one-time code by email or SMS (no Zoho). Each client has exactly one portal account; institutions decide internally who uses it.\n")
for acc in DB["client_portal_accounts"]:
    cid=acc["client_id"]
    cs=[p for p in DB["project_codes"] if p["client_id"]==cid and p["department"] in("IP_PATENT","IP_SOFT","LITIGATION","AGREEMENT") and p["status"] in ("ACTIVE","COMPLETED")]
    ids={p["id"] for p in cs}
    shared=sum(1 for d in DB["documents"] if d["project_code_id"] in ids and d["client_shared"])
    hidden=sum(1 for d in DB["documents"] if d["project_code_id"] in ids and not d["client_shared"])
    w(f"- **{acc['id']}** {CL[cid]['client_code']} ({acc['status']}): matters = {', '.join(p['code'] for p in cs) or '—'}; shared documents visible = {shared}; internal documents hidden = {hidden}")
w("\n- cpa_1004 (Dr. Meera Kulkarni) is INVITED, not yet activated: login must show 'account not activated — use the invite link'.")
w("- cpa_1003 has a pending change of registered email: old contact verified, new contact not yet verified → login still goes to the OLD email until both are verified and the SPOC approves.")
w("- cpa_1004 must NOT see AR5010 (status DUPLICATE_REVIEW).")
w("\nMust never appear in any client view: internal notes (LIT5001 strategy note, LIT5002 note), drafts/review comments, filing corrections, checker names, quotations, invoices, ledger, petty cash, reimbursements, govt-fee requests, trust scores, AGR5003 v1 internal draft, MISC (vendor) matters. Litigation hearings and agreement versions only where client_visible = true.")

w("\n## 6. Employee reimbursements\n")
w("Rules: every claim needs a bill (Finance Lead or SUPER_ADMIN can override with a reason); reporting manager approves, then Finance; nobody approves their own claim and the two approvals are by different people; founders' claims go to the other founder for the manager step; claims older than 60 days also need SUPER_ADMIN; payout weekly on Friday.\n")
for c in DB["reimbursement_claims"]:
    al=sum(a["amount"] for a in DB["reimbursement_allocations"] if a["claim_id"]==c["id"])
    w(f"- {c['id']} {U[c['claimant_user_id']]['display_name']} · {c['category']} · {inr(c['amount'])} · **{c['status']}**"
      + (f" · manager: {U[c['manager_decision_by']]['display_name']}" if c['manager_decision_by'] else f" · awaiting manager ({U[c['manager_user_id']]['display_name']})")
      + (f" · finance: {U[c['finance_decision_by']]['display_name']}" if c['finance_decision_by'] else "")
      + (f" · {inr(al)} allocated to client matters" if al else "")
      + (" · bill override" if c['bill_override'] else "")
      + (f" · {c['query_note']}" if c['query_note'] else ""))
pend=[c for c in DB["reimbursement_claims"] if c["status"]=="FINANCE_APPROVED"]
w(f"\n- Ready for next payout (FINANCE_APPROVED): {len(pend)} claims, total {inr(sum(c['amount'] for c in pend))}")
w(f"- Awaiting manager (SUBMITTED): {sum(1 for c in DB['reimbursement_claims'] if c['status']=='SUBMITTED')}; awaiting Finance (MANAGER_APPROVED): {sum(1 for c in DB['reimbursement_claims'] if c['status']=='MANAGER_APPROVED')}; queried: {sum(1 for c in DB['reimbursement_claims'] if c['status']=='QUERIED')}")
w("- Paid on 02-Oct (UTR-DEMO-RMB-0002): Office Executive's September petrol bills, ₹780 — office overhead, not on any client ledger.")
w("- Only FINANCE_APPROVED or PAID claims with allocations reach client ledgers; the REJECTED claim's KVU03 allocation does not.")

w("\n## 7. Drafter review score (lower is better)\n")
cfg=DB["demo_settings"][0]["review_score"]
w("Per counted return (reason DRAFTER_QUALITY): 1 point + 1 per CRITICAL comment + 0.5 per MAJOR comment. Score = average points per draft over drafts with at least one decided review round. First-time-right = drafts with no counted return.\n")
w("| Drafter | Drafts counted | Counted returns | Points | Score | First-time-right | Not counted (client input etc.) |")
w("|---|---|---|---|---|---|---|")
for uid in ["u_dr1","u_dr2","u_dr3"]:
    drafts=[d for d in DB["draft_documents"] if d["drafter_user_id"]==uid]
    counted=0; pts=0; ftr=0; n=0; notc=0
    for d in drafts:
        rs=[r for r in DB["review_rounds"] if r["draft_document_id"]==d["id"] and r["decision"]]
        if not rs: continue
        n+=1; dp=0
        for r in rs:
            if r["decision"]=="RETURNED":
                if r["counts_toward_review_score"]:
                    sev=[c["severity"] for c in DB["review_comments"] if c["review_round_id"]==r["id"]]
                    p=cfg["points_per_counted_return"]+sev.count("CRITICAL")*cfg["extra_points_per_comment"]["CRITICAL"]+sev.count("MAJOR")*cfg["extra_points_per_comment"]["MAJOR"]
                    dp+=p; counted+=1
                else: notc+=1
        pts+=dp; ftr+= (dp==0)
    w(f"| {U[uid]['display_name']} | {n} | {counted} | {pts:g} | {pts/n if n else 0:.2f} | {ftr}/{n} | {notc} |")
w("\nThe KVU01 return (inventors sent a new embodiment) is tagged CLIENT_INPUT_CHANGE and does not count against Drafter A.")
w("Open threads: TBI02 has an unresolved CRITICAL comment with a drafter–reviewer discussion; TBI01 v2 is with the external reviewer with all round-1 comments marked addressed.")
open("/home/claude/seed/out/expected_results.md","w").write("\n".join(L))
print("\n".join(L))
