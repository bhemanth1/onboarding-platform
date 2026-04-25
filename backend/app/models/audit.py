"""
Audit Log Model
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class AuditAction(str, Enum):
    """Audit log action types"""
    CREATE = "create"
    UPDATE = "update"
    APPROVE = "approve"
    REJECT = "reject"
    TRIGGER = "trigger"
    VERIFY = "verify"
    COMPLETE = "complete"
    NOTIFY = "notify"

class AuditLog(BaseModel):
    """Audit log entry"""
    id: str
    case_id: str
    employee_name: str
    action: AuditAction
    action_by: str  # Agent or User
    timestamp: datetime
    
    # Details
    resource_type: str  # 'employee', 'document', 'hil_gate', 'task'
    resource_id: str
    description: str
    
    # Outcome
    outcome: str  # 'success', 'failure', 'pending'
    rule_triggered: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True
