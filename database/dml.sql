SET search_path TO dana;

-- Insert candidate
INSERT INTO candidates (
    first_name, last_name, personal_email, phone,
    role, department, manager_name, joining_date,
    employee_type, office_location, nationality
)
VALUES (
    'Nisha', 'Rao', 'nisha.rao@mvp.aegis.local', '+91-90000-00000',
    'Product Manager', 'Product', 'Nandita Mehta', CURRENT_DATE,
    'new_hire', 'Bengaluru HQ', 'Indian'
)
ON CONFLICT (personal_email) DO UPDATE
SET updated_at = NOW();

-- Insert onboarding case
INSERT INTO onboarding_cases (
    case_number, candidate_id, employee_id, phase, status,
    pre_onboarding_progress, onboarding_progress, post_onboarding_progress,
    overall_progress, it_status, docs_status, payroll_status, pf_status
)
VALUES (
    'OB-MVP-1001',
    (SELECT id FROM candidates WHERE personal_email = 'nisha.rao@mvp.aegis.local'),
    'EMP-MVP-1001',
    'pre_onboarding',
    'active',
    35, 0, 0, 35,
    'in_progress', 'not_started', 'not_started', 'not_started'
)
ON CONFLICT (case_number) DO UPDATE
SET updated_at = NOW();

-- Task
INSERT INTO pre_onboarding_tasks (
    case_id, task_type, assigned_team, description,
    due_date, status, sla_compliant
)
VALUES (
    (SELECT id FROM onboarding_cases WHERE case_number = 'OB-MVP-1001'),
    'laptop_setup',
    'it',
    'Setup laptop',
    CURRENT_DATE + INTERVAL '2 days',
    'in_progress',
    TRUE
);

-- Follow-up
INSERT INTO follow_ups (
    case_id, follow_up_type, scheduled_at, sent_at,
    channel, response_status, responded_at, notes
)
VALUES (
    (SELECT id FROM onboarding_cases WHERE case_number = 'OB-MVP-1001'),
    '7_day',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '6 days',
    'email',
    'confirmed_joining',
    NOW() - INTERVAL '6 days',
    'Initial follow-up'
);

-- Document
INSERT INTO documents (
    case_id, candidate_id, document_type, file_name, status,
    owner, source, uploaded_by, timing, sla_status,
    submitted_at, validated_at, rejection_reason, correction_instructions
)
VALUES (
    (SELECT id FROM onboarding_cases WHERE case_number = 'OB-MVP-1001'),
    (SELECT id FROM candidates WHERE personal_email = 'nisha.rao@mvp.aegis.local'),
    'identity_proof',
    'identity_proof.pdf',
    'submitted',
    'Candidate',
    'employee_portal',
    'Nisha Rao',
    'On Time',
    'on_time',
    NOW() - INTERVAL '1 day',
    NULL,
    NULL,
    NULL
);

-- Provisioning item
INSERT INTO provisioning_items (
    case_id, item_type, assigned_team, description,
    status, requested_at, completed_at, notes
)
VALUES (
    (SELECT id FROM onboarding_cases WHERE case_number = 'OB-MVP-1001'),
    'laptop',
    'it',
    'Laptop allocation and base software setup',
    'in_progress',
    NOW() - INTERVAL '1 day',
    NULL,
    'Provisioning request created from onboarding workflow'
);

-- Post-onboarding item
INSERT INTO post_onboarding_items (
    case_id, payroll_completed, pf_completed,
    buddy_assigned, feedback_collected, docs_archived
)
VALUES (
    (SELECT id FROM onboarding_cases WHERE case_number = 'OB-MVP-1001'),
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE
);

-- Audit log
INSERT INTO audit_logs (
    case_id, candidate_id, employee_id, phase,
    event_type, rule_ref, rule_version,
    event_description, outcome, agent_id
)
VALUES (
    (SELECT id FROM onboarding_cases WHERE case_number = 'OB-MVP-1001'),
    (SELECT id FROM candidates WHERE personal_email = 'nisha.rao@mvp.aegis.local'),
    'EMP-MVP-1001',
    'pre_onboarding',
    'trigger',
    'BR-001',
    'v1.3',
    'Pre-onboarding started',
    'created',
    'AG-HR-0426-001'
);

-- Role profiles
INSERT INTO role_profiles (
    role_name, display_name, initials, color, sort_order
)
VALUES
    ('HR Coordinator', 'Jagadeeswar R', 'JR', '#5929d0', 1),
    ('HR Ops Manager', 'Nandita Mehta', 'NM', '#CF008B', 2),
    ('Onboarding Employee', 'Amina Yusuf', 'AY', '#0E2E89', 3),
    ('IT Support', 'Kiran Patel', 'KP', '#E4902E', 4),
    ('Admin Team', 'Asha Rao', 'AR', '#16A34A', 5)
ON CONFLICT (role_name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    initials = EXCLUDED.initials,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();
    