-- ═══════════════════════════════════════════════════════════════════
-- AEGIS.AI — Employee Onboarding OS
-- Schema: dana
-- Source of truth: reflects the live Aiven (PostgreSQL) database.
-- All PKs are UUID. All timestamps are TIMESTAMPTZ (UTC-aware).
-- ═══════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS dana;
SET search_path TO dana;

-- ───────────────────────────────────────────────────────────────────
-- candidates
-- One row per new joiner. Created when HR registers a candidate.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name       VARCHAR(100)  NOT NULL,
    last_name        VARCHAR(100)  NOT NULL,
    personal_email   VARCHAR(255)  NOT NULL UNIQUE,
    phone            VARCHAR(50),
    role             VARCHAR(150),
    department       VARCHAR(150),
    manager_name     VARCHAR(150),
    joining_date     DATE,
    employee_type    VARCHAR(100),
    office_location  VARCHAR(150),
    nationality      VARCHAR(100),
    created_at       TIMESTAMPTZ   DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- onboarding_cases
-- One case per candidate, tracking phase/status/progress end-to-end.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_cases (
    id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number                 VARCHAR(80)  NOT NULL UNIQUE,
    candidate_id                UUID         NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    employee_id                 VARCHAR(80)  UNIQUE,
    phase                       VARCHAR(80),   -- pre_onboarding | onboarding | post_onboarding | completed
    status                      VARCHAR(80),   -- active | in_progress | pending_hil | at_risk | blocked | completed
    pre_onboarding_progress     INTEGER      DEFAULT 0,
    onboarding_progress         INTEGER      DEFAULT 0,
    post_onboarding_progress    INTEGER      DEFAULT 0,
    overall_progress            INTEGER      DEFAULT 0,
    it_status                   VARCHAR(80),
    docs_status                 VARCHAR(80),
    payroll_status              VARCHAR(80),
    pf_status                   VARCHAR(80),
    is_completed                BOOLEAN      DEFAULT FALSE,
    completed_at                TIMESTAMPTZ,
    sla_breach                  BOOLEAN      DEFAULT FALSE,
    sla_pending_hil_started_at  TIMESTAMPTZ,  -- BR002: 4-business-hour HIL SLA clock start
    sla_escalated_at            TIMESTAMPTZ,  -- BR002: set at 75% SLA threshold
    created_at                  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- pre_onboarding_tasks
-- IT and admin tasks triggered when a case is created.
-- task_type values: laptop_setup | email_id_creation | desk_allocation | id_card_preparation
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pre_onboarding_tasks (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id        UUID         NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    task_type      VARCHAR(120),
    assigned_team  VARCHAR(120),  -- it | admin
    description    TEXT,
    due_date       DATE,
    status         VARCHAR(80),   -- in_progress | completed | overdue
    sla_compliant  BOOLEAN      DEFAULT TRUE,
    created_at     TIMESTAMPTZ  DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- follow_ups
-- Scheduled candidate communications. Three types per case:
--   t_minus_7 → 7 days before joining
--   t_minus_3 → 3 days before joining
--   t_plus_0  → welcome email on day 0 (sent_at IS NOT NULL = sent)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_ups (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          UUID         NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    follow_up_type   VARCHAR(120),  -- t_minus_7 | t_minus_3 | t_plus_0
    scheduled_at     TIMESTAMPTZ,
    sent_at          TIMESTAMPTZ,   -- NULL = not yet sent
    channel          VARCHAR(80),   -- email
    response_status  VARCHAR(120),  -- pending | responded | suppressed
    responded_at     TIMESTAMPTZ,
    notes            TEXT,
    template_version VARCHAR(20),   -- links to email_templates.version
    created_at       TIMESTAMPTZ  DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- hil_gates
-- Human-in-the-loop approval gates. Blocking gates pause the case.
-- gate_type: doc_bg_verification | manual_review | ...
-- decision:  pending | approved | rejected
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hil_gates (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          UUID         NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    gate_type        VARCHAR(120),
    decision         VARCHAR(80),
    decision_notes   TEXT,
    decided_at       TIMESTAMPTZ,
    is_blocking      BOOLEAN      DEFAULT TRUE,
    flag_description TEXT,
    approval_token   TEXT         UNIQUE,       -- one-click approval link token
    token_expires_at TIMESTAMPTZ,
    email_sent_to    VARCHAR(255),
    email_sent_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- documents
-- Documents submitted by the candidate per case.
-- status: submitted | under_review | validated | approved | rejected
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                 UUID         NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    candidate_id            UUID         REFERENCES candidates(id) ON DELETE CASCADE,
    document_type           VARCHAR(120),
    file_name               VARCHAR(255),
    status                  VARCHAR(80),
    rejection_reason        TEXT,
    correction_instructions TEXT,
    submitted_at            TIMESTAMPTZ,
    validated_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- provisioning_items
-- IT system access provisioned for the new joiner.
-- item_type: laptop | email | vpn | slack | github | ...
-- status: pending | provisioned | failed | completed
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provisioning_items (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id      UUID         NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    item_type    VARCHAR(120),
    system_name  VARCHAR(120),
    status       VARCHAR(80),
    requested_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes        TEXT,
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- post_onboarding_items
-- Checklist for the final post-onboarding phase (one row per case).
-- All fields default FALSE; set to TRUE as each item is completed.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_onboarding_items (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID        NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    buddy_assigned      BOOLEAN     DEFAULT FALSE,
    manager_checkin     BOOLEAN     DEFAULT FALSE,
    policy_acknowledged BOOLEAN     DEFAULT FALSE,
    payroll_confirmed   BOOLEAN     DEFAULT FALSE,
    pf_confirmed        BOOLEAN     DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- audit_logs
-- Immutable event log written by the AEGIS agent and API.
-- event_type: trigger | hil_trigger | sla_breach | sla_75_escalation | ...
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id           UUID         REFERENCES onboarding_cases(id) ON DELETE SET NULL,
    candidate_id      UUID         REFERENCES candidates(id) ON DELETE SET NULL,
    employee_id       VARCHAR(80),
    phase             VARCHAR(80),
    event_type        VARCHAR(120),
    rule_ref          VARCHAR(120),
    rule_version      VARCHAR(40),
    event_description TEXT,
    outcome           VARCHAR(120),
    agent_id          VARCHAR(120),
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- consents
-- GDPR / data-processing consent acknowledgements per case.
-- processing_category: data_processing | background_check | communication | payroll
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consents (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id              UUID         REFERENCES onboarding_cases(id) ON DELETE CASCADE,
    candidate_id         UUID         REFERENCES candidates(id) ON DELETE SET NULL,
    processing_category  VARCHAR(100) NOT NULL,
    acknowledged_at      TIMESTAMPTZ,
    ip_address           VARCHAR(50),
    template_version     VARCHAR(20),
    created_at           TIMESTAMPTZ  DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- email_templates
-- Versioned, HR-approved templates used by follow_ups.
-- Only one version per template_name may have is_active = TRUE.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL,
    version       VARCHAR(20)  NOT NULL,
    content       TEXT,
    approved_by   VARCHAR(100),
    approved_at   TIMESTAMPTZ,
    is_active     BOOLEAN      DEFAULT FALSE,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (template_name, version)
);

-- ───────────────────────────────────────────────────────────────────
-- role_profiles
-- Display metadata for roles shown in the HR dashboard.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_profiles (
    role_name    VARCHAR(100) PRIMARY KEY,
    display_name VARCHAR(150) NOT NULL,
    initials     VARCHAR(10),
    color        VARCHAR(20),
    sort_order   INTEGER,
    is_active    BOOLEAN      DEFAULT TRUE,
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_onboarding_cases_candidate_id   ON onboarding_cases(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pre_onboarding_tasks_case_id    ON pre_onboarding_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_case_id              ON follow_ups(case_id);
CREATE INDEX IF NOT EXISTS idx_hil_gates_case_id               ON hil_gates(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id               ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_items_case_id      ON provisioning_items(case_id);
CREATE INDEX IF NOT EXISTS idx_post_onboarding_items_case_id   ON post_onboarding_items(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id              ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_consents_case_id                ON consents(case_id);

-- ═══════════════════════════════════════════════════════════════════
-- SEED: email templates (reference data — idempotent)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO email_templates (template_name, version, content, approved_by, approved_at, is_active)
VALUES
  ('t_minus_7', 'v1.0',
   'Dear {{first_name}}, your joining date at {{company}} is in 7 days on {{joining_date}}. Please complete your onboarding documents at your earliest convenience.',
   'System', NOW(), TRUE),
  ('t_minus_3', 'v1.0',
   'Dear {{first_name}}, your joining date at {{company}} is in 3 days on {{joining_date}}. This is a reminder to ensure all onboarding tasks are completed.',
   'System', NOW(), TRUE),
  ('t_plus_0', 'v1.0',
   'Dear {{first_name}}, welcome to your first day at {{company}}! Your HR coordinator will be in touch shortly. We look forward to having you on board.',
   'System', NOW(), TRUE)
ON CONFLICT (template_name, version) DO NOTHING;
