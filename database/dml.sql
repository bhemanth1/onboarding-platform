-- Insert candidate
INSERT INTO candidates (
    first_name, last_name, personal_email, phone,
    role, department, manager_name, joining_date,
    employee_type, office_location, nationality,
    created_at, updated_at
)
VALUES (
    'Nisha', 'Rao', 'nisha.rao@mvp.aegis.local', '+91-90000-00000',
    'Product Manager', 'Product', 'Nandita Mehta', CURRENT_DATE,
    'new_hire', 'Bengaluru HQ', 'Indian',
    NOW(), NOW()
);

-- Insert onboarding case
INSERT INTO onboarding_cases (
    case_number, candidate_id, employee_id, phase, status,
    pre_onboarding_progress, onboarding_progress, post_onboarding_progress,
    overall_progress, it_status, docs_status, payroll_status, pf_status,
    is_completed, completed_at, sla_breach, created_at, updated_at
)
VALUES (
    'OB-MVP-1001', 1, 'EMP-MVP-1001', 'pre_onboarding', 'active',
    35, 0, 0, 35, 'in_progress', 'not_started',
    'not_started', 'not_started',
    FALSE, NULL, FALSE, NOW(), NOW()
);

-- Task
INSERT INTO pre_onboarding_tasks (
    case_id, task_type, assigned_team, description,
    due_date, status, sla_compliant, created_at
)
VALUES (
    1, 'laptop_setup', 'it', 'Setup laptop',
    CURRENT_DATE + INTERVAL '2 days',
    'in_progress', TRUE, NOW()
);

-- Follow-up
INSERT INTO follow_ups (
    case_id, follow_up_type, scheduled_at, sent_at,
    channel, response_status, responded_at, notes, created_at
)
VALUES (
    1, '7_day', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days',
    'email', 'confirmed_joining', NOW() - INTERVAL '6 days',
    'Initial follow-up', NOW()
);

-- Audit log
INSERT INTO audit_logs (
    case_id, candidate_id, employee_id, phase,
    event_type, rule_ref, rule_version,
    event_description, outcome, agent_id, created_at
)
VALUES (
    1, 1, 'EMP-MVP-1001', 'pre_onboarding',
    'trigger', 'BR-001', 'v1.3',
    'Pre-onboarding started', 'created',
    'AG-HR-0426-001', NOW()
);