"""
Microphone Permission Routes

This module contains the API routes for microphone permission monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import MicrophonePermissionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/microphone-permission", tags=["Microphone Permission"])

class MicrophonePermissionViolation(BaseModel):
    session_id: int
    error_message: str = None
    device_info: str = None

@router.post("/violation")
async def log_microphone_permission_violation(
    violation: MicrophonePermissionViolation,
    db: Session = Depends(get_db)
):
    """Log a microphone permission violation"""
    try:
        success = MicrophonePermissionService.log_permission_violation(
            db=db,
            session_id=violation.session_id,
            error_message=violation.error_message,
            device_info=violation.device_info
        )
        
        if success:
            return {"message": "Microphone permission violation logged successfully", "session_id": violation.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log microphone permission violation")
    except Exception as e:
        logger.error(f"Error logging microphone permission violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/grant")
async def log_microphone_permission_grant(
    session_id: int,
    device_info: str = None,
    db: Session = Depends(get_db)
):
    """Log when microphone permission is granted"""
    try:
        success = MicrophonePermissionService.log_permission_grant(
            db=db,
            session_id=session_id,
            device_info=device_info
        )
        
        if success:
            return {"message": "Microphone permission grant logged successfully", "session_id": session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log microphone permission grant")
    except Exception as e:
        logger.error(f"Error logging microphone permission grant: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/violation-check")
async def check_microphone_permission_violation(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Check if there's a microphone permission violation for the session"""
    try:
        result = MicrophonePermissionService.check_permission_violation(db, session_id)
        return {
            "session_id": session_id,
            **result
        }
    except Exception as e:
        logger.error(f"Error checking microphone permission violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 