"""
Camera Permission Routes

This module contains the API routes for camera permission monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import CameraPermissionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/camera-permission", tags=["Camera Permission"])

class CameraPermissionViolation(BaseModel):
    session_id: int
    error_message: str = None
    device_info: str = None

@router.post("/violation")
async def log_camera_permission_violation(
    violation: CameraPermissionViolation,
    db: Session = Depends(get_db)
):
    """Log a camera permission violation"""
    try:
        success = CameraPermissionService.log_permission_violation(
            db=db,
            session_id=violation.session_id,
            error_message=violation.error_message,
            device_info=violation.device_info
        )
        
        if success:
            return {"message": "Camera permission violation logged successfully", "session_id": violation.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log camera permission violation")
    except Exception as e:
        logger.error(f"Error logging camera permission violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/grant")
async def log_camera_permission_grant(
    session_id: int,
    device_info: str = None,
    db: Session = Depends(get_db)
):
    """Log when camera permission is granted"""
    try:
        success = CameraPermissionService.log_permission_grant(
            db=db,
            session_id=session_id,
            device_info=device_info
        )
        
        if success:
            return {"message": "Camera permission grant logged successfully", "session_id": session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log camera permission grant")
    except Exception as e:
        logger.error(f"Error logging camera permission grant: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/violation-check")
async def check_camera_permission_violation(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Check if there's a camera permission violation for the session"""
    try:
        result = CameraPermissionService.check_permission_violation(db, session_id)
        return {
            "session_id": session_id,
            **result
        }
    except Exception as e:
        logger.error(f"Error checking camera permission violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 