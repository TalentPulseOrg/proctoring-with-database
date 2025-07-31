"""
Permission Logging Service

This module contains the business logic for permission logging.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class PermissionLoggingService:
    """Service class for permission logging operations"""
    
    # Valid permission types
    VALID_PERMISSION_TYPES = ['camera', 'microphone', 'screen', 'location']
    
    @staticmethod
    def validate_permission_type(permission_type: str) -> bool:
        """Validate if permission type is supported"""
        return permission_type in PermissionLoggingService.VALID_PERMISSION_TYPES
    
    @staticmethod
    def log_permission_event(
        db: Session, 
        session_id: int,
        permission_type: str,
        granted: bool,
        device_info: Optional[str] = None,
        error_message: Optional[str] = None,
        additional_info: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Log a permission event"""
        try:
            # Validate permission type
            if not PermissionLoggingService.validate_permission_type(permission_type):
                logger.error(f"Invalid permission type: {permission_type}")
                return False
            
            # Log violation if permission was denied
            if not granted:
                if permission_type == 'camera':
                    violation = ViolationService.log_camera_permission_violation(
                        db=db,
                        session_id=session_id,
                        details={
                            "error_type": "permission_denied",
                            "description": "User denied or revoked camera access during test",
                            "error_message": error_message,
                            "device_info": device_info,
                            "additional_info": additional_info or {}
                        }
                    )
                elif permission_type == 'microphone':
                    violation = ViolationService.log_microphone_permission_violation(
                        db=db,
                        session_id=session_id,
                        details={
                            "error_type": "permission_denied",
                            "description": "User denied or revoked microphone access during test",
                            "error_message": error_message,
                            "device_info": device_info,
                            "additional_info": additional_info or {}
                        }
                    )
                else:
                    # For other permission types, log as a general violation
                    violation = ViolationService.log_violation(
                        db=db,
                        session_id=session_id,
                        violation_type=f"{permission_type}_permission_denied",
                        details={
                            "error_type": "permission_denied",
                            "description": f"User denied or revoked {permission_type} access during test",
                            "error_message": error_message,
                            "device_info": device_info,
                            "additional_info": additional_info or {}
                        }
                    )
                
                if violation:
                    logger.warning(f"Permission violation logged for session {session_id}: {permission_type} denied")
                else:
                    logger.error(f"Failed to log permission violation for session {session_id}")
            
            logger.info(f"Permission event logged for session {session_id}: {permission_type} = {granted}")
            return True
            
        except Exception as e:
            logger.error(f"Error logging permission event: {str(e)}")
            return False
    
    @staticmethod
    def get_session_permissions(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """Get all permission events for a session"""
        try:
            from app.models.violation import Violation
            
            # Get all permission-related violations
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type.in_(['camera_permission_denied', 'microphone_permission_denied'])
                )
            ).order_by(Violation.timestamp.desc()).all()
            
            return [
                {
                    "id": violation.id,
                    "session_id": violation.session_id,
                    "timestamp": violation.timestamp,
                    "permission_type": violation.violation_type.replace('_permission_denied', ''),
                    "granted": False,  # All violations are for denied permissions
                    "details": violation.details,
                    "filepath": violation.filepath
                } for violation in violations
            ]
        except Exception as e:
            logger.error(f"Error getting session permissions: {str(e)}")
            return []
    
    @staticmethod
    def get_permission_status(db: Session, session_id: int) -> Dict[str, Any]:
        """Get the current permission status for a session"""
        try:
            from app.models.violation import Violation
            
            # Check for camera permission violations
            camera_violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'camera_permission_denied'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            # Check for microphone permission violations
            microphone_violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'microphone_permission_denied'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            # Get total violations
            total_violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type.in_(['camera_permission_denied', 'microphone_permission_denied'])
                )
            ).count()
            
            # Determine last permission check
            last_permission_check = None
            if camera_violation or microphone_violation:
                violations = [v for v in [camera_violation, microphone_violation] if v]
                last_permission_check = max(violations, key=lambda x: x.timestamp).timestamp
            
            return {
                "session_id": session_id,
                "camera_granted": camera_violation is None,  # No violation means granted
                "microphone_granted": microphone_violation is None,  # No violation means granted
                "screen_granted": True,  # Not tracked in violations
                "location_granted": True,  # Not tracked in violations
                "total_permissions_requested": total_violations,
                "last_permission_check": last_permission_check
            }
        except Exception as e:
            logger.error(f"Error getting permission status: {str(e)}")
            return {
                "session_id": session_id,
                "camera_granted": True,
                "microphone_granted": True,
                "screen_granted": True,
                "location_granted": True,
                "total_permissions_requested": 0,
                "last_permission_check": None,
                "error": str(e)
            }
    
    @staticmethod
    def get_permission_summary(db: Session, session_id: int) -> Dict[str, Any]:
        """Get a summary of permission events for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type.in_(['camera_permission_denied', 'microphone_permission_denied'])
                )
            ).all()
            
            if not violations:
                return {
                    "session_id": session_id,
                    "total_permissions": 0,
                    "permission_types": {},
                    "granted_permissions": {"camera": True, "microphone": True, "screen": True, "location": True},
                    "last_permission_check": None
                }
            
            total_permissions = len(violations)
            last_permission_check = max(violations, key=lambda x: x.timestamp).timestamp
            
            # Count by permission type
            permission_types = {}
            granted_permissions = {"camera": True, "microphone": True, "screen": True, "location": True}
            
            for violation in violations:
                permission_type = violation.violation_type.replace('_permission_denied', '')
                permission_types[permission_type] = permission_types.get(permission_type, 0) + 1
                granted_permissions[permission_type] = False  # Has violation means denied
            
            return {
                "session_id": session_id,
                "total_permissions": total_permissions,
                "permission_types": permission_types,
                "granted_permissions": granted_permissions,
                "last_permission_check": last_permission_check
            }
        except Exception as e:
            logger.error(f"Error getting permission summary: {str(e)}")
            return {
                "session_id": session_id,
                "total_permissions": 0,
                "permission_types": {},
                "granted_permissions": {"camera": True, "microphone": True, "screen": True, "location": True},
                "last_permission_check": None,
                "error": str(e)
            } 