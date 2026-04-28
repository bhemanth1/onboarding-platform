SET search_path TO dana;

TRUNCATE TABLE
    audit_logs,
    hil_gates,
    post_onboarding_items,
    provisioning_items,
    documents,
    follow_ups,
    pre_onboarding_tasks,
    onboarding_cases,
    candidates,
    role_profiles
RESTART IDENTITY CASCADE;

CREATE TEMP TABLE seed_cases (
    idx INT,
    case_number VARCHAR(50),
    employee_id VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    personal_email VARCHAR(255),
    role VARCHAR(100),
    department VARCHAR(100),
    phase VARCHAR(50),
    status VARCHAR(80),          -- BRD 11-state values
    progress INT,
    it_status VARCHAR(50),
    docs_status VARCHAR(50),
    sla_breach BOOLEAN,
    hil_decision VARCHAR(50),
    nationality VARCHAR(100),
    grade_band VARCHAR(20),
    mgr_notif_status VARCHAR(30),
    welcome_status VARCHAR(30),
    statutory_form VARCHAR(50),
    hr_signoff VARCHAR(30),
    it_notif_failed BOOLEAN,
    it_action_open BOOLEAN
) ON COMMIT DROP;

-- status column uses BRD 11-state machine values plus legacy compat values
INSERT INTO seed_cases VALUES
    (1,  'OB-MVP-1001', 'EMP-MVP-1001', 'Nisha',   'Rao',     'nisha.rao@mvp.aegis.local',     'Product Manager',    'Product',     'pre_onboarding',  'AWAITING_SUBMISSION',  35, 'in_progress',    'not_started',         FALSE, NULL,      'Indian', 'L3', 'not_sent', 'not_sent', 'Form_12BB', 'pending',    FALSE, FALSE),
    (2,  'OB-MVP-1002', 'EMP-MVP-1002', 'Daniel',  'Kim',     'daniel.kim@mvp.aegis.local',     'Backend Engineer',   'Engineering', 'onboarding',      'HOLD_HR_APPROVAL',     58, 'completed',      'validated',           FALSE, 'pending', 'Korean', 'L2', 'sent',     'not_sent', 'W8-BEN',    'pending',    FALSE, FALSE),
    (3,  'OB-MVP-1003', 'EMP-MVP-1003', 'Maya',    'Iyer',    'maya.iyer@mvp.aegis.local',      'UX Researcher',      'Design',      'onboarding',      'PROVISIONING',         72, 'completed',      'validated',           FALSE, 'approved','Indian', 'L2', 'sent',     'not_sent', 'Form_12BB', 'pending',    FALSE, FALSE),
    (4,  'OB-MVP-1004', 'EMP-MVP-1004', 'Omar',    'Hassan',  'omar.hassan@mvp.aegis.local',    'Finance Analyst',    'Finance',     'onboarding',      'REJECTED',             48, 'blocked',        'rejected',            FALSE, 'rejected','Egyptian','L2','not_sent', 'not_sent', 'W8-BEN',    'pending',    FALSE, FALSE),
    (5,  'OB-MVP-1005', 'EMP-MVP-1005', 'Elena',   'Petrova', 'elena.petrova@mvp.aegis.local',  'Compliance Lead',    'Legal',       'post_onboarding', 'HOLD_HR_SIGNOFF',      82, 'completed',      'validated',           TRUE,  'approved','Russian','L4', 'sent',     'sent',     'W8-BEN',    'pending',    FALSE, FALSE),
    (6,  'OB-MVP-1006', 'EMP-MVP-1006', 'Karthik', 'Menon',   'karthik.menon@mvp.aegis.local',  'Data Analyst',       'Analytics',   'completed',       'COMPLETE',             100,'completed',      'validated',           FALSE, 'approved','Indian', 'L2', 'sent',     'sent',     'Form_12BB', 'signed_off', FALSE, FALSE),
    (7,  'OB-MVP-1007', 'EMP-MVP-1007', 'Sofia',   'Garcia',  'sofia.garcia@mvp.aegis.local',   'HR Specialist',      'HR',          'pre_onboarding',  'HOLD_LATE_SUBMISSION', 18, 'not_started',    'not_submitted',       TRUE,  NULL,      'Spanish','L2', 'not_sent', 'not_sent', 'W8-BEN',    'pending',    FALSE, FALSE),
    (8,  'OB-MVP-1008', 'EMP-MVP-1008', 'Lucas',   'Meyer',   'lucas.meyer@mvp.aegis.local',    'DevOps Engineer',    'Engineering', 'onboarding',      'PROVISIONING',         64, 'failed_retrying','correction_required', FALSE, 'approved','German', 'L2', 'sent',     'not_sent', 'W8-BEN',    'pending',    TRUE,  TRUE ),
    (9,  'OB-MVP-1009', 'EMP-MVP-1009', 'Amina',   'Yusuf',   'amina.yusuf@mvp.aegis.local',    'Payroll Coordinator','Finance',     'onboarding',      'PAYROLL_SETUP',        69, 'completed',      'validated',           FALSE, 'approved','Somali', 'L2', 'sent',     'not_sent', 'W8-BEN',    'pending',    FALSE, FALSE),
    (10, 'OB-MVP-1010', 'EMP-MVP-1010', 'Wei',     'Zhang',   'wei.zhang@mvp.aegis.local',      'IT Support',         'IT',          'post_onboarding', 'WELCOME_SENT',         91, 'completed',      'validated',           FALSE, 'approved','Chinese','L2', 'sent',     'sent',     'W8-BEN',    'pending',    FALSE, FALSE),
    (11, 'OB-MVP-1011', 'EMP-MVP-1011', 'Fatima',  'Khan',    'fatima.khan@mvp.aegis.local',    'Security Engineer',  'Security',    'onboarding',      'HOLD_HR_APPROVAL',     52, 'completed',      'validated',           FALSE, 'pending', 'Pakistani','L2','sent',    'not_sent', 'W8-BEN',    'pending',    FALSE, FALSE),
    (12, 'OB-MVP-1012', 'EMP-MVP-1012', 'Noah',    'Wilson',  'noah.wilson@mvp.aegis.local',    'Sales Operations',   'Revenue',     'pre_onboarding',  'CREATED',              24, 'in_queue',       'partial',             FALSE, NULL,      'American','L1','not_sent', 'not_sent', 'W9',        'pending',    FALSE, FALSE);

