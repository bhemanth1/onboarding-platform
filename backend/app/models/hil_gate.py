"""
HIL (Hand-off In Lieu) Gate Models
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class HILStatus(str, Enum):
    """HIL Gate status"""
    NOT_TRIGGERED = "not_triggered"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    BLOCKED = "blocked"

class HILGate(BaseModel):
    """Human-In-Loop decision gate"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    gate_number: int  # 1, 2, 3, 4
    gate_name: str  # e.g., "Doc Verification", "IT Confirmation"
    gate_type: str  # 'verification', 'approval', 'confirmation'
    status: HILStatus
    description: str
    
    # Decision tracking
    assigned_to: Optional[str] = None  # HR role/person
    decision_date: Optional[datetime] = None
    decision_notes: Optional[str] = None
    
    # Validation checks
    checks_required: dict = Field(default_factory=dict)  # e.g., {'document_valid': True}
    checks_passed: int = 0
    checks_total: int = 0
    
    # Timeline
    created_at: datetime = None
    updated_at: datetime = None
    
    @property
    def check_percentage(self) -> int:
        """Calculate check completion percentage"""
        if self.checks_total == 0:
            return 0
        return int((self.checks_passed / self.checks_total) * 100)
