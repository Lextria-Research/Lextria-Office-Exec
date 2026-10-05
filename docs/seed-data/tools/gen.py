import json, re, os, datetime as dt, csv, copy
D = dt.date
TODAY = D(2026,10,5)
def iso(d): return d.isoformat() if d else None
def ts(d, h=10, m=0): return dt.datetime(d.year,d.month,d.day,h,m).isoformat()+"+05:30"
DB = {}
def T(name): return DB.setdefault(name, [])
_seq = {}
def nid(prefix):
    _seq[prefix] = _seq.get(prefix,0)+1
    return f"{prefix}_{_seq[prefix]:04d}"

# ---------------- settings ----------------
DB["demo_settings"] = [{
  "demo_today": iso(TODAY), "timezone": "Asia/Kolkata", "currency": "INR",
  "gst_rate_percent": 18, "petty_cash_low_balance_threshold": 300,
  "esign_reminder_after_days": 5, "approval_reminder_days": [3,7],
  "post_pending_followup_days": 7, "invoice_mismatch_tolerance": 1,
  "review_buffer_working_days": {"FINAL_APPROVAL":3, "EXTERNAL_REVIEW":7, "CO_LEAD_REVIEW":10},
  "review_sla_days": {"CO_LEAD_REVIEW":7, "EXTERNAL_REVIEW":10, "FINAL_APPROVAL":3},
  "stage_due_rule": "stage_due_date = min(assigned_at + review_sla_days[stage], statutory_deadline - review_buffer_working_days[stage])",
  "renewal_reminder_days": [90,60,30],
  "review_score": {"counted_return_reasons":["DRAFTER_QUALITY"],"points_per_counted_return":1.0,"extra_points_per_comment":{"CRITICAL":1.0,"MAJOR":0.5,"MINOR":0.0},
                   "window":"last 10 drafts with at least one decided review round","lower_is_better":True,
                   "note":"Illustrative weights — DEPT_ADMIN/SUPER_ADMIN can change. Returns tagged CLIENT_INPUT_CHANGE or REVIEWER_PREFERENCE are not counted."},
  "note": "All people, clients, addresses, phone numbers, application numbers and amounts are fictional. Domain lextria-demo.test is non-routable."
}]

# ---------------- users ----------------
users = [
 ("u_sa1","Managing Partner","SUPER_ADMIN","MANAGEMENT",None,True,0),
 ("u_sa2","Operations Partner","SUPER_ADMIN","MANAGEMENT",None,True,0),
 ("u_pl1","Patent Co-lead A","DEPT_ADMIN","IP_PATENT","u_sa1",True,20),
 ("u_pl2","Patent Co-lead B","DEPT_ADMIN","IP_PATENT","u_sa1",True,20),
 ("u_dr1","Drafter A","DRAFTER","IP_PATENT","u_pl1",True,15),
 ("u_dr2","Drafter B","DRAFTER","IP_PATENT","u_pl1",True,15),
 ("u_dr3","Drafter C","DRAFTER","IP_PATENT","u_pl2",True,15),
 ("u_dr4","Drafter D (left firm)","DRAFTER","IP_PATENT","u_pl2",False,0),
 ("u_ext","External Senior Reviewer","EXTERNAL_REVIEWER","IP_PATENT","u_sa1",True,10),
 ("u_ph","Paralegal Head","DEPT_ADMIN","PARALEGAL","u_sa2",True,15),
 ("u_pa1","Paralegal A","PARALEGAL","PARALEGAL","u_ph",True,12),
 ("u_pa2","Paralegal B","PARALEGAL","PARALEGAL","u_ph",True,12),
 ("u_ops","Ops & Systems Admin","PARALEGAL","PARALEGAL","u_sa2",True,10),
 ("u_int1","Filing Intern","INTERN","PARALEGAL","u_ph",True,8),
 ("u_dm","IP Data Manager","PARALEGAL","IP_PATENT","u_ph",True,12),
 ("u_fl","Finance Lead","FINANCE","FINANCE","u_sa2",True,0),
 ("u_fe1","Finance Exec 1","FINANCE","FINANCE","u_fl",True,0),
 ("u_fe2","Finance Exec 2","FINANCE","FINANCE","u_fl",True,0),
 ("u_sl","Soft IP Lead","DEPT_ADMIN","IP_SOFT","u_sa1",True,15),
 ("u_sip","Soft IP Associate","PARALEGAL","IP_SOFT","u_sl",True,12),
 ("u_lit","Litigation Associate","DEPT_ADMIN","LITIGATION","u_sa1",True,12),
 ("u_agr","Agreements Associate","DEPT_ADMIN","AGREEMENT","u_sa1",True,12),
 ("u_int2","Legal Intern","INTERN","LITIGATION","u_lit",True,8),
 ("u_oe","Office Executive","OFFICE_EXEC","OFFICE","u_sa2",True,0),
]
for u in users:
    T("users").append({"id":u[0],"display_name":u[1],"email":u[0].replace("u_","")+"@lextria-demo.test",
        "role":u[2],"department":u[3],"reports_to":u[4],"active":u[5],"weekly_capacity_points":u[6]})
UIDS = {u[0] for u in users}

# ---------------- prefixes ----------------
for p,dep,cl,desc,ex in [
 ("AR","IP_PATENT",None,"Firm general patent series","AR5001"),
 ("TBI","IP_PATENT","cli_1001","Tungabhadra Institute patent series","TBI01"),
 ("KVU","IP_PATENT","cli_1002","Kaveri Vidya University patent series","KVU01"),
 ("TM","IP_SOFT",None,"Trademark series","TM5001"),
 ("CR","IP_SOFT",None,"Copyright series","CR5001"),
 ("DS","IP_SOFT",None,"Design series","DS5001"),
 ("LIT","LITIGATION",None,"Litigation series","LIT5001"),
 ("AGR","AGREEMENT",None,"Agreements series","AGR5001"),
 ("MISC","MISC_VENDOR",None,"Vendor-handled miscellaneous work","MISC5001")]:
    T("prefix_registry").append({"prefix":p,"department":dep,"client_id":cl,"description":desc,"example":ex,"active":True})

# ---------------- organizations / clients / persons ----------------
orgs = [
 ("org_01","Tungabhadra Institute of Technology","EDUCATIONAL_INSTITUTION","Survey No. 12, Riverside Campus, Hosapete, Karnataka","583201","29AAATT0001A1Z1","EDUCATIONAL_INSTITUTION"),
 ("org_02","Kaveri Vidya University","EDUCATIONAL_INSTITUTION","University Road, Srirangapatna, Karnataka","571438","29AAATK0002B1Z2","EDUCATIONAL_INSTITUTION"),
 ("org_03","Nimbus Agritech Private Limited","STARTUP","2nd Floor, 14 Lakeview Layout, Bengaluru, Karnataka","560102","29AAFCN0003C1Z3","STARTUP"),
 ("org_05","Coastal Spice Traders LLP","SMALL_ENTITY","Door 7-21, Bunder Road, Mangaluru, Karnataka","575001","29AAKFC0005E1Z5","SMALL_ENTITY"),
 ("org_06","Hemadri Biotech Private Limited","LARGE_ENTITY","Plot 44, Biotech Park Phase 2, Dharwad, Karnataka","580011","29AABCH0006F1Z6","OTHERS"),
 ("org_07","Orbitron Robotics LLP","STARTUP","Unit 3, Old Port Industrial Estate, Udupi, Karnataka","576101","29AAKFO0007G1Z7","STARTUP"),
]
for o in orgs:
    T("organizations").append({"id":o[0],"name":o[1],"type":o[2],"address":o[3],"pin":o[4],"gstin":o[5],"applicant_fee_category":o[6]})

def sanitize(s):
    s = re.sub(r'[\/\\:\*\?"<>\|]', '', s); s = re.sub(r'\s+',' ',s).strip(); return s[:100]
clients = [
 ("cli_1001","CLI-1001","Tungabhadra Institute of Technology","EDUCATIONAL_INSTITUTION","org_01","ipr.cell@tbi-demo.test","+91 00000 10001"),
 ("cli_1002","CLI-1002","Kaveri Vidya University","EDUCATIONAL_INSTITUTION","org_02","ipr@kvu-demo.test","+91 00000 10002"),
 ("cli_1003","CLI-1003","Nimbus Agritech Pvt Ltd","STARTUP","org_03","legal@nimbus-demo.test","+91 00000 10003"),
 ("cli_1004","CLI-1004","Dr. Meera Kulkarni","NATURAL_PERSON",None,"meera.k@mail-demo.test","+91 00000 10004"),
 ("cli_1005","CLI-1005","Coastal Spice Traders LLP","SMALL_ENTITY","org_05","partners@coastalspice-demo.test","+91 00000 10005"),
 ("cli_1006","CLI-1006","Hemadri Biotech Pvt Ltd","LARGE_ENTITY","org_06","ip@hemadri-demo.test","+91 00000 10006"),
 ("cli_1007","CLI-1007","Orbitron Robotics LLP","STARTUP","org_07","founders@orbitron-demo.test","+91 00000 10007"),
]
CLI = {}
for i,c in enumerate(clients):
    path = f"WorkDrive Root/{c[1]} - {sanitize(c[2])}"
    rec = {"id":c[0],"client_code":c[1],"client_name":c[2],"entity_type":c[3],"organization_id":c[4],
      "email":c[5],"phone":c[6],"gstin":(next(o for o in orgs if o[0]==c[4])[5] if c[4] else None),
      "billing_address":(next(o for o in orgs if o[0]==c[4])[3] if c[4] else "House 18, 4th Cross, Kunjibettu, Udupi, Karnataka 576102"),
      "primary_contact_person_id":None,"workdrive_folder_id":f"wd_cli_{c[1][-4:]}","workdrive_folder_path":path,"created_at":ts(D(2024,4+i%6,3))}
    T("clients").append(rec); CLI[c[0]] = rec

persons = [
 # id, name, relation, address, pin, nationality, residence, email, phone, org, designation
 ("per_01","Dr. Arvind Hegde","S/o Ramachandra Hegde","Staff Quarters 4, TBI Campus, Hosapete","583201","Indian","India","arvind.h@tbi-demo.test","+91 00010 00001","org_01","Professor, Mechanical"),
 ("per_02","Ms. Shruti Nayak","D/o Prakash Nayak","12 Temple Street, Hosapete","583201","Indian","India","shruti.n@tbi-demo.test","+91 00010 00002","org_01","Research Scholar"),
 ("per_03","Mr. Kiran Bhandary","S/o Vasanth Bhandary","45 Station Road, Ballari","583101","Indian","India","kiran.b@tbi-demo.test","+91 00010 00003","org_01","Assistant Professor, EEE"),
 ("per_04","Dr. Lakshmi Iyer","D/o S. Iyer","8 Lake Road, Mysuru","570001","Indian","India","lakshmi.i@kvu-demo.test","+91 00010 00004","org_02","Professor, Computer Science"),
 ("per_05","Mr. Rohan D'Costa","S/o Peter D'Costa","22 Church Lane, Mandya","571401","Indian","India","rohan.d@kvu-demo.test","+91 00010 00005","org_02","Research Scholar"),
 ("per_06","Dr. Farah Siddiqui","D/o Anwar Siddiqui","3 Green Avenue, Mysuru","570012","Indian","United Arab Emirates","farah.s@kvu-demo.test","+91 00010 00006","org_02","Visiting Faculty"),
 ("per_07","Mr. Varun Shetty","S/o Mohan Shetty","Flat 9B, Lakeview Residency, Bengaluru","560102","Indian","India","varun@nimbus-demo.test","+91 00010 00007","org_03","Co-founder & CTO"),
 ("per_08","Ms. Neha Rao","D/o Suresh Rao","Flat 2A, Palm Grove, Bengaluru","560034","Indian","India","neha@nimbus-demo.test","+91 00010 00008","org_03","Co-founder & CEO"),
 ("per_09","Dr. Meera Kulkarni","W/o Anil Kulkarni","House 18, 4th Cross, Kunjibettu, Udupi","576102","Indian","India","meera.k@mail-demo.test","+91 00000 10004",None,"Independent Inventor"),
 ("per_10","Mr. Abdul Rahim","S/o Kareem","Door 7-21, Bunder Road, Mangaluru","575001","Indian","India","rahim@coastalspice-demo.test","+91 00010 00010","org_05","Designated Partner"),
 ("per_11","Ms. Priya Kamath","D/o Gopal Kamath","14 Hill View, Mangaluru","575003","Indian","India","priya@coastalspice-demo.test","+91 00010 00011","org_05","Designated Partner"),
 ("per_12","Dr. Sameer Joshi","S/o Vinod Joshi","Plot 44, Biotech Park, Dharwad","580011","Indian","India","sameer.j@hemadri-demo.test","+91 00010 00012","org_06","Head of R&D"),
 ("per_13","Ms. Ananya Pai","D/o Raghavendra Pai","Unit 3, Old Port Estate, Udupi","576101","Indian","India","ananya@orbitron-demo.test","+91 00010 00013","org_07","Designated Partner"),
 ("per_14","Mr. Deepak Gowda","S/o Ningappa Gowda","Unit 3, Old Port Estate, Udupi","576101","Indian","India","deepak@orbitron-demo.test","+91 00010 00014","org_07","Designated Partner"),
 ("per_15","Mr. Kiran Bhandari","S/o Vasant Bhandari","45, Station Rd, Ballari","583101","Indian","India","kiran.bhandari@mail-demo.test","+91 00010 00003",None,"(possible duplicate of per_03)"),
]
for p in persons:
    T("persons").append({"id":p[0],"full_name":p[1],"relation_name":p[2],"address":p[3],"pin":p[4],"nationality":p[5],
       "country_of_residence":p[6],"email":p[7],"phone":p[8],"affiliation_org_id":p[9],"designation":p[10],
       "duplicate_candidate_of":"per_03" if p[0]=="per_15" else None})
for cid,pid in [("cli_1001","per_01"),("cli_1002","per_04"),("cli_1003","per_08"),("cli_1004","per_09"),("cli_1005","per_10"),("cli_1006","per_12"),("cli_1007","per_13")]:
    CLI[cid]["primary_contact_person_id"]=pid

# ---------------- project codes ----------------
CATS = ["IDF & Client Docs","Drafts","Final Filed","Forms","ACKs","Office Actions","Responses & Submissions","Hearings","Certificates","Correspondence","Postal & Courier","Engagement & Finance"]
PC = {}
def pc(code, dep, cli, title, spoc, lead, created, status="ACTIVE", dup=None):
    norm = re.sub(r'\s+','',code).upper()
    m = re.match(r'([A-Z]+)(\d+)', norm)
    pid = "pc_"+norm
    path = f"{CLI[cli]['workdrive_folder_path']}/{code}"
    rec = {"id":pid,"code":code,"code_normalized":norm,"prefix":m.group(1),"number":int(m.group(2)),"department":dep,
      "client_id":cli,"title":title,"status":status,"spoc_user_id":spoc,"lead_assignee_id":lead,
      "workdrive_folder_id":"wd_"+norm.lower(),"workdrive_path":path,
      "category_folder_ids":{c:f"wd_{norm.lower()}_{i:02d}" for i,c in enumerate(CATS)},
      "created_by":"u_dm" if dep in("IP_PATENT",) else "u_sa2","created_at":ts(created),"possible_duplicate_of":dup}
    T("project_codes").append(rec); PC[norm]=rec
    T("code_issuance_log").append({"id":nid("cil"),"code":code,"project_code_id":pid,"issued_to":lead,"issued_by":"u_ph" if dep=="IP_PATENT" else "u_sa2","issued_at":ts(created,11),"purpose":title})
    T("timeline_events").append({"id":nid("tl"),"project_code_id":pid,"event_type":"MATTER_OPENED","title":"Matter opened","detail":title,"occurred_at":ts(created,11),"actor_user_id":rec["created_by"],"client_visible":True,"client_label":"Engagement started"})
    return pid

# Patents
pc("TBI01","IP_PATENT","cli_1001","Low-power soil moisture sensing node with self-calibration","u_pl1","u_dr1",D(2025,10,10))
pc("TBI02","IP_PATENT","cli_1001","Bamboo-fibre composite brake pad","u_pl1","u_dr2",D(2026,8,20))
pc("TBI03","IP_PATENT","cli_1001","Grid-tied inverter islanding detection method","u_pl2","u_dr3",D(2024,9,2))
pc("TBI04","IP_PATENT","cli_1001","Portable water turbidity analyser using smartphone camera","u_pl1","u_dr2",D(2026,7,1))
pc("KVU01","IP_PATENT","cli_1002","Federated learning scheduler for edge classrooms","u_pl2","u_dr1",D(2025,12,1))
pc("KVU02","IP_PATENT","cli_1002","Herbal-free enzymatic dye extraction process","u_pl2","u_dr3",D(2025,10,8))
pc("KVU03","IP_PATENT","cli_1002","Multilingual speech-to-sign avatar system","u_pl1","u_dr1",D(2025,6,12))
pc("AR5001","IP_PATENT","cli_1003","Drip irrigation emitter with clog-sensing membrane","u_pl1","u_dr2",D(2023,11,15))
pc("AR5002","IP_PATENT","cli_1004","Ergonomic laparoscopic instrument handle","u_pl2","u_dr3",D(2026,3,4))
pc("AR5003","IP_PATENT","cli_1006","Thermostable lipase variant for biodiesel","u_pl2","u_dr1",D(2019,2,20))
pc("AR5004","IP_PATENT","cli_1006","Microbial consortium for effluent decolourisation","u_pl2","u_dr1",D(2017,10,25))
pc("AR5005","IP_PATENT","cli_1006","Enzyme immobilisation on chitosan beads","u_pl2","u_dr3",D(2016,7,10))
pc("AR5006","IP_PATENT","cli_1007","Autonomous hull-cleaning crawler","u_pl1","u_dr1",D(2026,9,20))
pc("AR5010","IP_PATENT","cli_1004","Laparoscopic instrument handle (ergonomic)","u_pl2","u_dr3",D(2026,3,6),status="DUPLICATE_REVIEW",dup="pc_AR5002")
# Soft IP
pc("TM5001","IP_SOFT","cli_1003","Trademark NIMBUSROOT — Class 31","u_sl","u_sip",D(2025,11,3))
pc("TM5002","IP_SOFT","cli_1005","Trademark SAGARGANDHA — Class 30","u_sl","u_sl",D(2025,5,14))
pc("TM5003","IP_SOFT","cli_1005","Trademark COASTAL SPICE (device) — Class 30","u_sl","u_sl",D(2019,1,10))
pc("TM5004","IP_SOFT","cli_1007","Trademark ORBITRON — Classes 7, 9","u_sl","u_sip",D(2026,9,22))
for i in range(1,11):
    pc(f"CR50{i:02d}","IP_SOFT","cli_1002",f"Copyright — KVU course software module {i}","u_sip","u_sip",D(2026,9,1)+dt.timedelta(days=i))
