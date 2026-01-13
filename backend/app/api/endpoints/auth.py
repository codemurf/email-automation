from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.services.gmail_service import gmail_service
import os

router = APIRouter()

# Frontend URL for OAuth redirects (configure via FRONTEND_URL env var)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@router.get("/gmail/connect")
async def gmail_connect():
    """Start Gmail OAuth flow - returns URL to redirect user to"""
    auth_url = gmail_service.get_auth_url()
    return {"auth_url": auth_url}

@router.get("/gmail/callback")
async def gmail_callback(code: str = Query(...)):
    """Handle OAuth callback from Google"""
    result = await gmail_service.handle_oauth_callback(code)
    
    if result.get("success"):
        # Redirect to frontend with success
        return RedirectResponse(url=f"{FRONTEND_URL}/settings?gmail=connected")
    else:
        # Redirect with error
        return RedirectResponse(url=f"{FRONTEND_URL}/settings?gmail=error&message={result.get('error', 'Unknown error')}")

@router.get("/gmail/status")
async def gmail_status():
    """Check Gmail connection status"""
    connected = gmail_service.is_connected()
    return {
        "connected": connected,
        "mock_mode": gmail_service.mock_mode
    }

@router.post("/gmail/disconnect")
async def gmail_disconnect():
    """Disconnect Gmail account"""
    result = await gmail_service.disconnect()
    return result
