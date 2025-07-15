"""
Audio Monitoring Routes

This module contains the API routes for audio monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import AudioMonitoringService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/audio-monitoring", tags=["Audio Monitoring"])

class AudioViolationRequest(BaseModel):
    session_id: int
    audio_level: float
    audio_type: str
    duration_seconds: float = None
    is_suspicious: bool = True
    confidence_level: float = None
    audio_file_path: str = None
    additional_info: Dict[str, Any] = None

@router.post("/violation")
async def log_audio_violation(
    violation: AudioViolationRequest,
    db: Session = Depends(get_db)
):
    """Log an audio monitoring violation"""
    try:
        success = AudioMonitoringService.log_audio_violation(
            db=db,
            session_id=violation.session_id,
            audio_level=violation.audio_level,
            audio_type=violation.audio_type,
            duration_seconds=violation.duration_seconds,
            is_suspicious=violation.is_suspicious,
            confidence_level=violation.confidence_level,
            audio_file_path=violation.audio_file_path,
            additional_info=violation.additional_info
        )
        
        if success:
            return {"message": "Audio violation logged successfully", "session_id": violation.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log audio violation")
    except Exception as e:
        logger.error(f"Error logging audio violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/violations")
async def get_session_audio_violations(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all audio violations for a session"""
    try:
        return AudioMonitoringService.get_session_violations(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session audio violations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/status")
async def get_audio_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get the current audio monitoring status for a session"""
    try:
        return AudioMonitoringService.get_audio_status(db, session_id)
    except Exception as e:
        logger.error(f"Error getting audio status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/summary")
async def get_audio_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a summary of audio violations for a session"""
    try:
        return AudioMonitoringService.get_violation_summary(db, session_id)
    except Exception as e:
        logger.error(f"Error getting audio summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_audio_pattern(
    audio_level: float,
    confidence_level: float,
    audio_data: dict
):
    """Analyze audio pattern based on monitoring data"""
    try:
        audio_type = AudioMonitoringService.analyze_audio_pattern(audio_level, confidence_level, audio_data)
        return {
            "audio_level": audio_level,
            "confidence_level": confidence_level,
            "audio_data": audio_data,
            "audio_type": audio_type,
            "is_violation": audio_type in ['voice', 'noise']
        }
    except Exception as e:
        logger.error(f"Error analyzing audio pattern: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 