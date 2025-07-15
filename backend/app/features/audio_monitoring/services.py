"""
Audio Monitoring Service

This module contains the business logic for audio monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class AudioMonitoringService:
    """Service class for audio monitoring operations"""
    
    # Audio monitoring thresholds
    MIN_CONFIDENCE_LEVEL = 0.6  # Minimum confidence for reliable detection
    HIGH_AUDIO_THRESHOLD = 70.0  # Decibels above which is considered loud
    VOICE_DETECTION_THRESHOLD = 0.7  # Confidence level for voice detection
    
    @staticmethod
    def analyze_audio_pattern(audio_level: float, confidence_level: float, audio_data: dict) -> str:
        """Analyze audio pattern based on monitoring data"""
        if confidence_level < AudioMonitoringService.MIN_CONFIDENCE_LEVEL:
            return 'unknown'
        
        # This would typically analyze frequency patterns, voice characteristics, etc.
        # For now, we'll use a simplified approach
        if audio_data.get('is_voice', False) and confidence_level > AudioMonitoringService.VOICE_DETECTION_THRESHOLD:
            return 'voice'
        elif audio_level > AudioMonitoringService.HIGH_AUDIO_THRESHOLD:
            return 'noise'
        elif audio_level < 30.0:  # Very low audio level
            return 'silence'
        else:
            return 'unknown'
    
    @staticmethod
    def log_audio_violation(
        db: Session, 
        session_id: int,
        audio_level: float,
        audio_type: str,
        duration_seconds: Optional[float] = None,
        is_suspicious: bool = True,
        confidence_level: Optional[float] = None,
        audio_file_path: Optional[str] = None,
        additional_info: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Log an audio monitoring violation"""
        try:
            audio_data = {
                "audio_level": audio_level,
                "audio_type": audio_type,
                "duration_seconds": duration_seconds,
                "is_suspicious": is_suspicious,
                "confidence_level": confidence_level,
                "additional_info": additional_info or {}
            }
            
            violation = ViolationService.log_audio_suspicious_violation(
                db=db,
                session_id=session_id,
                audio_data=audio_data,
                filepath=audio_file_path
            )
            
            if violation:
                logger.warning(f"Audio violation logged for session {session_id}: type={audio_type}, level={audio_level}dB")
                return True
            else:
                logger.error(f"Failed to log audio violation for session {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging audio violation: {str(e)}")
            return False
    
    @staticmethod
    def get_session_violations(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """Get all audio violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'audio_suspicious'
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
            logger.error(f"Error getting session audio violations: {str(e)}")
            return []
    
    @staticmethod
    def get_audio_status(db: Session, session_id: int) -> Dict[str, Any]:
        """Get the current audio monitoring status for a session"""
        try:
            from app.models.violation import Violation
            
            # Get the most recent violation
            latest_violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'audio_suspicious'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            # Count total violations
            total_violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'audio_suspicious'
                )
            ).count()
            
            # Calculate average confidence
            confidence_levels = db.query(Violation.details).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'audio_suspicious',
                    Violation.details.isnot(None)
                )
            ).all()
            
            average_confidence = None
            if confidence_levels:
                valid_levels = []
                for violation in confidence_levels:
                    if violation[0] and 'audio_analysis' in violation[0]:
                        confidence = violation[0]['audio_analysis'].get('confidence_level')
                        if confidence is not None:
                            valid_levels.append(confidence)
                
                if valid_levels:
                    average_confidence = sum(valid_levels) / len(valid_levels)
            
            # Determine current status
            current_audio_level = None
            current_audio_type = 'silence'
            
            if latest_violation and latest_violation.details and 'audio_analysis' in latest_violation.details:
                audio_analysis = latest_violation.details['audio_analysis']
                current_audio_level = audio_analysis.get('audio_level')
                current_audio_type = audio_analysis.get('audio_type', 'silence')
            
            return {
                "session_id": session_id,
                "is_monitoring": True,
                "current_audio_level": current_audio_level,
                "current_audio_type": current_audio_type,
                "last_violation": latest_violation.timestamp if latest_violation else None,
                "total_violations": total_violations,
                "average_confidence": round(average_confidence, 3) if average_confidence else None
            }
        except Exception as e:
            logger.error(f"Error getting audio status: {str(e)}")
            return {
                "session_id": session_id,
                "is_monitoring": True,
                "current_audio_level": None,
                "current_audio_type": "silence",
                "last_violation": None,
                "total_violations": 0,
                "average_confidence": None,
                "error": str(e)
            }
    
    @staticmethod
    def get_violation_summary(db: Session, session_id: int) -> Dict[str, Any]:
        """Get a summary of audio violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'audio_suspicious'
                )
            ).all()
            
            if not violations:
                return {
                    "session_id": session_id,
                    "total_violations": 0,
                    "total_duration": 0,
                    "average_audio_level": 0,
                    "audio_types": {},
                    "last_violation": None
                }
            
            total_violations = len(violations)
            durations = []
            audio_levels = []
            audio_types = {}
            
            for violation in violations:
                if violation.details and 'audio_analysis' in violation.details:
                    audio_analysis = violation.details['audio_analysis']
                    
                    duration = audio_analysis.get('duration_seconds')
                    if duration is not None:
                        durations.append(duration)
                    
                    audio_level = audio_analysis.get('audio_level')
                    if audio_level is not None:
                        audio_levels.append(audio_level)
                    
                    audio_type = audio_analysis.get('audio_type', 'unknown')
                    audio_types[audio_type] = audio_types.get(audio_type, 0) + 1
            
            total_duration = sum(durations)
            average_audio_level = sum(audio_levels) / len(audio_levels) if audio_levels else 0
            last_violation = max(violations, key=lambda x: x.timestamp).timestamp
            
            return {
                "session_id": session_id,
                "total_violations": total_violations,
                "total_duration": round(total_duration, 2),
                "average_audio_level": round(average_audio_level, 2),
                "audio_types": audio_types,
                "last_violation": last_violation
            }
        except Exception as e:
            logger.error(f"Error getting audio summary: {str(e)}")
            return {
                "session_id": session_id,
                "total_violations": 0,
                "total_duration": 0,
                "average_audio_level": 0,
                "audio_types": {},
                "last_violation": None,
                "error": str(e)
            } 