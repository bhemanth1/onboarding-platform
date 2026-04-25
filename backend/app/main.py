"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .config import settings
from .database import init_db
from .database.postgres import close_pool, init_pool, postgres_enabled
from .services.scheduler_service import start_scheduler, stop_scheduler
from .controllers import (
    employee_router,
    onboarding_router,
    hil_router,
    audit_router,
    dashboard_router,
    mvp_router,
    v1_router,
)

# Initialize database
init_db()

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Include routers
app.include_router(employee_router)
app.include_router(onboarding_router)
app.include_router(hil_router)
app.include_router(audit_router)
app.include_router(dashboard_router)
app.include_router(mvp_router)
app.include_router(v1_router)


@app.on_event("startup")
async def startup_event():
    if postgres_enabled():
        await init_pool()
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()
    await close_pool()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
STATIC_DIR = os.path.join(FRONTEND_DIR, "static")
VIEWS_DIR = os.path.join(FRONTEND_DIR, "views")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
DIST_ASSETS_DIR = os.path.join(DIST_DIR, "assets")

if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
if os.path.isdir(DIST_ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=DIST_ASSETS_DIR), name="assets")

# Health check
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "agent": settings.AGENT_ID,
        "version": settings.API_VERSION
    }

@app.get("/")
def root():
    """Serve the desktop frontend view."""
    dist_index = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(dist_index):
        return FileResponse(dist_index)
    index_path = os.path.join(VIEWS_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"name": settings.API_TITLE, "version": settings.API_VERSION, "docs_url": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
