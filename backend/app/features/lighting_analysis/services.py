"""
Lighting Analysis Service

This module contains the business logic for lighting analysis monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import json

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class LightingAnalysisService:
    """Service class for lighting analysis operations"""
    
    # Lighting thresholds
    DARK_THRESHOLD = 0.3  # Below this is considered dark
    BRIGHT_THRESHOLD = 0.8  # Above this is considered bright
    SUDDEN_CHANGE_THRESHOLD = 0.2  # Change greater than this is sudden
    
    @staticmethod
    def analyze_lighting_condition(brightness_level: float, previous_brightness: Optional[float] = None) -> str:
        """Analyze lighting condition based on brightness level"""
        if brightness_level < LightingAnalysisService.DARK_THRESHOLD:
            return 'dark'
        elif brightness_level > LightingAnalysisService.BRIGHT_THRESHOLD:
            return 'bright'
        elif previous_brightness and abs(brightness_level - previous_brightness) > LightingAnalysisService.SUDDEN_CHANGE_THRESHOLD:
            return 'sudden_change'
        else:
            return 'normal'
    
    @staticmethod
    def log_lighting_violation(
        db: Session, 
        session_id: int,
        brightness_level: float,
        lighting_condition: str,
        screenshot_path: Optional[str] = None,
        additional_info: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Log a lighting violation"""
        try:
            lighting_data = {
                "brightness_level": brightness_level,
                "lighting_condition": lighting_condition,
                "additional_info": additional_info or {}
            }
            
            violation = ViolationService.log_lighting_violation(
                db=db,
                session_id=session_id,
                lighting_data=lighting_data,
                filepath=screenshot_path
            )
            
            if violation:
                logger.warning(f"Lighting violation logged for session {session_id}: condition={lighting_condition}, brightness={brightness_level}")
                return True
            else:
                logger.error(f"Failed to log lighting violation for session {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging lighting violation: {str(e)}")
            return False
    
    @staticmethod
    def get_session_violations(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """Get all lighting violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'lighting_issue'
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
            logger.error(f"Error getting session lighting violations: {str(e)}")
            return []
    
    @staticmethod
    def get_lighting_status(db: Session, session_id: int) -> Dict[str, Any]:
        """Get the current lighting status for a session"""
        try:
            from app.models.violation import Violation
            
            # Get the most recent violation
            latest_violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'lighting_issue'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            # Count total violations
            total_violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'lighting_issue'
                )
            ).count()
            
            # Get current lighting condition
            current_condition = 'normal'
            current_brightness = None
            
            if latest_violation and latest_violation.details:
                lighting_analysis = latest_violation.details.get('lighting_analysis', {})
                current_condition = lighting_analysis.get('lighting_condition', 'normal')
                current_brightness = lighting_analysis.get('brightness_level')
            
            return {
                "session_id": session_id,
                "current_brightness": current_brightness,
                "lighting_condition": current_condition,
                "last_violation": latest_violation.timestamp if latest_violation else None,
                "total_violations": total_violations
            }
        except Exception as e:
            logger.error(f"Error getting lighting status: {str(e)}")
            return {
                "session_id": session_id,
                "current_brightness": None,
                "lighting_condition": "normal",
                "last_violation": None,
                "total_violations": 0,
                "error": str(e)
            }
    
    @staticmethod
    def get_violation_summary(db: Session, session_id: int) -> Dict[str, Any]:
        """Get a summary of lighting violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'lighting_issue'
                )
            ).all()
            
            if not violations:
                return {
                    "session_id": session_id,
                    "total_violations": 0,
                    "average_brightness": 0,
                    "lighting_conditions": {},
                    "last_violation": None
                }
            
            total_violations = len(violations)
            brightness_levels = []
            conditions = {}
            
            for violation in violations:
                if violation.details and 'lighting_analysis' in violation.details:
                    lighting_data = violation.details['lighting_analysis']
                    brightness = lighting_data.get('brightness_level')
                    condition = lighting_data.get('lighting_condition', 'unknown')
                    
                    if brightness is not None:
                        brightness_levels.append(brightness)
                    
                    conditions[condition] = conditions.get(condition, 0) + 1
            
            average_brightness = sum(brightness_levels) / len(brightness_levels) if brightness_levels else 0
            last_violation = max(violations, key=lambda x: x.timestamp).timestamp
            
            return {
                "session_id": session_id,
                "total_violations": total_violations,
                "average_brightness": round(average_brightness, 3),
                "lighting_conditions": conditions,
                "last_violation": last_violation
            }
        except Exception as e:
            logger.error(f"Error getting lighting summary: {str(e)}")
            return {
                "session_id": session_id,
                "total_violations": 0,
                "average_brightness": 0,
                "lighting_conditions": {},
                "last_violation": None,
                "error": str(e)
            } 