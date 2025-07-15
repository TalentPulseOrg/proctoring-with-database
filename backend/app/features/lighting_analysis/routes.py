"""
Lighting Analysis Routes

This module contains the API routes for lighting analysis monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import LightingAnalysisService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/lighting-analysis", tags=["Lighting Analysis"])

class LightingViolationRequest(BaseModel):
    session_id: int
    brightness_level: float
    lighting_condition: str
    screenshot_path: str = None
    additional_info: Dict[str, Any] = None

@router.post("/violation")
async def log_lighting_violation(
    violation: LightingViolationRequest,
    db: Session = Depends(get_db)
):
    """Log a lighting violation"""
    try:
        success = LightingAnalysisService.log_lighting_violation(
            db=db,
            session_id=violation.session_id,
            brightness_level=violation.brightness_level,
            lighting_condition=violation.lighting_condition,
            screenshot_path=violation.screenshot_path,
            additional_info=violation.additional_info
        )
        
        if success:
            return {"message": "Lighting violation logged successfully", "session_id": violation.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log lighting violation")
    except Exception as e:
        logger.error(f"Error logging lighting violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/violations")
async def get_session_lighting_violations(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all lighting violations for a session"""
    try:
        return LightingAnalysisService.get_session_violations(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session lighting violations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/status")
async def get_lighting_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get the current lighting status for a session"""
    try:
        return LightingAnalysisService.get_lighting_status(db, session_id)
    except Exception as e:
        logger.error(f"Error getting lighting status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/summary")
async def get_lighting_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a summary of lighting violations for a session"""
    try:
        return LightingAnalysisService.get_violation_summary(db, session_id)
    except Exception as e:
        logger.error(f"Error getting lighting summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_lighting_condition(
    brightness_level: float,
    previous_brightness: float = None
):
    """Analyze lighting condition based on brightness level"""
    try:
        condition = LightingAnalysisService.analyze_lighting_condition(brightness_level, previous_brightness)
        return {
            "brightness_level": brightness_level,
            "previous_brightness": previous_brightness,
            "lighting_condition": condition,
            "is_violation": condition != 'normal'
        }
    except Exception as e:
        logger.error(f"Error analyzing lighting condition: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 