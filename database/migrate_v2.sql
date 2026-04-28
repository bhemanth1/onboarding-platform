-- ═══════════════════════════════════════════════════════════════════
-- AEGIS.AI — BRD V5 Migration: Phase 2 fields
-- Run once against the live Aiven (PostgreSQL) database.
-- Idempotent — safe to re-run; uses ADD COLUMN IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════

SET search_path TO dana;

-- ── candidates: BRD data-capture fields ──────────────────────────
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS date_of_birth                  DATE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS grade_band                     VARCHAR(50);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS country_of_employment          VARCHAR(100);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS european_country_of_employment BOOLEAN DEFAULT FALSE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS permanent_address              TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS emergency_contact              JSONB;

-- ── onboarding_cases: BRD state-machine fields ───────────────────
ALTER TABLE onboarding_cases ADD COLUMN IF NOT EXISTS manager_notification_status      VARCHAR(80)  DEFAULT 'not_sent';
ALTER TABLE onboarding_cases ADD COLUMN IF NOT EXISTS welcome_email_status             VARCHAR(80)  DEFAULT 'not_sent';
ALTER TABLE onboarding_cases ADD COLUMN IF NOT EXISTS statutory_form_type              VARCHAR(120);
ALTER TABLE onboarding_cases ADD COLUMN IF NOT EXISTS statutory_form_submission_status VARCHAR(80)  DEFAULT 'not_applicable';
ALTER TABLE onboarding_cases ADD COLUMN IF NOT EXISTS tax_statutory_config_status      VARCHAR(80)  DEFAULT 'not_started';
ALTER TABLE onboarding_cases ADD COLUMN IF NOT EXISTS hr_signoff_status                VARCHAR(80)  DEFAULT 'pending';
ALTER TABLE onboarding_cases ADD COLUMN IF NOT EXISTS it_admin_notification_failed     BOOLEAN      DEFAULT FALSE;
ALTER TABLE onboarding_cases ADD COLUMN IF NOT EXISTS it_admin_action_item_open        BOOLEAN      DEFAULT FALSE;

-- ── Back-fill existing rows with sensible defaults ────────────────
UPDATE onboarding_cases
SET
    manager_notification_status      = CASE WHEN overall_progress >= 50  THEN 'sent' ELSE 'not_sent' END,
    welcome_email_status             = CASE WHEN overall_progress = 100 THEN 'sent' ELSE 'not_sent' END,
    statutory_form_type              = CASE
                                         WHEN oc2.nationality = 'Indian' THEN 'Form_12BB'
                                         ELSE 'W8-BEN'
                                       END,
    statutory_form_submission_status = CASE WHEN overall_progress >= 80  THEN 'submitted' ELSE 'not_submitted' END,
    tax_statutory_config_status      = CASE WHEN payroll_status = 'completed' THEN 'configured' ELSE 'not_started' END,
    hr_signoff_status                = CASE WHEN is_completed THEN 'signed_off' ELSE 'pending' END,
    it_admin_notification_failed     = (it_status = 'failed_retrying'),
    it_admin_action_item_open        = (it_status IN ('failed_retrying', 'blocked'))
FROM candidates oc2
WHERE onboarding_cases.candidate_id = oc2.id
  AND onboarding_cases.manager_notification_status = 'not_sent';

-- ── Back-fill candidate fields ────────────────────────────────────
UPDATE candidates
SET
    country_of_employment = CASE
        WHEN office_location ILIKE '%hyderabad%' OR office_location ILIKE '%bengaluru%'
             OR office_location ILIKE '%mumbai%' OR nationality = 'Indian' THEN 'India'
        WHEN nationality = 'German'  THEN 'Germany'
        WHEN nationality = 'Russian' THEN 'Russia'
        ELSE nationality
    END,
    european_country_of_employment = (nationality IN ('German', 'French', 'Italian', 'Spanish', 'Dutch', 'Belgian')),
    grade_band = CASE
        WHEN role ILIKE '%lead%' OR role ILIKE '%manager%' OR role ILIKE '%head%' THEN 'L4'
        WHEN role ILIKE '%senior%' OR role ILIKE '%specialist%' THEN 'L3'
        WHEN role ILIKE '%analyst%' OR role ILIKE '%engineer%' THEN 'L2'
        ELSE 'L1'
    END
WHERE country_of_employment IS NULL;

-- ── role_profiles: add Compliance Reviewer + HR Platform Engineer ──
INSERT INTO role_profiles (role_name, display_name, initials, color, sort_order, is_active, created_at, updated_at)
VALUES
    ('Compliance Reviewer',     'Riya Sharma',      'RS', '#0E766E', 6, TRUE, NOW(), NOW()),
    ('HR Platform Engineer',    'Arjun Dev',        'AD', '#7C3AED', 7, TRUE, NOW(), NOW())
ON CONFLICT (role_name) DO NOTHING;
