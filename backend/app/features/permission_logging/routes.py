"""
Permission Logging Routes

This module contains the API routes for permission logging.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import PermissionLoggingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/permission-logging", tags=["Permission Logging"])

class PermissionLogRequest(BaseModel):
    session_id: int
    permission_type: str
    granted: bool
    device_info: str = None
    error_message: str = None
    additional_info: Dict[str, Any] = None

@router.post("/log")
async def log_permission_event(
    permission: PermissionLogRequest,
    db: Session = Depends(get_db)
):
    """Log a permission event"""
    try:
        success = PermissionLoggingService.log_permission_event(
            db=db,
            session_id=permission.session_id,
            permission_type=permission.permission_type,
            granted=permission.granted,
            device_info=permission.device_info,
            error_message=permission.error_message,
            additional_info=permission.additional_info
        )
        
        if success:
            return {"message": "Permission event logged successfully", "session_id": permission.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log permission event")
    except Exception as e:
        logger.error(f"Error logging permission event: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/permissions")
async def get_session_permissions(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all permission events for a session"""
    try:
        return PermissionLoggingService.get_session_permissions(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session permissions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/status")
async def get_permission_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get the current permission status for a session"""
    try:
        return PermissionLoggingService.get_permission_status(db, session_id)
    except Exception as e:
        logger.error(f"Error getting permission status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/summary")
async def get_permission_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a summary of permission events for a session"""
    try:
        return PermissionLoggingService.get_permission_summary(db, session_id)
    except Exception as e:
        logger.error(f"Error getting permission summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/valid-permission-types")
async def get_valid_permission_types():
    """Get list of valid permission types"""
    try:
        return {
            "valid_permission_types": PermissionLoggingService.VALID_PERMISSION_TYPES,
            "total_count": len(PermissionLoggingService.VALID_PERMISSION_TYPES)
        }
    except Exception as e:
        logger.error(f"Error getting valid permission types: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 