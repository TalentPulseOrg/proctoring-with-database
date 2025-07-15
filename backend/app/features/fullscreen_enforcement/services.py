"""
Full Screen Enforcement Service

This module contains the business logic for fullscreen enforcement monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class FullscreenEnforcementService:
    """Service class for fullscreen enforcement operations"""
    
    @staticmethod
    def log_fullscreen_exit_violation(
        db: Session, 
        session_id: int,
        screenshot_path: Optional[str] = None,
        additional_info: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Log a fullscreen exit violation"""
        try:
            details = {
                "error_type": "fullscreen_exit",
                "description": "User exited fullscreen mode during test",
                "additional_info": additional_info or {}
            }
            
            violation = ViolationService.log_fullscreen_exit_violation(
                db=db,
                session_id=session_id,
                filepath=screenshot_path
            )
            
            if violation:
                logger.warning(f"Fullscreen exit violation logged for session {session_id}")
                return True
            else:
                logger.error(f"Failed to log fullscreen exit violation for session {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging fullscreen exit violation: {str(e)}")
            return False
    
    @staticmethod
    def get_session_violations(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """Get all fullscreen exit violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'fullscreen_exit'
                )
            ).order_by(Violation.timestamp.desc()).all()
            
            return [
                {
                    "id": violation.id,
                    "session_id": violation.session_id,
                    "timestamp": violation.timestamp,
                    "details": violation.details,
                    "filepath": violation.filepath
                } for violation in violations
            ]
        except Exception as e:
            logger.error(f"Error getting session fullscreen exit violations: {str(e)}")
            return []
    
    @staticmethod
    def get_fullscreen_status(db: Session, session_id: int) -> Dict[str, Any]:
        """Get the current fullscreen status for a session"""
        try:
            from app.models.violation import Violation
            
            # Get the most recent violation
            latest_violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'fullscreen_exit'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            # Count total violations
            total_violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'fullscreen_exit'
                )
            ).count()
            
            return {
                "session_id": session_id,
                "is_fullscreen": latest_violation is None,  # Fullscreen if no recent violations
                "last_violation": latest_violation.timestamp if latest_violation else None,
                "total_violations": total_violations
            }
        except Exception as e:
            logger.error(f"Error getting fullscreen status: {str(e)}")
            return {
                "session_id": session_id,
                "is_fullscreen": True,
                "last_violation": None,
                "total_violations": 0,
                "error": str(e)
            }
    
    @staticmethod
    def get_violation_summary(db: Session, session_id: int) -> Dict[str, Any]:
        """Get a summary of fullscreen exit violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'fullscreen_exit'
                )
            ).all()
            
            if not violations:
                return {
                    "session_id": session_id,
                    "total_violations": 0,
                    "last_violation": None
                }
            
            total_violations = len(violations)
            last_violation = max(violations, key=lambda x: x.timestamp).timestamp
            
            return {
                "session_id": session_id,
                "total_violations": total_violations,
                "last_violation": last_violation
            }
        except Exception as e:
            logger.error(f"Error getting fullscreen exit summary: {str(e)}")
            return {
                "session_id": session_id,
                "total_violations": 0,
                "last_violation": None,
                "error": str(e)
            } 