INSERT INTO candidates (
    first_name, last_name, personal_email, phone, role, department,
    manager_name, joining_date, employee_type, office_location, nationality,
    date_of_birth, grade_band, country_of_employment, european_country_of_employment,
    permanent_address, emergency_contact,
    created_at, updated_at
)
SELECT
    first_name,
    last_name,
    personal_email,
    '+91-90000-' || LPAD(idx::text, 5, '0'),
    role,
    department,
    'Nandita Mehta',
    CURRENT_DATE + (idx - 5),
    'new_hire',
    CASE
        WHEN department IN ('Engineering', 'IT', 'Security') THEN 'Hyderabad Tech Park'
        WHEN department IN ('Finance', 'Legal') THEN 'Mumbai Office'
        ELSE 'Bengaluru HQ'
    END,
    sc.nationality,
    (DATE '1990-01-01' + (idx * 365 + idx * 17) * INTERVAL '1 day')::DATE,
    sc.grade_band,
    CASE
        WHEN sc.nationality = 'Indian'  THEN 'India'
        WHEN sc.nationality = 'German'  THEN 'Germany'
        WHEN sc.nationality = 'Spanish' THEN 'Spain'
        WHEN sc.nationality = 'Korean'  THEN 'South Korea'
        WHEN sc.nationality = 'Russian' THEN 'Russia'
        WHEN sc.nationality = 'Chinese' THEN 'China'
        WHEN sc.nationality = 'Somali'  THEN 'Somalia'
        WHEN sc.nationality = 'Egyptian' THEN 'Egypt'
        WHEN sc.nationality = 'Pakistani' THEN 'Pakistan'
        ELSE 'United States'
    END,
    sc.nationality IN ('German', 'French', 'Italian', 'Spanish', 'Dutch', 'Belgian'),
    CASE
        WHEN department IN ('Engineering', 'IT', 'Security') THEN 'Plot 12, Hitech City, Hyderabad 500081'
        WHEN department IN ('Finance', 'Legal') THEN '4th Floor, BKC Complex, Mumbai 400051'
        ELSE '14, MG Road, Bengaluru 560001'
    END,
    jsonb_build_object('name', 'Emergency Contact ' || idx, 'phone', '+91-9000' || idx, 'relation', 'Spouse'),
    NOW() - (idx || ' days')::interval,
    NOW()
