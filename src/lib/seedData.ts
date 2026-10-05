// src/lib/seedData.ts
// Generated automatically from docs/seed-data/seed/*.json
// DO NOT EDIT MANUALLY. Run: node scripts/sync-seed.cjs

export const SEED_DEMO_SETTINGS    = {
  "demo_today": "2026-10-05",
  "timezone": "Asia/Kolkata",
  "currency": "INR",
  "gst_rate_percent": 18,
  "petty_cash_low_balance_threshold": 300,
  "esign_reminder_after_days": 5,
  "approval_reminder_days": [
    3,
    7
  ],
  "post_pending_followup_days": 7,
  "invoice_mismatch_tolerance": 1,
  "review_buffer_working_days": {
    "FINAL_APPROVAL": 3,
    "EXTERNAL_REVIEW": 7,
    "CO_LEAD_REVIEW": 10
  },
  "review_sla_days": {
    "CO_LEAD_REVIEW": 7,
    "EXTERNAL_REVIEW": 10,
    "FINAL_APPROVAL": 3
  },
  "stage_due_rule": "stage_due_date = min(assigned_at + review_sla_days[stage], statutory_deadline - review_buffer_working_days[stage])",
  "renewal_reminder_days": [
    90,
    60,
    30
  ],
  "review_score": {
    "counted_return_reasons": [
      "DRAFTER_QUALITY"
    ],
    "points_per_counted_return": 1,
    "extra_points_per_comment": {
      "CRITICAL": 1,
      "MAJOR": 0.5,
      "MINOR": 0
    },
    "window": "last 10 drafts with at least one decided review round",
    "lower_is_better": true,
    "note": "Illustrative weights — DEPT_ADMIN/SUPER_ADMIN can change. Returns tagged CLIENT_INPUT_CHANGE or REVIEWER_PREFERENCE are not counted."
  },
  "note": "All people, clients, addresses, phone numbers, application numbers and amounts are fictional. Domain lextria-demo.test is non-routable."
};
export const SEED_USERS            = [
  {
    "id": "u_sa1",
    "display_name": "Managing Partner",
    "email": "sa1@lextria-demo.test",
    "role": "SUPER_ADMIN",
    "department": "MANAGEMENT",
    "reports_to": null,
    "active": true,
    "weekly_capacity_points": 0
  },
  {
    "id": "u_sa2",
    "display_name": "Operations Partner",
    "email": "sa2@lextria-demo.test",
    "role": "SUPER_ADMIN",
    "department": "MANAGEMENT",
    "reports_to": null,
    "active": true,
    "weekly_capacity_points": 0
  },
  {
    "id": "u_pl1",
    "display_name": "Patent Co-lead A",
    "email": "pl1@lextria-demo.test",
    "role": "DEPT_ADMIN",
    "department": "IP_PATENT",
    "reports_to": "u_sa1",
    "active": true,
    "weekly_capacity_points": 20
  },
  {
    "id": "u_pl2",
    "display_name": "Patent Co-lead B",
    "email": "pl2@lextria-demo.test",
    "role": "DEPT_ADMIN",
    "department": "IP_PATENT",
    "reports_to": "u_sa1",
    "active": true,
    "weekly_capacity_points": 20
  },
  {
    "id": "u_dr1",
    "display_name": "Drafter A",
    "email": "dr1@lextria-demo.test",
    "role": "DRAFTER",
    "department": "IP_PATENT",
    "reports_to": "u_pl1",
    "active": true,
    "weekly_capacity_points": 15
  },
  {
    "id": "u_dr2",
    "display_name": "Drafter B",
    "email": "dr2@lextria-demo.test",
    "role": "DRAFTER",
    "department": "IP_PATENT",
    "reports_to": "u_pl1",
    "active": true,
    "weekly_capacity_points": 15
  },
  {
    "id": "u_dr3",
    "display_name": "Drafter C",
    "email": "dr3@lextria-demo.test",
    "role": "DRAFTER",
    "department": "IP_PATENT",
    "reports_to": "u_pl2",
    "active": true,
    "weekly_capacity_points": 15
  },
  {
    "id": "u_dr4",
    "display_name": "Drafter D (left firm)",
    "email": "dr4@lextria-demo.test",
    "role": "DRAFTER",
    "department": "IP_PATENT",
    "reports_to": "u_pl2",
    "active": false,
    "weekly_capacity_points": 0
  },
  {
    "id": "u_ext",
    "display_name": "External Senior Reviewer",
    "email": "ext@lextria-demo.test",
    "role": "EXTERNAL_REVIEWER",
    "department": "IP_PATENT",
    "reports_to": "u_sa1",
    "active": true,
    "weekly_capacity_points": 10
  },
  {
    "id": "u_ph",
    "display_name": "Paralegal Head",
    "email": "ph@lextria-demo.test",
    "role": "DEPT_ADMIN",
    "department": "PARALEGAL",
    "reports_to": "u_sa2",
    "active": true,
    "weekly_capacity_points": 15
  },
  {
    "id": "u_pa1",
    "display_name": "Paralegal A",
    "email": "pa1@lextria-demo.test",
    "role": "PARALEGAL",
    "department": "PARALEGAL",
    "reports_to": "u_ph",
    "active": true,
    "weekly_capacity_points": 12
  },
  {
    "id": "u_pa2",
    "display_name": "Paralegal B",
    "email": "pa2@lextria-demo.test",
    "role": "PARALEGAL",
    "department": "PARALEGAL",
    "reports_to": "u_ph",
    "active": true,
    "weekly_capacity_points": 12
  },
  {
    "id": "u_ops",
    "display_name": "Ops & Systems Admin",
    "email": "ops@lextria-demo.test",
    "role": "PARALEGAL",
    "department": "PARALEGAL",
    "reports_to": "u_sa2",
    "active": true,
    "weekly_capacity_points": 10
  },
  {
    "id": "u_int1",
    "display_name": "Filing Intern",
    "email": "int1@lextria-demo.test",
    "role": "INTERN",
    "department": "PARALEGAL",
    "reports_to": "u_ph",
    "active": true,
    "weekly_capacity_points": 8
  },
  {
    "id": "u_dm",
    "display_name": "IP Data Manager",
    "email": "dm@lextria-demo.test",
    "role": "PARALEGAL",
    "department": "IP_PATENT",
    "reports_to": "u_ph",
    "active": true,
    "weekly_capacity_points": 12
  },
  {
    "id": "u_fl",
    "display_name": "Finance Lead",
    "email": "fl@lextria-demo.test",
    "role": "FINANCE",
    "department": "FINANCE",
    "reports_to": "u_sa2",
    "active": true,
    "weekly_capacity_points": 0
  },
  {
    "id": "u_fe1",
    "display_name": "Finance Exec 1",
    "email": "fe1@lextria-demo.test",
    "role": "FINANCE",
    "department": "FINANCE",
    "reports_to": "u_fl",
    "active": true,
    "weekly_capacity_points": 0
  },
  {
    "id": "u_fe2",
    "display_name": "Finance Exec 2",
    "email": "fe2@lextria-demo.test",
    "role": "FINANCE",
    "department": "FINANCE",
    "reports_to": "u_fl",
    "active": true,
    "weekly_capacity_points": 0
  },
  {
    "id": "u_sl",
    "display_name": "Soft IP Lead",
    "email": "sl@lextria-demo.test",
    "role": "DEPT_ADMIN",
    "department": "IP_SOFT",
    "reports_to": "u_sa1",
    "active": true,
    "weekly_capacity_points": 15
  },
  {
    "id": "u_sip",
    "display_name": "Soft IP Associate",
    "email": "sip@lextria-demo.test",
    "role": "PARALEGAL",
    "department": "IP_SOFT",
    "reports_to": "u_sl",
    "active": true,
    "weekly_capacity_points": 12
  },
  {
    "id": "u_lit",
    "display_name": "Litigation Associate",
    "email": "lit@lextria-demo.test",
    "role": "DEPT_ADMIN",
    "department": "LITIGATION",
    "reports_to": "u_sa1",
    "active": true,
    "weekly_capacity_points": 12
  },
  {
    "id": "u_agr",
    "display_name": "Agreements Associate",
    "email": "agr@lextria-demo.test",
    "role": "DEPT_ADMIN",
    "department": "AGREEMENT",
    "reports_to": "u_sa1",
    "active": true,
    "weekly_capacity_points": 12
  },
  {
    "id": "u_int2",
    "display_name": "Legal Intern",
    "email": "int2@lextria-demo.test",
    "role": "INTERN",
    "department": "LITIGATION",
    "reports_to": "u_lit",
    "active": true,
    "weekly_capacity_points": 8
  },
  {
    "id": "u_oe",
    "display_name": "Office Executive",
    "email": "oe@lextria-demo.test",
    "role": "OFFICE_EXEC",
    "department": "OFFICE",
    "reports_to": "u_sa2",
    "active": true,
    "weekly_capacity_points": 0
  }
];
export const SEED_PROJECT_CODES    = [
  {
    "id": "pc_TBI01",
    "code": "TBI01",
    "client_id": "cli_1001",
    "client_code": "CLI-1001",
    "client_name": "Tungabhadra Institute of Technology",
    "title": "Low-power soil moisture sensing node with self-calibration",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_TBI02",
    "code": "TBI02",
    "client_id": "cli_1001",
    "client_code": "CLI-1001",
    "client_name": "Tungabhadra Institute of Technology",
    "title": "Bamboo-fibre composite brake pad",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_TBI03",
    "code": "TBI03",
    "client_id": "cli_1001",
    "client_code": "CLI-1001",
    "client_name": "Tungabhadra Institute of Technology",
    "title": "Grid-tied inverter islanding detection method",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_TBI04",
    "code": "TBI04",
    "client_id": "cli_1001",
    "client_code": "CLI-1001",
    "client_name": "Tungabhadra Institute of Technology",
    "title": "Portable water turbidity analyser using smartphone camera",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_KVU01",
    "code": "KVU01",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Federated learning scheduler for edge classrooms",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_KVU02",
    "code": "KVU02",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Herbal-free enzymatic dye extraction process",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_KVU03",
    "code": "KVU03",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Multilingual speech-to-sign avatar system",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_AR5001",
    "code": "AR5001",
    "client_id": "cli_1003",
    "client_code": "CLI-1003",
    "client_name": "Nimbus Agritech Pvt Ltd",
    "title": "Drip irrigation emitter with clog-sensing membrane",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_AR5002",
    "code": "AR5002",
    "client_id": "cli_1004",
    "client_code": "CLI-1004",
    "client_name": "Dr. Meera Kulkarni",
    "title": "Ergonomic laparoscopic instrument handle",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_AR5003",
    "code": "AR5003",
    "client_id": "cli_1006",
    "client_code": "CLI-1006",
    "client_name": "Hemadri Biotech Pvt Ltd",
    "title": "Thermostable lipase variant for biodiesel",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_AR5004",
    "code": "AR5004",
    "client_id": "cli_1006",
    "client_code": "CLI-1006",
    "client_name": "Hemadri Biotech Pvt Ltd",
    "title": "Microbial consortium for effluent decolourisation",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_AR5005",
    "code": "AR5005",
    "client_id": "cli_1006",
    "client_code": "CLI-1006",
    "client_name": "Hemadri Biotech Pvt Ltd",
    "title": "Enzyme immobilisation on chitosan beads",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_AR5006",
    "code": "AR5006",
    "client_id": "cli_1007",
    "client_code": "CLI-1007",
    "client_name": "Orbitron Robotics LLP",
    "title": "Autonomous hull-cleaning crawler",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_AR5010",
    "code": "AR5010",
    "client_id": "cli_1004",
    "client_code": "CLI-1004",
    "client_name": "Dr. Meera Kulkarni",
    "title": "Laparoscopic instrument handle (ergonomic)",
    "department": "IP_PATENT"
  },
  {
    "id": "pc_TM5001",
    "code": "TM5001",
    "client_id": "cli_1003",
    "client_code": "CLI-1003",
    "client_name": "Nimbus Agritech Pvt Ltd",
    "title": "Trademark NIMBUSROOT — Class 31",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_TM5002",
    "code": "TM5002",
    "client_id": "cli_1005",
    "client_code": "CLI-1005",
    "client_name": "Coastal Spice Traders LLP",
    "title": "Trademark SAGARGANDHA — Class 30",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_TM5003",
    "code": "TM5003",
    "client_id": "cli_1005",
    "client_code": "CLI-1005",
    "client_name": "Coastal Spice Traders LLP",
    "title": "Trademark COASTAL SPICE (device) — Class 30",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_TM5004",
    "code": "TM5004",
    "client_id": "cli_1007",
    "client_code": "CLI-1007",
    "client_name": "Orbitron Robotics LLP",
    "title": "Trademark ORBITRON — Classes 7, 9",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5001",
    "code": "CR5001",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 1",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5002",
    "code": "CR5002",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 2",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5003",
    "code": "CR5003",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 3",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5004",
    "code": "CR5004",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 4",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5005",
    "code": "CR5005",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 5",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5006",
    "code": "CR5006",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 6",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5007",
    "code": "CR5007",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 7",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5008",
    "code": "CR5008",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 8",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5009",
    "code": "CR5009",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 9",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5010",
    "code": "CR5010",
    "client_id": "cli_1002",
    "client_code": "CLI-1002",
    "client_name": "Kaveri Vidya University",
    "title": "Copyright — KVU course software module 10",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_CR5011",
    "code": "CR5011",
    "client_id": "cli_1004",
    "client_code": "CLI-1004",
    "client_name": "Dr. Meera Kulkarni",
    "title": "Copyright — 'Surgical Ergonomics' illustrated handbook",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_DS5001",
    "code": "DS5001",
    "client_id": "cli_1005",
    "client_code": "CLI-1005",
    "client_name": "Coastal Spice Traders LLP",
    "title": "Design — spice jar with pour spout",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_DS5002",
    "code": "DS5002",
    "client_id": "cli_1003",
    "client_code": "CLI-1003",
    "client_name": "Nimbus Agritech Pvt Ltd",
    "title": "Design — emitter housing",
    "department": "IP_SOFT"
  },
  {
    "id": "pc_LIT5001",
    "code": "LIT5001",
    "client_id": "cli_1003",
    "client_code": "CLI-1003",
    "client_name": "Nimbus Agritech Pvt Ltd",
    "title": "Nimbus Agritech v. Greenfield Agro Tools — patent infringement",
    "department": "LITIGATION"
  },
  {
    "id": "pc_LIT5002",
    "code": "LIT5002",
    "client_id": "cli_1005",
    "client_code": "CLI-1005",
    "client_name": "Coastal Spice Traders LLP",
    "title": "Coastal Spice Traders v. Sagar Masala Co. — TM infringement & passing off",
    "department": "LITIGATION"
  },
  {
    "id": "pc_AGR5001",
    "code": "AGR5001",
    "client_id": "cli_1006",
    "client_code": "CLI-1006",
    "client_name": "Hemadri Biotech Pvt Ltd",
    "title": "Patent licence — Hemadri to Vardhan Bioprocess",
    "department": "AGREEMENT"
  },
  {
    "id": "pc_AGR5002",
    "code": "AGR5002",
    "client_id": "cli_1003",
    "client_code": "CLI-1003",
    "client_name": "Nimbus Agritech Pvt Ltd",
    "title": "Mutual NDA — Nimbus & field-trial partner",
    "department": "AGREEMENT"
  },
  {
    "id": "pc_AGR5003",
    "code": "AGR5003",
    "client_id": "cli_1007",
    "client_code": "CLI-1007",
    "client_name": "Orbitron Robotics LLP",
    "title": "IP assignment — founders to Orbitron Robotics LLP",
    "department": "AGREEMENT"
  },
  {
    "id": "pc_MISC5001",
    "code": "MISC5001",
    "client_id": "cli_1005",
    "client_code": "CLI-1005",
    "client_name": "Coastal Spice Traders LLP",
    "title": "GST registration amendment (new branch)",
    "department": "MISC_VENDOR"
  },
  {
    "id": "pc_MISC5002",
    "code": "MISC5002",
    "client_id": "cli_1006",
    "client_code": "CLI-1006",
    "client_name": "Hemadri Biotech Pvt Ltd",
    "title": "ROC annual filing FY 2025-26 (AOC-4, MGT-7)",
    "department": "MISC_VENDOR"
  },
  {
    "id": "pc_MISC5003",
    "code": "MISC5003",
    "client_id": "cli_1007",
    "client_code": "CLI-1007",
    "client_name": "Orbitron Robotics LLP",
    "title": "Designated partner KYC filing",
    "department": "MISC_VENDOR"
  }
];
export const SEED_ADDRESS_BOOK     = [
  {
    "id": "ab_cr",
    "name": "Registrar of Copyrights",
    "organization": "Copyright Office",
    "organisation": "Copyright Office",
    "address": "Boudhik Sampada Bhawan, Plot 32, Sector 14, Dwarka, New Delhi",
    "full_address": "Boudhik Sampada Bhawan, Plot 32, Sector 14, Dwarka, New Delhi",
    "pin": "110078",
    "phone": null,
    "email": null,
    "type": "GOVT_OFFICE",
    "times_used": 10,
    "last_used": "2026-10-03"
  },
  {
    "id": "ab_po",
    "name": "Controller of Patents",
    "organization": "Patent Office Chennai",
    "organisation": "Patent Office Chennai",
    "address": "Intellectual Property Office Building, Guindy, Chennai",
    "full_address": "Intellectual Property Office Building, Guindy, Chennai",
    "pin": "600032",
    "phone": null,
    "email": null,
    "type": "GOVT_OFFICE",
    "times_used": 0,
    "last_used": null
  },
  {
    "id": "ab_tbi",
    "name": "IPR Cell",
    "organization": "Tungabhadra Institute of Technology",
    "organisation": "Tungabhadra Institute of Technology",
    "address": "Survey No. 12, Riverside Campus, Hosapete",
    "full_address": "Survey No. 12, Riverside Campus, Hosapete",
    "pin": "583201",
    "phone": "+91 00000 10001",
    "email": "ipr.cell@tbi-demo.test",
    "type": "CLIENT",
    "times_used": 0,
    "last_used": null
  },
  {
    "id": "ab_kvu",
    "name": "IPR Office",
    "organization": "Kaveri Vidya University",
    "organisation": "Kaveri Vidya University",
    "address": "University Road, Srirangapatna",
    "full_address": "University Road, Srirangapatna",
    "pin": "571438",
    "phone": "+91 00000 10002",
    "email": "ipr@kvu-demo.test",
    "type": "CLIENT",
    "times_used": 1,
    "last_used": "2026-09-22"
  },
  {
    "id": "ab_orb",
    "name": "Ms. Ananya Pai",
    "organization": "Orbitron Robotics LLP",
    "organisation": "Orbitron Robotics LLP",
    "address": "Unit 3, Old Port Industrial Estate, Udupi",
    "full_address": "Unit 3, Old Port Industrial Estate, Udupi",
    "pin": "576101",
    "phone": "+91 00010 00013",
    "email": "ananya@orbitron-demo.test",
    "type": "CLIENT",
    "times_used": 2,
    "last_used": "2026-09-30"
  },
  {
    "id": "ab_sagar",
    "name": "Proprietor",
    "organization": "Sagar Masala Co. (opposite party)",
    "organisation": "Sagar Masala Co. (opposite party)",
    "address": "Shop 4, Market Road, Puttur",
    "full_address": "Shop 4, Market Road, Puttur",
    "pin": "574201",
    "phone": null,
    "email": null,
    "type": "OTHER",
    "times_used": 1,
    "last_used": "2026-09-15"
  },
  {
    "id": "ab_firm",
    "name": "Managing Partner",
    "organization": "Lextria Research (demo)",
    "organisation": "Lextria Research (demo)",
    "address": "1-344C, Demo Lane, Udupi",
    "full_address": "1-344C, Demo Lane, Udupi",
    "pin": "576102",
    "phone": "+91 00000 00000",
    "email": null,
    "type": "OTHER",
    "times_used": 1,
    "last_used": "2026-10-01"
  },
  {
    "id": "ab_hem",
    "name": "IP Desk",
    "organization": "Hemadri Biotech Pvt Ltd",
    "organisation": "Hemadri Biotech Pvt Ltd",
    "address": "Plot 44, Biotech Park Phase 2, Dharwad",
    "full_address": "Plot 44, Biotech Park Phase 2, Dharwad",
    "pin": "580011",
    "phone": "+91 00000 10006",
    "email": "ip@hemadri-demo.test",
    "type": "CLIENT",
    "times_used": 1,
    "last_used": "2026-10-01"
  }
];
export const SEED_DISPATCHES       = [
  {
    "id": "dsp_0001",
    "serial_no": 1,
    "direction": "OUTWARD",
    "booking_date": "2026-09-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000001IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "DELIVERED",
    "delivered_on": "2026-09-08",
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0002",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-09-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5001"
    ],
    "created_by": "u_oe",
    "created_at": "2026-09-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0002",
    "serial_no": 2,
    "direction": "OUTWARD",
    "booking_date": "2026-09-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000002IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "DELIVERED",
    "delivered_on": "2026-09-08",
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0003",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-09-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5002"
    ],
    "created_by": "u_oe",
    "created_at": "2026-09-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0003",
    "serial_no": 3,
    "direction": "OUTWARD",
    "booking_date": "2026-09-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000003IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "DELIVERED",
    "delivered_on": "2026-09-08",
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0004",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-09-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5003"
    ],
    "created_by": "u_oe",
    "created_at": "2026-09-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0004",
    "serial_no": 4,
    "direction": "OUTWARD",
    "booking_date": "2026-09-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000004IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "DELIVERED",
    "delivered_on": "2026-09-08",
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0005",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-09-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5004"
    ],
    "created_by": "u_oe",
    "created_at": "2026-09-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0005",
    "serial_no": 5,
    "direction": "OUTWARD",
    "booking_date": "2026-09-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000005IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "DELIVERED",
    "delivered_on": "2026-09-08",
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0006",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-09-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5005"
    ],
    "created_by": "u_oe",
    "created_at": "2026-09-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0006",
    "serial_no": 6,
    "direction": "OUTWARD",
    "booking_date": "2026-10-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000016IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "BOOKED",
    "delivered_on": null,
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0017",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-10-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5006"
    ],
    "created_by": "u_oe",
    "created_at": "2026-10-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0007",
    "serial_no": 7,
    "direction": "OUTWARD",
    "booking_date": "2026-10-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000017IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "BOOKED",
    "delivered_on": null,
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0017",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-10-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5007"
    ],
    "created_by": "u_oe",
    "created_at": "2026-10-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0008",
    "serial_no": 8,
    "direction": "OUTWARD",
    "booking_date": "2026-10-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000018IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "BOOKED",
    "delivered_on": null,
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0017",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-10-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5008"
    ],
    "created_by": "u_oe",
    "created_at": "2026-10-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0009",
    "serial_no": 9,
    "direction": "OUTWARD",
    "booking_date": "2026-10-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000019IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "BOOKED",
    "delivered_on": null,
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0017",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-10-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5009"
    ],
    "created_by": "u_oe",
    "created_at": "2026-10-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0010",
    "serial_no": 10,
    "direction": "OUTWARD",
    "booking_date": "2026-10-03",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000020IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_cr",
    "recipient_id": "ab_cr",
    "document_type": "OTHER",
    "doc_type": "OTHER",
    "particulars": "Copyright application hard copy",
    "status": "BOOKED",
    "delivered_on": null,
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0017",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": "batch_2026-10-03",
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_CR5010"
    ],
    "created_by": "u_oe",
    "created_at": "2026-10-03T10:00:00+05:30"
  },
  {
    "id": "dsp_0011",
    "serial_no": 11,
    "direction": "OUTWARD",
    "booking_date": "2026-09-15",
    "carrier": "POSTAL_AD",
    "tracking_id": "RA000000101IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_sagar",
    "recipient_id": "ab_sagar",
    "document_type": "LEGAL_NOTICE",
    "doc_type": "LEGAL_NOTICE",
    "particulars": "Legal notice — TM infringement & passing off",
    "status": "DELIVERED",
    "delivered_on": "2026-09-18",
    "ad_card_received": true,
    "cost": 62,
    "cash_entry_id": "cash_0008",
    "payment_mode": "CASH",
    "legal_evidence": true,
    "batch_id": null,
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_LIT5002"
    ],
    "created_by": "u_oe",
    "created_at": "2026-09-15T10:00:00+05:30"
  },
  {
    "id": "dsp_0012",
    "serial_no": 12,
    "direction": "INWARD",
    "booking_date": "2026-10-01",
    "carrier": "PROFESSIONAL_COURIER",
    "tracking_id": "PC77001234",
    "sender_address_id": "ab_tbi",
    "sender_id": "ab_tbi",
    "recipient_address_id": "ab_firm",
    "recipient_id": "ab_firm",
    "document_type": "FORMS_FOR_SIGNATURE",
    "doc_type": "FORMS_FOR_SIGNATURE",
    "particulars": "Signed Form 1 (TBI04) from institution",
    "status": "DELIVERED",
    "delivered_on": "2026-10-03",
    "ad_card_received": false,
    "cost": 0,
    "cash_entry_id": null,
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": null,
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_TBI04"
    ],
    "created_by": "u_oe",
    "created_at": "2026-10-01T10:00:00+05:30"
  },
  {
    "id": "dsp_0013",
    "serial_no": 13,
    "direction": "OUTWARD",
    "booking_date": "2026-09-22",
    "carrier": "INDIA_REGISTERED_POST",
    "tracking_id": "RK000000202IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_kvu",
    "recipient_id": "ab_kvu",
    "document_type": "POA",
    "doc_type": "POA",
    "particulars": "Form 26 for signature",
    "status": "IN_TRANSIT",
    "delivered_on": null,
    "ad_card_received": false,
    "cost": 52,
    "cash_entry_id": "cash_0010",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": null,
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_KVU03"
    ],
    "created_by": "u_oe",
    "created_at": "2026-09-22T10:00:00+05:30"
  },
  {
    "id": "dsp_0014",
    "serial_no": 14,
    "direction": "OUTWARD",
    "booking_date": "2026-09-24",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000303IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_orb",
    "recipient_id": "ab_orb",
    "document_type": "FORMS_FOR_SIGNATURE",
    "doc_type": "FORMS_FOR_SIGNATURE",
    "particulars": "Wrong address — reposted",
    "status": "RETURNED",
    "delivered_on": null,
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0011",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": null,
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_AR5006"
    ],
    "created_by": "u_oe",
    "created_at": "2026-09-24T10:00:00+05:30"
  },
  {
    "id": "dsp_0015",
    "serial_no": 15,
    "direction": "OUTWARD",
    "booking_date": "2026-09-30",
    "carrier": "INDIA_SPEED_POST",
    "tracking_id": "JK000000304IN",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_orb",
    "recipient_id": "ab_orb",
    "document_type": "FORMS_FOR_SIGNATURE",
    "doc_type": "FORMS_FOR_SIGNATURE",
    "particulars": "Reposted to corrected address",
    "status": "DELIVERED",
    "delivered_on": "2026-10-02",
    "ad_card_received": false,
    "cost": 47,
    "cash_entry_id": "cash_0014",
    "payment_mode": "CASH",
    "legal_evidence": false,
    "batch_id": null,
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_AR5006",
      "pc_TM5004"
    ],
    "created_by": "u_oe",
    "created_at": "2026-09-30T10:00:00+05:30"
  },
  {
    "id": "dsp_0016",
    "serial_no": 16,
    "direction": "OUTWARD",
    "booking_date": "2026-10-01",
    "carrier": "PRIVATE_COURIER_SPEED",
    "tracking_id": "PVT0001122",
    "sender_address_id": "ab_firm",
    "sender_id": "ab_firm",
    "recipient_address_id": "ab_hem",
    "recipient_id": "ab_hem",
    "document_type": "COVER_LETTER",
    "doc_type": "COVER_LETTER",
    "particulars": "Renewal reminder & instruction form (year 10)",
    "status": "DELIVERED",
    "delivered_on": "2026-10-02",
    "ad_card_received": false,
    "cost": 80,
    "cash_entry_id": "cash_0015",
    "payment_mode": "FIRM_UPI",
    "legal_evidence": false,
    "batch_id": null,
    "reposted_from_id": null,
    "return_reason": null,
    "project_codes": [
      "pc_AR5004"
    ],
    "created_by": "u_oe",
    "created_at": "2026-10-01T10:00:00+05:30"
  }
];
export const SEED_DISPATCH_LINKS   = [
  {
    "dispatch_id": "dsp_0001",
    "project_code_id": "pc_CR5001"
  },
  {
    "dispatch_id": "dsp_0002",
    "project_code_id": "pc_CR5002"
  },
  {
    "dispatch_id": "dsp_0003",
    "project_code_id": "pc_CR5003"
  },
  {
    "dispatch_id": "dsp_0004",
    "project_code_id": "pc_CR5004"
  },
  {
    "dispatch_id": "dsp_0005",
    "project_code_id": "pc_CR5005"
  },
  {
    "dispatch_id": "dsp_0006",
    "project_code_id": "pc_CR5006"
  },
  {
    "dispatch_id": "dsp_0007",
    "project_code_id": "pc_CR5007"
  },
  {
    "dispatch_id": "dsp_0008",
    "project_code_id": "pc_CR5008"
  },
  {
    "dispatch_id": "dsp_0009",
    "project_code_id": "pc_CR5009"
  },
  {
    "dispatch_id": "dsp_0010",
    "project_code_id": "pc_CR5010"
  },
  {
    "dispatch_id": "dsp_0011",
    "project_code_id": "pc_LIT5002"
  },
  {
    "dispatch_id": "dsp_0012",
    "project_code_id": "pc_TBI04"
  },
  {
    "dispatch_id": "dsp_0013",
    "project_code_id": "pc_KVU03"
  },
  {
    "dispatch_id": "dsp_0014",
    "project_code_id": "pc_AR5006"
  },
  {
    "dispatch_id": "dsp_0015",
    "project_code_id": "pc_AR5006"
  },
  {
    "dispatch_id": "dsp_0015",
    "project_code_id": "pc_TM5004"
  },
  {
    "dispatch_id": "dsp_0016",
    "project_code_id": "pc_AR5004"
  }
];
export const SEED_CASH_ENTRIES     = [
  {
    "id": "cash_0001",
    "entry_no": 1,
    "entry_date": "2026-09-01",
    "type": "TOP_UP",
    "entry_type": "TOP_UP",
    "category": "TOP_UP",
    "description": "Opening float for September",
    "amount": 2000,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0046",
    "linked_dispatch_id": null,
    "recoverable": null,
    "is_recoverable": null,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 2000,
    "allocations": [],
    "created_at": "2026-09-01T17:00:00+05:30"
  },
  {
    "id": "cash_0002",
    "entry_no": 2,
    "entry_date": "2026-09-03",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Speed post CR5001",
    "amount": 47,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0047",
    "linked_dispatch_id": "dsp_0001",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1953,
    "allocations": [
      {
        "id": "ca_0001",
        "cash_entry_id": "cash_0002",
        "project_code_id": "pc_CR5001",
        "project_code": "CR5001",
        "amount": 47
      }
    ],
    "created_at": "2026-09-03T17:00:00+05:30"
  },
  {
    "id": "cash_0003",
    "entry_no": 3,
    "entry_date": "2026-09-03",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Speed post CR5002",
    "amount": 47,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0048",
    "linked_dispatch_id": "dsp_0002",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1906,
    "allocations": [
      {
        "id": "ca_0002",
        "cash_entry_id": "cash_0003",
        "project_code_id": "pc_CR5002",
        "project_code": "CR5002",
        "amount": 47
      }
    ],
    "created_at": "2026-09-03T17:00:00+05:30"
  },
  {
    "id": "cash_0004",
    "entry_no": 4,
    "entry_date": "2026-09-03",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Speed post CR5003",
    "amount": 47,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0049",
    "linked_dispatch_id": "dsp_0003",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1859,
    "allocations": [
      {
        "id": "ca_0003",
        "cash_entry_id": "cash_0004",
        "project_code_id": "pc_CR5003",
        "project_code": "CR5003",
        "amount": 47
      }
    ],
    "created_at": "2026-09-03T17:00:00+05:30"
  },
  {
    "id": "cash_0005",
    "entry_no": 5,
    "entry_date": "2026-09-03",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Speed post CR5004",
    "amount": 47,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0050",
    "linked_dispatch_id": "dsp_0004",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1812,
    "allocations": [
      {
        "id": "ca_0004",
        "cash_entry_id": "cash_0005",
        "project_code_id": "pc_CR5004",
        "project_code": "CR5004",
        "amount": 47
      }
    ],
    "created_at": "2026-09-03T17:00:00+05:30"
  },
  {
    "id": "cash_0006",
    "entry_no": 6,
    "entry_date": "2026-09-03",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Speed post CR5005",
    "amount": 47,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0051",
    "linked_dispatch_id": "dsp_0005",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1765,
    "allocations": [
      {
        "id": "ca_0005",
        "cash_entry_id": "cash_0006",
        "project_code_id": "pc_CR5005",
        "project_code": "CR5005",
        "amount": 47
      }
    ],
    "created_at": "2026-09-03T17:00:00+05:30"
  },
  {
    "id": "cash_0007",
    "entry_no": 7,
    "entry_date": "2026-09-12",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "NOTARY",
    "description": "Notary & true copies — 5 copyright author declarations",
    "amount": 250,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0052",
    "linked_dispatch_id": null,
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1515,
    "allocations": [
      {
        "id": "ca_0006",
        "cash_entry_id": "cash_0007",
        "project_code_id": "pc_CR5006",
        "project_code": "CR5006",
        "amount": 50
      },
      {
        "id": "ca_0007",
        "cash_entry_id": "cash_0007",
        "project_code_id": "pc_CR5007",
        "project_code": "CR5007",
        "amount": 50
      },
      {
        "id": "ca_0008",
        "cash_entry_id": "cash_0007",
        "project_code_id": "pc_CR5008",
        "project_code": "CR5008",
        "amount": 50
      },
      {
        "id": "ca_0009",
        "cash_entry_id": "cash_0007",
        "project_code_id": "pc_CR5009",
        "project_code": "CR5009",
        "amount": 50
      },
      {
        "id": "ca_0010",
        "cash_entry_id": "cash_0007",
        "project_code_id": "pc_CR5010",
        "project_code": "CR5010",
        "amount": 50
      }
    ],
    "created_at": "2026-09-12T17:00:00+05:30"
  },
  {
    "id": "cash_0008",
    "entry_no": 8,
    "entry_date": "2026-09-15",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Postal AD — legal notice",
    "amount": 62,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0053",
    "linked_dispatch_id": "dsp_0011",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1453,
    "allocations": [
      {
        "id": "ca_0011",
        "cash_entry_id": "cash_0008",
        "project_code_id": "pc_LIT5002",
        "project_code": "LIT5002",
        "amount": 62
      }
    ],
    "created_at": "2026-09-15T17:00:00+05:30"
  },
  {
    "id": "cash_0009",
    "entry_no": 9,
    "entry_date": "2026-09-16",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "STAMP_PAPER",
    "description": "Stamp paper ₹100 for licence agreement",
    "amount": 100,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0054",
    "linked_dispatch_id": null,
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1353,
    "allocations": [
      {
        "id": "ca_0012",
        "cash_entry_id": "cash_0009",
        "project_code_id": "pc_AGR5001",
        "project_code": "AGR5001",
        "amount": 100
      }
    ],
    "created_at": "2026-09-16T17:00:00+05:30"
  },
  {
    "id": "cash_0010",
    "entry_no": 10,
    "entry_date": "2026-09-22",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Regd post Form 26 to KVU",
    "amount": 52,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0055",
    "linked_dispatch_id": "dsp_0013",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1301,
    "allocations": [
      {
        "id": "ca_0013",
        "cash_entry_id": "cash_0010",
        "project_code_id": "pc_KVU03",
        "project_code": "KVU03",
        "amount": 52
      }
    ],
    "created_at": "2026-09-22T17:00:00+05:30"
  },
  {
    "id": "cash_0011",
    "entry_no": 11,
    "entry_date": "2026-09-24",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Speed post to Orbitron (returned)",
    "amount": 47,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0056",
    "linked_dispatch_id": "dsp_0014",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1254,
    "allocations": [
      {
        "id": "ca_0014",
        "cash_entry_id": "cash_0011",
        "project_code_id": "pc_AR5006",
        "project_code": "AR5006",
        "amount": 47
      }
    ],
    "created_at": "2026-09-24T17:00:00+05:30"
  },
  {
    "id": "cash_0012",
    "entry_no": 12,
    "entry_date": "2026-09-26",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "NOTARY",
    "description": "Notary — Form 26 copies (3 matters)",
    "amount": 180,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0057",
    "linked_dispatch_id": null,
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1074,
    "allocations": [
      {
        "id": "ca_0015",
        "cash_entry_id": "cash_0012",
        "project_code_id": "pc_KVU01",
        "project_code": "KVU01",
        "amount": 60
      },
      {
        "id": "ca_0016",
        "cash_entry_id": "cash_0012",
        "project_code_id": "pc_KVU02",
        "project_code": "KVU02",
        "amount": 60
      },
      {
        "id": "ca_0017",
        "cash_entry_id": "cash_0012",
        "project_code_id": "pc_KVU03",
        "project_code": "KVU03",
        "amount": 60
      }
    ],
    "created_at": "2026-09-26T17:00:00+05:30"
  },
  {
    "id": "cash_0013",
    "entry_no": 13,
    "entry_date": "2026-09-28",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "PRINTING",
    "description": "Office printer toner",
    "amount": 650,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0058",
    "linked_dispatch_id": null,
    "recoverable": false,
    "is_recoverable": false,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 424,
    "allocations": [],
    "created_at": "2026-09-28T17:00:00+05:30"
  },
  {
    "id": "cash_0014",
    "entry_no": 14,
    "entry_date": "2026-09-30",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Speed post repost to Orbitron",
    "amount": 47,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0059",
    "linked_dispatch_id": "dsp_0015",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 377,
    "allocations": [
      {
        "id": "ca_0018",
        "cash_entry_id": "cash_0014",
        "project_code_id": "pc_AR5006",
        "project_code": "AR5006",
        "amount": 24
      },
      {
        "id": "ca_0019",
        "cash_entry_id": "cash_0014",
        "project_code_id": "pc_TM5004",
        "project_code": "TM5004",
        "amount": 23
      }
    ],
    "created_at": "2026-09-30T17:00:00+05:30"
  },
  {
    "id": "cash_0015",
    "entry_no": 15,
    "entry_date": "2026-10-01",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "PRIVATE_COURIER",
    "description": "Courier renewal pack to Hemadri",
    "amount": 80,
    "payment_mode": "FIRM_UPI",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0060",
    "linked_dispatch_id": "dsp_0016",
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": false,
    "status": "ACTIVE",
    "balance_after": 377,
    "allocations": [
      {
        "id": "ca_0020",
        "cash_entry_id": "cash_0015",
        "project_code_id": "pc_AR5004",
        "project_code": "AR5004",
        "amount": 80
      }
    ],
    "created_at": "2026-10-01T17:00:00+05:30"
  },
  {
    "id": "cash_0016",
    "entry_no": 16,
    "entry_date": "2026-10-01",
    "type": "TOP_UP",
    "entry_type": "TOP_UP",
    "category": "TOP_UP",
    "description": "Top-up approved by finance",
    "amount": 1000,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0061",
    "linked_dispatch_id": null,
    "recoverable": null,
    "is_recoverable": null,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1377,
    "allocations": [],
    "created_at": "2026-10-01T17:00:00+05:30"
  },
  {
    "id": "cash_0017",
    "entry_no": 17,
    "entry_date": "2026-10-03",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "INDIA_POST",
    "description": "Speed post batch — 5 copyright applications",
    "amount": 235,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0062",
    "linked_dispatch_id": null,
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1142,
    "allocations": [
      {
        "id": "ca_0021",
        "cash_entry_id": "cash_0017",
        "project_code_id": "pc_CR5006",
        "project_code": "CR5006",
        "amount": 47
      },
      {
        "id": "ca_0022",
        "cash_entry_id": "cash_0017",
        "project_code_id": "pc_CR5007",
        "project_code": "CR5007",
        "amount": 47
      },
      {
        "id": "ca_0023",
        "cash_entry_id": "cash_0017",
        "project_code_id": "pc_CR5008",
        "project_code": "CR5008",
        "amount": 47
      },
      {
        "id": "ca_0024",
        "cash_entry_id": "cash_0017",
        "project_code_id": "pc_CR5009",
        "project_code": "CR5009",
        "amount": 47
      },
      {
        "id": "ca_0025",
        "cash_entry_id": "cash_0017",
        "project_code_id": "pc_CR5010",
        "project_code": "CR5010",
        "amount": 47
      }
    ],
    "created_at": "2026-10-03T17:00:00+05:30"
  },
  {
    "id": "cash_0018",
    "entry_no": 18,
    "entry_date": "2026-10-03",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "BUS_PARCEL",
    "description": "Bus parcel — originals to TBI",
    "amount": 60,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": null,
    "linked_dispatch_id": null,
    "recoverable": true,
    "is_recoverable": true,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 1082,
    "allocations": [
      {
        "id": "ca_0026",
        "cash_entry_id": "cash_0018",
        "project_code_id": "pc_TBI04",
        "project_code": "TBI04",
        "amount": 60
      }
    ],
    "created_at": "2026-10-03T17:00:00+05:30"
  },
  {
    "id": "cash_0019",
    "entry_no": 19,
    "entry_date": "2026-10-03",
    "type": "EXPENSE",
    "entry_type": "EXPENSE",
    "category": "LOCAL_CONVEYANCE",
    "description": "Auto fare to notary",
    "amount": 120,
    "payment_mode": "CASH",
    "paid_by": "u_oe",
    "receipt_document_id": "doc_0063",
    "linked_dispatch_id": null,
    "recoverable": false,
    "is_recoverable": false,
    "affects_petty_cash_balance": true,
    "status": "ACTIVE",
    "balance_after": 962,
    "allocations": [],
    "created_at": "2026-10-03T17:00:00+05:30"
  }
];
export const SEED_CASH_ALLOCATIONS = [
  {
    "id": "ca_0001",
    "cash_entry_id": "cash_0002",
    "project_code_id": "pc_CR5001",
    "project_code": "CR5001",
    "amount": 47
  },
  {
    "id": "ca_0002",
    "cash_entry_id": "cash_0003",
    "project_code_id": "pc_CR5002",
    "project_code": "CR5002",
    "amount": 47
  },
  {
    "id": "ca_0003",
    "cash_entry_id": "cash_0004",
    "project_code_id": "pc_CR5003",
    "project_code": "CR5003",
    "amount": 47
  },
  {
    "id": "ca_0004",
    "cash_entry_id": "cash_0005",
    "project_code_id": "pc_CR5004",
    "project_code": "CR5004",
    "amount": 47
  },
  {
    "id": "ca_0005",
    "cash_entry_id": "cash_0006",
    "project_code_id": "pc_CR5005",
    "project_code": "CR5005",
    "amount": 47
  },
  {
    "id": "ca_0006",
    "cash_entry_id": "cash_0007",
    "project_code_id": "pc_CR5006",
    "project_code": "CR5006",
    "amount": 50
  },
  {
    "id": "ca_0007",
    "cash_entry_id": "cash_0007",
    "project_code_id": "pc_CR5007",
    "project_code": "CR5007",
    "amount": 50
  },
  {
    "id": "ca_0008",
    "cash_entry_id": "cash_0007",
    "project_code_id": "pc_CR5008",
    "project_code": "CR5008",
    "amount": 50
  },
  {
    "id": "ca_0009",
    "cash_entry_id": "cash_0007",
    "project_code_id": "pc_CR5009",
    "project_code": "CR5009",
    "amount": 50
  },
  {
    "id": "ca_0010",
    "cash_entry_id": "cash_0007",
    "project_code_id": "pc_CR5010",
    "project_code": "CR5010",
    "amount": 50
  },
  {
    "id": "ca_0011",
    "cash_entry_id": "cash_0008",
    "project_code_id": "pc_LIT5002",
    "project_code": "LIT5002",
    "amount": 62
  },
  {
    "id": "ca_0012",
    "cash_entry_id": "cash_0009",
    "project_code_id": "pc_AGR5001",
    "project_code": "AGR5001",
    "amount": 100
  },
  {
    "id": "ca_0013",
    "cash_entry_id": "cash_0010",
    "project_code_id": "pc_KVU03",
    "project_code": "KVU03",
    "amount": 52
  },
  {
    "id": "ca_0014",
    "cash_entry_id": "cash_0011",
    "project_code_id": "pc_AR5006",
    "project_code": "AR5006",
    "amount": 47
  },
  {
    "id": "ca_0015",
    "cash_entry_id": "cash_0012",
    "project_code_id": "pc_KVU01",
    "project_code": "KVU01",
    "amount": 60
  },
  {
    "id": "ca_0016",
    "cash_entry_id": "cash_0012",
    "project_code_id": "pc_KVU02",
    "project_code": "KVU02",
    "amount": 60
  },
  {
    "id": "ca_0017",
    "cash_entry_id": "cash_0012",
    "project_code_id": "pc_KVU03",
    "project_code": "KVU03",
    "amount": 60
  },
  {
    "id": "ca_0018",
    "cash_entry_id": "cash_0014",
    "project_code_id": "pc_AR5006",
    "project_code": "AR5006",
    "amount": 24
  },
  {
    "id": "ca_0019",
    "cash_entry_id": "cash_0014",
    "project_code_id": "pc_TM5004",
    "project_code": "TM5004",
    "amount": 23
  },
  {
    "id": "ca_0020",
    "cash_entry_id": "cash_0015",
    "project_code_id": "pc_AR5004",
    "project_code": "AR5004",
    "amount": 80
  },
  {
    "id": "ca_0021",
    "cash_entry_id": "cash_0017",
    "project_code_id": "pc_CR5006",
    "project_code": "CR5006",
    "amount": 47
  },
  {
    "id": "ca_0022",
    "cash_entry_id": "cash_0017",
    "project_code_id": "pc_CR5007",
    "project_code": "CR5007",
    "amount": 47
  },
  {
    "id": "ca_0023",
    "cash_entry_id": "cash_0017",
    "project_code_id": "pc_CR5008",
    "project_code": "CR5008",
    "amount": 47
  },
  {
    "id": "ca_0024",
    "cash_entry_id": "cash_0017",
    "project_code_id": "pc_CR5009",
    "project_code": "CR5009",
    "amount": 47
  },
  {
    "id": "ca_0025",
    "cash_entry_id": "cash_0017",
    "project_code_id": "pc_CR5010",
    "project_code": "CR5010",
    "amount": 47
  },
  {
    "id": "ca_0026",
    "cash_entry_id": "cash_0018",
    "project_code_id": "pc_TBI04",
    "project_code": "TBI04",
    "amount": 60
  }
];
export const SEED_TOPUP_REQUESTS   = [
  {
    "id": "tu_0001",
    "amount": 1000,
    "reason": "Balance below threshold before CR batch",
    "requested_by": "u_oe",
    "requested_by_name": "Office Executive",
    "requested_at": "2026-09-30T16:00:00+05:30",
    "status": "HANDED_OVER",
    "decided_by": "u_fl",
    "decided_at": "2026-10-01T10:00:00+05:30",
    "approved_by": "u_fl",
    "approved_at": "2026-10-01T10:00:00+05:30",
    "handed_over_at": "2026-10-01T11:00:00+05:30"
  },
  {
    "id": "tu_0002",
    "amount": 1500,
    "reason": "Week of 5-Oct: notary for 14 copyright docs + post",
    "requested_by": "u_oe",
    "requested_by_name": "Office Executive",
    "requested_at": "2026-10-05T09:15:00+05:30",
    "status": "REQUESTED",
    "decided_by": null,
    "decided_at": null,
    "approved_by": null,
    "approved_at": null,
    "handed_over_at": null
  }
];
export const SEED_CASH_COUNTS      = [
  {
    "id": "cc_0001",
    "count_date": "2026-10-03",
    "counted_by": "u_oe",
    "counted_by_name": "Office Executive",
    "physical_cash": 942,
    "book_balance": 962,
    "variance": -20,
    "note": "₹20 short — likely xerox not entered",
    "finance_signoff_by": "u_fl",
    "finance_signoff_at": "2026-10-03T18:00:00+05:30",
    "finance_note": "Accepted; add xerox entry going forward"
  }
];
export const SEED_PHYSICAL_DOCS    = [
  {
    "id": "phd_0001",
    "project_code_id": "pc_TBI04",
    "project_code": "TBI04",
    "document": "Signed Form 1 (hard copy)",
    "doc_name": "Signed Form 1 (hard copy)",
    "original_or_copy": "ORIGINAL",
    "doc_nature": "ORIGINAL",
    "status": "RECEIVED",
    "pages": null,
    "pages_count": 1,
    "copies_count": 1,
    "current_location": "Office Cabinet A",
    "notary_cost": 0,
    "notary_cash_entry_id": null,
    "scan_document_id": null,
    "updated_at": "2026-10-03T15:00:00+05:30",
    "created_at": "2026-10-03T15:00:00+05:30"
  },
  {
    "id": "phd_0002",
    "project_code_id": "pc_KVU02",
    "project_code": "KVU02",
    "document": "Signed Form 1 (hard copy)",
    "doc_name": "Signed Form 1 (hard copy)",
    "original_or_copy": "ORIGINAL",
    "doc_nature": "ORIGINAL",
    "status": "SCANNED_UPLOADED",
    "pages": null,
    "pages_count": 1,
    "copies_count": 1,
    "current_location": "Office Cabinet A",
    "notary_cost": 0,
    "notary_cash_entry_id": null,
    "scan_document_id": null,
    "updated_at": "2026-10-03T15:00:00+05:30",
    "created_at": "2026-10-03T15:00:00+05:30"
  },
  {
    "id": "phd_0003",
    "project_code_id": "pc_KVU03",
    "project_code": "KVU03",
    "document": "Form 26 / POA",
    "doc_name": "Form 26 / POA",
    "original_or_copy": "ORIGINAL",
    "doc_nature": "ORIGINAL",
    "status": "REQUESTED_FROM_CLIENT",
    "pages": null,
    "pages_count": 1,
    "copies_count": 1,
    "current_location": "Office Cabinet A",
    "notary_cost": 0,
    "notary_cash_entry_id": null,
    "scan_document_id": null,
    "updated_at": "2026-10-03T15:00:00+05:30",
    "created_at": "2026-10-03T15:00:00+05:30"
  },
  {
    "id": "phd_0004",
    "project_code_id": "pc_KVU01",
    "project_code": "KVU01",
    "document": "Form 26 / POA (notarised copy)",
    "doc_name": "Form 26 / POA (notarised copy)",
    "original_or_copy": "COPY",
    "doc_nature": "COPY",
    "status": "SENT_FOR_NOTARY",
    "pages": null,
    "pages_count": 1,
    "copies_count": 1,
    "current_location": "Office Cabinet A",
    "notary_cost": 0,
    "notary_cash_entry_id": null,
    "scan_document_id": null,
    "updated_at": "2026-10-03T15:00:00+05:30",
    "created_at": "2026-10-03T15:00:00+05:30"
  },
  {
    "id": "phd_0005",
    "project_code_id": "pc_TBI04",
    "project_code": "TBI04",
    "document": "NOC from inventors",
    "doc_name": "NOC from inventors",
    "original_or_copy": "ORIGINAL",
    "doc_nature": "ORIGINAL",
    "status": "SENT_FOR_NOTARY",
    "pages": null,
    "pages_count": 1,
    "copies_count": 1,
    "current_location": "Office Cabinet A",
    "notary_cost": 0,
    "notary_cash_entry_id": null,
    "scan_document_id": null,
    "updated_at": "2026-10-03T15:00:00+05:30",
    "created_at": "2026-10-03T15:00:00+05:30"
  },
  {
    "id": "phd_0006",
    "project_code_id": "pc_AGR5001",
    "project_code": "AGR5001",
    "document": "Licence agreement — stamp paper",
    "doc_name": "Licence agreement — stamp paper",
    "original_or_copy": "ORIGINAL",
    "doc_nature": "ORIGINAL",
    "status": "RECEIVED",
    "pages": null,
    "pages_count": 1,
    "copies_count": 1,
    "current_location": "Office Cabinet A",
    "notary_cost": 0,
    "notary_cash_entry_id": null,
    "scan_document_id": null,
    "updated_at": "2026-10-03T15:00:00+05:30",
    "created_at": "2026-10-03T15:00:00+05:30"
  },
  {
    "id": "phd_0007",
    "project_code_id": "pc_CR5006",
    "project_code": "CR5006",
    "document": "Author declaration",
    "doc_name": "Author declaration",
    "original_or_copy": "ORIGINAL",
    "doc_nature": "ORIGINAL",
    "status": "NOTARIZED",
    "pages": null,
    "pages_count": 1,
    "copies_count": 1,
    "current_location": "Office Cabinet A",
    "notary_cost": 0,
    "notary_cash_entry_id": null,
    "scan_document_id": null,
    "updated_at": "2026-10-03T15:00:00+05:30",
    "created_at": "2026-10-03T15:00:00+05:30"
  }
];
export const SEED_CUSTODY_ITEMS    = [
  {
    "id": "cust_dsc1",
    "item": "DSC token — Managing Partner",
    "item_name": "DSC token — Managing Partner",
    "identifier": "cust_dsc1",
    "type": "DSC",
    "item_type": "DSC",
    "status": "CHECKED_OUT",
    "current_holder_id": "u_ops",
    "current_holder_name": "Ops & Systems Admin",
    "checked_out_at": "2026-10-05T09:30:00+05:30",
    "expected_return": "2026-10-05T19:00:00+05:30"
  },
  {
    "id": "cust_dsc2",
    "item": "DSC token — Operations Partner",
    "item_name": "DSC token — Operations Partner",
    "identifier": "cust_dsc2",
    "type": "DSC",
    "item_type": "DSC",
    "status": "AVAILABLE",
    "current_holder_id": null,
    "current_holder_name": null,
    "checked_out_at": null,
    "expected_return": null
  },
  {
    "id": "cust_phone",
    "item": "Office phone (OTP)",
    "item_name": "Office phone (OTP)",
    "identifier": "cust_phone",
    "type": "PHONE",
    "item_type": "PHONE",
    "status": "CHECKED_OUT",
    "current_holder_id": "u_pa2",
    "current_holder_name": "Paralegal B",
    "checked_out_at": "2026-10-05T09:40:00+05:30",
    "expected_return": "2026-10-05T19:00:00+05:30"
  }
];
export const SEED_CUSTODY_LOG      = [
  {
    "id": "cl_0001",
    "custody_item_id": "cust_dsc1",
    "holder_user_id": "u_ops",
    "holder_id": "u_ops",
    "holder_name": "Ops & Systems Admin",
    "out_at": "2026-10-05T09:30:00+05:30",
    "expected_return": "2026-10-05T19:00:00+05:30",
    "in_at": null
  },
  {
    "id": "cl_0002",
    "custody_item_id": "cust_phone",
    "holder_user_id": "u_pa2",
    "holder_id": "u_pa2",
    "holder_name": "Paralegal B",
    "out_at": "2026-10-05T09:40:00+05:30",
    "expected_return": "2026-10-05T19:00:00+05:30",
    "in_at": null
  },
  {
    "id": "cl_0003",
    "custody_item_id": "cust_dsc1",
    "holder_user_id": "u_ops",
    "holder_id": "u_ops",
    "holder_name": "Ops & Systems Admin",
    "out_at": "2026-10-03T09:30:00+05:30",
    "expected_return": "2026-10-03T19:00:00+05:30",
    "in_at": "2026-10-03T21:05:00+05:30"
  },
  {
    "id": "cl_0004",
    "custody_item_id": "cust_dsc2",
    "holder_user_id": "u_sa2",
    "holder_id": "u_sa2",
    "holder_name": "Operations Partner",
    "out_at": "2026-09-20T10:00:00+05:30",
    "expected_return": "2026-09-20T18:00:00+05:30",
    "in_at": "2026-09-20T17:00:00+05:30"
  }
];
export const SEED_OFFICE_REQUESTS  = [
  {
    "id": "or_0001",
    "project_code_id": "pc_TBI04",
    "project_code": "TBI04",
    "requested_by": "u_pa1",
    "requested_by_id": "u_pa1",
    "requested_by_name": "Paralegal A",
    "requested_by_role": "PARALEGAL",
    "title": "Get NOC from inventors notarised (2 copies)",
    "category": "GENERAL",
    "description": "Get NOC from inventors notarised (2 copies)",
    "priority": "HIGH",
    "due_date": "2026-10-05",
    "needed_by": "2026-10-05",
    "status": "IN_PROGRESS",
    "accepted_by": "u_oe",
    "accepted_by_name": "Office Executive",
    "completed_links": [],
    "request_type": "ERRAND",
    "created_at": "2026-10-04T12:00:00+05:30"
  },
  {
    "id": "or_0002",
    "project_code_id": "pc_AGR5001",
    "project_code": "AGR5001",
    "requested_by": "u_agr",
    "requested_by_id": "u_agr",
    "requested_by_name": "Agreements Associate",
    "requested_by_role": "DEPT_ADMIN",
    "title": "Buy ₹100 stamp paper for licence agreement",
    "category": "GENERAL",
    "description": "Buy ₹100 stamp paper for licence agreement",
    "priority": "NORMAL",
    "due_date": "2026-09-16",
    "needed_by": "2026-09-16",
    "status": "DONE",
    "accepted_by": "u_oe",
    "accepted_by_name": "Office Executive",
    "completed_links": [],
    "request_type": "ERRAND",
    "created_at": "2026-09-15T12:00:00+05:30"
  },
  {
    "id": "or_0003",
    "project_code_id": "pc_AR5006",
    "project_code": "AR5006",
    "requested_by": "u_pl1",
    "requested_by_id": "u_pl1",
    "requested_by_name": "Patent Co-lead A",
    "requested_by_role": "DEPT_ADMIN",
    "title": "Courier signed Form 1 & POA pack to Orbitron (c...",
    "category": "GENERAL",
    "description": "Courier signed Form 1 & POA pack to Orbitron (corrected address)",
    "priority": "NORMAL",
    "due_date": "2026-09-30",
    "needed_by": "2026-09-30",
    "status": "DONE",
    "accepted_by": "u_oe",
    "accepted_by_name": "Office Executive",
    "completed_links": [],
    "request_type": "ERRAND",
    "created_at": "2026-09-29T12:00:00+05:30"
  },
  {
    "id": "or_0004",
    "project_code_id": "pc_KVU03",
    "project_code": "KVU03",
    "requested_by": "u_pa2",
    "requested_by_id": "u_pa2",
    "requested_by_name": "Paralegal B",
    "requested_by_role": "PARALEGAL",
    "title": "Follow up on Form 26 registered post — not deli...",
    "category": "GENERAL",
    "description": "Follow up on Form 26 registered post — not delivered after 13 days",
    "priority": "HIGH",
    "due_date": "2026-10-05",
    "needed_by": "2026-10-05",
    "status": "OPEN",
    "accepted_by": null,
    "accepted_by_name": null,
    "completed_links": [],
    "request_type": "ERRAND",
    "created_at": "2026-10-04T12:00:00+05:30"
  },
  {
    "id": "or_0005",
    "project_code_id": "pc_CR5007",
    "project_code": "CR5007",
    "requested_by": "u_sip",
    "requested_by_id": "u_sip",
    "requested_by_name": "Soft IP Associate",
    "requested_by_role": "PARALEGAL",
    "title": "Notarise 14 copyright author declarations",
    "category": "GENERAL",
    "description": "Notarise 14 copyright author declarations",
    "priority": "NORMAL",
    "due_date": "2026-10-06",
    "needed_by": "2026-10-06",
    "status": "OPEN",
    "accepted_by": null,
    "accepted_by_name": null,
    "completed_links": [],
    "request_type": "ERRAND",
    "created_at": "2026-10-05T12:00:00+05:30"
  }
];
export const SEED_SCANS            = [
  {
    "id": "scan_doc_0040",
    "dispatch_id": "dsp_0011",
    "kind": "BOOKING_RECEIPT",
    "document_id": "doc_0040",
    "file_name": "lit_notice_booking_receipt.pdf",
    "created_at": "2026-09-18T13:00:00+05:30"
  },
  {
    "id": "scan_doc_0041",
    "dispatch_id": "dsp_0011",
    "kind": "DOCUMENT_COPY",
    "document_id": "doc_0041",
    "file_name": "lit_notice_document_copy.pdf",
    "created_at": "2026-09-18T13:00:00+05:30"
  },
  {
    "id": "scan_doc_0042",
    "dispatch_id": "dsp_0011",
    "kind": "PROOF_OF_DELIVERY",
    "document_id": "doc_0042",
    "file_name": "lit_notice_proof_of_delivery.pdf",
    "created_at": "2026-09-18T13:00:00+05:30"
  },
  {
    "id": "scan_doc_0043",
    "dispatch_id": "dsp_0011",
    "kind": "TRACKING_HISTORY",
    "document_id": "doc_0043",
    "file_name": "lit_notice_tracking_history.pdf",
    "created_at": "2026-09-18T13:00:00+05:30"
  },
  {
    "id": "scan_doc_0044",
    "dispatch_id": "dsp_0001",
    "kind": "BOOKING_RECEIPT",
    "document_id": "doc_0044",
    "file_name": "cr_sep1_booking_receipt.pdf",
    "created_at": "2026-09-18T13:00:00+05:30"
  },
  {
    "id": "scan_doc_0045",
    "dispatch_id": "dsp_0012",
    "kind": "BOOKING_RECEIPT",
    "document_id": "doc_0045",
    "file_name": "tbi04_form1_booking_receipt.pdf",
    "created_at": "2026-09-18T13:00:00+05:30"
  }
];
