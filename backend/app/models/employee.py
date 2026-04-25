"""
Employee Model
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class Employee(BaseModel):
    """Employee data model"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    role: str
    department: str
    reporting_manager: str
    joining_date: datetime
    employment_type: str  # 'New Hire', 'Internal Transfer', 'Contractor'
    office_location: str
    hardware_tier: str  # 'Basic', 'Standard (M3)', 'Premium'
    it_status: Optional[str] = None
    documents_status: Optional[str] = None
    created_at: datetime = None
    updated_at: datetime = None

    @property
    def full_name(self) -> str:
        """Get full name"""
        return f"{self.first_name} {self.last_name}"

    @property
    def initials(self) -> str:
        """Get name initials"""
        return f"{self.first_name[0]}{self.last_name[0]}".upper()
