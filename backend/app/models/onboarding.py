"""
Onboarding Case and Phase Models
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class OnboardingPhase(str, Enum):
    """Onboarding workflow phases"""
    PRE_ONBOARDING = "pre"
    ONBOARDING = "onb"
    POST_ONBOARDING = "post"
    COMPLETED = "completed"

class OnboardingStatus(str, Enum):
    """Case status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    AT_RISK = "at_risk"
    COMPLETED = "completed"

class OnboardingCase(BaseModel):
    """Onboarding case model"""
    id: str
    employee_id: str
    employee_name: str
    phase: OnboardingPhase
    status: OnboardingStatus
    progress_percentage: int  # 0-100
    current_step: int
    total_steps: int
    start_date: datetime
    target_completion_date: datetime
    actual_completion_date: Optional[datetime] = None
    
    # Document tracking
    identity_doc_status: str  # pending, uploaded, verified
    identity_doc_number: Optional[str] = None
    employment_agreement_status: str
    tax_form_status: str
    address_proof_status: str
    
    # IT Provisioning
    hardware_ordered: bool = False
    email_created: bool = False
    access_provisioned: bool = False
    
    # Metadata
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = None
    updated_at: datetime = None
    
    class Config:
        from_attributes = True

    @property
    def days_remaining(self) -> int:
        """Calculate days until target completion"""
        from datetime import datetime as dt
        return (self.target_completion_date - dt.now()).days
