import json, glob, os, collections, datetime as dt
S="/home/claude/seed/out/seed"
DB={os.path.basename(f)[:-5]:json.load(open(f)) for f in glob.glob(S+"/*.json")}
ids={k:{r["id"] for r in v if isinstance(r,dict) and "id" in r} for k,v in DB.items()}
U=ids["users"]
FK={"project_code_id":"project_codes","source_project_code_id":"project_codes","target_project_code_id":"project_codes","from_project_code_id":"project_codes","to_project_code_id":"project_codes",
 "client_id":"clients","person_id":"persons","inventor_person_id":"persons","primary_contact_person_id":"persons","organization_id":"organizations","affiliation_org_id":"organizations","applicant_org_id":"organizations","applicant_person_id":"persons",
 "quotation_id":"quotations","invoice_ref_id":"invoice_refs","billing_stage_id":"billing_stages","disbursement_id":"disbursements","payment_id":"payments",
 "draft_document_id":"draft_documents","version_id":"draft_versions","draft_version_id":"draft_versions","final_version_id":"draft_versions","review_round_id":"review_rounds",
 "filing_job_id":"filing_jobs","govt_fee_request_id":"govt_fee_requests","esign_request_id":"esign_requests","template_id":None,
 "dispatch_id":"dispatches","linked_dispatch_id":"dispatches","cash_entry_id":"cash_entries","custody_item_id":"custody_items","vendor_id":"vendors",
 "recovered_via_invoice_ref_id":"invoice_refs","document_id":"documents","ack_document_id":"documents","evidence_document_id":"documents","order_document_id":"documents",
 "signed_file_document_id":"documents","sender_address_id":"address_book","recipient_address_id":"address_book","service_id":"service_catalog","matched_request_id":"govt_fee_requests",
 "duplicate_suspect_of":"govt_fee_requests","receipt_document_id":"documents","scan_document_id":"documents","screenshot_document_id":"documents","duplicate_candidate_of":"persons","claim_id":"reimbursement_claims","review_comment_id":"review_comments","bill_document_id":"documents","client_portal_account_id":"client_portal_accounts","possible_duplicate_of":"project_codes"}
userish=lambda k: k.endswith("_user_id") or k in("finance_decision_by","manager_decision_by","reports_to","created_by","issued_to","issued_by","requested_by","approved_by","paid_by","reconciled_by","sent_by","uploaded_by","raised_by","attributed_to","checked_by","completed_by","counted_by","finance_signoff_by","accepted_by","author_user_id","entered_by","set_by","escalated_to","evaluator_user_id","assigned_to")
errs=[]
for t,rows in DB.items():
    for r in rows:
        if not isinstance(r,dict): continue
        for k,v in r.items():
            if v is None or isinstance(v,(dict,list)): continue
            if userish(k):
                if v not in U: errs.append((t,r.get("id"),k,v))
            elif k in FK and FK[k]:
                tgt=FK[k]
                if v not in ids.get(tgt,set()): errs.append((t,r.get("id"),k,v))
        if t=="filing_jobs":
            for d in r["depends_on"]:
                if d not in ids["filing_jobs"]: errs.append((t,r["id"],"depends_on",d))
        if t=="payment_allocations" and r["target_type"]=="INVOICE" and r["target_id"] not in ids["invoice_refs"]: errs.append((t,"","target_id",r["target_id"]))
        if t=="checklist_instances" and r["template_id"] not in ids["checklist_templates"]: errs.append((t,r["id"],"template_id",r["template_id"]))
        if t=="esign_signers" and r["esign_request_id"] not in ids["esign_requests"]: errs.append(t)
dup=[k for k,v in DB.items() if isinstance(v,list) and v and isinstance(v[0],dict) and "id" in v[0] and len({r["id"] for r in v})!=len(v)]
print("FK errors:",len(errs)); [print(e) for e in errs[:20]]; print("dup ids:",dup)
# quotations stage sums
for q in DB["quotations"]:
    s=sum(b["allocated_amount"] for b in DB["billing_stages"] if b["quotation_id"]==q["id"])
    if s!=q["total_prof_fee"]: errs.append(("stage-sum",q["quote_number"],s,q["total_prof_fee"]))
for b in DB["billing_stages"]:
    if not b["trigger_status_value"] and not b["manual_completion"]: errs.append(("stage-no-trigger",b["id"]))
print("total errors",len(errs))