pc("CR5011","IP_SOFT","cli_1004","Copyright — 'Surgical Ergonomics' illustrated handbook","u_sip","u_sip",D(2026,4,2))
pc("DS5001","IP_SOFT","cli_1005","Design — spice jar with pour spout","u_sl","u_sip",D(2026,6,18))
pc("DS5002","IP_SOFT","cli_1003","Design — emitter housing","u_sl","u_sl",D(2024,10,1))
# Litigation / Agreements / Misc
pc("LIT5001","LITIGATION","cli_1003","Nimbus Agritech v. Greenfield Agro Tools — patent infringement","u_lit","u_lit",D(2026,5,12))
pc("LIT5002","LITIGATION","cli_1005","Coastal Spice Traders v. Sagar Masala Co. — TM infringement & passing off","u_lit","u_lit",D(2026,8,4))
pc("AGR5001","AGREEMENT","cli_1006","Patent licence — Hemadri to Vardhan Bioprocess","u_agr","u_agr",D(2026,8,25))
pc("AGR5002","AGREEMENT","cli_1003","Mutual NDA — Nimbus & field-trial partner","u_agr","u_int2",D(2026,6,2),status="COMPLETED")
pc("AGR5003","AGREEMENT","cli_1007","IP assignment — founders to Orbitron Robotics LLP","u_agr","u_agr",D(2026,9,21))
pc("MISC5001","MISC_VENDOR","cli_1005","GST registration amendment (new branch)","u_fe1","u_fe1",D(2026,9,10))
pc("MISC5002","MISC_VENDOR","cli_1006","ROC annual filing FY 2025-26 (AOC-4, MGT-7)","u_fe1","u_fe2",D(2026,9,15))
pc("MISC5003","MISC_VENDOR","cli_1007","Designated partner KYC filing","u_fe2","u_fe2",D(2026,9,1))

def P(code): return PC[code]["id"]
def alias(code, t, v, d):
    T("project_aliases").append({"id":nid("al"),"project_code_id":P(code),"alias_type":t,"alias_value":v,"valid_from":iso(d)})

# ---------------- patent matters ----------------
def patent(code, **k):
    base = dict(id="mp_"+code, project_code_id=P(code), patent_type=None, current_status=None, temp_code=None, application_no=None,
      ps_filing_date=None, cs_filing_date=None, cs_due_date=None, publication_date=None, journal_no=None, rfe_filed_date=None,
      fer_issued_date=None, fer_response_due=None, hearing_date=None, grant_date=None, patent_number=None,
      recorded_in_register_date=None, term_end=None, applicant_org_id=None, applicant_person_id=None)
    for kk,v in k.items(): base[kk] = iso(v) if isinstance(v,D) else v
    T("matter_patents").append(base); return base
patent("TBI01",patent_type="PS_TO_CS",current_status="PS_FILED",temp_code="TBI01",application_no="202641000101",ps_filing_date=D(2025,11,20),cs_due_date=D(2026,11,20),applicant_org_id="org_01")
alias("TBI01","PATENT_APP_NO","202641000101",D(2025,11,20))
patent("TBI02",patent_type="PS_ONLY",current_status="PS_DRAFTING",temp_code="TBI02",applicant_org_id="org_01")
alias("TBI02","TEMP_CODE","TBI02",D(2026,8,20))
patent("TBI03",patent_type="CS_ONLY",current_status="FER_RESPONSE_DRAFTING",application_no="202441000303",cs_filing_date=D(2024,10,15),publication_date=D(2024,11,22),journal_no="47/2024",rfe_filed_date=D(2024,10,15),fer_issued_date=D(2026,7,20),fer_response_due=D(2027,1,20),applicant_org_id="org_01")
alias("TBI03","PATENT_APP_NO","202441000303",D(2024,10,15))
patent("TBI04",patent_type="CS_ONLY",current_status="CS_DRAFTING",temp_code="TBI04",applicant_org_id="org_01")
alias("TBI04","TEMP_CODE","TBI04",D(2026,7,1))
patent("KVU01",patent_type="PS_TO_CS",current_status="CS_FILED",application_no="202641000201",ps_filing_date=D(2025,12,15),cs_filing_date=D(2026,9,25),applicant_org_id="org_02")
alias("KVU01","PATENT_APP_NO","202641000201",D(2025,12,15))
patent("KVU02",patent_type="PS_TO_CS",current_status="CS_DRAFTING",application_no="202541000202",ps_filing_date=D(2025,10,5),cs_due_date=D(2026,10,5),applicant_org_id="org_02")
alias("KVU02","PATENT_APP_NO","202541000202",D(2025,10,5))
patent("KVU03",patent_type="CS_ONLY",current_status="CS_FILED",application_no="202541000203",cs_filing_date=D(2025,7,1),publication_date=D(2025,8,8),journal_no="32/2025",applicant_org_id="org_02")
alias("KVU03","PATENT_APP_NO","202541000203",D(2025,7,1))
patent("AR5001",patent_type="PS_TO_CS",current_status="HEARING_SCHEDULED",application_no="202341000501",ps_filing_date=D(2023,12,1),cs_filing_date=D(2024,11,28),publication_date=D(2024,12,20),journal_no="51/2024",rfe_filed_date=D(2024,11,28),fer_issued_date=D(2025,9,10),fer_response_due=D(2026,3,10),hearing_date=D(2026,10,14),applicant_org_id="org_03")
alias("AR5001","PATENT_APP_NO","202341000501",D(2023,12,1))
patent("AR5002",patent_type="PS_ONLY",current_status="PS_FILED",application_no="202641000502",ps_filing_date=D(2026,3,30),cs_due_date=D(2027,3,30),applicant_person_id="per_09")
alias("AR5002","PATENT_APP_NO","202641000502",D(2026,3,30))
patent("AR5010",patent_type="PS_ONLY",current_status="PS_DRAFTING",temp_code="AR5010",applicant_person_id="per_09")
patent("AR5003",patent_type="CS_ONLY",current_status="GRANTED",application_no="201941000503",cs_filing_date=D(2019,3,15),grant_date=D(2024,5,20),recorded_in_register_date=D(2024,5,20),patent_number="IN 512345",term_end=D(2039,3,15),applicant_org_id="org_06")
alias("AR5003","PATENT_APP_NO","201941000503",D(2019,3,15))
patent("AR5004",patent_type="CS_ONLY",current_status="GRANTED",application_no="201741000504",cs_filing_date=D(2017,11,2),grant_date=D(2022,1,12),recorded_in_register_date=D(2022,1,12),patent_number="IN 387654",term_end=D(2037,11,2),applicant_org_id="org_06")
alias("AR5004","PATENT_APP_NO","201741000504",D(2017,11,2))
patent("AR5005",patent_type="CS_ONLY",current_status="GRANTED",application_no="201641000505",cs_filing_date=D(2016,8,1),grant_date=D(2021,3,3),recorded_in_register_date=D(2021,3,3),patent_number="IN 360001",term_end=D(2036,8,1),applicant_org_id="org_06")
alias("AR5005","PATENT_APP_NO","201641000505",D(2016,8,1))
patent("AR5006",patent_type="PS_TO_CS",current_status="PS_DRAFTING",temp_code="AR5006",applicant_org_id="org_07")

# parties (inventors)
def party(code, pid=None, oid=None, role="INVENTOR", seq=None, src="IDF", vby=None, vat=None, locked=False, conflict=None):
    T("matter_parties").append({"id":nid("mpty"),"project_code_id":P(code),"person_id":pid,"organization_id":oid,"role":role,
      "sequence_no":seq,"affiliation_org_id":next((p[9] for p in persons if p[0]==pid),None) if pid else None,
      "verified_source":src,"verified_by":vby,"verified_at":vat,"locked":locked,"conflict":conflict})
for code,inv,lock in [("TBI01",["per_01","per_02"],True),("TBI03",["per_03"],True),("KVU01",["per_04","per_05","per_06"],True),
                      ("KVU02",["per_04","per_06"],True),("KVU03",["per_05"],True),("AR5001",["per_07"],True),("AR5002",["per_09"],True),
                      ("AR5003",["per_12"],True),("AR5004",["per_12"],True),("AR5005",["per_12"],True),("TBI02",["per_01"],False),("AR5006",["per_14","per_13"],False)]:
    for i,p in enumerate(inv): party(code,p,seq=i+1,src="SIGNED_FORM_1" if lock else "IDF",vby="u_pl1" if lock else None,vat=ts(D(2025,1,1)) if lock else None,locked=lock)
    org = {"TBI":"org_01","KVU":"org_02","AR5001":"org_03","AR5003":"org_06","AR5004":"org_06","AR5005":"org_06","AR5006":"org_07"}
    o = org.get(code[:3]) or org.get(code)
    if o: party(code,oid=o,role="APPLICANT",src="SIGNED_FORM_1" if lock else "IDF",locked=lock)
# TBI04 conflict scenario: IDF order vs signed Form 1 order differ
conflict = {"field":"sequence_no","IDF":["per_03","per_02"],"SIGNED_FORM_1":["per_02","per_03"],"status":"UNRESOLVED","raised_at":ts(D(2026,10,3),16)}
party("TBI04","per_03",seq=1,src="IDF",conflict=conflict); party("TBI04","per_02",seq=2,src="IDF",conflict=conflict)
party("TBI04",oid="org_01",role="APPLICANT",src="SIGNED_FORM_1",vby="u_pa1",vat=ts(D(2026,10,3)))
# KVU01 address conflict resolved
party("AR5002",pid="per_09",role="APPLICANT",src="SIGNED_FORM_1",vby="u_pl2",vat=ts(D(2026,3,28)),locked=True)

# ---------------- soft ip ----------------
def soft(code, **k):
    b = dict(id="ms_"+code, project_code_id=P(code), ip_type=None, subject=None, class_numbers=None, mark_type=None, application_no=None,
       diary_no=None, filing_date=None, statutory_status=None, next_action=None, next_action_due=None, registration_date=None, renewal_deadline=None)
    for kk,v in k.items(): b[kk]=iso(v) if isinstance(v,D) else v
    T("matter_soft_ip").append(b)
soft("TM5001",ip_type="TRADEMARK",subject="NIMBUSROOT",class_numbers="31",mark_type="WORD",application_no="7012345",filing_date=D(2025,11,10),statutory_status="OBJECTED",next_action="Reply to examination report",next_action_due=D(2026,10,28))
alias("TM5001","TM_APP_NO","7012345",D(2025,11,10))
soft("TM5002",ip_type="TRADEMARK",subject="SAGARGANDHA",class_numbers="30",mark_type="WORD",application_no="6950001",filing_date=D(2025,5,20),statutory_status="OPPOSED",next_action="File counter-statement",next_action_due=D(2026,11,2))
alias("TM5002","TM_APP_NO","6950001",D(2025,5,20))
soft("TM5003",ip_type="TRADEMARK",subject="COASTAL SPICE (device)",class_numbers="30",mark_type="DEVICE",application_no="4010001",filing_date=D(2019,1,15),statutory_status="REGISTERED",registration_date=D(2020,6,30),renewal_deadline=D(2029,1,15))
alias("TM5003","TM_APP_NO","4010001",D(2019,1,15))
soft("TM5004",ip_type="TRADEMARK",subject="ORBITRON",class_numbers="7, 9",mark_type="WORD",statutory_status="AWAITING_CLIENT_APPROVAL",next_action="Client to approve classes & specification")
crstat = ["REGISTERED","REGISTERED","SCRUTINY","SCRUTINY","DISCREPANCY_RAISED","FILED","FILED","FILED","FILED","FILED"]
for i in range(1,11):
    code=f"CR50{i:02d}"; fd = D(2026,9,3) if i<=5 else D(2026,10,3)
    if i<=2: fd = D(2026,5,10)
    diary=f"DY-2026-{18000+i}"
    soft(code,ip_type="COPYRIGHT",subject=f"Course software module {i} (computer programme)",diary_no=diary,filing_date=fd,statutory_status=crstat[i-1],
         registration_date=D(2026,9,20) if i<=2 else None,
         next_action=("Respond to discrepancy" if crstat[i-1]=="DISCREPANCY_RAISED" else None), next_action_due=(D(2026,10,30) if crstat[i-1]=="DISCREPANCY_RAISED" else None))
    alias(code,"CR_DIARY_NO",diary,fd)
soft("CR5011",ip_type="COPYRIGHT",subject="Surgical Ergonomics (literary/artistic)",diary_no="DY-2026-09001",filing_date=D(2026,4,20),statutory_status="SCRUTINY")
alias("CR5011","CR_DIARY_NO","DY-2026-09001",D(2026,4,20))
soft("DS5001",ip_type="DESIGN",subject="Spice jar with pour spout",class_numbers="07-01 (Locarno)",application_no="455001-001",filing_date=D(2026,7,2),statutory_status="UNDER_EXAMINATION")
alias("DS5001","DESIGN_APP_NO","455001-001",D(2026,7,2))
soft("DS5002",ip_type="DESIGN",subject="Emitter housing",class_numbers="23-01 (Locarno)",application_no="420002-001",filing_date=D(2024,10,20),statutory_status="REGISTERED",registration_date=D(2025,4,11),renewal_deadline=D(2034,10,20))
alias("DS5002","DESIGN_APP_NO","420002-001",D(2024,10,20))

# ---------------- litigation ----------------
T("matter_litigation").append({"id":"ml_LIT5001","project_code_id":P("LIT5001"),"cnr_number":"KABC010099992026","case_number":"COM.OS 1203/2026",
  "court_bench":"Commercial Court (fictional), Bengaluru — Court Hall 3","cause_title":"Nimbus Agritech Pvt Ltd v. Greenfield Agro Tools Pvt Ltd",
  "client_role":"PLAINTIFF","opposite_party":"Greenfield Agro Tools Pvt Ltd","current_stage":"INTERIM_APPLICATION_ARGUMENTS",
  "next_hearing_date":"2026-10-12","next_purpose":"Arguments on I.A. for interim injunction","ethical_wall_enabled":False,"ethical_wall_user_ids":[]})
T("matter_litigation").append({"id":"ml_LIT5002","project_code_id":P("LIT5002"),"cnr_number":None,"case_number":None,
  "court_bench":"Pre-litigation","cause_title":"Coastal Spice Traders LLP v. Sagar Masala Co.","client_role":"PLAINTIFF",
  "opposite_party":"Sagar Masala Co.","current_stage":"LEGAL_NOTICE_SERVED","next_hearing_date":None,"next_purpose":"Await reply to legal notice (15 days)",
  "ethical_wall_enabled":True,"ethical_wall_user_ids":["u_lit","u_int2","u_sa1"]})
for h in [("LIT5001",D(2026,6,20),"First hearing / summons","Summons issued; I.A. notice ordered",D(2026,8,18),True),
          ("LIT5001",D(2026,8,18),"Appearance of defendant","Defendant appeared; time for written statement",D(2026,10,12),True),
          ("LIT5001",D(2026,10,12),"Arguments on I.A. for interim injunction",None,None,True)]:
    T("litigation_hearings").append({"id":nid("hr"),"project_code_id":P(h[0]),"hearing_date":iso(h[1]),"purpose":h[2],"outcome":h[3],"next_date":iso(h[4]),"order_document_id":None,"client_visible":h[5]})
T("litigation_internal_notes").append({"id":nid("ln"),"project_code_id":P("LIT5001"),"author_user_id":"u_lit","created_at":ts(D(2026,9,30),18),"client_visible":False,
  "note":"INTERNAL: defendant's prior-art bundle is weak on claim 4; consider settlement range before 12-Oct. Do not share."})
T("litigation_internal_notes").append({"id":nid("ln"),"project_code_id":P("LIT5002"),"author_user_id":"u_lit","created_at":ts(D(2026,9,20),17),"client_visible":False,
  "note":"INTERNAL (ethical wall): evidence of first use from 2014 invoices; check authenticity before filing suit."})
T("cross_matter_links").append({"id":nid("cml"),"source_project_code_id":P("LIT5001"),"target_project_code_id":P("AR5001"),"relation_type":"LITIGATION_ENFORCES_PATENT"})
T("cross_matter_links").append({"id":nid("cml"),"source_project_code_id":P("LIT5002"),"target_project_code_id":P("TM5003"),"relation_type":"LITIGATION_ENFORCES_TRADEMARK"})
T("cross_matter_links").append({"id":nid("cml"),"source_project_code_id":P("AGR5001"),"target_project_code_id":P("AR5003"),"relation_type":"AGREEMENT_LICENSES_PATENT"})
T("dept_update_requests").append({"id":nid("dur"),"from_project_code_id":P("LIT5001"),"to_project_code_id":P("AR5001"),"requested_by_user_id":"u_lit",
  "assigned_dept_leader_id":"u_pl1","status":"PENDING","request_message":"Need confirmation of hearing date and claim amendments filed before 12-Oct court date.","response_notes":None,"created_at":ts(D(2026,10,3),12)})