FROM seed_cases sc
ORDER BY sc.idx;

INSERT INTO onboarding_cases (
    case_number, candidate_id, employee_id, phase, status,
    pre_onboarding_progress, onboarding_progress, post_onboarding_progress,
    overall_progress, it_status, docs_status, payroll_status, pf_status,
    is_completed, completed_at, sla_breach,
    manager_notification_status, welcome_email_status,
    statutory_form_type, statutory_form_submission_status,
    tax_statutory_config_status, hr_signoff_status,
    it_admin_notification_failed, it_admin_action_item_open,
    created_at, updated_at
)
SELECT
    sc.case_number,
    c.id,
    sc.employee_id,
    sc.phase,
    sc.status,
    CASE WHEN sc.phase = 'pre_onboarding' THEN sc.progress WHEN sc.phase IN ('onboarding', 'post_onboarding', 'completed') THEN LEAST(sc.progress, 100) ELSE 0 END,
    CASE WHEN sc.phase = 'onboarding' THEN sc.progress WHEN sc.phase IN ('post_onboarding', 'completed') THEN 100 ELSE 0 END,
    CASE WHEN sc.phase = 'post_onboarding' THEN sc.progress WHEN sc.phase = 'completed' THEN 100 ELSE 0 END,
    sc.progress,
    sc.it_status,
    sc.docs_status,
    CASE WHEN sc.case_number = 'OB-MVP-1009' THEN 'failed' WHEN sc.progress > 70 THEN 'completed' ELSE 'not_started' END,
    CASE WHEN sc.case_number = 'OB-MVP-1005' THEN 'overdue' WHEN sc.progress = 100 THEN 'completed' ELSE 'not_started' END,
    sc.status = 'COMPLETE',
    CASE WHEN sc.status = 'COMPLETE' THEN NOW() - INTERVAL '1 day' ELSE NULL END,
    sc.sla_breach,
    sc.mgr_notif_status,
    sc.welcome_status,
    sc.statutory_form,
    CASE WHEN sc.progress >= 80 THEN 'submitted' ELSE 'not_submitted' END,
    CASE WHEN sc.it_status = 'completed' THEN 'configured' ELSE 'not_started' END,
    sc.hr_signoff,
    sc.it_notif_failed,
    sc.it_action_open,
    NOW() - (sc.idx || ' days')::interval,
    NOW()
FROM seed_cases sc
JOIN candidates c ON c.personal_email = sc.personal_email
ORDER BY sc.idx;

INSERT INTO pre_onboarding_tasks (
    case_id, task_type, assigned_team, description, due_date, status, sla_compliant, created_at
)
SELECT
    oc.id,
    task.task_type,
    task.assigned_team,
    'MVP scenario task: ' || task.task_type,
    CURRENT_DATE + (task.offset_days - sc.idx),
    CASE
        WHEN sc.status = 'completed' THEN 'completed'
        WHEN sc.status IN ('in_progress', 'pending_hil') AND task.offset_days <= 2 THEN 'completed'
        WHEN sc.status IN ('blocked', 'at_risk') AND task.offset_days >= 3 THEN 'overdue'
        ELSE 'in_progress'
    END,
    NOT (sc.status IN ('blocked', 'at_risk') AND task.offset_days >= 3),
    NOW() - (sc.idx || ' days')::interval
