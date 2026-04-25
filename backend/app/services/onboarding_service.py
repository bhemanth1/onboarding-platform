"""
Onboarding Service - Workflow Management
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from ..models.onboarding import OnboardingCase, OnboardingPhase, OnboardingStatus

class OnboardingService:
    """Onboarding workflow service"""
    
    def __init__(self, db):
        self.db = db
    
    def create_onboarding_case(self, employee_id: str, employee_name: str) -> OnboardingCase:
        """Create onboarding case for new employee"""
        case = OnboardingCase(
            id=f"CASE-{uuid.uuid4().hex[:8].upper()}",
            employee_id=employee_id,
            employee_name=employee_name,
            phase=OnboardingPhase.PRE_ONBOARDING,
            status=OnboardingStatus.PENDING,
            progress_percentage=0,
            current_step=1,
            total_steps=6,
            start_date=datetime.now(),
            target_completion_date=datetime.now() + timedelta(days=30),
            identity_doc_status="pending",
            employment_agreement_status="pending",
            tax_form_status="pending",
            address_proof_status="pending",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        cursor = self.db.cursor()
        cursor.execute('''
            INSERT INTO onboarding_cases 
            (id, employee_id, employee_name, phase, status, progress_percentage,
             current_step, total_steps, start_date, target_completion_date,
             identity_doc_status, employment_agreement_status, tax_form_status,
             address_proof_status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            case.id, case.employee_id, case.employee_name, case.phase.value,
            case.status.value, case.progress_percentage, case.current_step,
            case.total_steps, case.start_date, case.target_completion_date,
            case.identity_doc_status, case.employment_agreement_status,
            case.tax_form_status, case.address_proof_status,
            case.created_at, case.updated_at
        ))
        self.db.commit()
        return case
    
    def get_case(self, case_id: str) -> Optional[dict]:
        """Get onboarding case"""
        cursor = self.db.cursor()
        cursor.execute('SELECT * FROM onboarding_cases WHERE id = ?', (case_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def get_cases_by_phase(self, phase: str, limit: int = 100) -> List[dict]:
        """Get cases by phase"""
        cursor = self.db.cursor()
        cursor.execute('SELECT * FROM onboarding_cases WHERE phase = ? LIMIT ?', (phase, limit))
        return [dict(row) for row in cursor.fetchall()]
    
    def get_cases_by_status(self, status: str, limit: int = 100) -> List[dict]:
        """Get cases by status"""
        cursor = self.db.cursor()
        cursor.execute('SELECT * FROM onboarding_cases WHERE status = ? LIMIT ?', (status, limit))
        return [dict(row) for row in cursor.fetchall()]
    
    def get_all_cases(self, limit: int = 100) -> List[dict]:
        """Get all onboarding cases"""
        cursor = self.db.cursor()
        cursor.execute('SELECT * FROM onboarding_cases LIMIT ?', (limit,))
        return [dict(row) for row in cursor.fetchall()]
    
    def update_case_progress(self, case_id: str, progress: int) -> Optional[dict]:
        """Update case progress"""
        cursor = self.db.cursor()
        cursor.execute('''
            UPDATE onboarding_cases 
            SET progress_percentage = ?, updated_at = ?
            WHERE id = ?
        ''', (progress, datetime.now(), case_id))
        self.db.commit()
        return self.get_case(case_id)
    
    def update_case_status(self, case_id: str, status: str) -> Optional[dict]:
        """Update case status"""
        cursor = self.db.cursor()
        cursor.execute('''
            UPDATE onboarding_cases 
            SET status = ?, updated_at = ?
            WHERE id = ?
        ''', (status, datetime.now(), case_id))
        self.db.commit()
        return self.get_case(case_id)
    
    def move_to_next_phase(self, case_id: str, next_phase: str) -> Optional[dict]:
        """Move case to next phase"""
        cursor = self.db.cursor()
        cursor.execute('''
            UPDATE onboarding_cases 
            SET phase = ?, current_step = current_step + 1, 
                progress_percentage = (current_step * 100 / total_steps),
                updated_at = ?
            WHERE id = ?
        ''', (next_phase, datetime.now(), case_id))
        self.db.commit()
        return self.get_case(case_id)
    
    def complete_case(self, case_id: str) -> Optional[dict]:
        """Mark case as complete"""
        cursor = self.db.cursor()
        cursor.execute('''
            UPDATE onboarding_cases 
            SET status = ?, phase = ?, progress_percentage = 100,
                actual_completion_date = ?, updated_at = ?
            WHERE id = ?
        ''', (OnboardingStatus.COMPLETED.value, OnboardingPhase.COMPLETED.value,
              datetime.now(), datetime.now(), case_id))
        self.db.commit()
        return self.get_case(case_id)
