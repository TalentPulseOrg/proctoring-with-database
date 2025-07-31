"""
Full Screen Enforcement Routes

This module contains the API routes for fullscreen enforcement monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import FullscreenEnforcementService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/fullscreen-enforcement", tags=["Full Screen Enforcement"])

class FullscreenExitViolationRequest(BaseModel):
    session_id: int
    screenshot_path: str = None
    additional_info: Dict[str, Any] = None

@router.post("/violation")
async def log_fullscreen_exit_violation(
    violation: FullscreenExitViolationRequest,
    db: Session = Depends(get_db)
):
    """Log a fullscreen exit violation"""
    try:
        success = FullscreenEnforcementService.log_fullscreen_exit_violation(
            db=db,
            session_id=violation.session_id,
            screenshot_path=violation.screenshot_path,
            additional_info=violation.additional_info
        )
        
        if success:
            return {"message": "Fullscreen exit violation logged successfully", "session_id": violation.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log fullscreen exit violation")
    except Exception as e:
        logger.error(f"Error logging fullscreen exit violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/violations")
async def get_session_fullscreen_violations(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all fullscreen exit violations for a session"""
    try:
        return FullscreenEnforcementService.get_session_violations(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session fullscreen violations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/status")
async def get_fullscreen_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get the current fullscreen status for a session"""
    try:
        return FullscreenEnforcementService.get_fullscreen_status(db, session_id)
    except Exception as e:
        logger.error(f"Error getting fullscreen status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/summary")
async def get_fullscreen_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a summary of fullscreen exit violations for a session"""
    try:
        return FullscreenEnforcementService.get_violation_summary(db, session_id)
    except Exception as e:
        logger.error(f"Error getting fullscreen summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 