# ---------------- agreements ----------------
for code,typ,stage,tmpl,sent in [("AGR5001","PATENT_LICENCE","COUNTERPARTY_REVIEW",False,D(2026,9,29)),("AGR5002","NDA","FINALIZED",True,D(2026,6,10)),("AGR5003","IP_ASSIGNMENT","CLIENT_REVIEW",False,D(2026,10,1))]:
    T("matter_agreements").append({"id":"ma_"+code,"project_code_id":P(code),"agreement_type":typ,"current_stage":stage,"is_template":tmpl,"latest_version_sent_at":ts(sent,15)})
for code,v,to,d,cv in [("AGR5001",1,"CLIENT",D(2026,9,5),True),("AGR5001",2,"CLIENT",D(2026,9,18),True),("AGR5001",3,"COUNTERPARTY",D(2026,9,29),True),
                       ("AGR5002",1,"CLIENT",D(2026,6,5),True),("AGR5002",2,"FINAL",D(2026,6,10),True),
                       ("AGR5003",1,"INTERNAL",D(2026,9,26),False),("AGR5003",2,"CLIENT",D(2026,10,1),True)]:
    T("agreement_versions").append({"id":nid("agv"),"project_code_id":P(code),"version_no":v,"sent_to":to,"sent_at":ts(d,15),"document_id":None,"client_visible":cv,
       "change_summary":("Internal draft — not shared" if to=="INTERNAL" else f"Version {v} shared with {to.lower()}")})

# ---------------- documents ----------------
def doc(code, cat, fname, by, d, shared=False, extra=None):
    p = PC[re.sub(r'\s+','',code).upper()]
    rec = {"id":nid("doc"),"project_code_id":p["id"],"category":cat,"file_name":fname,"file_type":fname.split(".")[-1],
      "file_size":120000,"uploaded_by":by,"uploaded_at":ts(d,13),"zoho_resource_id":"zr_demo_"+str(len(T("documents"))+1),
      "zoho_permalink":None,"workdrive_path":f"{p['workdrive_path']}/{cat}/{fname}","client_shared":shared,"finance_only":cat=="Engagement & Finance"}
    if extra: rec.update(extra)
    T("documents").append(rec); return rec["id"]
DOC = {}
DOC["tbi01_idf"]=doc("TBI01","IDF & Client Docs","TBI01_IDF.pdf","u_dr1",D(2025,10,12),True)
DOC["tbi01_ps_ack"]=doc("TBI01","ACKs","TBI01_PS_Form1_ACK.pdf","u_pa1",D(2025,11,20),True)
DOC["tbi01_ps_filed"]=doc("TBI01","Final Filed","TBI01_Provisional_Specification_FILED.pdf","u_pa1",D(2025,11,20),True)
DOC["tbi03_fer"]=doc("TBI03","Office Actions","TBI03_FER_2026-07-20.pdf","u_dm",D(2026,7,21),True)
DOC["kvu01_cs_ack"]=doc("KVU01","ACKs","KVU01_CS_ACK.pdf","u_pa2",D(2026,9,25),True)
DOC["kvu03_ack_f26"]=None
DOC["cr1_cert"]=doc("CR5001","Certificates","CR5001_Registration_Certificate.pdf","u_sip",D(2026,9,21),True)
DOC["cr2_cert"]=doc("CR5002","Certificates","CR5002_Registration_Certificate.pdf","u_sip",D(2026,9,21),True)
DOC["ar5002_ack"]=doc("AR5002","ACKs","AR5002_PS_ACK.pdf","u_pa2",D(2026,3,30),True)
DOC["ds5001_ack"]=doc("DS5001","ACKs","DS5001_Filing_ACK.pdf","u_sip",D(2026,7,2),True)
DOC["lit5002_notice"]=doc("LIT5002","Correspondence","LIT5002_Legal_Notice_as_sent.pdf","u_lit",D(2026,9,15),True)
DOC["ar5001_hearing_notice"]=doc("AR5001","Hearings","AR5001_Hearing_Notice.pdf","u_dm",D(2026,9,12),True)
DOC["ar5003_cert"]=doc("AR5003","Certificates","AR5003_Grant_Certificate.pdf","u_dm",D(2024,5,22),True)
DOC["ar5003_renew8"]=doc("AR5003","ACKs","AR5003_Renewal_Year8_Receipt.pdf","u_pa1",D(2026,2,20),True)
DOC["tm5001_exam"]=doc("TM5001","Office Actions","TM5001_Examination_Report.pdf","u_sip",D(2026,9,28),True)
DOC["tm5003_cert"]=doc("TM5003","Certificates","TM5003_Registration_Certificate.pdf","u_sl",D(2020,7,5),True)
DOC["lit5001_order1"]=doc("LIT5001","Hearings","LIT5001_Order_2026-06-20.pdf","u_lit",D(2026,6,21),True)
DOC["lit5001_order2"]=doc("LIT5001","Hearings","LIT5001_Order_2026-08-18.pdf","u_lit",D(2026,8,19),True)
DOC["lit5001_strategy"]=doc("LIT5001","Correspondence","LIT5001_Internal_Strategy_Memo.docx","u_lit",D(2026,9,30),False)
DOC["agr5001_v3"]=doc("AGR5001","Drafts","AGR5001_Licence_v3.docx","u_agr",D(2026,9,29),True)
DOC["agr5003_v1"]=doc("AGR5003","Drafts","AGR5003_IP_Assignment_v1_INTERNAL.docx","u_agr",D(2026,9,26),False)
DOC["agr5003_v2"]=doc("AGR5003","Drafts","AGR5003_IP_Assignment_v2.docx","u_agr",D(2026,10,1),True)
DOC["agr5002_final"]=doc("AGR5002","Final Filed","AGR5002_NDA_Executed.pdf","u_int2",D(2026,6,12),True)
for h in T("litigation_hearings"):
    if h["hearing_date"]=="2026-06-20": h["order_document_id"]=DOC["lit5001_order1"]
    if h["hearing_date"]=="2026-08-18": h["order_document_id"]=DOC["lit5001_order2"]
for v in T("agreement_versions"):
    k = {("pc_AGR5001",3):"agr5001_v3",("pc_AGR5003",1):"agr5003_v1",("pc_AGR5003",2):"agr5003_v2",("pc_AGR5002",2):"agr5002_final"}.get((v["project_code_id"],v["version_no"]))
    if k: v["document_id"]=DOC[k]

# ---------------- deadlines ----------------
def deadline(code,title,typ,due,owner,backup,status="OPEN",source=None):
    T("deadlines").append({"id":nid("dl"),"project_code_id":P(code),"title":title,"deadline_type":typ,"due_date":iso(due),
       "owner_user_id":owner,"backup_user_id":backup,"status":status,"source":source})
deadline("TBI01","Complete specification due (12 months from PS)","STATUTORY",D(2026,11,20),"u_dr1","u_pl1")
deadline("TBI02","Internal: PS draft to client","INTERNAL",D(2026,10,9),"u_dr2","u_pl1")
deadline("TBI03","FER response due","STATUTORY",D(2027,1,20),"u_dr3","u_pl2")
deadline("TBI04","Internal: CS filing target","INTERNAL",D(2026,10,7),"u_pa1","u_pa2")
deadline("KVU01","Form 18 (request for examination) — internal target","INTERNAL",D(2026,10,10),"u_pa2","u_ph")
deadline("KVU02","Complete specification due (12 months from PS)","STATUTORY",D(2026,10,5),"u_pa1","u_ph")
deadline("KVU03","Form 13 — address for service","INTERNAL",D(2026,10,20),"u_pa2","u_pa1")
deadline("AR5001","Hearing (patent office)","STATUTORY",D(2026,10,14),"u_pl1","u_sa1")
deadline("AR5001","Written submission due after hearing","STATUTORY",D(2026,10,29),"u_dr2","u_pl1",source="Calculated: 15 days post hearing — VERIFY")
deadline("AR5002","Complete specification due","STATUTORY",D(2027,3,30),"u_dr4","u_pl2")   # orphan: owner inactive
deadline("AR5004","Renewal fee year 10","STATUTORY",D(2026,11,2),"u_pa1","u_ph")
deadline("AR5005","Renewal fee year 11 — extension window ends","STATUTORY",D(2027,2,1),"u_pa1","u_ph")
deadline("TM5001","Reply to TM examination report","STATUTORY",D(2026,10,28),"u_sip","u_sl")
deadline("TM5002","Counter-statement in opposition","STATUTORY",D(2026,11,2),"u_sl","u_sip")
deadline("CR5005","Reply to copyright discrepancy","STATUTORY",D(2026,10,30),"u_sip","u_sl")
deadline("LIT5001","Hearing — I.A. arguments","STATUTORY",D(2026,10,12),"u_lit","u_sa1")
deadline("LIT5002","Reply period to legal notice ends","INTERNAL",D(2026,10,1),"u_lit","u_int2",status="DONE")
deadline("MISC5003","DP KYC statutory due (vendor)","STATUTORY",D(2026,9,30),"u_fe2","u_fe1")

# ---------------- service catalog / templates / rate cards ----------------
svc = [("SVC_PAT_PS_CS","Patent — Provisional to Complete",60000),("SVC_PAT_PS","Patent — Provisional only",25000),
       ("SVC_PAT_CS","Patent — Complete (direct)",50000),("SVC_PAT_FER","Patent — FER response",18000),("SVC_PAT_HEARING","Patent — Hearing & written submission",20000),
       ("SVC_PAT_RENEWAL","Patent — Renewal handling (per year)",3000),("SVC_PAT_F27","Patent — Form 27 working statement",5000),
       ("SVC_TM_FILE","Trademark — filing per class",6000),("SVC_TM_REPLY","Trademark — examination reply",5000),("SVC_TM_OPP","Trademark — opposition counter-statement",15000),
       ("SVC_CR_FILE","Copyright — filing per work",3500),("SVC_DS_FILE","Design — filing",8000),
       ("SVC_LIT_SUIT","Litigation — suit (per phase)",0),("SVC_AGR_DRAFT","Agreement drafting",0),("SVC_MISC","Vendor-handled compliance",0)]
for s in svc: T("service_catalog").append({"id":s[0],"name":s[1],"default_prof_fee":s[2]})
tmpls = {
 "TPL_PAT_PS_CS":[("PS_FILING","Provisional drafting & filing",40,"PS_FILED",False),("CS_FILING","Complete drafting & filing",45,"CS_FILED",False),("RFE","Request for examination (Form 18)",15,"RFE_FILED",False)],
 "TPL_PAT_CS":[("CS_FILING","Complete drafting & filing",85,"CS_FILED",False),("RFE","Request for examination",15,"RFE_FILED",False)],
 "TPL_PAT_PS":[("PS_FILING","Provisional drafting & filing",100,"PS_FILED",False)],
 "TPL_PAT_FER":[("FER_REPLY","FER response filed",100,"FER_REPLY_FILED",False)],
 "TPL_PAT_HEARING":[("HEARING","Hearing attended",60,"HEARING_ATTENDED",False),("WS","Written submission filed",40,"WS_FILED",False)],
 "TPL_TM_FILE":[("TM_FILING","TM application filed",100,"TM_FILED",False)],
 "TPL_CR_FILE":[("CR_FILING","Copyright application filed",100,"CR_FILED",False)],
 "TPL_LIT_PHASE":[("PLAINT","Plaint & I.A. filed",40,"SUIT_FILED",False),("IA_ARGS","Interim application argued",30,None,True),("TRIAL","Trial phase",30,None,True)],
 "TPL_LIT_NOTICE":[("NOTICE","Legal notice drafted & served",100,"LEGAL_NOTICE_SERVED",False)],
 "TPL_PAT_RENEWAL":[("RENEWAL","Renewal fee paid (per year)",100,"RENEWAL_PAID",False)],
 "TPL_DS_FILE":[("DS_FILING","Design application filed",100,"DS_FILED",False)],
 "TPL_TM_OPP":[("COUNTER","Counter-statement filed",100,"TM_COUNTER_FILED",False)],
 "TPL_AGR":[("DRAFT_V1","First draft delivered",50,"AGR_V1_SENT",False),("FINAL","Agreement finalised",50,"AGR_FINALIZED",False)],
}
for k,items in tmpls.items():
    T("stage_templates").append({"id":k,"name":k.replace("TPL_","").replace("_"," ").title(),"items":[{"stage_key":a,"name":b,"default_percent":c,"trigger_status_value":d,"manual_completion":e} for a,b,c,d,e in items]})
for c,s,f in [("cli_1001","SVC_PAT_PS_CS",45000),("cli_1001","SVC_PAT_CS",40000),("cli_1001","SVC_PAT_FER",15000),("cli_1002","SVC_PAT_PS_CS",45000),("cli_1002","SVC_PAT_CS",40000),("cli_1002","SVC_CR_FILE",2500)]:
    T("client_rate_cards").append({"id":nid("rc"),"client_id":c,"service_id":s,"prof_fee":f,"valid_from":"2025-04-01"})

# ---------------- quotations & stages ----------------
QS = {}
def quote(code, tmpl, total, status, created, version=1, reason=None, supersedes=None, govt=0, confirmed_via=None, override_reason=None):
    qid = nid("qt"); cli = PC[code]["client_id"]
    T("quotations").append({"id":qid,"project_code_id":P(code),"client_id":cli,"quote_number":f"Q-{code}-v{version}","version":version,
      "status":status,"template_id":tmpl,"total_prof_fee":total,"total_estimated_govt_fee":govt,"gst_applicable":True,
      "confirmed_via":confirmed_via,"override_reason":override_reason,"amendment_reason":reason,"supersedes_quotation_id":supersedes,"created_at":ts(created)})
    QS[(code,version)] = qid
    stages=[]
    tpl = next(t for t in T("stage_templates") if t["id"]==tmpl)
    for it in tpl["items"]:
        sid=nid("bs"); amt = round(total*it["default_percent"]/100)
        rec={"id":sid,"quotation_id":qid,"project_code_id":P(code),"stage_key":it["stage_key"],"name":it["name"],"trigger_status_value":it["trigger_status_value"],
          "manual_completion":it["manual_completion"],"allocated_amount":amt,"is_completed":False,"completed_at":None,"billing_status":"PENDING","invoice_ref_id":None}
        T("billing_stages").append(rec); stages.append(rec)
    return qid, stages
def complete(stage, d): stage["is_completed"]=True; stage["completed_at"]=ts(d,17); stage["billing_status"]="UNBILLED_WORK_DONE"

STG = {}
_,s = quote("TBI01","TPL_PAT_PS_CS",45000,"CONFIRMED",D(2025,10,11),govt=12000,confirmed_via="ESIGN"); complete(s[0],D(2025,11,20)); STG["TBI01"]=s
_,s = quote("TBI03","TPL_PAT_CS",40000,"CONFIRMED",D(2024,9,3),confirmed_via="OVERRIDE",override_reason="Institutional MoU covers all filings; accepted by email"); complete(s[0],D(2024,10,15)); complete(s[1],D(2024,10,15)); STG["TBI03"]=s
q3,_ = quote("TBI03","TPL_PAT_FER",15000,"CONFIRMED",D(2026,7,25),version=2,reason="FER issued 20-Jul-2026 — not in original scope",supersedes=None,confirmed_via="OVERRIDE",override_reason="Covered by institutional MoU")
_,s = quote("TBI04","TPL_PAT_CS",40000,"CONFIRMED",D(2026,7,2),confirmed_via="ESIGN"); STG["TBI04"]=s
_,s = quote("KVU01","TPL_PAT_PS_CS",45000,"CONFIRMED",D(2025,12,2),confirmed_via="ESIGN"); complete(s[0],D(2025,12,15)); complete(s[1],D(2026,9,25)); STG["KVU01"]=s
_,s = quote("KVU02","TPL_PAT_PS_CS",45000,"CONFIRMED",D(2025,10,9),confirmed_via="ESIGN"); complete(s[0],D(2025,10,5)); STG["KVU02"]=s
_,s = quote("AR5001","TPL_PAT_PS_CS",60000,"CONFIRMED",D(2023,11,16),confirmed_via="ESIGN"); [complete(x,D(2024,11,28)) for x in s]; s[0]["completed_at"]=ts(D(2023,12,1),17); STG["AR5001"]=s
_,s = quote("AR5001","TPL_PAT_HEARING",20000,"CONFIRMED",D(2026,9,13),version=2,reason="Hearing notice received after FER reply",confirmed_via="ESIGN"); STG["AR5001_H"]=s
_,s = quote("AR5002","TPL_PAT_PS",25000,"CONFIRMED",D(2026,3,5),confirmed_via="ESIGN"); complete(s[0],D(2026,3,30)); STG["AR5002"]=s
_,s = quote("AR5006","TPL_PAT_PS_CS",60000,"SENT",D(2026,9,22)); STG["AR5006"]=s
_,s = quote("TM5001","TPL_TM_FILE",6000,"CONFIRMED",D(2025,11,4),confirmed_via="ESIGN"); complete(s[0],D(2025,11,10)); STG["TM5001"]=s
_,s = quote("TM5004","TPL_TM_FILE",12000,"CONFIRMED",D(2026,9,23),confirmed_via="ESIGN"); STG["TM5004"]=s
for i in range(1,11):
    code=f"CR50{i:02d}"; _,s=quote(code,"TPL_CR_FILE",2500,"CONFIRMED",D(2026,9,1),confirmed_via="ESIGN")
    complete(s[0], D(2026,5,10) if i<=2 else (D(2026,9,3) if i<=5 else D(2026,10,3))); STG[code]=s
