"""
Tab Switching Service

This module contains the business logic for tab switching monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class TabSwitchingService:
    """Service class for tab switching operations"""
    
    @staticmethod
    def log_tab_switching_violation(
        db: Session, 
        session_id: int,
        duration_seconds: Optional[float] = None,
        screenshot_path: Optional[str] = None,
        additional_info: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Log a tab switching violation"""
        try:
            details = {
                "error_type": "tab_switch",
                "description": "User switched away from test tab",
                "duration_seconds": duration_seconds,
                "additional_info": additional_info or {}
            }
            
            violation = ViolationService.log_tab_switch_violation(
                db=db,
                session_id=session_id,
                filepath=screenshot_path
            )
            
            if violation:
                logger.warning(f"Tab switching violation logged for session {session_id}: duration={duration_seconds}s")
                return True
            else:
                logger.error(f"Failed to log tab switching violation for session {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging tab switching violation: {str(e)}")
            return False
    
    @staticmethod
    def get_session_violations(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """Get all tab switching violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'tab_switch'
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
            logger.error(f"Error getting session tab switching violations: {str(e)}")
            return []
    
    @staticmethod
    def get_tab_switching_status(db: Session, session_id: int) -> Dict[str, Any]:
        """Get the current tab switching status for a session"""
        try:
            from app.models.violation import Violation
            
            # Get the most recent violation
            latest_violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'tab_switch'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            # Count total violations
            total_violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'tab_switch'
                )
            ).count()
            
            return {
                "session_id": session_id,
                "is_active": latest_violation is None,  # Active if no recent violations
                "last_violation": latest_violation.timestamp if latest_violation else None,
                "total_violations": total_violations
            }
        except Exception as e:
            logger.error(f"Error getting tab switching status: {str(e)}")
            return {
                "session_id": session_id,
                "is_active": True,
                "last_violation": None,
                "total_violations": 0,
                "error": str(e)
            }
    
    @staticmethod
    def get_violation_summary(db: Session, session_id: int) -> Dict[str, Any]:
        """Get a summary of tab switching violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'tab_switch'
                )
            ).all()
            
            if not violations:
                return {
                    "session_id": session_id,
                    "total_violations": 0,
                    "average_duration": 0,
                    "total_time_away": 0,
                    "last_violation": None
                }
            
            total_violations = len(violations)
            total_duration = sum(v.details.get('duration_seconds', 0) for v in violations if v.details)
            average_duration = total_duration / total_violations if total_violations > 0 else 0
            last_violation = max(violations, key=lambda x: x.timestamp).timestamp
            
            return {
                "session_id": session_id,
                "total_violations": total_violations,
                "average_duration": round(average_duration, 2),
                "total_time_away": total_duration,
                "last_violation": last_violation
            }
        except Exception as e:
            logger.error(f"Error getting tab switching summary: {str(e)}")
            return {
                "session_id": session_id,
                "total_violations": 0,
                "average_duration": 0,
                "total_time_away": 0,
                "last_violation": None,
                "error": str(e)
            } 