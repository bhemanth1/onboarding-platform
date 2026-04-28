CREATE SCHEMA IF NOT EXISTS dana;

SET search_path TO dana;

CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    personal_email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(100),
    department VARCHAR(100),
    manager_name VARCHAR(100),
    joining_date DATE,
    employee_type VARCHAR(50),
    office_location VARCHAR(100),
    nationality VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_cases (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    candidate_id INT REFERENCES candidates(id) ON DELETE CASCADE,
    employee_id VARCHAR(50),
    phase VARCHAR(50),
    status VARCHAR(50),
    pre_onboarding_progress INT DEFAULT 0,
    onboarding_progress INT DEFAULT 0,
    post_onboarding_progress INT DEFAULT 0,
    overall_progress INT DEFAULT 0,
    it_status VARCHAR(50),
    docs_status VARCHAR(50),
    payroll_status VARCHAR(50),
    pf_status VARCHAR(50),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    sla_breach BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pre_onboarding_tasks (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    task_type VARCHAR(100),
    assigned_team VARCHAR(50),
    description TEXT,
    due_date DATE,
    status VARCHAR(50),
    sla_compliant BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_ups (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    follow_up_type VARCHAR(50),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    channel VARCHAR(50),
    response_status VARCHAR(50),
    responded_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hil_gates (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    gate_type VARCHAR(100),
    decision VARCHAR(50),
    decided_at TIMESTAMP,
    decision_notes TEXT,
    is_blocking BOOLEAN DEFAULT FALSE,
    flag_description TEXT,
    approval_token VARCHAR(255),
    token_expires_at TIMESTAMP,
    email_sent_to VARCHAR(255),
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    candidate_id INT REFERENCES candidates(id) ON DELETE SET NULL,
    document_type VARCHAR(100),
    file_name VARCHAR(255),
    status VARCHAR(50),
    owner VARCHAR(100),
    source VARCHAR(100),
    uploaded_by VARCHAR(100),
    timing VARCHAR(50),
    sla_status VARCHAR(50),
    submitted_at TIMESTAMP,
    validated_at TIMESTAMP,
    rejection_reason TEXT,
    correction_instructions TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provisioning_items (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    item_type VARCHAR(100),
    assigned_team VARCHAR(50),
    description TEXT,
    status VARCHAR(50),
    requested_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_onboarding_items (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    payroll_completed BOOLEAN DEFAULT FALSE,
    pf_completed BOOLEAN DEFAULT FALSE,
    buddy_assigned BOOLEAN DEFAULT FALSE,
    feedback_collected BOOLEAN DEFAULT FALSE,
    docs_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    candidate_id INT REFERENCES candidates(id) ON DELETE SET NULL,
    employee_id VARCHAR(50),
    phase VARCHAR(50),
    event_type VARCHAR(50),
    rule_ref VARCHAR(100),
    rule_version VARCHAR(20),
    event_description TEXT,
    outcome VARCHAR(50),
    agent_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_profiles (
    role_name VARCHAR(100) PRIMARY KEY,
    display_name VARCHAR(150) NOT NULL,
    initials VARCHAR(10),
    color VARCHAR(20),
    sort_order INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE IF EXISTS hil_gates
    ADD COLUMN IF NOT EXISTS decision_notes TEXT;

ALTER TABLE IF EXISTS documents
    ADD COLUMN IF NOT EXISTS case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS candidate_id INT REFERENCES candidates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS document_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS owner VARCHAR(100),
    ADD COLUMN IF NOT EXISTS source VARCHAR(100),
    ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS timing VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sla_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS correction_instructions TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE IF EXISTS provisioning_items
    ADD COLUMN IF NOT EXISTS case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS item_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS assigned_team VARCHAR(50),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE IF EXISTS post_onboarding_items
    ADD COLUMN IF NOT EXISTS case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS payroll_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pf_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS buddy_assigned BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS feedback_collected BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS docs_archived BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_onboarding_cases_candidate_id ON onboarding_cases(candidate_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_items_case_id ON provisioning_items(case_id);
CREATE INDEX IF NOT EXISTS idx_post_onboarding_items_case_id ON post_onboarding_items(case_id);
CREATE INDEX IF NOT EXISTS idx_pre_onboarding_tasks_case_id ON pre_onboarding_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_case_id ON follow_ups(case_id);
CREATE INDEX IF NOT EXISTS idx_hil_gates_case_id ON hil_gates(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
