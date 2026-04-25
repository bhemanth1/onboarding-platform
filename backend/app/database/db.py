"""
Database Configuration and Connection
"""
import sqlite3
from typing import Generator
from ..config import settings

DB_PATH = settings.DB_PATH

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_db() -> Generator:
    """Dependency: Get database connection"""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Initialize database schema"""
    if settings.USE_POSTGRES:
        print("PostgreSQL configured; skipping local SQLite initialization")
        return

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Employees table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            role TEXT NOT NULL,
            department TEXT NOT NULL,
            reporting_manager TEXT,
            joining_date TIMESTAMP,
            employment_type TEXT,
            office_location TEXT,
            hardware_tier TEXT,
            it_status TEXT,
            documents_status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Onboarding cases table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS onboarding_cases (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL,
            employee_name TEXT NOT NULL,
            phase TEXT,
            status TEXT,
            progress_percentage INTEGER DEFAULT 0,
            current_step INTEGER,
            total_steps INTEGER,
            start_date TIMESTAMP,
            target_completion_date TIMESTAMP,
            actual_completion_date TIMESTAMP,
            identity_doc_status TEXT,
            identity_doc_number TEXT,
            employment_agreement_status TEXT,
            tax_form_status TEXT,
            address_proof_status TEXT,
            hardware_ordered BOOLEAN DEFAULT 0,
            email_created BOOLEAN DEFAULT 0,
            access_provisioned BOOLEAN DEFAULT 0,
            assigned_to TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        )
    ''')
    
    # HIL Gates table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hil_gates (
            id TEXT PRIMARY KEY,
            case_id TEXT NOT NULL,
            gate_number INTEGER,
            gate_name TEXT,
            gate_type TEXT,
            status TEXT,
            description TEXT,
            assigned_to TEXT,
            decision_date TIMESTAMP,
            decision_notes TEXT,
            checks_required TEXT,
            checks_passed INTEGER DEFAULT 0,
            checks_total INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (case_id) REFERENCES onboarding_cases(id)
        )
    ''')
    
    # Audit logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            case_id TEXT,
            employee_name TEXT,
            action TEXT,
            action_by TEXT,
            timestamp TIMESTAMP,
            resource_type TEXT,
            resource_id TEXT,
            description TEXT,
            outcome TEXT,
            rule_triggered TEXT,
            details TEXT
        )
    ''')
    
    conn.commit()
    seed_sample_data(conn)
    conn.close()
    print("Database initialized successfully")

def seed_sample_data(conn):
    """Seed the demo workspace once so the frontend has usable app data."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS count FROM employees")
    if cursor.fetchone()["count"]:
        return

    employees = [
        ("EMP-2026-00841", "Aryan", "Mehta", "aryan.mehta@example.com", "Senior Data Engineer", "Engineering", "2026-04-28", "Pending HIL", "Validated"),
        ("EMP-2026-00842", "Priya", "Kapoor", "priya.kapoor@example.com", "Product Designer", "Design", "2026-04-28", "In Queue", "Partial"),
        ("EMP-2026-00843", "Wei", "Chen", "wei.chen@example.com", "HR Business Partner", "HR", "2026-04-14", "Provisioned", "Complete"),
        ("EMP-2026-00844", "Fatima", "Noor", "fatima.noor@example.com", "Compliance Analyst", "Legal", "2026-04-07", "Provisioned", "Complete"),
        ("EMP-2026-00845", "Rohit", "Sharma", "rohit.sharma@example.com", "DevOps Engineer", "Engineering", "2026-05-05", "Requested", "In Review"),
        ("EMP-2026-00846", "Aisha", "Patel", "aisha.patel@example.com", "Data Analyst", "Analytics", "2026-05-01", "Not Started", "Not Started"),
        ("EMP-2026-00847", "James", "O'Brien", "james.obrien@example.com", "Finance Manager", "Finance", "2026-04-30", "Pending", "Exception"),
        ("EMP-2026-00848", "Mei", "Tanaka", "mei.tanaka@example.com", "UX Researcher", "Design", "2026-05-12", "Not Started", "Not Started"),
    ]
    cursor.executemany(
        """
        INSERT INTO employees
        (id, first_name, last_name, email, role, department, reporting_manager,
         joining_date, employment_type, office_location, hardware_tier,
         it_status, documents_status)
        VALUES (?, ?, ?, ?, ?, ?, 'Nandita Mehta', ?, 'New Hire', 'Bengaluru',
                'Standard (M3)', ?, ?)
        """,
        employees,
    )

    cases = [
        ("OB-0841", "EMP-2026-00841", "Aryan Mehta", "onb", "hil", 55, 4, 6, "2026-04-28", "Pending HIL", "Validated", 0, 1, 0, "HR Coordinator"),
        ("OB-0842", "EMP-2026-00842", "Priya Kapoor", "pre", "in-progress", 30, 2, 6, "2026-04-28", "In Queue", "Partial", 0, 0, 0, "HR Coordinator"),
        ("OB-0843", "EMP-2026-00843", "Wei Chen", "post", "completed", 95, 6, 6, "2026-04-14", "Provisioned", "Complete", 1, 1, 1, "HR Ops Manager"),
        ("OB-0844", "EMP-2026-00844", "Fatima Noor", "post", "at-risk", 80, 5, 6, "2026-04-07", "Provisioned", "Complete", 1, 1, 1, "HR Ops Manager"),
        ("OB-0845", "EMP-2026-00845", "Rohit Sharma", "onb", "in-progress", 40, 3, 6, "2026-05-05", "Requested", "In Review", 1, 1, 0, "IT Admin"),
        ("OB-0846", "EMP-2026-00846", "Aisha Patel", "pre", "at-risk", 15, 1, 6, "2026-05-01", "Not Started", "Not Started", 0, 0, 0, "HR Coordinator"),
        ("OB-0847", "EMP-2026-00847", "James O'Brien", "onb", "blocked", 60, 4, 6, "2026-04-30", "Pending", "Exception", 0, 1, 0, "Finance Ops"),
        ("OB-0848", "EMP-2026-00848", "Mei Tanaka", "pre", "in-progress", 20, 1, 6, "2026-05-12", "Not Started", "Not Started", 0, 0, 0, "HR Coordinator"),
    ]
    cursor.executemany(
        """
        INSERT INTO onboarding_cases
        (id, employee_id, employee_name, phase, status, progress_percentage,
         current_step, total_steps, start_date, target_completion_date,
         identity_doc_status, employment_agreement_status, tax_form_status,
         address_proof_status, hardware_ordered, email_created, access_provisioned,
         assigned_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 'pending',
                'pending', ?, ?, ?, ?, ?)
        """,
        cases,
    )

    gates = [
        ("HIL-0841-1", "OB-0841", 1, "Doc Verification", "approval", "pending", "Validate identity and payroll documents", "Nandita Mehta", 2, 3),
        ("HIL-0842-4", "OB-0842", 4, "Joining Date Amendment", "approval", "pending", "Approve revised joining date", "Nandita Mehta", 1, 2),
        ("HIL-0843-4", "OB-0843", 4, "HR Ops Approval", "approval", "approved", "Final HR operations sign-off", "Nandita Mehta", 4, 4),
        ("HIL-0847-3", "OB-0847", 3, "Payroll Exception", "exception", "pending", "Resolve payroll configuration blocker", "Finance Ops", 1, 3),
    ]
    cursor.executemany(
        """
        INSERT INTO hil_gates
        (id, case_id, gate_number, gate_name, gate_type, status, description,
         assigned_to, checks_passed, checks_total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        gates,
    )

    logs = [
        ("AUD-001", "OB-0841", "Aryan Mehta", "HIL Gate 1 triggered", "AEGIS Agent", "2026-04-25T09:43:00", "hil_gate", "HIL-0841-1", "Pending HR review", "pending", "BR-002"),
        ("AUD-002", "OB-0841", "Aryan Mehta", "Background check initiated", "AEGIS Agent", "2026-04-25T09:38:00", "background_check", "OB-0841", "In progress", "success", "BR-002"),
        ("AUD-003", "OB-0841", "Aryan Mehta", "Document validation passed", "AEGIS Agent", "2026-04-25T09:31:00", "document", "EMP-2026-00841", "Rule BR-002 v1.3 passed", "success", "BR-002 v1.3"),
        ("AUD-004", "OB-0842", "Priya Kapoor", "3-day follow-up sent", "AEGIS Agent", "2026-04-25T09:05:00", "notification", "EMP-2026-00842", "Delivered to candidate", "success", "BR-001"),
        ("AUD-005", "OB-0845", "Rohit Sharma", "HRMS record created", "AEGIS Agent", "2026-04-25T08:52:00", "employee", "EMP-2026-00845", "Employee record created", "success", "BR-003"),
        ("AUD-006", "OB-0847", "James O'Brien", "Payroll config blocked", "AEGIS Agent", "2026-04-25T08:40:00", "payroll", "OB-0847", "Exception raised", "warning", "BR-004"),
        ("AUD-007", "OB-0843", "Wei Chen", "Buddy assigned", "AEGIS Agent", "2026-04-25T08:22:00", "buddy", "OB-0843", "Neha Singh assigned", "success", "BR-005"),
    ]
    cursor.executemany(
        """
        INSERT INTO audit_logs
        (id, case_id, employee_name, action, action_by, timestamp, resource_type,
         resource_id, description, outcome, rule_triggered)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        logs,
    )

    conn.commit()

if __name__ == '__main__':
    init_db()
