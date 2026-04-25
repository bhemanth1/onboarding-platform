"""
Controllers / Routes
"""
from .employee_controller import router as employee_router
from .onboarding_controller import router as onboarding_router
from .hil_controller import router as hil_router
from .audit_controller import router as audit_router
from .dashboard_controller import router as dashboard_router
from .mvp_controller import router as mvp_router

__all__ = [
    'employee_router',
    'onboarding_router',
    'hil_router',
    'audit_router',
    'dashboard_router',
    'mvp_router',
]
