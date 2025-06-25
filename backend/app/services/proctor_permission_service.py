from sqlalchemy.orm import Session
from ..models.proctor_permission_log import ProctorPermissionLog
from ..models.test_session import TestSession
from datetime import datetime, timedelta
import logging
import json
from typing import List, Optional

logger = logging.getLogger(__name__)

class ProctorPermissionService:
    
    @staticmethod
    def _check_recent_permission(db: Session, session_id: int, permission_type: str, granted: bool, time_window_minutes: int = 5) -> bool:
        """Check if a similar permission log exists within the time window"""
        try:
            cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
            
            recent_permission = db.query(ProctorPermissionLog).filter(
                ProctorPermissionLog.examSessionId == session_id,
                ProctorPermissionLog.permissionType == permission_type,
                ProctorPermissionLog.granted == granted,
                ProctorPermissionLog.timeStamp >= cutoff_time
            ).first()
            
            return recent_permission is not None
        except Exception as e:
            logger.error(f"Error checking recent permission: {str(e)}")
            return False
    
    @staticmethod
    def log_permission(db: Session, permission_data) -> Optional[ProctorPermissionLog]:
        """Log a proctor permission entry"""
        try:
            # Verify the session exists
            session = db.query(TestSession).filter(TestSession.id == permission_data.examSessionId).first()
            if not session:
                logger.error(f"Test session {permission_data.examSessionId} not found")
                return None
            
            # Check for recent duplicate permission
            if ProctorPermissionService._check_recent_permission(
                db, 
                permission_data.examSessionId, 
                permission_data.permissionType, 
                permission_data.granted
            ):
                logger.info(f"Duplicate permission log detected for session {permission_data.examSessionId}, type {permission_data.permissionType}, granted {permission_data.granted}. Skipping.")
                return None
            
            # Handle device info
            device_info = permission_data.deviceInfo
            if not device_info:
                device_info = json.dumps({
                    "basicInfo": "Web Browser - Permission Check"
                })
            elif isinstance(device_info, dict):
                device_info = json.dumps(device_info)
            elif isinstance(device_info, str):
                # Try to parse as JSON, if it fails, wrap it
                try:
                    json.loads(device_info)
                except json.JSONDecodeError:
                    device_info = json.dumps({
                        "basicInfo": device_info
                    })
            
            # Create the permission log entry
            db_permission = ProctorPermissionLog(
                examSessionId=permission_data.examSessionId,
                permissionType=permission_data.permissionType,
                granted=permission_data.granted,
                deviceInfo=device_info,
                errorMessage=permission_data.errorMessage,
                timeStamp=datetime.now()
            )
            
            db.add(db_permission)
            db.commit()
            db.refresh(db_permission)
            
            logger.info(f"Permission logged successfully: {permission_data.permissionType} for session {permission_data.examSessionId}, granted: {permission_data.granted}")
            return db_permission
            
        except Exception as e:
            logger.error(f"Error logging permission: {str(e)}")
            db.rollback()
            return None
    
    @staticmethod
    def get_session_permissions(db: Session, session_id: int) -> List[dict]:
        """Get all permission logs for a session"""
        try:
            permissions = db.query(ProctorPermissionLog).filter(
                ProctorPermissionLog.examSessionId == session_id
            ).order_by(ProctorPermissionLog.timeStamp.desc()).all()
            
            return [
                {
                    "id": p.id,
                    "examSessionId": p.examSessionId,
                    "permissionType": p.permissionType,
                    "granted": p.granted,
                    "deviceInfo": p.deviceInfo,
                    "errorMessage": p.errorMessage,
                    "timeStamp": p.timeStamp.isoformat() if p.timeStamp else None
                }
                for p in permissions
            ]
            
        except Exception as e:
            logger.error(f"Error getting session permissions: {str(e)}")
            return []
    
    @staticmethod
    def log_camera_permission(db: Session, session_id: int, granted: bool, error_message: str = None) -> Optional[ProctorPermissionLog]:
        """Log camera permission specifically"""
        try:
            # Check for recent duplicate camera permission
            if ProctorPermissionService._check_recent_permission(db, session_id, "camera", granted):
                logger.info(f"Duplicate camera permission log detected for session {session_id}, granted {granted}. Skipping.")
                return None
            
            # Create basic device info
            device_info = json.dumps({
                "basicInfo": "Web Browser - Permission Check"
            })
            
            db_permission = ProctorPermissionLog(
                examSessionId=session_id,
                permissionType="camera",
                granted=granted,
                deviceInfo=device_info,
                errorMessage=error_message,
                timeStamp=datetime.now()
            )
            
            db.add(db_permission)
            db.commit()
            db.refresh(db_permission)
            
            logger.info(f"Camera permission logged: session {session_id}, granted: {granted}")
            return db_permission
            
        except Exception as e:
            logger.error(f"Error logging camera permission: {str(e)}")
            db.rollback()
            return None
    
    @staticmethod
    def log_microphone_permission(db: Session, session_id: int, granted: bool, error_message: str = None) -> Optional[ProctorPermissionLog]:
        """Log microphone permission specifically"""
        try:
            # Check for recent duplicate microphone permission
            if ProctorPermissionService._check_recent_permission(db, session_id, "microphone", granted):
                logger.info(f"Duplicate microphone permission log detected for session {session_id}, granted {granted}. Skipping.")
                return None
            
            # Create basic device info
            device_info = json.dumps({
                "basicInfo": "Web Browser - Permission Check"
            })
            
            db_permission = ProctorPermissionLog(
                examSessionId=session_id,
                permissionType="microphone",
                granted=granted,
                deviceInfo=device_info,
                errorMessage=error_message,
                timeStamp=datetime.now()
            )
            
            db.add(db_permission)
            db.commit()
            db.refresh(db_permission)
            
            logger.info(f"Microphone permission logged: session {session_id}, granted: {granted}")
            return db_permission
            
        except Exception as e:
            logger.error(f"Error logging microphone permission: {str(e)}")
            db.rollback()
            return None 