# Seed schema — tables, row counts and key fields

Field names below are the contract. Prompt 01 must use these exact names (snake_case) for the mock layer and `docs/api-contract.md`.

## Core & access

**demo_settings** (1 rows): `demo_today`, `timezone`, `currency`, `gst_rate_percent`, `petty_cash_low_balance_threshold`, `esign_reminder_after_days`, `approval_reminder_days`, `post_pending_followup_days`, `invoice_mismatch_tolerance`, `review_buffer_working_days`, `review_sla_days`, `stage_due_rule`, `renewal_reminder_days`, `review_score`, `note`

**users** (24 rows): `id`, `display_name`, `email`, `role`, `department`, `reports_to`, `active`, `weekly_capacity_points`

**prefix_registry** (9 rows): `prefix`, `department`, `client_id`, `description`, `example`, `active`

**clients** (7 rows): `id`, `client_code`, `client_name`, `entity_type`, `organization_id`, `email`, `phone`, `gstin`, `billing_address`, `primary_contact_person_id`, `workdrive_folder_id`, `workdrive_folder_path`, `created_at`

**organizations** (6 rows): `id`, `name`, `type`, `address`, `pin`, `gstin`, `applicant_fee_category`

**persons** (15 rows): `id`, `full_name`, `relation_name`, `address`, `pin`, `nationality`, `country_of_residence`, `email`, `phone`, `affiliation_org_id`, `designation`, `duplicate_candidate_of`

**project_codes** (39 rows): `id`, `code`, `code_normalized`, `prefix`, `number`, `department`, `client_id`, `title`, `status`, `spoc_user_id`, `lead_assignee_id`, `workdrive_folder_id`, `workdrive_path`, `category_folder_ids`, `created_by`, `created_at`, `possible_duplicate_of`

**project_aliases** (28 rows): `id`, `project_code_id`, `alias_type`, `alias_value`, `valid_from`

**code_issuance_log** (39 rows): `id`, `code`, `project_code_id`, `issued_to`, `issued_by`, `issued_at`, `purpose`

**documents** (72 rows): `id`, `project_code_id`, `category`, `file_name`, `file_type`, `file_size`, `uploaded_by`, `uploaded_at`, `zoho_resource_id`, `zoho_permalink`, `workdrive_path`, `client_shared`, `finance_only`

**timeline_events** (62 rows): `id`, `project_code_id`, `event_type`, `title`, `detail`, `occurred_at`, `actor_user_id`, `client_visible`, `client_label`

**deadlines** (18 rows): `id`, `project_code_id`, `title`, `deadline_type`, `due_date`, `owner_user_id`, `backup_user_id`, `status`, `source`

**user_availability** (1 rows): `id`, `user_id`, `unavailable_from`, `unavailable_to`, `reason`, `set_by`

**notifications** (6 rows): `id`, `user_id`, `text`, `link_entity`, `created_at`, `read`

**cliq_outbox** (1 rows): `id`, `channel`, `card`, `logged_at`

**audit_log** (2 rows): `id`, `actor_user_id`, `action`, `entity`, `entity_id`, `at`, `before`, `after`

**escalations** (1 rows): `id`, `project_code_id`, `client_id`, `raised_by`, `raised_at`, `status`, `issue_summary`, `tried`, `decision_needed`

**tasks** (9 rows): `id`, `project_code_id`, `title`, `department`, `assignee_user_id`, `status`, `due_date`, `task_type`, `created_at`

**query_tickets** (2 rows): `id`, `project_code_id`, `subject`, `context`, `inventors_summary`, `contact_details`, `raised_by`, `assigned_to`, `status`, `priority`, `created_at`, `messages`

## IP — Patents

**matter_patents** (14 rows): `id`, `project_code_id`, `patent_type`, `current_status`, `temp_code`, `application_no`, `ps_filing_date`, `cs_filing_date`, `cs_due_date`, `publication_date`, `journal_no`, `rfe_filed_date`, `fer_issued_date`, `fer_response_due`, `hearing_date`, `grant_date`, `patent_number`, `recorded_in_register_date`, `term_end`, `applicant_org_id`, `applicant_person_id`

