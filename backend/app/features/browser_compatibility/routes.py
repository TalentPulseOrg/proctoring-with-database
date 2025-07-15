"""
Browser Compatibility Routes

This module contains the API routes for browser compatibility monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import BrowserCompatibilityService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/browser-compatibility", tags=["Browser Compatibility"])

class BrowserCompatibilityCheck(BaseModel):
    session_id: int
    browser_name: str
    browser_version: str = None
    user_agent: str = None

@router.post("/check")
async def check_browser_compatibility(
    check: BrowserCompatibilityCheck,
    db: Session = Depends(get_db)
):
    """Check browser compatibility"""
    try:
        return BrowserCompatibilityService.log_browser_check(
            db=db,
            session_id=check.session_id,
            browser_name=check.browser_name,
            browser_version=check.browser_version,
            user_agent=check.user_agent
        )
    except Exception as e:
        logger.error(f"Error checking browser compatibility: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-from-request")
async def check_browser_compatibility_from_request(
    session_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Check browser compatibility using request headers"""
    try:
        user_agent = request.headers.get("user-agent", "")
        browser_name, browser_version = BrowserCompatibilityService.extract_browser_info(user_agent)
        
        return BrowserCompatibilityService.log_browser_check(
            db=db,
            session_id=session_id,
            browser_name=browser_name,
            browser_version=browser_version,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error checking browser compatibility from request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/checks")
async def get_session_browser_checks(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all browser compatibility checks for a session"""
    try:
        return BrowserCompatibilityService.get_session_browser_checks(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session browser checks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/status")
async def get_browser_compatibility_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get the current browser compatibility status for a session"""
    try:
        return BrowserCompatibilityService.get_browser_compatibility_status(db, session_id)
    except Exception as e:
        logger.error(f"Error getting browser compatibility status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supported-browsers")
async def get_supported_browsers():
    """Get list of supported browsers"""
    try:
        return {
            "supported_browsers": list(BrowserCompatibilityService.SUPPORTED_BROWSERS.keys()),
            "browser_patterns": BrowserCompatibilityService.SUPPORTED_BROWSERS
        }
    except Exception as e:
        logger.error(f"Error getting supported browsers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 