_,s = quote("LIT5001","TPL_LIT_PHASE",150000,"CONFIRMED",D(2026,5,13),confirmed_via="ESIGN"); complete(s[0],D(2026,6,1)); STG["LIT5001"]=s
_,s = quote("AGR5001","TPL_AGR",40000,"CONFIRMED",D(2026,8,26),confirmed_via="ESIGN"); complete(s[0],D(2026,9,5)); STG["AGR5001"]=s
_,s = quote("AGR5002","TPL_AGR",12000,"CONFIRMED",D(2026,6,2),confirmed_via="ESIGN"); complete(s[0],D(2026,6,5)); complete(s[1],D(2026,6,10)); STG["AGR5002"]=s
_,s = quote("AGR5003","TPL_AGR",25000,"SENT",D(2026,9,22)); STG["AGR5003"]=s
_,s = quote("DS5001","TPL_DS_FILE",8000,"CONFIRMED",D(2026,6,19),confirmed_via="ESIGN"); complete(s[0],D(2026,7,2)); STG["DS5001"]=s
_,s = quote("TM5002","TPL_TM_OPP",15000,"CONFIRMED",D(2026,9,10),confirmed_via="OVERRIDE",override_reason="Partner confirmed by email; evidence uploaded"); STG["TM5002"]=s
q1,_ = quote("LIT5002","TPL_LIT_NOTICE",35000,"REJECTED",D(2026,8,4))
_,s = quote("LIT5002","TPL_LIT_NOTICE",25000,"CONFIRMED",D(2026,8,8),version=2,reason="Client declined v1 fee; revised scope (notice only, suit quoted separately)",supersedes=q1,confirmed_via="ESIGN"); complete(s[0],D(2026,9,18)); STG["LIT5002"]=s
_,s = quote("AR5004","TPL_PAT_RENEWAL",3000,"CONFIRMED",D(2026,10,1),version=1,reason=None,confirmed_via="OVERRIDE",override_reason="Standing renewal instruction letter on file"); STG["AR5004"]=s

# ---------------- esign ----------------
def esign(code, dtype, status, sent, signers, completed=None, ldid=None, ver=1):
    eid=nid("es"); q = QS.get((code,ver))
    T("esign_requests").append({"id":eid,"document_type":dtype,"project_code_id":P(code),"quotation_id":q,"client_id":PC[code]["client_id"],
       "leegality_document_id":ldid or ("LGL-DEMO-"+code),"sent_at":ts(sent,12),"sent_by":"u_fe1","status":status,"completed_at":ts(completed,16) if completed else None,
       "signed_file_document_id":None})
    for i,(name,email,st) in enumerate(signers):
        T("esign_signers").append({"id":nid("ess"),"esign_request_id":eid,"name":name,"email":email,"signing_order":i+1,"status":st,"signed_at":ts(completed or sent,15) if st=="SIGNED" else None})
    return eid
e1=esign("AR5001","ENGAGEMENT_LETTER","SIGNED",D(2023,11,16),[("Ms. Neha Rao","neha@nimbus-demo.test","SIGNED")],D(2023,11,17))
e2=esign("AR5006","QUOTATION","SENT",D(2026,9,23),[("Ms. Ananya Pai","ananya@orbitron-demo.test","VIEWED"),("Mr. Deepak Gowda","deepak@orbitron-demo.test","PENDING")])
e3=esign("AGR5003","ENGAGEMENT_LETTER","PARTIALLY_SIGNED",D(2026,9,24),[("Ms. Ananya Pai","ananya@orbitron-demo.test","SIGNED"),("Mr. Deepak Gowda","deepak@orbitron-demo.test","PENDING")],None)
e4=esign("TM5004","QUOTATION","SIGNED",D(2026,9,22),[("Ms. Ananya Pai","ananya@orbitron-demo.test","SIGNED")],D(2026,9,23))
e5=esign("LIT5002","ENGAGEMENT_LETTER","DECLINED",D(2026,8,5),[("Mr. Abdul Rahim","rahim@coastalspice-demo.test","DECLINED")],ldid="LGL-DEMO-LIT5002-v1")
e6=esign("LIT5002","ENGAGEMENT_LETTER","SIGNED",D(2026,8,8),[("Mr. Abdul Rahim","rahim@coastalspice-demo.test","SIGNED")],D(2026,8,9),ldid="LGL-DEMO-LIT5002-v2",ver=2)
e7=esign("DS5001","QUOTATION","SIGNED",D(2026,6,19),[("Ms. Priya Kamath","priya@coastalspice-demo.test","SIGNED")],D(2026,6,20))
for e in T("esign_requests"):
    if e["status"]=="SIGNED":
        e["signed_file_document_id"]=doc(T("project_codes")[[p["id"] for p in T("project_codes")].index(e["project_code_id"])]["code"],"Engagement & Finance",f"{e['leegality_document_id']}_signed.pdf","u_fe1",D(2026,9,23),False)

# ---------------- govt fees ----------------
fees = [("PATENT","FORM_1",{"NATURAL_PERSON":1600,"STARTUP":1600,"SMALL_ENTITY":1600,"EDUCATIONAL_INSTITUTION":1600,"OTHERS":8000}),
        ("PATENT","FORM_18",{"NATURAL_PERSON":4000,"STARTUP":4000,"SMALL_ENTITY":4000,"EDUCATIONAL_INSTITUTION":4000,"OTHERS":20000}),
        ("PATENT","FORM_1_CS",{"NATURAL_PERSON":1600,"STARTUP":1600,"SMALL_ENTITY":1600,"EDUCATIONAL_INSTITUTION":1600,"OTHERS":8000}),
        ("PATENT","FORM_9",{"NATURAL_PERSON":2500,"STARTUP":2500,"SMALL_ENTITY":2500,"EDUCATIONAL_INSTITUTION":2500,"OTHERS":12500}),
        ("PATENT","FORM_13",{"NATURAL_PERSON":0,"STARTUP":0,"SMALL_ENTITY":0,"EDUCATIONAL_INSTITUTION":0,"OTHERS":0}),
        ("PATENT","RENEWAL_YEAR_10",{"NATURAL_PERSON":0,"STARTUP":0,"SMALL_ENTITY":0,"EDUCATIONAL_INSTITUTION":0,"OTHERS":0}),
        ("TRADEMARK","TM_A_PER_CLASS",{"NATURAL_PERSON":4500,"STARTUP":4500,"SMALL_ENTITY":4500,"OTHERS":9000}),
        ("COPYRIGHT","LITERARY_WORK",{"ANY":500}),
        ("DESIGN","DESIGN_APPLICATION",{"NATURAL_PERSON":1000,"STARTUP":1000,"SMALL_ENTITY":2000,"OTHERS":4000})]
for off,form,amts in fees:
    for cat,a in amts.items():
        T("fee_schedule").append({"id":nid("fee"),"office":off,"form_or_action":form,"applicant_fee_category":cat,"efiling_amount":a,"effective_from":"2024-03-15","verify":True,
            "note":"ILLUSTRATIVE — VERIFY against current official fee schedule before go-live" + (" (0 = placeholder, fill actual)" if a==0 else "")})

# ---------------- review chains ----------------
for dtyp,stages in [("PS",["CO_LEAD_REVIEW","FINAL_APPROVAL"]),("CS",["CO_LEAD_REVIEW","EXTERNAL_REVIEW","FINAL_APPROVAL"]),
                    ("FER_RESPONSE",["CO_LEAD_REVIEW","EXTERNAL_REVIEW","FINAL_APPROVAL"]),("WRITTEN_SUBMISSION",["CO_LEAD_REVIEW","EXTERNAL_REVIEW","FINAL_APPROVAL"])]:
    T("review_chain_templates").append({"id":"rct_"+dtyp,"doc_type":dtyp,"stages":stages})
def draft(code,dtyp,drafter,stage,stages=None,override_reason=None,deadline_=None):
    did=nid("drf")
    T("draft_documents").append({"id":did,"project_code_id":P(code),"doc_type":dtyp,"drafter_user_id":drafter,"statutory_deadline":iso(deadline_),
      "current_stage":stage,"final_version_id":None,"chain_stages":stages or next(t["stages"] for t in T("review_chain_templates") if t["doc_type"]==dtyp),
      "chain_override_reason":override_reason})
    return did
def version(did,code,n,by,d,note):
    vid=nid("drv"); docid=doc(code,"Drafts",f"{code}_v{n}.docx",by,d,False)
    T("draft_versions").append({"id":vid,"draft_document_id":did,"version_no":n,"document_id":docid,"uploaded_by":by,"uploaded_at":ts(d,12),"change_note":note}); return vid
ANCH={"claims":"Claim 1","description":"Para [0021]","drawings":"Fig. 2","abstract":"Abstract","language":"Para [0008]","legal-patentability":"Claim 1"}
def rround(did,vid,stage,rev,assigned,decision=None,decided=None,rnd=1,comments=(),reason=None,replies=None):
    rid=nid("rr")
    if decision=="RETURNED" and reason is None: reason="DRAFTER_QUALITY"
    T("review_rounds").append({"id":rid,"draft_document_id":did,"version_id":vid,"round_no":rnd,"stage":stage,"reviewer_user_id":rev,
       "assigned_at":ts(assigned,10),"decision":decision,"decided_at":ts(decided,18) if decided else None,
       "return_reason":reason if decision=="RETURNED" else None,"counts_toward_review_score": decision=="RETURNED" and reason=="DRAFTER_QUALITY",
       "decision_note":None})
    dd=next(x for x in T("draft_documents") if x["id"]==did)
    for i,(sec,sev,txt,res) in enumerate(comments):
        cid=nid("rc")
        T("review_comments").append({"id":cid,"review_round_id":rid,"section":sec,"anchor":ANCH.get(sec,"General"),"quoted_text":None,"severity":sev,"text":txt,
          "status":"RESOLVED" if res else "OPEN","resolved":res,"created_by":rev,"created_at":ts(assigned+dt.timedelta(days=1),11+i)})
        if replies and i in replies:
            for who,day,msg in replies[i]:
                T("review_comment_replies").append({"id":nid("rcr"),"review_comment_id":cid,"author_user_id":who,"created_at":ts(day,15),"text":msg})
    return rid
# TBI01 CS: co-lead approved; external review round 2 in progress
d=draft("TBI01","CS","u_dr1","EXTERNAL_REVIEW",deadline_=D(2026,11,20))
v1=version(d,"TBI01",1,"u_dr1",D(2026,9,10),"First full CS draft")
rround(d,v1,"CO_LEAD_REVIEW","u_pl1",D(2026,9,10),"APPROVED",D(2026,9,14))
rround(d,v1,"EXTERNAL_REVIEW","u_ext",D(2026,9,15),"RETURNED",D(2026,9,22),1,[("claims","CRITICAL","Claim 1 lacks the calibration step that gives the technical effect",True),("description","MAJOR","Add worked example with drift numbers",True),("language","MINOR","Inconsistent term: node/unit",True)],
       replies={0:[("u_dr1",D(2026,9,23),"Should the calibration step be in claim 1 or a dependent claim? Inventor says it is optional in one variant."),("u_ext",D(2026,9,23),"Claim 1. The optional variant goes in a separate independent claim."),("u_dr1",D(2026,9,29),"Addressed in v2: claim 1 amended, new claim 12 for the variant.")],
                1:[("u_dr1",D(2026,9,29),"Addressed in v2: example with 30-day drift data added at para [0034].")]})
v2=version(d,"TBI01",2,"u_dr1",D(2026,9,29),"Claim 1 amended; example added")
rround(d,v2,"EXTERNAL_REVIEW","u_ext",D(2026,9,30),None,None,2)
DRAFT_TBI01=d
# TBI02 PS: returned at co-lead with 2 CRITICAL (round 1), awaiting v2
d=draft("TBI02","PS","u_dr2","DRAFTING",deadline_=D(2026,10,9))
v1=version(d,"TBI02",1,"u_dr2",D(2026,9,25),"Initial PS draft")
rround(d,v1,"CO_LEAD_REVIEW","u_pl1",D(2026,9,26),"RETURNED",D(2026,9,30),1,[("description","CRITICAL","Composite ratio not disclosed — enablement gap",False),("claims","CRITICAL","Draft claims read on prior-art pad",False),("drawings","MINOR","Fig 2 labels missing",False)],
       replies={0:[("u_dr2",D(2026,10,1),"Inventor has not shared the ratio yet. Asked by email on 1-Oct."),("u_pl1",D(2026,10,1),"Do not resubmit without it. Escalate to SPOC if no reply by 3-Oct.")]})
# TBI03 FER response drafting (chain overridden: skip external review)
d=draft("TBI03","FER_RESPONSE","u_dr3","CO_LEAD_REVIEW",stages=["CO_LEAD_REVIEW","FINAL_APPROVAL"],override_reason="Formal objections only (Sec 10(4) clarity) — external review not needed; approved by Patent Co-lead B",deadline_=D(2027,1,20))
v1=version(d,"TBI03",1,"u_dr3",D(2026,10,1),"Response to formal objections")
rround(d,v1,"CO_LEAD_REVIEW","u_pl2",D(2026,10,1))
# TBI04 CS: final approved & locked
d=draft("TBI04","CS","u_dr2","APPROVED_FINAL",deadline_=D(2026,10,7))
v1=version(d,"TBI04",1,"u_dr2",D(2026,8,20),"Full CS")
rround(d,v1,"CO_LEAD_REVIEW","u_pl1",D(2026,8,21),"APPROVED",D(2026,8,25))
rround(d,v1,"EXTERNAL_REVIEW","u_ext",D(2026,8,26),"APPROVED",D(2026,9,2),1,[("abstract","MINOR","Trim abstract to 150 words",True)])
rround(d,v1,"FINAL_APPROVAL","u_sa1",D(2026,9,3),"APPROVED",D(2026,9,5))
T("draft_documents")[-1]["final_version_id"]=v1; FINAL_TBI04=v1
# KVU02 CS final approved (due today)
d=draft("KVU02","CS","u_dr3","APPROVED_FINAL",deadline_=D(2026,10,5))
v1=version(d,"KVU02",1,"u_dr3",D(2026,9,1),"Full CS"); 
rround(d,v1,"CO_LEAD_REVIEW","u_pl2",D(2026,9,2),"RETURNED",D(2026,9,6),1,[("claims","MAJOR","Dependent claims 6-9 redundant",True)])
v2=version(d,"KVU02",2,"u_dr3",D(2026,9,9),"Claims consolidated")
rround(d,v2,"CO_LEAD_REVIEW","u_pl2",D(2026,9,10),"APPROVED",D(2026,9,12),2)
rround(d,v2,"EXTERNAL_REVIEW","u_ext",D(2026,9,13),"APPROVED",D(2026,9,24))
rround(d,v2,"FINAL_APPROVAL","u_sa1",D(2026,9,25),"APPROVED",D(2026,9,26))
T("draft_documents")[-1]["final_version_id"]=v2; FINAL_KVU02=v2
# AR5001 written submission: external review overdue (assigned 2026-09-28, due by 7 working days before 2026-10-29 -> 2026-10-20 ok) -> make co-lead overdue
d=draft("KVU01","CS","u_dr1","APPROVED_FINAL",deadline_=D(2026,12,15))
v1=version(d,"KVU01",1,"u_dr1",D(2026,8,10),"Full CS from PS")
rround(d,v1,"CO_LEAD_REVIEW","u_pl2",D(2026,8,11),"RETURNED",D(2026,8,14),1,[("description","MAJOR","Inventors sent a new embodiment (offline scheduling) on 12-Aug — add it",True)],reason="CLIENT_INPUT_CHANGE")
v2=version(d,"KVU01",2,"u_dr1",D(2026,8,24),"New embodiment added")
rround(d,v2,"CO_LEAD_REVIEW","u_pl2",D(2026,8,25),"APPROVED",D(2026,8,27),2)
rround(d,v2,"EXTERNAL_REVIEW","u_ext",D(2026,8,28),"APPROVED",D(2026,9,8))
rround(d,v2,"FINAL_APPROVAL","u_sa1",D(2026,9,9),"APPROVED",D(2026,9,10))
T("draft_documents")[-1]["final_version_id"]=v2
d=draft("AR5001","WRITTEN_SUBMISSION","u_dr2","CO_LEAD_REVIEW",deadline_=D(2026,10,29))
v1=version(d,"AR5001",1,"u_dr2",D(2026,9,20),"Hearing written submission skeleton")
rround(d,v1,"CO_LEAD_REVIEW","u_pl1",D(2026,9,21))

SLA={"CO_LEAD_REVIEW":7,"EXTERNAL_REVIEW":10,"FINAL_APPROVAL":3}; BUF={"FINAL_APPROVAL":3,"EXTERNAL_REVIEW":7,"CO_LEAD_REVIEW":10}
def minus_working(d,n):
    while n>0:
        d-=dt.timedelta(days=1)
        if d.weekday()<6: n-=1
    return d
for r in T("review_rounds"):
    dd=next(x for x in T("draft_documents") if x["id"]==r["draft_document_id"])
    a=dt.date.fromisoformat(r["assigned_at"][:10]); cand=[a+dt.timedelta(days=SLA[r["stage"]])]
    if dd["statutory_deadline"]: cand.append(minus_working(dt.date.fromisoformat(dd["statutory_deadline"]),BUF[r["stage"]]))
    r["stage_due_date"]=iso(min(cand)); r["overdue"]= r["decision"] is None and min(cand)<TODAY
