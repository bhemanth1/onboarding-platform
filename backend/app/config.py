"""
Application Configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Application settings"""
    # API Configuration
    API_TITLE = "AEGIS.AI - Employee Onboarding OS"
    API_VERSION = "1.0.0"
    API_DESCRIPTION = "Backend API for Employee Onboarding Management"
    
    # Server
    HOST = os.getenv('HOST', '127.0.0.1')
    PORT = int(os.getenv('PORT', 8000))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Database
    DB_CON_STR = os.getenv('DB_CON_STR', 'sqlite:///./aegis.db')
    DB_PATH = os.getenv('DB_PATH', 'aegis.db')
    USE_POSTGRES = DB_CON_STR.startswith('postgresql')
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5000,http://localhost:5173,http://127.0.0.1:5173').split(',')
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOW_METHODS = ['*']
    CORS_ALLOW_HEADERS = ['*']
    
    # Agent Configuration
    AGENT_NAME = "AEGIS Agent"
    AGENT_ENABLED = True
    AGENT_AUTO_TRIGGER = True
    
    # Email Configuration (for notifications)
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SMTP_USER = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', SMTP_USER)
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', SMTP_PASSWORD).replace(' ', '')
    MAIL_FROM = os.getenv('MAIL_FROM', MAIL_USERNAME)
    MAIL_FROM_NAME = os.getenv('MAIL_FROM_NAME', 'aegis.ai Onboarding Agent')
    MAIL_SERVER = os.getenv('MAIL_SERVER', SMTP_SERVER)
    MAIL_PORT = int(os.getenv('MAIL_PORT', SMTP_PORT))
    MAIL_STARTTLS = os.getenv('MAIL_STARTTLS', 'True').lower() == 'true'
    MAIL_SSL_TLS = os.getenv('MAIL_SSL_TLS', 'False').lower() == 'true'
    HR_APPROVER_EMAIL = os.getenv('HR_APPROVER_EMAIL', 'hr-coordinator@company.com')
    BACKEND_URL = os.getenv('BACKEND_URL', f'http://{HOST}:{PORT}')
    HIL_TOKEN_EXPIRY_HOURS = int(os.getenv('HIL_TOKEN_EXPIRY_HOURS', 48))
    AGENT_ID = os.getenv('AGENT_ID', 'AG-HR-0426-001')
    
    # Timeouts
    TASK_TIMEOUT = int(os.getenv('TASK_TIMEOUT', 3600))
    HIL_TIMEOUT = int(os.getenv('HIL_TIMEOUT', 86400))  # 24 hours

settings = Settings()
