"""
Tab Switching Routes

This module contains the API routes for tab switching monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import TabSwitchingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/tab-switching", tags=["Tab Switching"])

class TabSwitchingViolationRequest(BaseModel):
    session_id: int
    duration_seconds: float = None
    screenshot_path: str = None
    additional_info: Dict[str, Any] = None

@router.post("/violation")
async def log_tab_switching_violation(
    violation: TabSwitchingViolationRequest,
    db: Session = Depends(get_db)
):
    """Log a tab switching violation"""
    try:
        success = TabSwitchingService.log_tab_switching_violation(
            db=db,
            session_id=violation.session_id,
            duration_seconds=violation.duration_seconds,
            screenshot_path=violation.screenshot_path,
            additional_info=violation.additional_info
        )
        
        if success:
            return {"message": "Tab switching violation logged successfully", "session_id": violation.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log tab switching violation")
    except Exception as e:
        logger.error(f"Error logging tab switching violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/violations")
async def get_session_tab_switching_violations(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all tab switching violations for a session"""
    try:
        return TabSwitchingService.get_session_violations(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session tab switching violations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/status")
async def get_tab_switching_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get the current tab switching status for a session"""
    try:
        return TabSwitchingService.get_tab_switching_status(db, session_id)
    except Exception as e:
        logger.error(f"Error getting tab switching status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/summary")
async def get_tab_switching_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a summary of tab switching violations for a session"""
    try:
        return TabSwitchingService.get_violation_summary(db, session_id)
    except Exception as e:
        logger.error(f"Error getting tab switching summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 