# ---------------- approvals ----------------
def appr(code, ip, item, sent, status, approver=None, appr_on=None, rem=0, ver=None, override=None):
    T("approval_requests").append({"id":nid("apr"),"project_code_id":P(code),"ip_type":ip,"item_description":item,"draft_version_id":ver,
       "sent_on":iso(sent),"sent_by":PC[code]["spoc_user_id"],"channel":"EMAIL","status":status,"approver_name":approver,"approver_designation":None,
       "approved_on":iso(appr_on),"evidence_document_id":None,"reminder_count":rem,"last_reminder_at":None,"superadmin_override":override})
appr("TBI04","PATENT","Complete specification (final v1)",D(2026,9,6),"APPROVED","Dr. Arvind Hegde",D(2026,9,12),ver=FINAL_TBI04)
appr("KVU02","PATENT","Complete specification (final v2)",D(2026,9,27),"AWAITING",rem=2,ver=FINAL_KVU02,
     override={"by":"u_sa1","at":ts(D(2026,10,5),9),"reason":"Statutory CS deadline today; inventor approved by phone, written approval to follow (deemed approval)"})
appr("TM5004","TRADEMARK","Mark ORBITRON — classes 7 & 9 with specification",D(2026,9,27),"AWAITING",rem=2)
appr("TM5001","TRADEMARK","Draft reply to examination report",D(2026,10,2),"AWAITING",rem=0)
appr("DS5001","DESIGN","Representation sheets (6 views)",D(2026,6,25),"APPROVED_WITH_CHANGES","Ms. Priya Kamath",D(2026,6,29))
appr("CR5011","COPYRIGHT","Work details & author declarations",D(2026,4,10),"APPROVED","Dr. Meera Kulkarni",D(2026,4,12))
appr("TBI02","PATENT","Provisional specification draft",D(2026,10,1),"WITHDRAWN")  # withdrawn after internal return
for a in T("approval_requests"):
    if a["status"] in ("APPROVED","APPROVED_WITH_CHANGES"):
        a["evidence_document_id"]=doc(PC_code:= next(p["code"] for p in T("project_codes") if p["id"]==a["project_code_id"]),"Correspondence",f"{PC_code}_client_approval_email.pdf",a["sent_by"],dt.date.fromisoformat(a["approved_on"]),False)

# ---------------- filing checklists & jobs ----------------
CHK = {
 "CS":["Applicant name/address/PIN matches master","Inventor names & order match master","Inventor nationality & residence","Title matches specification","Specification is the locked final version","No duplicate upload","Form 26 / POA status","Fee category matches applicant type","Signed Form 1 hard copy received"],
 "FORM_18":["Application number correct","Fee category matches applicant type","No duplicate request already filed"],
 "FORM_13":["Correct field being amended","Supporting document attached","Dependency filings complete"],
 "FORM_26":["POA signed by authorised signatory","Notarised copy uploaded"],
 "TM_REPLY":["Mark & class match","Reply addresses every objection"],
}
for k,items in CHK.items(): T("filing_checklist_templates").append({"id":"fct_"+k,"filing_type":k,"items":items})
FJ={}
def fjob(key,code,ftype,state,due,stat,prep,checker=None,priority="NORMAL",ident=None,depends=None,ack=None,hold=None,dsc=None):
    jid=nid("fj"); FJ[key]=jid
    T("filing_jobs").append({"id":jid,"project_code_id":P(code),"filing_type":ftype,"identifier":ident or code,"due_date":iso(due),"is_statutory_deadline":stat,
       "priority":priority,"state":state,"preparer_user_id":prep,"checker_user_id":checker,"govt_fee_request_id":None,"depends_on":depends or [],
       "ack_document_id":ack,"application_no_captured":None,"on_hold_reason":hold,"esign_dsc_holder_user_id":dsc,"created_at":ts(due-dt.timedelta(days=10))})
    return jid
fjob("tbi04_cs","TBI04","CS","CORRECTIONS_REQUIRED",D(2026,10,7),False,"u_pa1","u_pa2","HIGH",ident="TBI04 (temp code)")
fjob("kvu02_cs","KVU02","CS","CLEARED_FOR_ESIGN",D(2026,10,5),True,"u_pa2","u_ops","CRITICAL",ident="202541000202")
fjob("kvu01_f18","KVU01","FORM_18","PAYMENT_PENDING",D(2026,10,10),False,"u_pa2","u_pa1","HIGH",ident="202641000201",dsc="u_ops")
fjob("kvu03_f26","KVU03","FORM_26","QUEUED",D(2026,10,15),False,"u_pa1",None,"NORMAL",ident="202541000203")
fjob("kvu03_f13","KVU03","FORM_13","ON_HOLD",D(2026,10,20),False,"u_pa2",None,"NORMAL",ident="202541000203",depends=[FJ["kvu03_f26"]],hold="Waiting on Form 26 (POA) for address for service")
fjob("kvu01_cs","KVU01","CS","CLOSED",D(2026,9,25),True,"u_pa2","u_pa1","HIGH",ident="202641000201",ack=DOC["kvu01_cs_ack"],dsc="u_ops")
fjob("tbi01_ps","TBI01","PS","CLOSED",D(2025,11,20),False,"u_pa1","u_ph","NORMAL",ident="TBI01 (temp code)",ack=DOC["tbi01_ps_ack"],dsc="u_ops")
fjob("tm5001_reply","TM5001","TM_REPLY","PREPARED",D(2026,10,28),True,"u_sip",None,"NORMAL",ident="7012345")
fjob("ar5004_renew","AR5004","RENEWAL","QUEUED",D(2026,11,2),True,"u_pa1",None,"HIGH",ident="IN 387654")
T("filing_jobs")[[j["id"] for j in T("filing_jobs")].index(FJ["tbi01_ps"])]["application_no_captured"]="202641000101"
T("filing_jobs")[[j["id"] for j in T("filing_jobs")].index(FJ["kvu01_cs"])]["application_no_captured"]="202641000201"
# check results
for i,item in enumerate(CHK["CS"]):
    fail = item in ("Inventor names & order match master",)
    T("filing_check_results").append({"id":nid("fcr"),"filing_job_id":FJ["tbi04_cs"],"item":item,"passed":not fail,"note":"IDF order differs from signed Form 1" if fail else None,"checked_by":"u_pa2","checked_at":ts(D(2026,10,3),16)})
    T("filing_check_results").append({"id":nid("fcr"),"filing_job_id":FJ["kvu02_cs"],"item":item,"passed":True,"note":None,"checked_by":"u_ops","checked_at":ts(D(2026,10,5),9,30)})
# corrections log (history across months)
corr = [("tbi04_cs","INVENTOR_DETAILS","Inventor order in Form 1 differs from IDF","u_pa1","u_pa2",D(2026,10,3),None),
        ("kvu02_cs","APPLICANT_ADDRESS","PIN code missing in applicant address on Form 1","u_pa2","u_ops",D(2026,10,4),D(2026,10,4)),
        ("kvu02_cs","WRONG_DOCUMENT","Draft v1 attached instead of final v2","u_pa2","u_ops",D(2026,10,4),D(2026,10,4)),
        ("kvu01_cs","TITLE","Title mismatch between Form 1 and spec","u_pa2","u_pa1",D(2026,9,24),D(2026,9,24)),
        ("kvu01_cs","DUPLICATE_UPLOAD","Drawings uploaded twice","u_pa2","u_pa1",D(2026,9,24),D(2026,9,24)),
        ("tbi01_ps","INVENTOR_DETAILS","Inventor 2 surname spelling","u_pa1","u_ph",D(2025,11,19),D(2025,11,19)),
        ("kvu01_f18","FEE_CATEGORY","Fee category initially set to OTHERS","u_int1","u_pa1",D(2026,10,2),D(2026,10,2)),
        ("kvu01_cs","APPLICANT_ADDRESS","Applicant address line 2 missing","u_pa2","u_pa1",D(2026,9,10),D(2026,9,10)),
        ("tbi01_ps","MISSING_DOCUMENT","Form 3 not attached","u_pa1","u_ph",D(2025,11,19),D(2025,11,19))]
for k,cat,desc,att,by,dd,res in corr:
    T("filing_corrections").append({"id":nid("fc"),"filing_job_id":FJ[k],"category":cat,"description":desc,"attributed_to":att,"raised_by":by,"raised_at":ts(dd,15),"resolved_at":ts(res,18) if res else None,"screenshot_document_id":None})

# ---------------- govt fee requests & portal payments ----------------
def gfr(key,code,form,cat,amt,status,req,d,approved=None,paid=None,ref=None,matched=False,recover=True,job=None):
    gid=nid("gfr")
    T("govt_fee_requests").append({"id":gid,"filing_job_id":FJ.get(job),"project_code_id":P(code),"form":form,"applicant_fee_category":cat,"computed_amount":amt,
       "manual_adjustment":0,"adjustment_reason":None,"requested_by":req,"requested_at":ts(d,11),"status":status,
       "approved_by":approved[0] if approved else None,"approved_at":ts(approved[1],12) if approved else None,
       "paid_by":paid[0] if paid else None,"paid_at":ts(paid[1],14) if paid else None,"payment_mode":"NET_BANKING" if paid else None,
       "transaction_reference":ref,"portal_record_matched":matched,"reconciled_by":"u_pa2" if matched else None,"reconciled_at":ts(paid[1],19) if matched else None,
       "recoverable_from_client":recover})
    if job: T("filing_jobs")[[j["id"] for j in T("filing_jobs")].index(FJ[job])]["govt_fee_request_id"]=gid
    return gid
GF={}
GF["tbi01_ps"]=gfr("tbi01_ps","TBI01","FORM_1","EDUCATIONAL_INSTITUTION",1600,"RECONCILED","u_pa1",D(2025,11,19),("u_fl",D(2025,11,19)),("u_ops",D(2025,11,20)),"CBR-DEMO-25110201",True,job="tbi01_ps")
GF["kvu01_cs"]=gfr("kvu01_cs","KVU01","FORM_1_CS","EDUCATIONAL_INSTITUTION",1600,"RECONCILED","u_pa2",D(2026,9,24),("u_fe1",D(2026,9,24)),("u_ops",D(2026,9,25)),"CBR-DEMO-26092501",True,job="kvu01_cs")
GF["kvu01_f18"]=gfr("kvu01_f18","KVU01","FORM_18","EDUCATIONAL_INSTITUTION",4000,"REQUESTED","u_pa2",D(2026,10,3),job="kvu01_f18")
GF["kvu02_cs"]=gfr("kvu02_cs","KVU02","FORM_1_CS","EDUCATIONAL_INSTITUTION",1600,"APPROVED","u_pa2",D(2026,10,4),("u_fl",D(2026,10,5)),job="kvu02_cs")
GF["ar5003_r8"]=gfr("ar5003_r8","AR5003","RENEWAL_YEAR_8","OTHERS",0,"RECONCILED","u_pa1",D(2026,2,18),("u_fl",D(2026,2,19)),("u_ops",D(2026,2,20)),"CBR-DEMO-26022001",True)
GF["cr_batch"]=[gfr(f"cr{i}",f"CR50{i:02d}","LITERARY_WORK","ANY",500,"PAID","u_sip",D(2026,10,2),("u_fe1",D(2026,10,2)),("u_ops",D(2026,10,3)),f"CR-DEMO-2610030{i}",False) for i in range(6,11)]
GF["dup"]=gfr("dup","CR5006","LITERARY_WORK","ANY",500,"PAID","u_sip",D(2026,10,3),("u_fe1",D(2026,10,3)),("u_ops",D(2026,10,3)),"CR-DEMO-26100399",False,recover=False)
T("govt_fee_requests")[-1]["duplicate_suspect_of"]=GF["cr_batch"][0]
T("govt_fee_requests")[-1]["note"]="Same project code + form + amount within 7 days — should be moved to REFUND_PENDING"
GF["tm5004"]=gfr("tm5004","TM5004","TM_A_PER_CLASS","STARTUP",9000,"REQUESTED","u_sip",D(2026,10,1))
# portal records for reconciliation day 2026-10-03
for i in range(6,11):
    T("portal_payment_records").append({"id":nid("ppr"),"office":"COPYRIGHT","payment_date":"2026-10-03","reference":f"CR-DEMO-2610030{i}","amount":500,"identifier":f"CR50{i:02d}","entered_by":"u_pa2","match_status":"UNMATCHED","matched_request_id":None,"resolution_note":None})
T("portal_payment_records").append({"id":nid("ppr"),"office":"PATENT","payment_date":"2026-10-03","reference":"CBR-DEMO-26100311","amount":2500,"identifier":"202541000203","entered_by":"u_pa2","match_status":"UNMATCHED","matched_request_id":None,"resolution_note":None})

# ---------------- post-grant ----------------
def renewals(code, filing, recorded, rows):
    for yr,status,instr,gf,receipt in rows:
        due = D(filing.year+yr-1, filing.month, filing.day)
        T("renewal_schedule").append({"id":nid("rn"),"project_code_id":P(code),"patent_year":yr,"due_date":iso(due),"status":status,
          "client_instruction":instr,"instruction_date":None,"govt_fee_request_id":gf,"receipt_document_id":receipt,
          "grace_end_date":iso(D(due.year+(1 if due.month>6 else 0),(due.month+6-1)%12+1,min(due.day,28))) if status=="IN_GRACE" else None,
          "is_arrears_on_grant": due < recorded})
renewals("AR5003",D(2019,3,15),D(2024,5,20),[(y,"PAID","RENEW",None,None) for y in range(3,8)]+[(8,"PAID","RENEW",GF["ar5003_r8"],DOC["ar5003_renew8"]),(9,"UPCOMING",None,None,None)]+[(y,"UPCOMING",None,None,None) for y in range(10,13)])
renewals("AR5004",D(2017,11,2),D(2022,1,12),[(y,"PAID","RENEW",None,None) for y in range(3,10)]+[(10,"CLIENT_REMINDED",None,None,None),(11,"UPCOMING",None,None,None)])
renewals("AR5005",D(2016,8,1),D(2021,3,3),[(y,"PAID","RENEW",None,None) for y in range(3,11)]+[(11,"IN_GRACE",None,None,None)])
T("form27_periods").append({"id":nid("f27"),"project_code_id":P("AR5003"),"period_label":"FY 2025-26 to FY 2027-28","period_start":"2025-04-01","period_end":"2028-03-31","due_date":"2028-09-30","status":"UPCOMING","note":"Grant FY 2024-25; first period starts next FY. Rules in config — VERIFY."})
T("form27_periods").append({"id":nid("f27"),"project_code_id":P("AR5004"),"period_label":"Legacy (granted before 15-Mar-2024)","period_start":None,"period_end":None,"due_date":None,"status":"SET_MANUALLY","note":"Transitional — confirm next period manually with the team"})
T("form27_periods").append({"id":nid("f27"),"project_code_id":P("AR5005"),"period_label":"Legacy (granted before 15-Mar-2024)","period_start":None,"period_end":None,"due_date":None,"status":"SET_MANUALLY","note":"Transitional — confirm manually"})

# ---------------- checklists & availability ----------------
CT=[("ct_dues","Daily dues review with drafters","PARALEGAL","DAILY","10:30","u_ph","u_pa1",["Open today's dues","Confirm status with each drafter","Update deadline notes"],"NOTE"),
    ("ct_eod","End-of-day ACK reconciliation","PARALEGAL","DAILY","18:30","u_ph","u_pa2",["List filings due today","Confirm ACK uploaded or carry-over reason"],"NOTE"),
    ("ct_fee","Daily govt fee portal reconciliation","PARALEGAL","DAILY","17:30","u_pa2","u_pa1",["Enter portal payment records","Resolve unmatched items"],"NOTE"),
    ("ct_prio","Daily priority filings check","PARALEGAL","DAILY","11:00","u_pa1","u_int1",["Review Today board","Flag anything blocked"],"NONE"),
    ("ct_pub","Friday journal publication check + inventor emails","IP_PATENT","WEEKLY:FRI","16:00","u_dm","u_pa1",["Search journal for client applications","Update publication dates","Send inventor status emails"],"FILE"),
    ("ct_ext","Saturday external patents check","IP_PATENT","WEEKLY:SAT","13:00","u_dm","u_pa2",["Check external patents list","Record findings"],"NOTE"),
    ("ct_cash","Weekly petty cash count","OFFICE","WEEKLY:SAT","17:00","u_oe","u_ops",["Count physical cash","Enter count","Request finance sign-off"],"NOTE"),
    ("ct_pg","Monthly post-grant look-ahead","IP_PATENT","MONTHLY:1","12:00","u_pa1","u_ph",["Review renewals due in 90 days","Review Form 27 periods","Send client reminders"],"NOTE")]
for c in CT:
    T("checklist_templates").append({"id":c[0],"name":c[1],"department":c[2],"schedule":c[3],"due_time":c[4],"owner_user_id":c[5],"backup_user_id":c[6],
       "steps":c[7],"evidence_required":c[8],"escalation_chain":["DEPT_ADMIN","SUPER_ADMIN"],"escalation_delay_minutes":60})
def inst(tid,d,status,by=None,at=None,escal=False,assigned=None,ev=None):
    tpl=next(t for t in T("checklist_templates") if t["id"]==tid)
    T("checklist_instances").append({"id":nid("ci"),"template_id":tid,"for_date":iso(d),"due_at":f"{iso(d)}T{tpl['due_time']}:00+05:30","assigned_user_id":assigned or tpl["owner_user_id"],
      "status":status,"completed_by":by,"completed_at":at,"escalated":escal,"escalated_to":"u_ph" if escal else None,"evidence":ev})
