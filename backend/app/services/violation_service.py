from sqlalchemy.orm import Session
from ..models.violation import Violation
from ..models.test_session import TestSession
from ..schemas.violation import ViolationCreate
from datetime import datetime
import logging
import os
from typing import Optional, Dict, Any
import pytz

logger = logging.getLogger(__name__)

class ViolationService:
    # Define violation types with their descriptions
    VIOLATION_TYPES = {
        'camera_permission_denied': 'Camera permission was denied or revoked',
        'microphone_permission_denied': 'Microphone permission was denied or revoked',
        'browser_compatibility_issue': 'Browser compatibility check failed',
        'tab_switch': 'User switched away from the test tab',
        'window_blur': 'Test window lost focus',
        'fullscreen_exit': 'User exited fullscreen mode',
        'keyboard_shortcut': 'Restricted keyboard shortcut was attempted',
        'lighting_issue': 'Poor or inadequate lighting conditions detected',
        'gaze_away': 'User gaze was away from screen for extended period',
        'multiple_faces': 'Multiple faces detected in camera feed',
        'audio_suspicious': 'Suspicious audio activity detected'
    }
    
    @staticmethod
    def log_violation(
        db: Session,
        session_id: int,
        violation_type: str,
        details: Optional[Dict[str, Any]] = None,
        filepath: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> Optional[Violation]:
        """
        Log a violation to the database
        
        Args:
            db: Database session
            session_id: Test session ID
            violation_type: Type of violation (must be in VIOLATION_TYPES)
            details: Additional details about the violation
            filepath: Path to screenshot/snapshot if available
            timestamp: When the violation occurred (defaults to now)
            
        Returns:
            Created Violation object or None if failed
        """
        if db is None:
            logger.error("Database session is None in log_violation")
            return None
            
        try:
            # Convert session_id to int if it's a string
            if isinstance(session_id, str):
                try:
                    session_id = int(session_id)
                except (ValueError, TypeError):
                    logger.error(f"Invalid session_id format: {session_id}")
                    return None
            
            logger.info(f"Attempting to log violation: {violation_type} for session {session_id}")
            
            # Validate violation type
            if violation_type not in ViolationService.VIOLATION_TYPES:
                logger.warning(f"Unknown violation type: {violation_type}")
                # Allow unknown types but log warning
            
            # Check if session exists
            session_exists = db.query(TestSession).filter(TestSession.id == session_id).first()
            if not session_exists:
                logger.warning(f"Session {session_id} not found. Violation will not be saved.")
                return None
            
            # Prepare violation data
            IST = pytz.timezone('Asia/Kolkata')
            violation_data = ViolationCreate(
                session_id=session_id,
                violation_type=violation_type,
                details=details or {},
                filepath=filepath,
                timestamp=timestamp or datetime.now(IST)
            )
            
            # Create violation record
            db_violation = Violation(
                session_id=violation_data.session_id,
                violation_type=violation_data.violation_type,
                details=violation_data.details,
                filepath=violation_data.filepath,
                timestamp=violation_data.timestamp
            )
            
            db.add(db_violation)
            db.commit()
            db.refresh(db_violation)
            
            logger.info(f"Violation logged successfully: {violation_type} for session {session_id}, violation ID: {db_violation.id}")
            return db_violation
            
        except Exception as e:
            logger.error(f"Error logging violation: {str(e)}")
            db.rollback()
            return None

    @staticmethod
    def log_camera_permission_violation(db: Session, session_id: int, details: Dict[str, Any] = None):
        """Log camera permission denial violation"""
        default_details = {
            "error_type": "permission_denied",
            "description": "User denied or revoked camera access during test"
        }
        if details:
            default_details.update(details)
        
        return ViolationService.log_violation(
            db, session_id, 'camera_permission_denied', default_details
        )

    @staticmethod
    def log_microphone_permission_violation(db: Session, session_id: int, details: Dict[str, Any] = None):
        """Log microphone permission denial violation"""
        default_details = {
            "error_type": "permission_denied",
            "description": "User denied or revoked microphone access during test"
        }
        if details:
            default_details.update(details)
        
        return ViolationService.log_violation(
            db, session_id, 'microphone_permission_denied', default_details
        )

    @staticmethod
    def log_browser_compatibility_violation(db: Session, session_id: int, browser_info: Dict[str, Any] = None):
        """Log browser compatibility violation"""
        details = {
            "error_type": "unsupported_browser",
            "description": "User is using an unsupported browser",
            "browser_info": browser_info or {}
        }
        
        return ViolationService.log_violation(
            db, session_id, 'browser_compatibility_issue', details
        )

    @staticmethod
    def log_tab_switch_violation(db: Session, session_id: int, filepath: str = None):
        """Log tab switching violation"""
        details = {
            "error_type": "tab_switch",
            "description": "User switched away from test tab"
        }
        
        return ViolationService.log_violation(
            db, session_id, 'tab_switch', details, filepath
        )

    @staticmethod
    def log_window_blur_violation(db: Session, session_id: int, filepath: str = None):
        """Log window blur violation"""
        details = {
            "error_type": "window_focus_lost",
            "description": "Test window lost focus"
        }
        
        return ViolationService.log_violation(
            db, session_id, 'window_blur', details, filepath
        )

    @staticmethod
    def log_fullscreen_exit_violation(db: Session, session_id: int, filepath: str = None):
        """Log fullscreen exit violation"""
        details = {
            "error_type": "fullscreen_exit",
            "description": "User exited fullscreen mode during test"
        }
        
        return ViolationService.log_violation(
            db, session_id, 'fullscreen_exit', details, filepath
        )

    @staticmethod
    def log_keyboard_shortcut_violation(db: Session, session_id: int, key_combination: str, filepath: str = None):
        """Log keyboard shortcut violation"""
        details = {
            "error_type": "restricted_shortcut",
            "description": f"User attempted restricted keyboard shortcut: {key_combination}",
            "key_combination": key_combination
        }
        
        return ViolationService.log_violation(
            db, session_id, 'keyboard_shortcut', details, filepath
        )

    @staticmethod
    def log_lighting_violation(db: Session, session_id: int, lighting_data: Dict[str, Any], filepath: str = None):
        """Log lighting issue violation"""
        details = {
            "error_type": "poor_lighting",
            "description": "Poor or inadequate lighting conditions detected",
            "lighting_analysis": lighting_data
        }
        
        return ViolationService.log_violation(
            db, session_id, 'lighting_issue', details, filepath
        )

    @staticmethod
    def log_gaze_away_violation(db: Session, session_id: int, gaze_data: Dict[str, Any], filepath: str = None):
        """Log gaze tracking violation"""
        details = {
            "error_type": "gaze_away",
            "description": "User gaze was away from screen for extended period",
            "gaze_analysis": gaze_data
        }
        
        return ViolationService.log_violation(
            db, session_id, 'gaze_away', details, filepath
        )

    @staticmethod
    def log_multiple_faces_violation(db: Session, session_id: int, face_count: int, filepath: str = None):
        """Log multiple faces detection violation"""
        details = {
            "error_type": "multiple_faces",
            "description": f"Multiple faces detected in camera feed ({face_count} faces)",
            "face_count": face_count
        }
        
        return ViolationService.log_violation(
            db, session_id, 'multiple_faces', details, filepath
        )

    @staticmethod
    def log_audio_suspicious_violation(db: Session, session_id: int, audio_data: Dict[str, Any], filepath: str = None):
        """Log suspicious audio activity violation"""
        details = {
            "error_type": "suspicious_audio",
            "description": "Suspicious audio activity detected",
            "audio_analysis": audio_data
        }
        
        return ViolationService.log_violation(
            db, session_id, 'audio_suspicious', details, filepath
        )

    @staticmethod
    def get_session_violations_summary(db: Session, session_id: int) -> Dict[str, Any]:
        """Get a summary of violations for a session"""
        try:
            violations = db.query(Violation).filter(
                Violation.session_id == session_id
            ).order_by(Violation.timestamp).all()
            
            # Count violations by type
            violation_counts = {}
            for violation in violations:
                v_type = violation.violation_type
                violation_counts[v_type] = violation_counts.get(v_type, 0) + 1
            
            return {
                "total_violations": len(violations),
                "violation_counts": violation_counts,
                "violations": [
                    {
                        "id": v.id,
                        "type": v.violation_type,
                        "timestamp": v.timestamp.isoformat(),
                        "details": v.details,
                        "filepath": v.filepath
                    }
                    for v in violations
                ]
            }
        except Exception as e:
            logger.error(f"Error getting violations summary: {str(e)}")
            return {
                "total_violations": 0,
                "violation_counts": {},
                "violations": []
            }