**matter_parties** (32 rows): `id`, `project_code_id`, `person_id`, `organization_id`, `role`, `sequence_no`, `affiliation_org_id`, `verified_source`, `verified_by`, `verified_at`, `locked`, `conflict`

**review_chain_templates** (4 rows): `id`, `doc_type`, `stages`

**draft_documents** (7 rows): `id`, `project_code_id`, `doc_type`, `drafter_user_id`, `statutory_deadline`, `current_stage`, `final_version_id`, `chain_stages`, `chain_override_reason`

**draft_versions** (10 rows): `id`, `draft_document_id`, `version_no`, `document_id`, `uploaded_by`, `uploaded_at`, `change_note`

**review_rounds** (17 rows): `id`, `draft_document_id`, `version_id`, `round_no`, `stage`, `reviewer_user_id`, `assigned_at`, `decision`, `decided_at`, `return_reason`, `counts_toward_review_score`, `decision_note`, `stage_due_date`, `overdue`

**review_comments** (9 rows): `id`, `review_round_id`, `section`, `anchor`, `quoted_text`, `severity`, `text`, `status`, `resolved`, `created_by`, `created_at`

**review_comment_replies** (6 rows): `id`, `review_comment_id`, `author_user_id`, `created_at`, `text`

**approval_requests** (7 rows): `id`, `project_code_id`, `ip_type`, `item_description`, `draft_version_id`, `sent_on`, `sent_by`, `channel`, `status`, `approver_name`, `approver_designation`, `approved_on`, `evidence_document_id`, `reminder_count`, `last_reminder_at`, `superadmin_override`

**filing_checklist_templates** (5 rows): `id`, `filing_type`, `items`

**filing_jobs** (9 rows): `id`, `project_code_id`, `filing_type`, `identifier`, `due_date`, `is_statutory_deadline`, `priority`, `state`, `preparer_user_id`, `checker_user_id`, `govt_fee_request_id`, `depends_on`, `ack_document_id`, `application_no_captured`, `on_hold_reason`, `esign_dsc_holder_user_id`, `created_at`

**filing_check_results** (18 rows): `id`, `filing_job_id`, `item`, `passed`, `note`, `checked_by`, `checked_at`

**filing_corrections** (9 rows): `id`, `filing_job_id`, `category`, `description`, `attributed_to`, `raised_by`, `raised_at`, `resolved_at`, `screenshot_document_id`

**fee_schedule** (39 rows): `id`, `office`, `form_or_action`, `applicant_fee_category`, `efiling_amount`, `effective_from`, `verify`, `note`

**govt_fee_requests** (12 rows): `id`, `filing_job_id`, `project_code_id`, `form`, `applicant_fee_category`, `computed_amount`, `manual_adjustment`, `adjustment_reason`, `requested_by`, `requested_at`, `status`, `approved_by`, `approved_at`, `paid_by`, `paid_at`, `payment_mode`, `transaction_reference`, `portal_record_matched`, `reconciled_by`, `reconciled_at`, `recoverable_from_client`

**portal_payment_records** (6 rows): `id`, `office`, `payment_date`, `reference`, `amount`, `identifier`, `entered_by`, `match_status`, `matched_request_id`, `resolution_note`

**renewal_schedule** (28 rows): `id`, `project_code_id`, `patent_year`, `due_date`, `status`, `client_instruction`, `instruction_date`, `govt_fee_request_id`, `receipt_document_id`, `grace_end_date`, `is_arrears_on_grant`

**form27_periods** (3 rows): `id`, `project_code_id`, `period_label`, `period_start`, `period_end`, `due_date`, `status`, `note`

**dept_update_requests** (1 rows): `id`, `from_project_code_id`, `to_project_code_id`, `requested_by_user_id`, `assigned_dept_leader_id`, `status`, `request_message`, `response_notes`, `created_at`

**cross_matter_links** (3 rows): `id`, `source_project_code_id`, `target_project_code_id`, `relation_type`

## IP — TM / Copyright / Design