inst("ct_dues",D(2026,10,3),"DONE","u_ph",ts(D(2026,10,3),10,50),ev="All dues confirmed")
inst("ct_eod",D(2026,10,3),"MISSED",escal=True)
inst("ct_fee",D(2026,10,3),"DONE","u_pa2",ts(D(2026,10,3),18,10),ev="5 CR payments entered; 1 patent payment unmatched")
inst("ct_pub",D(2026,10,2),"DONE","u_dm",ts(D(2026,10,2),16,40),ev="journal_check_2026-10-02.pdf")
inst("ct_ext",D(2026,10,3),"DONE","u_dm",ts(D(2026,10,3),13,30),ev="No new conflicts")
inst("ct_cash",D(2026,10,3),"DONE","u_oe",ts(D(2026,10,3),17,20),ev="Count entered, variance ₹20")
inst("ct_pg",D(2026,10,1),"DONE","u_pa1",ts(D(2026,10,1),12,30),ev="AR5004 reminder sent")
for tid in ["ct_dues","ct_eod","ct_fee","ct_prio"]:
    tpl=next(t for t in T("checklist_templates") if t["id"]==tid)
    inst(tid,TODAY,"OPEN",assigned=tpl["backup_user_id"] if tpl["owner_user_id"]=="u_pa1" else None)
T("user_availability").append({"id":nid("ua"),"user_id":"u_pa1","unavailable_from":"2026-10-05","unavailable_to":"2026-10-07","reason":"Leave","set_by":"u_pa1"})

# ---------------- work events, effort, evaluations ----------------
for k,v in {"CS":5,"PS":2,"FER_RESPONSE":4,"WRITTEN_SUBMISSION":3,"FORM_FILING":1,"TM_REPLY":2,"CR_FILING":1,"REVIEW":1}.items():
    T("effort_points").append({"task_type":k,"points":v})
def we(et,eid,etype,actor,target,d,h=11,meta=None):
    T("work_events").append({"id":nid("we"),"entity_type":et,"entity_id":eid,"event_type":etype,"actor_user_id":actor,"target_user_id":target,"occurred_at":ts(d,h),"metadata":meta or {}})
for dd in T("draft_documents"):
    we("draft",dd["id"],"ASSIGNED","u_pl1" if dd["drafter_user_id"] in("u_dr1","u_dr2") else "u_pl2",dd["drafter_user_id"],D(2026,8,15))
for r in T("review_rounds"):
    we("review_round",r["id"],"SUBMITTED_FOR_REVIEW",None,r["reviewer_user_id"],dt.date.fromisoformat(r["assigned_at"][:10]))
    if r["decision"]=="RETURNED":
        sev=[c["severity"] for c in T("review_comments") if c["review_round_id"]==r["id"]]
        dd=next(x for x in T("draft_documents") if x["id"]==r["draft_document_id"])
        we("review_round",r["id"],"RETURNED",r["reviewer_user_id"],dd["drafter_user_id"],dt.date.fromisoformat(r["decided_at"][:10]),18,{"critical":sev.count("CRITICAL"),"major":sev.count("MAJOR"),"minor":sev.count("MINOR"),"round":r["round_no"]})
    elif r["decision"]=="APPROVED":
        we("review_round",r["id"],"APPROVED",r["reviewer_user_id"],None,dt.date.fromisoformat(r["decided_at"][:10]),18)
for c in T("filing_corrections"):
    we("filing_correction",c["id"],"CORRECTION_ATTRIBUTED",c["raised_by"],c["attributed_to"],dt.date.fromisoformat(c["raised_at"][:10]),15,{"category":c["category"]})
we("draft",next(x["id"] for x in T("draft_documents") if x["project_code_id"]=="pc_TBI02"),"DEADLINE_CHANGED","u_pl1","u_dr2",D(2026,9,30),18,{"old":"2026-10-03","new":"2026-10-09","reason":"Returned with critical comments; client informed"})
we("draft",next(x["id"] for x in T("draft_documents") if x["project_code_id"]=="pc_AR5001"),"EXTENSION_REQUESTED","u_dr2","u_pl1",D(2026,9,27),10,{"requested_new_date":"2026-10-02","before_due":True})
we("draft",next(x["id"] for x in T("draft_documents") if x["project_code_id"]=="pc_AR5001"),"OVERDUE",None,"u_pl1",D(2026,10,1),9,{"stage":"CO_LEAD_REVIEW"})
for c in T("checklist_instances"):
    if c["status"]=="MISSED": we("checklist_instance",c["id"],"OVERDUE",None,c["assigned_user_id"],dt.date.fromisoformat(c["for_date"]),20)
for uid,s,w,ttm,ev in [("u_dr1",4,4,4,"2 CS delivered on time; 1 critical comment (TBI01)"),("u_dr2",3,4,2,"TBI02 returned with 2 critical; deadline moved"),
                       ("u_dr3",4,5,5,"KVU02 approved in 2 rounds, ahead of deadline"),("u_pa1",4,4,3,"2 attributed corrections"),("u_pa2",3,4,3,"4 attributed corrections in Sept/Oct"),
                       ("u_int1",2,5,4,"1 fee-category correction")]:
    T("evaluations").append({"id":nid("ev"),"user_id":uid,"period":"2026-09","evaluator_user_id":next(u[4] for u in users if u[0]==uid),"skill":s,"will":w,"task_time":ttm,
       "trust_score":round(0.3*s+0.2*w+0.5*ttm,2),"notes":ev,"xp_suggestions":[],"confirmed":True,"created_at":ts(D(2026,10,1),17)})
for e in T("evaluations"):
    t=e["trust_score"]; e["band"]= "HIGH_TRUST" if t>=4.5 else "STEADY" if t>=3.5 else "NEEDS_DEVELOPMENT" if t>=2.5 else "PERFORMANCE_WARNING"

# ---------------- office executive ----------------
ab=[("ab_cr","Registrar of Copyrights","Copyright Office","Boudhik Sampada Bhawan, Plot 32, Sector 14, Dwarka, New Delhi","110078",None,None,"GOVT_OFFICE"),
    ("ab_po","Controller of Patents","Patent Office Chennai","Intellectual Property Office Building, Guindy, Chennai","600032",None,None,"GOVT_OFFICE"),
    ("ab_tbi","IPR Cell","Tungabhadra Institute of Technology","Survey No. 12, Riverside Campus, Hosapete","583201","+91 00000 10001","ipr.cell@tbi-demo.test","CLIENT"),
    ("ab_kvu","IPR Office","Kaveri Vidya University","University Road, Srirangapatna","571438","+91 00000 10002","ipr@kvu-demo.test","CLIENT"),
    ("ab_orb","Ms. Ananya Pai","Orbitron Robotics LLP","Unit 3, Old Port Industrial Estate, Udupi","576101","+91 00010 00013","ananya@orbitron-demo.test","CLIENT"),
    ("ab_sagar","Proprietor","Sagar Masala Co. (opposite party)","Shop 4, Market Road, Puttur","574201",None,None,"OTHER"),
    ("ab_firm","Managing Partner","Lextria Research (demo)","1-344C, Demo Lane, Udupi","576102","+91 00000 00000",None,"OTHER"),
    ("ab_hem","IP Desk","Hemadri Biotech Pvt Ltd","Plot 44, Biotech Park Phase 2, Dharwad","580011","+91 00000 10006","ip@hemadri-demo.test","CLIENT")]
for a in ab: T("address_book").append({"id":a[0],"name":a[1],"organization":a[2],"address":a[3],"pin":a[4],"phone":a[5],"email":a[6],"type":a[7]})
DSP={}
def dispatch(key,direction,d,carrier,trk,sender,recip,doctype,partic,codes,status,deliv=None,ad=False,cost=0,legal=False,batch=None):
    did=nid("dsp"); DSP[key]=did
    T("dispatches").append({"id":did,"serial_no":len(T("dispatches"))+1,"direction":direction,"booking_date":iso(d),"carrier":carrier,"tracking_id":trk,
      "sender_address_id":sender,"recipient_address_id":recip,"document_type":doctype,"particulars":partic,"status":status,"delivered_on":iso(deliv),
      "ad_card_received":ad,"cost":cost,"cash_entry_id":None,"legal_evidence":legal,"batch_id":batch,"created_by":"u_oe"})
    for c in codes: T("dispatch_project_links").append({"dispatch_id":did,"project_code_id":P(c)})
    return did
for i in range(1,6):
    dispatch(f"cr_sep{i}","OUTWARD",D(2026,9,3),"INDIA_SPEED_POST",f"JK0000{i:05d}IN","ab_firm","ab_cr","OTHER","Copyright application hard copy",[f"CR50{i:02d}"],"DELIVERED",D(2026,9,8),False,47,batch="batch_2026-09-03")
for i in range(6,11):
    dispatch(f"cr_oct{i}","OUTWARD",D(2026,10,3),"INDIA_SPEED_POST",f"JK0000{i+10:05d}IN","ab_firm","ab_cr","OTHER","Copyright application hard copy",[f"CR50{i:02d}"],"BOOKED",None,False,47,batch="batch_2026-10-03")
dispatch("lit_notice","OUTWARD",D(2026,9,15),"POSTAL_AD","RA000000101IN","ab_firm","ab_sagar","LEGAL_NOTICE","Legal notice — TM infringement & passing off",["LIT5002"],"DELIVERED",D(2026,9,18),True,62,legal=True)
dispatch("tbi04_form1","INWARD",D(2026,10,1),"PROFESSIONAL_COURIER","PC77001234","ab_tbi","ab_firm","FORMS_FOR_SIGNATURE","Signed Form 1 (TBI04) from institution",["TBI04"],"DELIVERED",D(2026,10,3),False,0)
dispatch("kvu01_poa","OUTWARD",D(2026,9,22),"INDIA_REGISTERED_POST","RK000000202IN","ab_firm","ab_kvu","POA","Form 26 for signature",["KVU03"],"IN_TRANSIT",None,False,52)   # pending > 7 days
dispatch("orb_docs","OUTWARD",D(2026,9,24),"INDIA_SPEED_POST","JK000000303IN","ab_firm","ab_orb","FORMS_FOR_SIGNATURE","Wrong address — reposted",["AR5006"],"RETURNED",None,False,47)
dispatch("orb_docs2","OUTWARD",D(2026,9,30),"INDIA_SPEED_POST","JK000000304IN","ab_firm","ab_orb","FORMS_FOR_SIGNATURE","Reposted to corrected address",["AR5006","TM5004"],"DELIVERED",D(2026,10,2),False,47)
dispatch("hem_renew","OUTWARD",D(2026,10,1),"PRIVATE_COURIER_SPEED","PVT0001122","ab_firm","ab_hem","COVER_LETTER","Renewal reminder & instruction form (year 10)",["AR5004"],"DELIVERED",D(2026,10,2),False,80)
# scans
for key,codes in [("lit_notice",["LIT5002"]),("cr_sep1",["CR5001"]),("tbi04_form1",["TBI04"])]:
    for kind in (["BOOKING_RECEIPT","DOCUMENT_COPY","PROOF_OF_DELIVERY","TRACKING_HISTORY"] if key=="lit_notice" else ["BOOKING_RECEIPT"]):
        did=doc(codes[0],"Postal & Courier",f"{key}_{kind.lower()}.pdf","u_oe",D(2026,9,18),False,{"dispatch_id":DSP[key],"scan_kind":kind})
# petty cash
CASH=[]
def office_receipt(cid,d):
    rid=nid("doc")
    T("documents").append({"id":rid,"project_code_id":None,"category":"Petty Cash Receipts","file_name":f"{cid}_receipt.jpg","file_type":"jpg","file_size":80000,
      "uploaded_by":"u_oe","uploaded_at":ts(d,17),"zoho_resource_id":"zr_demo_r_"+cid,"zoho_permalink":None,
      "workdrive_path":f"WorkDrive Root/Lextria Office/Petty Cash/{d.strftime('%Y-%m')}/{cid}_receipt.jpg","client_shared":False,"finance_only":False})
    return rid
def cash(d,typ,cat,desc,amt,mode="CASH",alloc=None,receipt=True,disp=None,by="u_oe",recoverable=True):
    cid=nid("cash")
    T("cash_entries").append({"id":cid,"entry_date":iso(d),"type":typ,"category":cat,"description":desc,"amount":amt,"payment_mode":mode,
       "paid_by":by,"receipt_document_id":office_receipt(cid,d) if receipt else None,"linked_dispatch_id":disp,"recoverable":recoverable if typ=="EXPENSE" else None,
       "affects_petty_cash_balance": mode=="CASH","created_at":ts(d,17)})
    for code,share in (alloc or []):
        T("cash_allocations").append({"id":nid("ca"),"cash_entry_id":cid,"project_code_id":P(code),"amount":share})
    if disp: T("dispatches")[[x["id"] for x in T("dispatches")].index(disp)]["cash_entry_id"]=cid
    CASH.append(cid); return cid
cash(D(2026,9,1),"TOP_UP","TOP_UP","Opening float for September",2000,alloc=None)
for i in range(1,6): cash(D(2026,9,3),"EXPENSE","INDIA_POST",f"Speed post CR50{i:02d}",47,alloc=[(f"CR50{i:02d}",47)],disp=DSP[f"cr_sep{i}"])
cash(D(2026,9,12),"EXPENSE","NOTARY","Notary & true copies — 5 copyright author declarations",250,alloc=[(f"CR50{i:02d}",50) for i in range(6,11)])
cash(D(2026,9,15),"EXPENSE","INDIA_POST","Postal AD — legal notice",62,alloc=[("LIT5002",62)],disp=DSP["lit_notice"])
cash(D(2026,9,16),"EXPENSE","STAMP_PAPER","Stamp paper ₹100 for licence agreement",100,alloc=[("AGR5001",100)])
cash(D(2026,9,22),"EXPENSE","INDIA_POST","Regd post Form 26 to KVU",52,alloc=[("KVU03",52)],disp=DSP["kvu01_poa"])
cash(D(2026,9,24),"EXPENSE","INDIA_POST","Speed post to Orbitron (returned)",47,alloc=[("AR5006",47)],disp=DSP["orb_docs"])
cash(D(2026,9,26),"EXPENSE","NOTARY","Notary — Form 26 copies (3 matters)",180,alloc=[("KVU01",60),("KVU02",60),("KVU03",60)])
cash(D(2026,9,28),"EXPENSE","PRINTING","Office printer toner",650,alloc=None,recoverable=False)
cash(D(2026,9,30),"EXPENSE","INDIA_POST","Speed post repost to Orbitron",47,alloc=[("AR5006",24),("TM5004",23)],disp=DSP["orb_docs2"])
cash(D(2026,10,1),"EXPENSE","PRIVATE_COURIER","Courier renewal pack to Hemadri",80,mode="FIRM_UPI",alloc=[("AR5004",80)],disp=DSP["hem_renew"])
cash(D(2026,10,1),"TOP_UP","TOP_UP","Top-up approved by finance",1000)
cash(D(2026,10,3),"EXPENSE","INDIA_POST","Speed post batch — 5 copyright applications",235,alloc=[(f"CR50{i:02d}",47) for i in range(6,11)])
for i in range(6,11): pass
cash(D(2026,10,3),"EXPENSE","BUS_PARCEL","Bus parcel — originals to TBI",60,alloc=[("TBI04",60)],receipt=False)  # needs review: no receipt
cash(D(2026,10,3),"EXPENSE","LOCAL_CONVEYANCE","Auto fare to notary",120,alloc=None,recoverable=False)
# link batch dispatches to batch cash entry
batch_cash = T("cash_entries")[-3]["id"]
for i in range(6,11): T("dispatches")[[x["id"] for x in T("dispatches")].index(DSP[f"cr_oct{i}"])]["cash_entry_id"]=batch_cash
T("topup_requests").append({"id":nid("tu"),"amount":1000,"reason":"Balance below threshold before CR batch","requested_by":"u_oe","requested_at":ts(D(2026,9,30),16),"status":"HANDED_OVER","approved_by":"u_fl","approved_at":ts(D(2026,10,1),10),"handed_over_at":ts(D(2026,10,1),11)})
T("topup_requests").append({"id":nid("tu"),"amount":1500,"reason":"Week of 5-Oct: notary for 14 copyright docs + post","requested_by":"u_oe","requested_at":ts(D(2026,10,5),9,15),"status":"REQUESTED","approved_by":None,"approved_at":None,"handed_over_at":None})
# compute balance
bal=0
for c in T("cash_entries"):
    if not c["affects_petty_cash_balance"]: c["balance_after"]=bal; continue
    bal += c["amount"] if c["type"] in ("TOP_UP","REFUND_IN") else -c["amount"]; c["balance_after"]=bal
PETTY_BAL=bal
T("cash_counts").append({"id":nid("cc"),"count_date":"2026-10-03","counted_by":"u_oe","physical_cash":PETTY_BAL-20,"book_balance":PETTY_BAL,"variance":-20,
   "note":"₹20 short — likely xerox not entered","finance_signoff_by":"u_fl","finance_signoff_at":ts(D(2026,10,3),18),"finance_note":"Accepted; add xerox entry going forward"})
# physical docs
for code,docn,orig,status,cost in [("TBI04","Signed Form 1 (hard copy)","ORIGINAL","RECEIVED",None),("KVU02","Signed Form 1 (hard copy)","ORIGINAL","SCANNED_UPLOADED",None),
    ("KVU03","Form 26 / POA","ORIGINAL","REQUESTED_FROM_CLIENT",None),("KVU01","Form 26 / POA (notarised copy)","COPY","SENT_FOR_NOTARY",None),
    ("TBI04","NOC from inventors","ORIGINAL","SENT_FOR_NOTARY",None),("AGR5001","Licence agreement — stamp paper","ORIGINAL","RECEIVED",None),
    ("CR5006","Author declaration","ORIGINAL","NOTARIZED",None)]:
    T("physical_documents").append({"id":nid("phd"),"project_code_id":P(code),"document":docn,"original_or_copy":orig,"status":status,"pages":None,"notary_cash_entry_id":None,"scan_document_id":None,"updated_at":ts(D(2026,10,3),15)})
