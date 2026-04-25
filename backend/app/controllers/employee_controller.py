"""
Employee Controller - Employee Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from ..models.employee import Employee
from ..services.employee_service import EmployeeService
from ..database import get_db
from ..database.postgres import postgres_enabled
from ..services.v1_service import V1Service

router = APIRouter(prefix="/api/employees", tags=["employees"])

@router.post("/")
async def create_employee(employee: Employee, db = Depends(get_db)):
    """Create new employee"""
    if postgres_enabled():
        return await V1Service().create_candidate({
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "email": employee.email,
            "phone": employee.phone or "",
            "role": employee.role,
            "department": employee.department,
            "manager_name": employee.reporting_manager,
            "joining_date": employee.joining_date.date(),
            "employee_type": employee.employment_type,
            "office_location": employee.office_location,
            "employee_id": employee.id,
        })
    service = EmployeeService(db)
    return service.create_employee(employee)

@router.get("/{employee_id}", response_model=Optional[Employee])
def get_employee(employee_id: str, db = Depends(get_db)):
    """Get employee by ID"""
    service = EmployeeService(db)
    employee = service.get_employee(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.get("/", response_model=List[dict])
def list_employees(limit: int = 100, db = Depends(get_db)):
    """List all employees"""
    service = EmployeeService(db)
    return service.get_all_employees(limit)

@router.put("/{employee_id}", response_model=Optional[Employee])
def update_employee(employee_id: str, updates: dict, db = Depends(get_db)):
    """Update employee"""
    service = EmployeeService(db)
    employee = service.update_employee(employee_id, updates)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.delete("/{employee_id}")
def delete_employee(employee_id: str, db = Depends(get_db)):
    """Delete employee"""
    service = EmployeeService(db)
    if not service.delete_employee(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"status": "success", "message": "Employee deleted"}
