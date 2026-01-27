import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api.api import api_router
from app.database import init_db, close_db

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events"""
    # Startup
    print("🚀 Starting up...")
    await init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("🛑 Shutting down...")
    await close_db()
    print("✅ Database connections closed")


app = FastAPI(
    title="AI Workflow Automation API", 
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration - Allow frontend URLs (configure via ALLOWED_ORIGINS env var)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-workflow-backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=True)

