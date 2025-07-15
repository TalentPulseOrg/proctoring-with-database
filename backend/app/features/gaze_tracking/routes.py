"""
Gaze Tracking Routes

This module contains the API routes for gaze tracking monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import GazeTrackingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/gaze-tracking", tags=["Gaze Tracking"])

class GazeViolationRequest(BaseModel):
    session_id: int
    gaze_direction: str
    duration_seconds: float = None
    confidence_level: float = None
    is_looking_away: bool = True
    screenshot_path: str = None
    additional_info: Dict[str, Any] = None

@router.post("/violation")
async def log_gaze_violation(
    violation: GazeViolationRequest,
    db: Session = Depends(get_db)
):
    """Log a gaze tracking violation"""
    try:
        success = GazeTrackingService.log_gaze_violation(
            db=db,
            session_id=violation.session_id,
            gaze_direction=violation.gaze_direction,
            duration_seconds=violation.duration_seconds,
            confidence_level=violation.confidence_level,
            is_looking_away=violation.is_looking_away,
            screenshot_path=violation.screenshot_path,
            additional_info=violation.additional_info
        )
        
        if success:
            return {"message": "Gaze violation logged successfully", "session_id": violation.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log gaze violation")
    except Exception as e:
        logger.error(f"Error logging gaze violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/violations")
async def get_session_gaze_violations(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all gaze violations for a session"""
    try:
        return GazeTrackingService.get_session_violations(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session gaze violations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/status")
async def get_gaze_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get the current gaze tracking status for a session"""
    try:
        return GazeTrackingService.get_gaze_status(db, session_id)
    except Exception as e:
        logger.error(f"Error getting gaze status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/summary")
async def get_gaze_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a summary of gaze violations for a session"""
    try:
        return GazeTrackingService.get_violation_summary(db, session_id)
    except Exception as e:
        logger.error(f"Error getting gaze summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_gaze_direction(
    confidence_level: float,
    gaze_data: dict
):
    """Analyze gaze direction based on tracking data"""
    try:
        direction = GazeTrackingService.analyze_gaze_direction(confidence_level, gaze_data)
        return {
            "confidence_level": confidence_level,
            "gaze_data": gaze_data,
            "gaze_direction": direction,
            "is_violation": direction == 'away'
        }
    except Exception as e:
        logger.error(f"Error analyzing gaze direction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 