**matter_soft_ip** (17 rows): `id`, `project_code_id`, `ip_type`, `subject`, `class_numbers`, `mark_type`, `application_no`, `diary_no`, `filing_date`, `statutory_status`, `next_action`, `next_action_due`, `registration_date`, `renewal_deadline`

## Litigation

**matter_litigation** (2 rows): `id`, `project_code_id`, `cnr_number`, `case_number`, `court_bench`, `cause_title`, `client_role`, `opposite_party`, `current_stage`, `next_hearing_date`, `next_purpose`, `ethical_wall_enabled`, `ethical_wall_user_ids`

**litigation_hearings** (3 rows): `id`, `project_code_id`, `hearing_date`, `purpose`, `outcome`, `next_date`, `order_document_id`, `client_visible`

**litigation_internal_notes** (2 rows): `id`, `project_code_id`, `author_user_id`, `created_at`, `client_visible`, `note`

## Agreements

**matter_agreements** (3 rows): `id`, `project_code_id`, `agreement_type`, `current_stage`, `is_template`, `latest_version_sent_at`

**agreement_versions** (7 rows): `id`, `project_code_id`, `version_no`, `sent_to`, `sent_at`, `document_id`, `client_visible`, `change_summary`

## Finance (incl. Miscellaneous and Employee Reimbursements)

**service_catalog** (15 rows): `id`, `name`, `default_prof_fee`

**stage_templates** (13 rows): `id`, `name`, `items`

**client_rate_cards** (6 rows): `id`, `client_id`, `service_id`, `prof_fee`, `valid_from`

**quotations** (31 rows): `id`, `project_code_id`, `client_id`, `quote_number`, `version`, `status`, `template_id`, `total_prof_fee`, `total_estimated_govt_fee`, `gst_applicable`, `confirmed_via`, `override_reason`, `amendment_reason`, `supersedes_quotation_id`, `created_at`

**billing_stages** (49 rows): `id`, `quotation_id`, `project_code_id`, `stage_key`, `name`, `trigger_status_value`, `manual_completion`, `allocated_amount`, `is_completed`, `completed_at`, `billing_status`, `invoice_ref_id`

**esign_requests** (7 rows): `id`, `document_type`, `project_code_id`, `quotation_id`, `client_id`, `leegality_document_id`, `sent_at`, `sent_by`, `status`, `completed_at`, `signed_file_document_id`

**esign_signers** (9 rows): `id`, `esign_request_id`, `name`, `email`, `signing_order`, `status`, `signed_at`

**invoice_refs** (13 rows): `id`, `zoho_books_invoice_no`, `invoice_date`, `client_id`, `professional_taxable`, `gst_amount`, `reimbursement_amount`, `total_amount`, `notes`

**invoice_ref_stage_links** (20 rows): `invoice_ref_id`, `billing_stage_id`

**invoice_ref_disbursement_links** (6 rows): `invoice_ref_id`, `disbursement_id`

**payments** (9 rows): `id`, `client_id`, `received_date`, `gross_amount`, `tds_amount`, `net_amount`, `mode`, `reference`

**payment_allocations** (9 rows): `payment_id`, `target_type`, `target_id`, `amount`

**advances** (2 rows): `id`, `client_id`, `received_date`, `amount`, `reference`, `allocated_amount`, `note`

**disbursements** (37 rows): `id`, `client_id`, `project_code_id`, `source_type`, `source_id`, `date`, `description`, `amount`, `recoverable`, `ledger_posting_status`, `posted_at`, `recovered_via_invoice_ref_id`, `review_note`

**vendors** (2 rows): `id`, `name`, `contact_person`, `phone`, `email`, `gstin`, `pan`, `services`, `rate_card`, `active`

**misc_jobs** (3 rows): `id`, `project_code_id`, `client_id`, `work_type`, `description`, `vendor_id`, `assigned_date`, `status`, `client_due_date`, `statutory_due_date`, `amount_charged`, `vendor_cost`, `margin_amount`, `margin_percent`, `zoho_books_invoice_no`, `vendor_bill_no`, `vendor_bill_date`, `vendor_payment_status`, `vendor_paid_date`, `vendor_tds`

