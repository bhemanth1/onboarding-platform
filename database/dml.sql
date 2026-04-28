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
    status VARCHAR(50),
    progress INT,
    it_status VARCHAR(50),
    docs_status VARCHAR(50),
    sla_breach BOOLEAN,
    hil_decision VARCHAR(50)
) ON COMMIT DROP;

INSERT INTO seed_cases VALUES
    (1, 'OB-MVP-1001', 'EMP-MVP-1001', 'Nisha', 'Rao', 'nisha.rao@mvp.aegis.local', 'Product Manager', 'Product', 'pre_onboarding', 'active', 35, 'in_progress', 'not_started', FALSE, NULL),
    (2, 'OB-MVP-1002', 'EMP-MVP-1002', 'Daniel', 'Kim', 'daniel.kim@mvp.aegis.local', 'Backend Engineer', 'Engineering', 'onboarding', 'pending_hil', 58, 'completed', 'validated', FALSE, 'pending'),
    (3, 'OB-MVP-1003', 'EMP-MVP-1003', 'Maya', 'Iyer', 'maya.iyer@mvp.aegis.local', 'UX Researcher', 'Design', 'onboarding', 'in_progress', 72, 'completed', 'validated', FALSE, 'approved'),
    (4, 'OB-MVP-1004', 'EMP-MVP-1004', 'Omar', 'Hassan', 'omar.hassan@mvp.aegis.local', 'Finance Analyst', 'Finance', 'onboarding', 'blocked', 48, 'blocked', 'rejected', FALSE, 'rejected'),
    (5, 'OB-MVP-1005', 'EMP-MVP-1005', 'Elena', 'Petrova', 'elena.petrova@mvp.aegis.local', 'Compliance Lead', 'Legal', 'post_onboarding', 'at_risk', 82, 'completed', 'validated', TRUE, 'approved'),
    (6, 'OB-MVP-1006', 'EMP-MVP-1006', 'Karthik', 'Menon', 'karthik.menon@mvp.aegis.local', 'Data Analyst', 'Analytics', 'completed', 'completed', 100, 'completed', 'validated', FALSE, 'approved'),
    (7, 'OB-MVP-1007', 'EMP-MVP-1007', 'Sofia', 'Garcia', 'sofia.garcia@mvp.aegis.local', 'HR Specialist', 'HR', 'pre_onboarding', 'at_risk', 18, 'not_started', 'not_submitted', TRUE, NULL),
    (8, 'OB-MVP-1008', 'EMP-MVP-1008', 'Lucas', 'Meyer', 'lucas.meyer@mvp.aegis.local', 'DevOps Engineer', 'Engineering', 'onboarding', 'in_progress', 64, 'failed_retrying', 'correction_required', FALSE, 'approved'),
    (9, 'OB-MVP-1009', 'EMP-MVP-1009', 'Amina', 'Yusuf', 'amina.yusuf@mvp.aegis.local', 'Payroll Coordinator', 'Finance', 'onboarding', 'blocked', 69, 'completed', 'validated', FALSE, 'approved'),
    (10, 'OB-MVP-1010', 'EMP-MVP-1010', 'Wei', 'Zhang', 'wei.zhang@mvp.aegis.local', 'IT Support', 'IT', 'post_onboarding', 'in_progress', 91, 'completed', 'validated', FALSE, 'approved'),
    (11, 'OB-MVP-1011', 'EMP-MVP-1011', 'Fatima', 'Khan', 'fatima.khan@mvp.aegis.local', 'Security Engineer', 'Security', 'onboarding', 'pending_hil', 52, 'completed', 'validated', FALSE, 'pending'),
    (12, 'OB-MVP-1012', 'EMP-MVP-1012', 'Noah', 'Wilson', 'noah.wilson@mvp.aegis.local', 'Sales Operations', 'Revenue', 'pre_onboarding', 'active', 24, 'in_queue', 'partial', FALSE, NULL);

INSERT INTO candidates (
    first_name, last_name, personal_email, phone, role, department,
    manager_name, joining_date, employee_type, office_location, nationality,
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
    'Indian',
    NOW() - (idx || ' days')::interval,
    NOW()
FROM seed_cases
ORDER BY idx;

INSERT INTO onboarding_cases (
    case_number, candidate_id, employee_id, phase, status,
    pre_onboarding_progress, onboarding_progress, post_onboarding_progress,
    overall_progress, it_status, docs_status, payroll_status, pf_status,
    is_completed, completed_at, sla_breach, created_at, updated_at
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
    sc.status = 'completed',
    CASE WHEN sc.status = 'completed' THEN NOW() - INTERVAL '1 day' ELSE NULL END,
    sc.sla_breach,
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
        ('7_day', 7),
        ('3_day', 3),
        ('0_day', 0)
) AS follow(follow_up_type, days_before);

INSERT INTO documents (
    case_id, candidate_id, document_type, file_name, status,
    owner, source, uploaded_by, timing, sla_status,
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
    'Candidate',
    'employee_portal',
    sc.first_name || ' ' || sc.last_name,
    CASE WHEN sc.sla_breach THEN 'Late' WHEN sc.docs_status IN ('not_submitted', 'not_started') THEN 'Pending' ELSE 'On Time' END,
    CASE WHEN sc.sla_breach THEN 'late' WHEN sc.docs_status IN ('not_submitted', 'not_started') THEN 'pending' ELSE 'on_time' END,
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
    case_id, item_type, assigned_team, description, status,
    requested_at, completed_at, notes, created_at, updated_at
)
SELECT
    oc.id,
    item.item_type,
    item.assigned_team,
    item.description,
    CASE
        WHEN sc.it_status = 'completed' THEN 'completed'
        WHEN sc.it_status = 'failed_retrying' AND item.item_type = 'access_card' THEN 'failed_retrying'
        WHEN sc.it_status = 'blocked' AND item.item_type <> 'email_account' THEN 'blocked'
        WHEN sc.it_status IN ('not_started', 'in_queue') THEN sc.it_status
        ELSE 'in_progress'
    END,
    NOW() - (sc.idx || ' days')::interval,
    CASE WHEN sc.it_status = 'completed' THEN NOW() - INTERVAL '1 day' ELSE NULL END,
    'Provisioning scenario for ' || item.item_type,
    NOW() - (sc.idx || ' days')::interval,
    NOW()
FROM seed_cases sc
JOIN onboarding_cases oc ON oc.case_number = sc.case_number
CROSS JOIN (
    VALUES
        ('laptop', 'it', 'Laptop allocation and base software setup'),
        ('email_account', 'it', 'Corporate email account creation'),
        ('access_card', 'admin', 'Office access card activation')
) AS item(item_type, assigned_team, description);

INSERT INTO post_onboarding_items (
    case_id, payroll_completed, pf_completed, buddy_assigned,
    feedback_collected, docs_archived, created_at, updated_at
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
    ('HR Coordinator', 'Jagadeeswar R', 'JR', '#5929d0', 1, TRUE, NOW(), NOW()),
    ('HR Ops Manager', 'Nandita Mehta', 'NM', '#CF008B', 2, TRUE, NOW(), NOW()),
    ('Onboarding Employee', 'Amina Yusuf', 'AY', '#0E2E89', 3, TRUE, NOW(), NOW()),
    ('IT Support', 'Kiran Patel', 'KP', '#E4902E', 4, TRUE, NOW(), NOW()),
    ('Admin Team', 'Asha Rao', 'AR', '#16A34A', 5, TRUE, NOW(), NOW());

DROP TABLE IF EXISTS seed_cases;