T("custody_items").extend([{"id":"cust_dsc1","item":"DSC token — Managing Partner","type":"DSC"},{"id":"cust_dsc2","item":"DSC token — Operations Partner","type":"DSC"},{"id":"cust_phone","item":"Office phone (OTP)","type":"PHONE"}])
T("custody_log").extend([
 {"id":nid("cl"),"custody_item_id":"cust_dsc1","holder_user_id":"u_ops","out_at":ts(TODAY,9,30),"expected_return":ts(TODAY,19),"in_at":None},
 {"id":nid("cl"),"custody_item_id":"cust_phone","holder_user_id":"u_pa2","out_at":ts(TODAY,9,40),"expected_return":ts(TODAY,19),"in_at":None},
 {"id":nid("cl"),"custody_item_id":"cust_dsc1","holder_user_id":"u_ops","out_at":ts(D(2026,10,3),9,30),"expected_return":ts(D(2026,10,3),19),"in_at":ts(D(2026,10,3),21,5)},
 {"id":nid("cl"),"custody_item_id":"cust_dsc2","holder_user_id":"u_sa2","out_at":ts(D(2026,9,20),10),"expected_return":ts(D(2026,9,20),18),"in_at":ts(D(2026,9,20),17)}])
for code,req,desc,prio,due,status,by in [("TBI04","u_pa1","Get NOC from inventors notarised (2 copies)","HIGH",TODAY,"IN_PROGRESS","u_oe"),
    ("AGR5001","u_agr","Buy ₹100 stamp paper for licence agreement","NORMAL",D(2026,9,16),"DONE","u_oe"),
    ("AR5006","u_pl1","Courier signed Form 1 & POA pack to Orbitron (corrected address)","NORMAL",D(2026,9,30),"DONE","u_oe"),
    ("KVU03","u_pa2","Follow up on Form 26 registered post — not delivered after 13 days","HIGH",TODAY,"OPEN",None),
    ("CR5007","u_sip","Notarise 14 copyright author declarations","NORMAL",D(2026,10,6),"OPEN",None)]:
    T("office_requests").append({"id":nid("or"),"project_code_id":P(code),"requested_by":req,"description":desc,"priority":prio,"due_date":iso(due),"status":status,"accepted_by":by,"created_at":ts(due-dt.timedelta(days=1),12),"completed_links":[]})

# ---------------- client portal accounts (one login per client) ----------------
for cid,c in CLI.items():
    T("client_portal_accounts").append({"id":"cpa_"+c["client_code"][-4:],"client_id":cid,
      "login_email":c["email"],"login_phone":c["phone"],"password_set": cid!="cli_1004","default_otp_channel":"EMAIL" if cid!="cli_1003" else "SMS",
      "status":"ACTIVE" if cid!="cli_1004" else "INVITED","invited_at":ts(D(2026,9,1)),"activated_at":ts(D(2026,9,3)) if cid!="cli_1004" else None,
      "last_login_at":ts(D(2026,10,3),11) if cid in("cli_1001","cli_1003") else None,"failed_otp_attempts":0,"locked_until":None,
      "contact_change_requests":[]})
# a pending change of registered email (must be verified on both old and new contact, approved by SPOC)
T("client_portal_accounts")[2]["contact_change_requests"].append({"field":"login_email","new_value":"ip.desk@nimbus-demo.test","requested_at":ts(D(2026,10,4),15),
   "requested_via":"Email from client to SPOC","verified_old":True,"verified_new":False,"approved_by":None,"status":"PENDING_VERIFICATION"})
T("client_portal_settings").append({"auth":{"method":"PASSWORD_PLUS_OTP","otp_channels_allowed":["EMAIL","SMS"],"otp_length":6,"otp_validity_minutes":10,"max_attempts":5,"lockout_minutes":30,
   "session_timeout_minutes":30,"remember_device_days":0,"sms_note":"SMS OTP in India requires DLT-registered sender ID and template before go-live; demo simulates OTP on screen"},
   "actions_enabled":{"approve_drafts":False,"upload_requested_documents":False,"raise_query":False,"form27_questionnaire":False},
   "note":"One login per client. Institutions manage who uses it internally. v1 is read-only."})
T("client_access_log").extend([
 {"id":nid("cal"),"client_portal_account_id":"cpa_1001","event":"LOGIN_PASSWORD_OTP_EMAIL","project_code_id":None,"document_id":None,"at":ts(D(2026,10,3),11)},
 {"id":nid("cal"),"client_portal_account_id":"cpa_1001","event":"VIEW_MATTER","project_code_id":P("TBI01"),"document_id":None,"at":ts(D(2026,10,3),11,2)},
 {"id":nid("cal"),"client_portal_account_id":"cpa_1001","event":"DOWNLOAD","project_code_id":P("TBI01"),"document_id":DOC["tbi01_ps_ack"],"at":ts(D(2026,10,3),11,3)},
 {"id":nid("cal"),"client_portal_account_id":"cpa_1003","event":"LOGIN_PASSWORD_OTP_SMS","project_code_id":None,"document_id":None,"at":ts(D(2026,10,3),11,30)},
 {"id":nid("cal"),"client_portal_account_id":"cpa_1003","event":"VIEW_MATTER","project_code_id":P("LIT5001"),"document_id":None,"at":ts(D(2026,10,3),11,31)}])

# ---------------- employee reimbursements (bill-based, Finance approves) ----------------
T("reimbursement_policy").append({"bill_required":True,"bill_override_roles":["FINANCE_LEAD","SUPER_ADMIN"],"claim_window_days":60,
  "approval_chain":["REPORTING_MANAGER","FINANCE"],"manager_fallback":"Claimant with no reporting manager (founders) -> the other SUPER_ADMIN","payout_cycle":"WEEKLY_FRIDAY",
  "note":"Every claim needs a bill. Reporting manager approves first, then Finance. Nobody approves their own claim, and the same person cannot give both approvals. Claim window is an illustrative setting. Payroll/tax treatment per CA."})
RC={}
def claim(key,uid,d,cat,desc,amt,mode,status,fin=None,fin_at=None,codes=(),note=None,dup=None,bill=True,override=None,mgr=None,mgr_at=None):
    cid=nid("rmb"); RC[key]=cid
    T("reimbursement_claims").append({"id":cid,"claimant_user_id":uid,"expense_date":iso(d),"submitted_at":ts(d+dt.timedelta(days=1),18),"category":cat,
      "description":desc,"amount":amt,"paid_with":mode,"bill_document_id":(office_receipt("rmb_"+cid,d) if bill else None),"bill_override":override,
      "status":status,"manager_user_id":next(u[4] for u in users if u[0]==uid) or ("u_sa2" if uid=="u_sa1" else "u_sa1"),
      "manager_decision_by":mgr,"manager_decision_at":ts(mgr_at,12) if mgr_at else None,"finance_decision_by":fin,"finance_decision_at":ts(fin_at,15) if fin_at else None,"query_note":note,"duplicate_suspect_of":dup,"payout_id":None})
    for code,share in codes:
        T("reimbursement_allocations").append({"id":nid("ra"),"claim_id":cid,"project_code_id":P(code),"amount":share})
    return cid
claim("oe_fuel_sep","u_oe",D(2026,9,30),"FUEL","Petrol bills — own two-wheeler, September errands (3 bills)",780,"OWN_CASH","PAID",fin="u_fl",fin_at=D(2026,10,1),mgr="u_sa2",mgr_at=D(2026,10,1))
claim("oe_fuel_oct","u_oe",D(2026,10,3),"FUEL","Petrol bill — own two-wheeler, 1–3 Oct errands",300,"OWN_UPI","SUBMITTED")
claim("ops_ext","u_ops",D(2026,9,29),"PURCHASE","Extension board + LAN cable from cash-only hardware shop (server room outage)",640,"OWN_CASH","FINANCE_APPROVED",fin="u_fe1",fin_at=D(2026,10,2),mgr="u_sa2",mgr_at=D(2026,9,30))
claim("ops_dsc","u_ops",D(2026,10,2),"PURCHASE","USB token reader for DSC (shop accepted cash only)",950,"OWN_CASH","MANAGER_APPROVED",mgr="u_sa2",mgr_at=D(2026,10,3))
claim("oe_dup","u_oe",D(2026,10,3),"POSTAGE_COURIER","Bus parcel — originals to TBI",60,"OWN_CASH","QUERIED",note="Same date, amount and description as a petty cash entry — paid from petty cash or your own money?",
      dup={"table":"cash_entries","id":next(c["id"] for c in T("cash_entries") if c["category"]=="BUS_PARCEL")})
claim("pa2_auto","u_pa2",D(2026,9,24),"TRAVEL","Auto fare to KVU to collect signatures",350,"OWN_UPI","REJECTED",mgr="u_ph",mgr_at=D(2026,9,25),
      note="Rejected by reporting manager (Paralegal Head): trip was cancelled; client couriered the documents — never reached Finance",codes=[("KVU03",350)])
claim("sa1_travel","u_sa1",D(2026,9,18),"TRAVEL","Train tickets — client meeting (Nimbus) Bengaluru",1240,"OWN_CARD","FINANCE_APPROVED",fin="u_fl",fin_at=D(2026,9,22),codes=[("LIT5001",1240)],mgr="u_sa2",mgr_at=D(2026,9,19))
claim("fe2_stamp","u_fe2",D(2026,9,25),"FEE_PAID_PERSONALLY","Court fee stamps for urgent filing (paid personally)",500,"OWN_CASH","FINANCE_APPROVED",fin="u_fe1",fin_at=D(2026,9,27),mgr="u_fl",mgr_at=D(2026,9,26),codes=[("LIT5001",500)],
      note="Finance Exec 2's own claim — manager step by Finance Lead, Finance step by Finance Exec 1 (two different people, neither the claimant)")
claim("int2_old","u_int2",D(2026,7,20),"PURCHASE","Printing of court paper books (shop near court, cash only)",420,"OWN_CASH","SUBMITTED",codes=[("LIT5001",420)],
      note="Older than the 60-day claim window — after the manager step it also needs SUPER_ADMIN approval")
claim("oe_lost","u_oe",D(2026,9,19),"POSTAGE_COURIER","Courier to Hemadri — bill lost",120,"OWN_CASH","FINANCE_APPROVED",fin="u_fl",fin_at=D(2026,9,24),mgr="u_sa2",mgr_at=D(2026,9,22),bill=False,
      override={"by":"u_fl","reason":"Courier receipt lost; courier tracking printout attached instead","at":ts(D(2026,9,24),15)},codes=[("AR5004",120)])
T("reimbursement_payouts").append({"id":"rpo_0001","payout_date":"2026-10-02","method":"BANK_TRANSFER","reference":"UTR-DEMO-RMB-0002",
   "claim_ids":[RC["oe_fuel_sep"]],"total":780,"paid_by":"u_fe1","note":"Weekly Friday payout"})
for c in T("reimbursement_claims"):
    if c["id"]==RC["oe_fuel_sep"]: c["payout_id"]="rpo_0001"
# approved & allocated recoverable claims -> disbursements to client ledger (same rule as office expenses)
# ---------------- finance: invoices, payments, advances, disbursements ----------------
def inv(no,date,cli,stage_ids,disb_ids=(),notes=None):
    iid=nid("inv"); stages=[s for s in T("billing_stages") if s["id"] in stage_ids]
    prof=sum(s["allocated_amount"] for s in stages); gst=round(prof*0.18)
    disb=[x for x in T("disbursements") if x["id"] in disb_ids]; reimb=sum(x["amount"] for x in disb)
    T("invoice_refs").append({"id":iid,"zoho_books_invoice_no":no,"invoice_date":iso(date),"client_id":cli,"professional_taxable":prof,"gst_amount":gst,
       "reimbursement_amount":reimb,"total_amount":prof+gst+reimb,"notes":notes})
    for s in stages: s["billing_status"]="INVOICED"; s["invoice_ref_id"]=iid; T("invoice_ref_stage_links").append({"invoice_ref_id":iid,"billing_stage_id":s["id"]})
    for x in disb: x["recovered_via_invoice_ref_id"]=iid; T("invoice_ref_disbursement_links").append({"invoice_ref_id":iid,"disbursement_id":x["id"]})
    return iid
def pay(cli,d,gross,tds,mode,ref,allocs):
    pid=nid("pay")
    T("payments").append({"id":pid,"client_id":cli,"received_date":iso(d),"gross_amount":gross,"tds_amount":tds,"net_amount":gross-tds,"mode":mode,"reference":ref})
    for target_type,tid,amt in allocs: T("payment_allocations").append({"payment_id":pid,"target_type":target_type,"target_id":tid,"amount":amt})
    return pid
def disb(cli,code,src_type,src_id,d,desc,amt,recoverable=True,posting=None,note=None):
    x={"id":nid("dsb"),"client_id":cli,"project_code_id":P(code) if code else None,"source_type":src_type,"source_id":src_id,"date":iso(d),
       "description":desc,"amount":amt,"recoverable":recoverable,
       "ledger_posting_status":posting or ("AUTO_POSTED" if recoverable else "NOT_RECOVERABLE"),"posted_at":ts(d,18) if (posting or "AUTO_POSTED")=="AUTO_POSTED" and recoverable else None,
       "recovered_via_invoice_ref_id":None,"review_note":note}
    T("disbursements").append(x); return x["id"]
# govt-fee disbursements
gfmap={g["id"]:g for g in T("govt_fee_requests")}
for g in T("govt_fee_requests"):
    if g["status"] in ("PAID","RECONCILED") and g["recoverable_from_client"] and g["computed_amount"]>0:
        code=next(p["code"] for p in T("project_codes") if p["id"]==g["project_code_id"])
        disb(PC[code]["client_id"],code,"GOVT_FEE",g["id"],dt.date.fromisoformat(g["paid_at"][:10]),f"Govt fee {g['form']} ({code})",g["computed_amount"])
# office-expense disbursements (from cash allocations)
for c in T("cash_entries"):
    if c["type"]!="EXPENSE" or not c["recoverable"]: continue
    allocs=[a for a in T("cash_allocations") if a["cash_entry_id"]==c["id"]]
    for a in allocs:
        code=next(p["code"] for p in T("project_codes") if p["id"]==a["project_code_id"])
        posting = "AUTO_POSTED" if c["receipt_document_id"] else "NEEDS_REVIEW"
        disb(PC[code]["client_id"],code,"OFFICE_EXPENSE",c["id"],dt.date.fromisoformat(c["entry_date"]),f"{c['category'].replace('_',' ').title()}: {c['description']}",a["amount"],
             posting=posting,note=("No receipt attached — finance to confirm" if posting=="NEEDS_REVIEW" else None))
# employee reimbursement allocations -> disbursements (only once FINANCE_APPROVED or PAID)
for c in T("reimbursement_claims"):
    if c["status"] not in ("FINANCE_APPROVED","PAID"): continue
    for a in [x for x in T("reimbursement_allocations") if x["claim_id"]==c["id"]]:
        code=next(p["code"] for p in T("project_codes") if p["id"]==a["project_code_id"])
        disb(PC[code]["client_id"],code,"EMPLOYEE_REIMBURSEMENT",c["id"],dt.date.fromisoformat(c["finance_decision_at"][:10]),
             f"{c['category'].replace('_',' ').title()}: {c['description']}",a["amount"])
