"""
Camera Permission Service

This module contains the business logic for camera permission monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class CameraPermissionService:
    """Service class for camera permission operations"""
    
    @staticmethod
    def log_permission_violation(
        db: Session, 
        session_id: int, 
        error_message: Optional[str] = None,
        device_info: Optional[str] = None
    ) -> bool:
        """Log a camera permission violation"""
        try:
            details = {
                "error_type": "permission_denied",
                "description": "User denied or revoked camera access during test",
                "error_message": error_message,
                "device_info": device_info
            }
            
            violation = ViolationService.log_camera_permission_violation(
                db=db,
                session_id=session_id,
                details=details
            )
            
            if violation:
                logger.info(f"Camera permission violation logged for session {session_id}")
                return True
            else:
                logger.error(f"Failed to log camera permission violation for session {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging camera permission violation: {str(e)}")
            return False
    
    @staticmethod
    def log_permission_grant(
        db: Session, 
        session_id: int, 
        device_info: Optional[str] = None
    ) -> bool:
        """Log when camera permission is granted (for tracking purposes)"""
        try:
            # For granted permissions, we just log it for tracking but don't create a violation
            logger.info(f"Camera permission granted for session {session_id}, device_info: {device_info}")
            return True
        except Exception as e:
            logger.error(f"Error logging camera permission grant: {str(e)}")
            return False
    
    @staticmethod
    def check_permission_violation(db: Session, session_id: int) -> Dict[str, Any]:
        """Check if there's a camera permission violation for the session"""
        try:
            # Query the violations table for camera permission violations
            from app.models.violation import Violation
            
            violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'camera_permission_denied'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            if violation:
                return {
                    "has_violation": True,
                    "timestamp": violation.timestamp,
                    "details": violation.details
                }
            else:
                return {
                    "has_violation": False,
                    "timestamp": None,
                    "details": None
                }
        except Exception as e:
            logger.error(f"Error checking permission violation: {str(e)}")
            return {
                "has_violation": False,
                "timestamp": None,
                "details": None,
                "error": str(e)
            } 