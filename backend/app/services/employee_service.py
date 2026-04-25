"""
Employee Service - Business Logic
"""
import uuid
from datetime import datetime
from typing import List, Optional
from ..models.employee import Employee

class EmployeeService:
    """Employee management service"""
    
    def __init__(self, db):
        self.db = db
    
    def create_employee(self, employee_data: Employee) -> Employee:
        """Create new employee"""
        employee_data.id = employee_data.id or f"EMP-{uuid.uuid4().hex[:8].upper()}"
        employee_data.created_at = datetime.now()
        employee_data.updated_at = datetime.now()
        
        cursor = self.db.cursor()
        cursor.execute('''
            INSERT INTO employees 
            (id, first_name, last_name, email, phone, role, department, 
             reporting_manager, joining_date, employment_type, office_location, 
             hardware_tier, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            employee_data.id, employee_data.first_name, employee_data.last_name,
            employee_data.email, employee_data.phone, employee_data.role,
            employee_data.department, employee_data.reporting_manager,
            employee_data.joining_date, employee_data.employment_type,
            employee_data.office_location, employee_data.hardware_tier,
            employee_data.created_at, employee_data.updated_at
        ))
        self.db.commit()
        return employee_data
    
    def get_employee(self, employee_id: str) -> Optional[Employee]:
        """Get employee by ID"""
        cursor = self.db.cursor()
        cursor.execute('SELECT * FROM employees WHERE id = ?', (employee_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def get_all_employees(self, limit: int = 100) -> List[dict]:
        """Get all employees"""
        cursor = self.db.cursor()
        cursor.execute('SELECT * FROM employees LIMIT ?', (limit,))
        return [dict(row) for row in cursor.fetchall()]
    
    def update_employee(self, employee_id: str, updates: dict) -> Optional[Employee]:
        """Update employee"""
        updates['updated_at'] = datetime.now()
        
        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        values = list(updates.values()) + [employee_id]
        
        cursor = self.db.cursor()
        cursor.execute(f'UPDATE employees SET {set_clause} WHERE id = ?', values)
        self.db.commit()
        
        return self.get_employee(employee_id)
    
    def delete_employee(self, employee_id: str) -> bool:
        """Delete employee"""
        cursor = self.db.cursor()
        cursor.execute('DELETE FROM employees WHERE id = ?', (employee_id,))
        self.db.commit()
        return cursor.rowcount > 0
