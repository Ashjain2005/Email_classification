"""
MailGuard AI - FastAPI Application Server.

Entry point for the backend REST API server.
"""

import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
root_dir = os.path.dirname(backend_dir)
dist_dir = os.path.join(root_dir, "frontend", "dist")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.api.routes import router as api_router
from ml.predict import get_pipeline, is_model_available
from app.database.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes SQLite database and pre-warms ML pipeline on startup."""
    init_db()
    if is_model_available():
        try:
            get_pipeline()
            print("[MailGuard AI] Model pipeline pre-loaded and ready for inference.")
        except Exception as e:
            print(f"[MailGuard AI] Warning: Failed to pre-load model: {e}")
    else:
        print("[MailGuard AI] Notice: Model artifact not found yet. Run training script to generate.")
    yield


app = FastAPI(
    title="MailGuard AI API",
    description="Enterprise-grade AI Email Security & Spam Classification System",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend applications (Vite default :5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(api_router, prefix="/api")

# Mount frontend production build assets if available
if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Serve exact file if exists in dist
        file_path = os.path.join(dist_dir, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise fallback to index.html for React SPA client-side routing
        return FileResponse(os.path.join(dist_dir, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "application": "MailGuard AI",
            "description": "AI-Based Spam Classification System",
            "documentation": "/docs",
            "health_check": "/api/health"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
