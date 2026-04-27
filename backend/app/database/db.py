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

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS role_profiles (
            role_name TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            initials TEXT,
            color TEXT,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

if __name__ == '__main__':
    init_db()
