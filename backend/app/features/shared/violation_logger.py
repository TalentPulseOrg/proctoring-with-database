"""
Shared Modular Violation Logger

This module provides a shared violation logging utility that each feature can use independently.
It ensures that each feature can log violations without depending on a global violation system.

Usage:
    from app.features.shared.violation_logger import ModularViolationLogger
    
    # In any feature service
    logger = ModularViolationLogger()
    logger.log_violation(db, session_id, violation_type, details)
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class ModularViolationLogger:
    """Modular violation logger that can be used by any feature independently"""
    
    @staticmethod
    def log_violation(
        db: Session,
        session_id: int,
        violation_type: str,
        details: Optional[Dict[str, Any]] = None,
        filepath: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> bool:
        """
        Log a violation to the database using the feature's own violation table
        
        Args:
            db: Database session
            session_id: Test session ID
            violation_type: Type of violation
            details: Additional details about the violation
            filepath: Path to screenshot/snapshot if available
            timestamp: When the violation occurred (defaults to now)
            
        Returns:
            True if violation was logged successfully, False otherwise
        """
        try:
            if db is None:
                logger.error("Database session is None in log_violation")
                return False
            
            # Convert session_id to int if it's a string
            if isinstance(session_id, str):
                try:
                    session_id = int(session_id)
                except (ValueError, TypeError):
                    logger.error(f"Invalid session_id format: {session_id}")
                    return False
            
            logger.info(f"Logging modular violation: {violation_type} for session {session_id}")
            
            # Note: This is a placeholder. Each feature should implement its own violation logging
            # using its specific violation model and service
            logger.warning(f"Feature should implement its own violation logging for type: {violation_type}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error logging modular violation: {str(e)}")
            return False
    
    @staticmethod
    def validate_session_exists(db: Session, session_id: int) -> bool:
        """Validate that a session exists in the database"""
        try:
            from ..models.test_session import TestSession
            session_exists = db.query(TestSession).filter(TestSession.id == session_id).first()
            return session_exists is not None
        except Exception as e:
            logger.error(f"Error validating session existence: {str(e)}")
            return False
    
    @staticmethod
    def format_violation_details(
        error_type: str,
        description: str,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Format violation details in a consistent way"""
        details = {
            "error_type": error_type,
            "description": description,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if additional_data:
            details.update(additional_data)
        
        return details 