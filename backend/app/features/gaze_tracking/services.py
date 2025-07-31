"""
Gaze Tracking Service

This module contains the business logic for gaze tracking monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class GazeTrackingService:
    """Service class for gaze tracking operations"""
    
    # Gaze tracking thresholds
    MIN_CONFIDENCE_LEVEL = 0.5  # Minimum confidence for reliable detection
    AWAY_DURATION_THRESHOLD = 2.0  # Seconds before considering gaze away as violation
    
    @staticmethod
    def analyze_gaze_direction(confidence_level: float, gaze_data: dict) -> str:
        """Analyze gaze direction based on tracking data"""
        if confidence_level < GazeTrackingService.MIN_CONFIDENCE_LEVEL:
            return 'unknown'
        
        # This would typically analyze eye position, head orientation, etc.
        # For now, we'll use a simplified approach
        if gaze_data.get('is_looking_away', False):
            return 'away'
        else:
            return 'towards'
    
    @staticmethod
    def log_gaze_violation(
        db: Session, 
        session_id: int,
        gaze_direction: str,
        duration_seconds: Optional[float] = None,
        confidence_level: Optional[float] = None,
        is_looking_away: bool = True,
        screenshot_path: Optional[str] = None,
        additional_info: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Log a gaze tracking violation"""
        try:
            gaze_data = {
                "gaze_direction": gaze_direction,
                "duration_seconds": duration_seconds,
                "confidence_level": confidence_level,
                "is_looking_away": is_looking_away,
                "additional_info": additional_info or {}
            }
            
            violation = ViolationService.log_gaze_away_violation(
                db=db,
                session_id=session_id,
                gaze_data=gaze_data,
                filepath=screenshot_path
            )
            
            if violation:
                logger.warning(f"Gaze violation logged for session {session_id}: direction={gaze_direction}, duration={duration_seconds}s")
                return True
            else:
                logger.error(f"Failed to log gaze violation for session {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging gaze violation: {str(e)}")
            return False
    
    @staticmethod
    def get_session_violations(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """Get all gaze violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'gaze_away'
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
            logger.error(f"Error getting session gaze violations: {str(e)}")
            return []
    
    @staticmethod
    def get_gaze_status(db: Session, session_id: int) -> Dict[str, Any]:
        """Get the current gaze tracking status for a session"""
        try:
            from app.models.violation import Violation
            
            # Get the most recent violation
            latest_violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'gaze_away'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            # Count total violations
            total_violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'gaze_away'
                )
            ).count()
            
            # Calculate average confidence
            confidence_levels = db.query(Violation.details).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'gaze_away',
                    Violation.details.isnot(None)
                )
            ).all()
            
            average_confidence = None
            if confidence_levels:
                valid_levels = []
                for violation in confidence_levels:
                    if violation[0] and 'gaze_analysis' in violation[0]:
                        confidence = violation[0]['gaze_analysis'].get('confidence_level')
                        if confidence is not None:
                            valid_levels.append(confidence)
                
                if valid_levels:
                    average_confidence = sum(valid_levels) / len(valid_levels)
            
            # Determine current status
            is_looking_at_screen = True
            current_gaze_direction = 'towards'
            
            if latest_violation and latest_violation.details and 'gaze_analysis' in latest_violation.details:
                gaze_analysis = latest_violation.details['gaze_analysis']
                if gaze_analysis.get('is_looking_away', False):
                    is_looking_at_screen = False
                    current_gaze_direction = gaze_analysis.get('gaze_direction', 'away')
            
            return {
                "session_id": session_id,
                "is_looking_at_screen": is_looking_at_screen,
                "current_gaze_direction": current_gaze_direction,
                "last_violation": latest_violation.timestamp if latest_violation else None,
                "total_violations": total_violations,
                "average_confidence": round(average_confidence, 3) if average_confidence else None
            }
        except Exception as e:
            logger.error(f"Error getting gaze status: {str(e)}")
            return {
                "session_id": session_id,
                "is_looking_at_screen": True,
                "current_gaze_direction": "towards",
                "last_violation": None,
                "total_violations": 0,
                "average_confidence": None,
                "error": str(e)
            }
    
    @staticmethod
    def get_violation_summary(db: Session, session_id: int) -> Dict[str, Any]:
        """Get a summary of gaze violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'gaze_away'
                )
            ).all()
            
            if not violations:
                return {
                    "session_id": session_id,
                    "total_violations": 0,
                    "total_time_away": 0,
                    "average_duration": 0,
                    "gaze_directions": {},
                    "last_violation": None
                }
            
            total_violations = len(violations)
            durations = []
            directions = {}
            
            for violation in violations:
                if violation.details and 'gaze_analysis' in violation.details:
                    gaze_analysis = violation.details['gaze_analysis']
                    
                    duration = gaze_analysis.get('duration_seconds')
                    if duration is not None:
                        durations.append(duration)
                    
                    direction = gaze_analysis.get('gaze_direction', 'unknown')
                    directions[direction] = directions.get(direction, 0) + 1
            
            total_time_away = sum(durations)
            average_duration = total_time_away / len(durations) if durations else 0
            last_violation = max(violations, key=lambda x: x.timestamp).timestamp
            
            return {
                "session_id": session_id,
                "total_violations": total_violations,
                "total_time_away": round(total_time_away, 2),
                "average_duration": round(average_duration, 2),
                "gaze_directions": directions,
                "last_violation": last_violation
            }
        except Exception as e:
            logger.error(f"Error getting gaze summary: {str(e)}")
            return {
                "session_id": session_id,
                "total_violations": 0,
                "total_time_away": 0,
                "average_duration": 0,
                "gaze_directions": {},
                "last_violation": None,
                "error": str(e)
            } 