# a reversed one (misallocated) for demo
rev=disb("cli_1003","TM5001","OFFICE_EXPENSE",None,D(2026,9,20),"Notary — wrongly allocated to Nimbus",90,posting="REVERSED",note="Reversed by Finance Lead: belonged to Coastal Spice")
# invoices
dmap={x["id"]:x for x in T("disbursements")}
tbi01=inv("INV-DEMO-0101",D(2025,11,25),"cli_1001",[STG["TBI01"][0]["id"]],[x for x in dmap if dmap[x]["source_id"]==GF["tbi01_ps"]],"PS stage + Form 1 fee")
tbi03=inv("INV-DEMO-0088",D(2024,10,20),"cli_1001",[STG["TBI03"][0]["id"],STG["TBI03"][1]["id"]])
kvu01a=inv("INV-DEMO-0120",D(2025,12,20),"cli_1002",[STG["KVU01"][0]["id"]])
kvu02a=inv("INV-DEMO-0115",D(2025,10,10),"cli_1002",[STG["KVU02"][0]["id"]])
cr_sep=inv("INV-DEMO-0201",D(2026,9,10),"cli_1002",[STG[f"CR50{i:02d}"][0]["id"] for i in range(1,6)],[x for x in dmap if dmap[x]["description"].startswith("India Post: Speed post CR50") and dmap[x]["date"]=="2026-09-03"],"5 copyright filings + postage")
ar5001=inv("INV-DEMO-0045",D(2024,12,5),"cli_1003",[s["id"] for s in STG["AR5001"]])
ar5002=inv("INV-DEMO-0170",D(2026,4,5),"cli_1004",[STG["AR5002"][0]["id"]])
tm5001=inv("INV-DEMO-0130",D(2025,11,15),"cli_1003",[STG["TM5001"][0]["id"]])
lit=inv("INV-DEMO-0150",D(2026,6,5),"cli_1003",[STG["LIT5001"][0]["id"]])
agr1=inv("INV-DEMO-0190",D(2026,9,8),"cli_1006",[STG["AGR5001"][0]["id"]])
ds1=inv("INV-DEMO-0175",D(2026,7,10),"cli_1005",[STG["DS5001"][0]["id"]])
misc3=inv("INV-DEMO-0210",D(2026,9,20),"cli_1007",[],notes="Misc vendor job MISC5003 (DP KYC) — no billing stages; amount from misc_jobs.amount_charged")
_m=next(x for x in T("invoice_refs") if x["id"]==misc3); _m.update({"professional_taxable":2400,"gst_amount":432,"total_amount":2832,"misc_job_id":"mj_MISC5003"})
agr2=inv("INV-DEMO-0160",D(2026,6,12),"cli_1003",[s["id"] for s in STG["AGR5002"]])
# NOTE: invoice total includes reimbursements; when a disbursement was already AUTO_POSTED to the ledger, the invoice's ledger debit excludes it (see ledger rules).
def itot(i): return next(x for x in T("invoice_refs") if x["id"]==i)["total_amount"]
def iprof(i): r=next(x for x in T("invoice_refs") if x["id"]==i); return r["professional_taxable"]+r["gst_amount"]
pay("cli_1001",D(2024,11,20),itot(tbi03),round(next(x for x in T("invoice_refs") if x["id"]==tbi03)["professional_taxable"]*0.10),"NEFT","UTR-DEMO-1001",[("INVOICE",tbi03,itot(tbi03))])
pay("cli_1001",D(2025,12,30),itot(tbi01),round(next(x for x in T("invoice_refs") if x["id"]==tbi01)["professional_taxable"]*0.10),"NEFT","UTR-DEMO-1002",[("INVOICE",tbi01,itot(tbi01))])
pay("cli_1002",D(2025,11,15),itot(kvu02a),2025,"NEFT","UTR-DEMO-2001",[("INVOICE",kvu02a,itot(kvu02a))])
pay("cli_1002",D(2026,2,10),20000,1800,"NEFT","UTR-DEMO-2002",[("INVOICE",kvu01a,20000)])   # partial
pay("cli_1003",D(2025,1,10),itot(ar5001),6000,"NEFT","UTR-DEMO-3001",[("INVOICE",ar5001,itot(ar5001))])
pay("cli_1003",D(2025,12,1),itot(tm5001),600,"UPI","UTR-DEMO-3002",[("INVOICE",tm5001,itot(tm5001))])
pay("cli_1003",D(2026,7,20),itot(lit),6000,"NEFT","UTR-DEMO-3003",[("INVOICE",lit,itot(lit))])
pay("cli_1005",D(2026,8,1),itot(ds1),800,"NEFT","UTR-DEMO-5001",[("INVOICE",ds1,itot(ds1))])
pay("cli_1004",D(2026,4,10),itot(ar5002),0,"UPI","UTR-DEMO-4001",[("INVOICE",ar5002,itot(ar5002))])
T("advances").append({"id":nid("adv"),"client_id":"cli_1007","received_date":"2026-09-25","amount":50000,"reference":"UTR-DEMO-7001","allocated_amount":0,"note":"Advance against AR5006 & TM5004 — not yet invoiced"})
T("advances").append({"id":nid("adv"),"client_id":"cli_1003","received_date":"2026-09-14","amount":10000,"reference":"UTR-DEMO-3004","allocated_amount":0,"note":"Advance for hearing (AR5001 v2 quote)"})
# mark paid stages
paid_inv={a["target_id"] for a in T("payment_allocations") if a["target_type"]=="INVOICE"}
for s in T("billing_stages"):
    if s["invoice_ref_id"] in paid_inv:
        tot=sum(a["amount"] for a in T("payment_allocations") if a["target_id"]==s["invoice_ref_id"])
        if tot>=itot(s["invoice_ref_id"]): s["billing_status"]="PAID"

# ---------------- vendors & misc ----------------
T("vendors").extend([
 {"id":"ven_01","name":"Ganga Compliance Associates (demo)","contact_person":"Mr. R. Menon","phone":"+91 00020 00001","email":"desk@ganga-demo.test","gstin":"29AAAFG0001H1Z1","pan":"AAAFG0001H","services":["ROC_ANNUAL_FILING","DIR_KYC","INCORPORATION"],"rate_card":{"ROC_ANNUAL_FILING":6000,"DIR_KYC":800,"INCORPORATION":9000},"active":True},
 {"id":"ven_02","name":"TaxEase GST Services (demo)","contact_person":"Ms. S. Rao","phone":"+91 00020 00002","email":"ops@taxease-demo.test","gstin":"29AAAFT0002J1Z2","pan":"AAAFT0002J","services":["GST_REGISTRATION","GST_AMENDMENT"],"rate_card":{"GST_REGISTRATION":2500,"GST_AMENDMENT":1500},"active":True}])
for code,wt,ven,status,cdue,sdue,charge,cost,invno,vbill,vpay,vtds in [
 ("MISC5001","GST_AMENDMENT","ven_02","IN_PROGRESS",D(2026,10,15),None,4000,1500,None,None,"UNPAID",0),
 ("MISC5002","ROC_ANNUAL_FILING","ven_01","AWAITING_CLIENT_DOCS",D(2026,10,25),D(2026,10,30),12000,6000,None,None,"UNPAID",0),
 ("MISC5003","DIR_KYC","ven_01","SENT_TO_VENDOR",D(2026,9,28),D(2026,9,30),2400,1600,"INV-DEMO-0210","GCA/26-27/118","PAID",160)]:
    T("misc_jobs").append({"id":"mj_"+code,"project_code_id":P(code),"client_id":PC[code]["client_id"],"work_type":wt,"description":PC[code]["title"],"vendor_id":ven,
      "assigned_date":iso(dt.date.fromisoformat(PC[code]["created_at"][:10])+dt.timedelta(days=1)),"status":status,"client_due_date":iso(cdue),"statutory_due_date":iso(sdue),
      "amount_charged":charge,"vendor_cost":cost,"margin_amount":charge-cost,"margin_percent":round((charge-cost)*100/charge,1),
      "zoho_books_invoice_no":invno,"vendor_bill_no":vbill,"vendor_bill_date":"2026-09-20" if vbill else None,"vendor_payment_status":vpay,"vendor_paid_date":"2026-09-22" if vpay=="PAID" else None,"vendor_tds":vtds})

# ---------------- tasks, tickets, escalations, notifications ----------------
for code,title,dep,assignee,status,due,ttype in [("TBI02","Revise PS draft v2 after co-lead return","IP_PATENT","u_dr2","IN_PROGRESS",D(2026,10,8),"PS"),
   ("TBI03","Draft FER response (formal objections)","IP_PATENT","u_dr3","REVIEW",D(2026,10,20),"FER_RESPONSE"),
   ("AR5006","Draft PS — hull-cleaning crawler","IP_PATENT","u_dr1","TODO",D(2026,10,25),"PS"),
   ("AR5001","Prepare hearing written submission","IP_PATENT","u_dr2","REVIEW",D(2026,10,20),"WRITTEN_SUBMISSION"),
   ("TM5001","Draft reply to TM examination report","IP_SOFT","u_sip","REVIEW",D(2026,10,20),"TM_REPLY"),
   ("CR5005","Respond to copyright discrepancy","IP_SOFT","u_sip","TODO",D(2026,10,25),"CR_FILING"),
   ("LIT5001","Prepare arguments note for I.A.","LITIGATION","u_lit","IN_PROGRESS",D(2026,10,10),"OTHER"),
   ("AGR5001","Incorporate counterparty comments (v4)","AGREEMENT","u_agr","TODO",D(2026,10,9),"OTHER"),
   ("AR5002","Resolve duplicate code AR5010","IP_PATENT","u_dm","TODO",D(2026,10,6),"OTHER")]:
    T("tasks").append({"id":nid("tsk"),"project_code_id":P(code),"title":title,"department":dep,"assignee_user_id":assignee,"status":status,"due_date":iso(due),"task_type":ttype,"created_at":ts(D(2026,9,28))})
T("query_tickets").append({"id":nid("qt"),"project_code_id":P("TBI04"),"subject":"Inventor order conflict — IDF vs signed Form 1","context":"Signed Form 1 lists Ms. Shruti Nayak first; IDF lists Mr. Kiran Bhandary first. Filing blocked.","inventors_summary":"Mr. Kiran Bhandary; Ms. Shruti Nayak (TBI)","contact_details":"+91 00010 00003 / +91 00010 00002","raised_by":"u_pa2","assigned_to":"u_pl1","status":"OPEN","priority":"HIGH","created_at":ts(D(2026,10,3),16,30),
   "messages":[{"by":"u_pa2","at":ts(D(2026,10,3),16,30),"text":"Which order is correct?"},{"by":"u_pl1","at":ts(D(2026,10,3),18),"text":"Checking with Dr. Hegde tomorrow morning."}]})
T("query_tickets").append({"id":nid("qt"),"project_code_id":P("KVU03"),"subject":"Form 26 not received from client","context":"Regd post sent 22-Sep still in transit.","inventors_summary":"Mr. Rohan D'Costa (KVU)","contact_details":"+91 00010 00005","raised_by":"u_pa2","assigned_to":"u_oe","status":"OPEN","priority":"NORMAL","created_at":ts(D(2026,10,4),11),"messages":[]})
T("escalations").append({"id":nid("esc"),"project_code_id":P("TBI04"),"client_id":"cli_1001","raised_by":"u_pl1","raised_at":ts(D(2026,10,5),9),"status":"OPEN",
   "issue_summary":"Inventor order dispute blocks CS filing (internal target 7-Oct)","tried":"Asked IPR cell; inventors disagree on order","decision_needed":"Founder to call institution IPR head and confirm order per institutional policy"})
for uid,text,link in [("u_fl","Govt fee request for KVU01 Form 18 awaiting approval","govt_fee_requests"),("u_ph","End-of-day ACK reconciliation for 3-Oct was missed (escalated)","checklist_instances"),
   ("u_sa1","Escalation: TBI04 inventor order dispute","escalations"),("u_ph","Paralegal A unavailable 5–7 Oct: 4 deadlines routed to backups","user_availability"),
   ("u_fl","Top-up request ₹1,500 from Office Executive","topup_requests"),("u_pl1","Draft AR5001 written submission overdue at co-lead review","draft_documents")]:
    T("notifications").append({"id":nid("nt"),"user_id":uid,"text":text,"link_entity":link,"created_at":ts(TODAY,9),"read":False})
T("cliq_outbox").append({"id":nid("cq"),"channel":"#patent-filing","card":{"title":"KVU02 · 202541000202 — proceed for e-sign","by":"Ops & Systems Admin"},"logged_at":ts(TODAY,9,35)})

# ---------------- timeline events (client-visible mapping) ----------------
def tl(code,etype,title,d,actor,cv,label=None,detail=None):
    T("timeline_events").append({"id":nid("tl"),"project_code_id":P(code),"event_type":etype,"title":title,"detail":detail,"occurred_at":ts(d,15),"actor_user_id":actor,"client_visible":cv,"client_label":label})
tl("TBI01","STATUS_CHANGED","PS filed — app 202641000101",D(2025,11,20),"u_pa1",True,"Provisional application filed")
tl("TBI01","REVIEW_RETURNED","External review returned with 1 critical",D(2026,9,22),"u_ext",False)
tl("TBI01","STATUS_CHANGED","CS under internal review",D(2026,9,30),"u_dr1",True,"Complete specification being finalised")
tl("TBI04","FILING_CORRECTION","Correction: inventor order mismatch",D(2026,10,3),"u_pa2",False)
tl("TBI04","STATUS_CHANGED","CS approved by client",D(2026,9,12),"u_pl1",True,"You approved the complete specification")
tl("KVU01","STATUS_CHANGED","CS filed",D(2026,9,25),"u_pa2",True,"Complete specification filed")
tl("KVU01","STAGE_COMPLETED","Billing stage CS_FILING completed — ready to invoice",D(2026,9,25),None,False)
tl("TBI03","STATUS_CHANGED","FER received",D(2026,7,21),"u_dm",True,"Examination report received — response being prepared")
tl("AR5001","STATUS_CHANGED","Hearing scheduled 14-Oct-2026",D(2026,9,12),"u_dm",True,"Hearing scheduled at the Patent Office")
tl("AR5003","STATUS_CHANGED","Renewal year 8 paid",D(2026,2,20),"u_pa1",True,"Renewal fee paid (year 8)")
tl("AR5004","STATUS_CHANGED","Renewal reminder sent (year 10)",D(2026,10,1),"u_pa1",True,"Renewal due 02-Nov-2026 — your instruction needed")
tl("LIT5001","HEARING","Hearing 18-Aug: defendant appeared",D(2026,8,18),"u_lit",True,"Hearing held — next date 12-Oct-2026")
tl("LIT5001","INTERNAL_NOTE","Strategy memo uploaded",D(2026,9,30),"u_lit",False)
tl("LIT5002","DISPATCH","Legal notice delivered",D(2026,9,18),"u_oe",True,"Legal notice delivered to opposite party")
tl("AGR5001","VERSION_SENT","v3 sent to counterparty",D(2026,9,29),"u_agr",True,"Draft v3 sent to the other side")
tl("AGR5003","VERSION_SENT","v1 internal draft",D(2026,9,26),"u_agr",False)
tl("AGR5003","VERSION_SENT","v2 sent to client",D(2026,10,1),"u_agr",True,"Draft v2 shared for your review")
for i in range(6,11): tl(f"CR50{i:02d}","DISPATCH","Hard copy dispatched to Copyright Office",D(2026,10,3),"u_oe",True,"Application hard copy posted to the Copyright Office")
tl("TM5001","STATUS_CHANGED","Examination report received",D(2026,9,28),"u_sip",True,"Examination report received — reply being prepared")

# ---------------- client status map ----------------
csm = [("PATENT","PS_DRAFTING","Provisional specification being drafted"),("PATENT","PS_FILED","Provisional application filed"),("PATENT","CS_DRAFTING","Complete specification being drafted"),
 ("PATENT","CS_FILED","Complete specification filed"),("PATENT","PUBLISHED","Application published"),("PATENT","RFE_FILED","Examination requested"),
 ("PATENT","FER_ISSUED","Examination report received"),("PATENT","FER_RESPONSE_DRAFTING","Examination report received — response being prepared"),
 ("PATENT","FER_REPLY_FILED","Response to examination report filed"),("PATENT","HEARING_SCHEDULED","Hearing scheduled at the Patent Office"),
 ("PATENT","GRANTED","Patent granted"),("PATENT","LAPSED","Patent lapsed"),
 ("FILING_JOB","QUEUED","Filing in preparation"),("FILING_JOB","PREPARED","Filing in preparation"),("FILING_JOB","IN_CHECK","Filing in preparation"),
 ("FILING_JOB","CORRECTIONS_REQUIRED","Filing in preparation"),("FILING_JOB","ON_HOLD","Awaiting documents"),("FILING_JOB","CLEARED_FOR_ESIGN","Filing in progress"),
 ("FILING_JOB","E_SIGNED","Filing in progress"),("FILING_JOB","PAYMENT_PENDING","Filing in progress"),("FILING_JOB","PAID","Filing in progress"),
 ("FILING_JOB","ACK_UPLOADED","Filed"),("FILING_JOB","CLOSED","Filed"),
 ("TRADEMARK","OBJECTED","Examination report received — reply being prepared"),("TRADEMARK","OPPOSED","Opposition filed by third party — we are responding"),
 ("TRADEMARK","REGISTERED","Registered"),("TRADEMARK","AWAITING_CLIENT_APPROVAL","Awaiting your approval"),
 ("COPYRIGHT","FILED","Application filed"),("COPYRIGHT","SCRUTINY","Under scrutiny at the Copyright Office"),("COPYRIGHT","DISCREPANCY_RAISED","Copyright Office raised a query — reply being prepared"),("COPYRIGHT","REGISTERED","Registered"),
 ("DESIGN","UNDER_EXAMINATION","Under examination"),("DESIGN","REGISTERED","Registered"),
 ("LITIGATION","LEGAL_NOTICE_SERVED","Legal notice served"),("LITIGATION","INTERIM_APPLICATION_ARGUMENTS","Interim application listed for arguments"),
 ("AGREEMENT","CLIENT_REVIEW","Draft shared for your review"),("AGREEMENT","COUNTERPARTY_REVIEW","With the other side for review"),("AGREEMENT","FINALIZED","Finalised"),
 ("APPROVAL","AWAITING","Awaiting your approval"),("APPROVAL","APPROVED","Approved by you"),("APPROVAL","APPROVED_WITH_CHANGES","Approved by you with changes"),("APPROVAL","CHANGES_REQUESTED","Changes requested by you")]
for a,b,c in csm: T("client_status_map").append({"domain":a,"internal_status":b,"client_label":c})

# ---------------- audit sample ----------------
T("audit_log").extend([
 {"id":nid("au"),"actor_user_id":"u_sa1","action":"OVERRIDE_CLIENT_APPROVAL_GATE","entity":"approval_requests","entity_id":next(a["id"] for a in T("approval_requests") if a["project_code_id"]=="pc_KVU02"),"at":ts(TODAY,9),"before":{"status":"AWAITING"},"after":{"superadmin_override":"deemed approval"}},
 {"id":nid("au"),"actor_user_id":"u_fl","action":"REVERSE_DISBURSEMENT","entity":"disbursements","entity_id":rev,"at":ts(D(2026,9,21),11),"before":{"ledger_posting_status":"AUTO_POSTED"},"after":{"ledger_posting_status":"REVERSED"}}])

# ---------------- write ----------------
out="/home/claude/seed/out/seed"; import shutil; shutil.rmtree(out,ignore_errors=True); os.makedirs(out,exist_ok=True)
for k,v in DB.items():
    with open(f"{out}/{k}.json","w") as f: json.dump(v,f,indent=2,ensure_ascii=False)
json.dump({"PETTY_BAL":PETTY_BAL}, open("/home/claude/seed/out/_meta.json","w"))
print({k:len(v) for k,v in DB.items()}); print("petty",PETTY_BAL)
