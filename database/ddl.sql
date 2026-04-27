-- Create schema
CREATE SCHEMA IF NOT EXISTS dana;

SET search_path TO dana;

-- Candidates
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    personal_email VARCHAR(255) UNIQUE,
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

-- Onboarding Cases
CREATE TABLE IF NOT EXISTS onboarding_cases (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE,
    candidate_id INT REFERENCES candidates(id) ON DELETE CASCADE,
    employee_id VARCHAR(50),
    phase VARCHAR(50),
    status VARCHAR(50),
    pre_onboarding_progress INT,
    onboarding_progress INT,
    post_onboarding_progress INT,
    overall_progress INT,
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

-- Pre-onboarding Tasks
CREATE TABLE IF NOT EXISTS pre_onboarding_tasks (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    task_type VARCHAR(100),
    assigned_team VARCHAR(50),
    description TEXT,
    due_date DATE,
    status VARCHAR(50),
    sla_compliant BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Follow Ups
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

-- HIL Gates
CREATE TABLE IF NOT EXISTS hil_gates (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    gate_type VARCHAR(100),
    decision VARCHAR(50),
    decided_at TIMESTAMP,
    is_blocking BOOLEAN,
    flag_description TEXT,
    approval_token VARCHAR(255),
    token_expires_at TIMESTAMP,
    email_sent_to VARCHAR(255),
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs (append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    case_id INT,
    candidate_id INT,
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

-- Role Profiles
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