FROM seed_cases sc
JOIN onboarding_cases oc ON oc.case_number = sc.case_number
CROSS JOIN (
    VALUES
        ('laptop_setup', 'it', 1),
        ('email_id_creation', 'it', 2),
        ('desk_allocation', 'admin', 3),
        ('id_card_preparation', 'admin', 4)
) AS task(task_type, assigned_team, offset_days);

INSERT INTO follow_ups (
    case_id, follow_up_type, scheduled_at, sent_at, channel, response_status, responded_at, notes, created_at
)
SELECT
    oc.id,
    follow.follow_up_type,
    NOW() - (follow.days_before || ' days')::interval,
    CASE WHEN sc.idx % 4 = 0 THEN NULL ELSE NOW() - (GREATEST(0, follow.days_before - (sc.idx % 3)) || ' days')::interval END,
    'email',
    CASE WHEN sc.idx % 4 = 0 THEN 'pending' ELSE 'confirmed_joining' END,
    CASE WHEN sc.idx % 4 = 0 THEN NULL ELSE NOW() - (GREATEST(0, follow.days_before - (sc.idx % 3)) || ' days')::interval END,
    'MVP dummy follow-up for ' || follow.follow_up_type,
    NOW()
FROM seed_cases sc
JOIN onboarding_cases oc ON oc.case_number = sc.case_number
CROSS JOIN (
    VALUES
        ('t_minus_7', 7),
        ('t_minus_3', 3),
        ('t_plus_0', 0)
) AS follow(follow_up_type, days_before);

INSERT INTO documents (
    case_id, candidate_id, document_type, file_name, status,
    submitted_at, validated_at, rejection_reason, correction_instructions,
    created_at, updated_at
)
SELECT
    oc.id,
    c.id,
    doc.document_type,
    LOWER(sc.employee_id || '_' || doc.document_type || '.pdf'),
    CASE
        WHEN sc.docs_status IN ('validated', 'approved') THEN 'validated'
        WHEN sc.docs_status = 'rejected' AND doc.document_type = 'address_proof' THEN 'rejected'
        WHEN sc.docs_status = 'correction_required' AND doc.document_type = 'identity_proof' THEN 'correction_required'
        WHEN sc.docs_status IN ('not_submitted', 'not_started') THEN 'pending'
        WHEN sc.docs_status = 'partial' AND doc.doc_order = 1 THEN 'submitted'
        WHEN sc.docs_status = 'partial' THEN 'pending'
        ELSE sc.docs_status
    END,
    CASE WHEN sc.docs_status IN ('not_submitted', 'not_started') THEN NULL ELSE NOW() - (doc.doc_order || ' days')::interval END,
    CASE WHEN sc.docs_status IN ('validated', 'approved') THEN NOW() - ((doc.doc_order - 1) || ' days')::interval ELSE NULL END,
    CASE WHEN sc.docs_status = 'rejected' AND doc.document_type = 'address_proof' THEN 'Address proof failed verification.' ELSE NULL END,
    CASE WHEN sc.docs_status = 'correction_required' AND doc.document_type = 'identity_proof' THEN 'Upload a clearer identity proof scan.' ELSE NULL END,
    NOW() - (sc.idx || ' days')::interval,
    NOW()
FROM seed_cases sc
JOIN candidates c ON c.personal_email = sc.personal_email
JOIN onboarding_cases oc ON oc.case_number = sc.case_number
CROSS JOIN (
    VALUES
        (1, 'identity_proof'),
        (2, 'employment_agreement'),
        (3, 'address_proof')
) AS doc(doc_order, document_type);

INSERT INTO provisioning_items (
    case_id, item_type, system_name, status,
    requested_at, completed_at, notes, created_at, updated_at
)
SELECT
    oc.id,
    item.item_type,
    item.system_name,
    CASE
        WHEN sc.it_status = 'completed' THEN 'completed'
        WHEN sc.it_status = 'failed_retrying' AND item.item_type = 'access_card' THEN 'failed_retrying'
        WHEN sc.it_status = 'blocked' AND item.item_type <> 'email_account' THEN 'blocked'
        WHEN sc.it_status IN ('not_started', 'in_queue') THEN sc.it_status
        ELSE 'in_progress'
    END,
    NOW() - (sc.idx || ' days')::interval,
    CASE WHEN sc.it_status = 'completed' THEN NOW() - INTERVAL '1 day' ELSE NULL END,
    item.notes,
    NOW() - (sc.idx || ' days')::interval,
    NOW()
