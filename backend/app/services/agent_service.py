"""
Agent Service - Autonomous Workflow Agent
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from ..models.audit import AuditLog, AuditAction

class AgentService:
    """Autonomous agent for managing workflows"""
    
    def __init__(self, db):
        self.db = db
        self.agent_name = "AEGIS Agent"
    
    def log_action(self, case_id: str, employee_name: str, action: str,
                   resource_type: str, resource_id: str, description: str,
                   outcome: str, rule_triggered: Optional[str] = None,
                   details: Optional[Dict] = None) -> AuditLog:
        """Log agent action in audit trail"""
        log = AuditLog(
            id=f"AUDIT-{uuid.uuid4().hex[:8].upper()}",
            case_id=case_id,
            employee_name=employee_name,
            action=action,
            action_by=self.agent_name,
            timestamp=datetime.now(),
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            outcome=outcome,
            rule_triggered=rule_triggered,
            details=details
        )
        
        cursor = self.db.cursor()
        import json
        cursor.execute('''
            INSERT INTO audit_logs 
            (id, case_id, employee_name, action, action_by, timestamp,
             resource_type, resource_id, description, outcome, rule_triggered, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            log.id, log.case_id, log.employee_name, log.action, log.action_by,
            log.timestamp, log.resource_type, log.resource_id, log.description,
            log.outcome, log.rule_triggered, json.dumps(details) if details else None
        ))
        self.db.commit()
        return log
    
    def trigger_hil_gate(self, case_id: str, gate_number: int, gate_name: str,
                         description: str) -> Dict[str, Any]:
        """Trigger a Human-In-Loop gate"""
        log = self.log_action(
            case_id=case_id,
            employee_name="Unknown",
            action=AuditAction.TRIGGER.value,
            resource_type="hil_gate",
            resource_id=f"HIL-{gate_number}",
            description=f"HIL Gate {gate_number} triggered: {gate_name}",
            outcome="success"
        )
        return {
            "status": "success",
            "gate_number": gate_number,
            "gate_name": gate_name,
            "audit_log": log.dict()
        }
    
    def process_documents(self, case_id: str, employee_name: str) -> Dict[str, Any]:
        """Process and validate documents"""
        log = self.log_action(
            case_id=case_id,
            employee_name=employee_name,
            action=AuditAction.VERIFY.value,
            resource_type="documents",
            resource_id="ALL",
            description="Agent processing and validating documents",
            outcome="pending"
        )
        return {
            "status": "processing",
            "audit_log": log.dict()
        }
    
    def provision_it_resources(self, case_id: str, employee_name: str) -> Dict[str, Any]:
        """Trigger IT provisioning"""
        log = self.log_action(
            case_id=case_id,
            employee_name=employee_name,
            action=AuditAction.TRIGGER.value,
            resource_type="it_provisioning",
            resource_id="PROV-" + uuid.uuid4().hex[:6].upper(),
            description="Agent triggered IT provisioning request",
            outcome="pending"
        )
        return {
            "status": "provisioning_initiated",
            "audit_log": log.dict()
        }
    
    def send_follow_up_reminder(self, case_id: str, employee_name: str,
                               message: str) -> Dict[str, Any]:
        """Send follow-up reminder"""
        log = self.log_action(
            case_id=case_id,
            employee_name=employee_name,
            action=AuditAction.NOTIFY.value,
            resource_type="notification",
            resource_id="NOTIF-" + uuid.uuid4().hex[:6].upper(),
            description=f"Follow-up reminder sent: {message}",
            outcome="success"
        )
        return {
            "status": "notification_sent",
            "audit_log": log.dict()
        }
    
    def get_audit_log(self, case_id: str, limit: int = 50) -> list:
        """Get audit log for case"""
        cursor = self.db.cursor()
        cursor.execute('''
            SELECT * FROM audit_logs 
            WHERE case_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (case_id, limit))
        return [dict(row) for row in cursor.fetchall()]
