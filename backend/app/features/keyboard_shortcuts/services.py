"""
Keyboard Shortcuts Service

This module contains the business logic for keyboard shortcuts monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class KeyboardShortcutsService:
    """Service class for keyboard shortcuts operations"""
    
    # List of restricted keyboard shortcuts
    RESTRICTED_SHORTCUTS = [
        "Ctrl+C", "Ctrl+V", "Ctrl+X", "Ctrl+A", "Ctrl+Z", "Ctrl+Y",
        "Alt+Tab", "Alt+F4", "F5", "F11", "F12",
        "Ctrl+Shift+I", "Ctrl+Shift+J", "Ctrl+Shift+C",
        "Ctrl+U", "Ctrl+S", "Ctrl+P", "Ctrl+O", "Ctrl+N",
        "PrintScreen", "PrtScn"
    ]
    
    @staticmethod
    def is_restricted_shortcut(key_combination: str) -> bool:
        """Check if a keyboard shortcut is restricted"""
        return key_combination in KeyboardShortcutsService.RESTRICTED_SHORTCUTS
    
    @staticmethod
    def log_keyboard_shortcut_violation(
        db: Session, 
        session_id: int,
        key_combination: str,
        screenshot_path: Optional[str] = None,
        additional_info: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Log a keyboard shortcut violation"""
        try:
            details = {
                "error_type": "restricted_shortcut",
                "description": f"User attempted restricted keyboard shortcut: {key_combination}",
                "key_combination": key_combination,
                "additional_info": additional_info or {}
            }
            
            violation = ViolationService.log_keyboard_shortcut_violation(
                db=db,
                session_id=session_id,
                key_combination=key_combination,
                filepath=screenshot_path
            )
            
            if violation:
                logger.warning(f"Keyboard shortcut violation logged for session {session_id}: {key_combination}")
                return True
            else:
                logger.error(f"Failed to log keyboard shortcut violation for session {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging keyboard shortcut violation: {str(e)}")
            return False
    
    @staticmethod
    def get_session_violations(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """Get all keyboard shortcut violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'keyboard_shortcut'
                )
            ).order_by(Violation.timestamp.desc()).all()
            
            return [
                {
                    "id": violation.id,
                    "session_id": violation.session_id,
                    "key_combination": violation.details.get('key_combination') if violation.details else None,
                    "timestamp": violation.timestamp,
                    "details": violation.details,
                    "filepath": violation.filepath
                } for violation in violations
            ]
        except Exception as e:
            logger.error(f"Error getting session keyboard shortcut violations: {str(e)}")
            return []
    
    @staticmethod
    def get_keyboard_shortcuts_status(db: Session, session_id: int) -> Dict[str, Any]:
        """Get the current keyboard shortcuts status for a session"""
        try:
            from app.models.violation import Violation
            
            # Get the most recent violation
            latest_violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'keyboard_shortcut'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            # Count total violations
            total_violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'keyboard_shortcut'
                )
            ).count()
            
            return {
                "session_id": session_id,
                "is_blocked": latest_violation is not None,  # Blocked if there are violations
                "last_violation": latest_violation.timestamp if latest_violation else None,
                "total_violations": total_violations
            }
        except Exception as e:
            logger.error(f"Error getting keyboard shortcuts status: {str(e)}")
            return {
                "session_id": session_id,
                "is_blocked": False,
                "last_violation": None,
                "total_violations": 0,
                "error": str(e)
            }
    
    @staticmethod
    def get_violation_summary(db: Session, session_id: int) -> Dict[str, Any]:
        """Get a summary of keyboard shortcut violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'keyboard_shortcut'
                )
            ).all()
            
            if not violations:
                return {
                    "session_id": session_id,
                    "total_violations": 0,
                    "most_used_shortcut": None,
                    "last_violation": None
                }
            
            total_violations = len(violations)
            last_violation = max(violations, key=lambda x: x.timestamp).timestamp
            
            # Find most used shortcut
            shortcut_counts = {}
            for violation in violations:
                if violation.details and 'key_combination' in violation.details:
                    key_combo = violation.details['key_combination']
                    shortcut_counts[key_combo] = shortcut_counts.get(key_combo, 0) + 1
            
            most_used_shortcut = max(shortcut_counts.items(), key=lambda x: x[1])[0] if shortcut_counts else None
            
            return {
                "session_id": session_id,
                "total_violations": total_violations,
                "most_used_shortcut": most_used_shortcut,
                "last_violation": last_violation,
                "shortcut_breakdown": shortcut_counts
            }
        except Exception as e:
            logger.error(f"Error getting keyboard shortcuts summary: {str(e)}")
            return {
                "session_id": session_id,
                "total_violations": 0,
                "most_used_shortcut": None,
                "last_violation": None,
                "error": str(e)
            } 