FROM seed_cases sc
JOIN onboarding_cases oc ON oc.case_number = sc.case_number
CROSS JOIN (
    VALUES
        ('laptop',        'Laptop Provisioning',   'Laptop allocation and base software setup'),
        ('email_account', 'Email Account',          'Corporate email account creation'),
        ('access_card',   'Office Access Card',     'Office access card activation')
) AS item(item_type, system_name, notes);

INSERT INTO post_onboarding_items (
    case_id, payroll_confirmed, pf_confirmed, buddy_assigned,
    manager_checkin, policy_acknowledged, created_at, updated_at
)
SELECT
    oc.id,
    sc.phase IN ('post_onboarding', 'completed'),
    sc.phase IN ('post_onboarding', 'completed') AND sc.pf_status IS DISTINCT FROM 'overdue',
    sc.phase IN ('post_onboarding', 'completed'),
    sc.phase = 'completed',
    sc.status = 'completed',
    NOW() - (sc.idx || ' days')::interval,
    NOW()
FROM (
    SELECT
        sc.*,
        CASE WHEN sc.case_number = 'OB-MVP-1005' THEN 'overdue' WHEN sc.progress = 100 THEN 'completed' ELSE 'not_started' END AS pf_status
    FROM seed_cases sc
) sc
JOIN onboarding_cases oc ON oc.case_number = sc.case_number;

INSERT INTO hil_gates (
    case_id, gate_type, decision, decided_at, decision_notes, is_blocking,
    flag_description, approval_token, token_expires_at, email_sent_to,
    email_sent_at, created_at, updated_at
)
SELECT
    oc.id,
    'doc_bg_verification',
    sc.hil_decision,
    CASE WHEN sc.hil_decision IN ('approved', 'rejected') THEN NOW() - INTERVAL '2 hours' ELSE NULL END,
    CASE WHEN sc.hil_decision IN ('approved', 'rejected') THEN 'Seeded HR ' || sc.hil_decision || ' decision.' ELSE NULL END,
    TRUE,
    'Background verification scenario for ' || sc.first_name || ' ' || sc.last_name || ' / ' || sc.case_number,
    'mvp-' || LOWER(sc.case_number) || '-' || sc.hil_decision,
    NOW() + INTERVAL '48 hours',
    'hr-coordinator@mvp.aegis.local',
    NOW() - INTERVAL '1 hour',
    NOW() - (sc.idx || ' days')::interval,
    NOW()
FROM seed_cases sc
JOIN onboarding_cases oc ON oc.case_number = sc.case_number
WHERE sc.hil_decision IS NOT NULL;

INSERT INTO audit_logs (
    case_id, candidate_id, employee_id, phase, event_type,
    rule_ref, rule_version, event_description, outcome, agent_id, created_at
)
SELECT
    oc.id,
    c.id,
    sc.employee_id,
    audit.phase,
    audit.event_type,
    audit.rule_ref,
    'v1.3',
    audit.event_description,
    audit.outcome,
    'AG-HR-0426-001',
    NOW() - (audit.event_offset || ' hours')::interval
FROM seed_cases sc
JOIN candidates c ON c.personal_email = sc.personal_email
JOIN onboarding_cases oc ON oc.case_number = sc.case_number
CROSS JOIN LATERAL (
    VALUES
        ('pre_onboarding', 'trigger', 'BR-001', 'Pre-onboarding workflow triggered for ' || sc.first_name || ' ' || sc.last_name || '.', 'created', sc.idx * 4),
        (sc.phase, 'activity', 'BR-001', 'Reminder timeline updated for ' || sc.case_number || '.', 'sent', sc.idx * 4 - 1),
        (sc.phase, 'validation', 'BR-002 v1.3', 'Document validation state is ' || sc.status || '.', sc.status, sc.idx * 4 - 2)
) AS audit(phase, event_type, rule_ref, event_description, outcome, event_offset);