**reimbursement_policy** (1 rows): `bill_required`, `bill_override_roles`, `claim_window_days`, `approval_chain`, `payout_cycle`, `note`

**reimbursement_claims** (10 rows): `id`, `claimant_user_id`, `expense_date`, `submitted_at`, `category`, `description`, `amount`, `paid_with`, `bill_document_id`, `bill_override`, `status`, `finance_decision_by`, `finance_decision_at`, `query_note`, `duplicate_suspect_of`, `payout_id`

**reimbursement_allocations** (5 rows): `id`, `claim_id`, `project_code_id`, `amount`

**reimbursement_payouts** (1 rows): `id`, `payout_date`, `method`, `reference`, `claim_ids`, `total`, `paid_by`, `note`

## Office Executive

**address_book** (8 rows): `id`, `name`, `organization`, `address`, `pin`, `phone`, `email`, `type`

**dispatches** (16 rows): `id`, `serial_no`, `direction`, `booking_date`, `carrier`, `tracking_id`, `sender_address_id`, `recipient_address_id`, `document_type`, `particulars`, `status`, `delivered_on`, `ad_card_received`, `cost`, `cash_entry_id`, `legal_evidence`, `batch_id`, `created_by`

**dispatch_project_links** (17 rows): `dispatch_id`, `project_code_id`

**cash_entries** (19 rows): `id`, `entry_date`, `type`, `category`, `description`, `amount`, `payment_mode`, `paid_by`, `receipt_document_id`, `linked_dispatch_id`, `recoverable`, `affects_petty_cash_balance`, `created_at`, `balance_after`

**cash_allocations** (26 rows): `id`, `cash_entry_id`, `project_code_id`, `amount`

**topup_requests** (2 rows): `id`, `amount`, `reason`, `requested_by`, `requested_at`, `status`, `approved_by`, `approved_at`, `handed_over_at`

**cash_counts** (1 rows): `id`, `count_date`, `counted_by`, `physical_cash`, `book_balance`, `variance`, `note`, `finance_signoff_by`, `finance_signoff_at`, `finance_note`

**physical_documents** (7 rows): `id`, `project_code_id`, `document`, `original_or_copy`, `status`, `pages`, `notary_cash_entry_id`, `scan_document_id`, `updated_at`

**custody_items** (3 rows): `id`, `item`, `type`

**custody_log** (4 rows): `id`, `custody_item_id`, `holder_user_id`, `out_at`, `expected_return`, `in_at`

**office_requests** (5 rows): `id`, `project_code_id`, `requested_by`, `description`, `priority`, `due_date`, `status`, `accepted_by`, `created_at`, `completed_links`

## Scheduled checklists & performance

**checklist_templates** (8 rows): `id`, `name`, `department`, `schedule`, `due_time`, `owner_user_id`, `backup_user_id`, `steps`, `evidence_required`, `escalation_chain`, `escalation_delay_minutes`

**checklist_instances** (11 rows): `id`, `template_id`, `for_date`, `due_at`, `assigned_user_id`, `status`, `completed_by`, `completed_at`, `escalated`, `escalated_to`, `evidence`

**effort_points** (8 rows): `task_type`, `points`

**work_events** (51 rows): `id`, `entity_type`, `entity_id`, `event_type`, `actor_user_id`, `target_user_id`, `occurred_at`, `metadata`

**evaluations** (6 rows): `id`, `user_id`, `period`, `evaluator_user_id`, `skill`, `will`, `task_time`, `trust_score`, `notes`, `xp_suggestions`, `confirmed`, `created_at`, `band`

## Client portal

**client_status_map** (42 rows): `domain`, `internal_status`, `client_label`

**client_portal_accounts** (7 rows): `id`, `client_id`, `login_email`, `login_phone`, `password_set`, `default_otp_channel`, `status`, `invited_at`, `activated_at`, `last_login_at`, `failed_otp_attempts`, `locked_until`, `contact_change_requests`

**client_portal_settings** (1 rows): `auth`, `actions_enabled`, `note`

**client_access_log** (5 rows): `id`, `client_portal_account_id`, `event`, `project_code_id`, `document_id`, `at`
