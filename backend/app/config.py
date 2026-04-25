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
    HOST = '127.0.0.1'
    PORT = 8000
    DEBUG = True
    
    # Database
    DB_CON_STR = os.getenv('DB_CON_STR', 'sqlite:///./aegis.db')
    DB_PATH = 'aegis.db'
    USE_POSTGRES = DB_CON_STR.startswith('postgresql')
    
    # CORS
    CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:5173', 'http://127.0.0.1:5173']
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOW_METHODS = ['*']
    CORS_ALLOW_HEADERS = ['*']
    
    # Agent Configuration
    AGENT_NAME = "AEGIS Agent"
    AGENT_ENABLED = True
    AGENT_AUTO_TRIGGER = True
    
    # Email Configuration (for notifications)
    SMTP_SERVER = 'smtp.gmail.com'
    SMTP_PORT = 587
    SMTP_USER = ''
    SMTP_PASSWORD = ''
    MAIL_USERNAME = 'rakshithdasari07@gmail.com'
    MAIL_PASSWORD = 'jfsrygzepympybyi'
    MAIL_FROM = 'rakshithdasari07@gmail.com'
    MAIL_FROM_NAME = 'aegis.ai Onboarding Agent'
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_STARTTLS = True
    MAIL_SSL_TLS = False
    HR_APPROVER_EMAIL = 'v_anugu.reddy@centific.com'
    BACKEND_URL = 'http://localhost:8000'
    HIL_TOKEN_EXPIRY_HOURS = 48
    AGENT_ID = 'AG-HR-0426-001'
    
    # Timeouts
    TASK_TIMEOUT = 3600
    HIL_TIMEOUT = 86400  # 24 hours

settings = Settings()