INSERT INTO audit_logs (
    case_id, candidate_id, employee_id, phase, event_type,
    rule_ref, rule_version, event_description, outcome, agent_id, created_at
)
SELECT
    oc.id,
    c.id,
    sc.employee_id,
    sc.phase,
    'hil_decision',
    'HIL-1',
    'v1.3',
    'Background verification ' || sc.hil_decision || '.',
    sc.hil_decision,
    'AG-HR-0426-001',
    NOW() - INTERVAL '30 minutes'
FROM seed_cases sc
JOIN candidates c ON c.personal_email = sc.personal_email
JOIN onboarding_cases oc ON oc.case_number = sc.case_number
WHERE sc.hil_decision IS NOT NULL;

INSERT INTO role_profiles (
    role_name, display_name, initials, color, sort_order, is_active, created_at, updated_at
)
VALUES
    ('HR Coordinator',      'Jagadeeswar R',  'JR', '#5929d0', 1, TRUE, NOW(), NOW()),
    ('HR Ops Manager',      'Nandita Mehta',  'NM', '#CF008B', 2, TRUE, NOW(), NOW()),
    ('Onboarding Employee', 'Amina Yusuf',    'AY', '#0E2E89', 3, TRUE, NOW(), NOW()),
    ('IT Support',          'Kiran Patel',    'KP', '#E4902E', 4, TRUE, NOW(), NOW()),
    ('Admin Team',          'Asha Rao',       'AR', '#16A34A', 5, TRUE, NOW(), NOW()),
    ('Compliance Reviewer', 'Riya Sharma',    'RS', '#0E766E', 6, TRUE, NOW(), NOW()),
    ('HR Platform Engineer','Arjun Dev',      'AD', '#7C3AED', 7, TRUE, NOW(), NOW());

DROP TABLE IF EXISTS seed_cases;

-- ── Email templates (idempotent — email_templates is NOT truncated above) ──
INSERT INTO email_templates (template_name, version, content, approved_by, approved_at, is_active)
VALUES
    ('t_minus_7', 'v1.0',
     'Dear {{first_name}}, your joining date at Centific is in 7 days on {{joining_date}}. Please complete your onboarding documents (identity proof, address proof, employment agreement) before your start date. Contact your HR Coordinator if you have questions.',
     'Jagadeeswar R', NOW(), TRUE),
    ('t_minus_3', 'v1.0',
     'Dear {{first_name}}, only 3 days until you join us on {{joining_date}}! This is a reminder to ensure all onboarding documents are submitted and validated. Your IT setup request has been raised. See you soon!',
     'Nandita Mehta', NOW(), TRUE),
    ('t_plus_0', 'v1.0',
     'Dear {{first_name}}, welcome to your first day at Centific! Your HR Coordinator {{hr_coordinator}} will meet you at reception. Your laptop and email account are ready. We look forward to having you on board!',
     'Jagadeeswar R', NOW(), TRUE),
    ('manager_notification', 'v1.0',
     'Dear {{manager_name}}, we would like to inform you that {{first_name}} {{last_name}} will be joining your team as {{role}} on {{joining_date}}. Please ensure their desk, access card, and system access are ready. Their HR case reference is {{case_number}}.',
     'Nandita Mehta', NOW(), TRUE),
    ('welcome_pack', 'v1.0',
     'Dear {{first_name}}, attached is your onboarding welcome pack. It contains your joining instructions, company policies, and a checklist of items to complete in your first week. Your buddy {{buddy_name}} will reach out to schedule a welcome call.',
     'Nandita Mehta', NOW(), TRUE),
    ('sla_escalation', 'v1.0',
     'This is an automated escalation notice. Case {{case_number}} for employee {{first_name}} {{last_name}} has reached 75%% of the 4-business-hour HIL SLA window. Immediate review is required to avoid a breach.',
     'System', NOW(), TRUE)
ON CONFLICT (template_name, version) DO NOTHING;
