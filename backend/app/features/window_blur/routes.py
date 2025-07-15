"""
Window Blur Routes

This module contains the API routes for window blur monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import WindowBlurService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/window-blur", tags=["Window Blur"])

class WindowBlurViolationRequest(BaseModel):
    session_id: int
    duration_seconds: float = None
    screenshot_path: str = None
    additional_info: Dict[str, Any] = None

@router.post("/violation")
async def log_window_blur_violation(
    violation: WindowBlurViolationRequest,
    db: Session = Depends(get_db)
):
    """Log a window blur violation"""
    try:
        success = WindowBlurService.log_window_blur_violation(
            db=db,
            session_id=violation.session_id,
            duration_seconds=violation.duration_seconds,
            screenshot_path=violation.screenshot_path,
            additional_info=violation.additional_info
        )
        
        if success:
            return {"message": "Window blur violation logged successfully", "session_id": violation.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log window blur violation")
    except Exception as e:
        logger.error(f"Error logging window blur violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/violations")
async def get_session_window_blur_violations(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all window blur violations for a session"""
    try:
        return WindowBlurService.get_session_violations(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session window blur violations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/status")
async def get_window_blur_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get the current window blur status for a session"""
    try:
        return WindowBlurService.get_window_blur_status(db, session_id)
    except Exception as e:
        logger.error(f"Error getting window blur status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/summary")
async def get_window_blur_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a summary of window blur violations for a session"""
    try:
        return WindowBlurService.get_violation_summary(db, session_id)
    except Exception as e:
        logger.error(f"Error getting window blur summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 