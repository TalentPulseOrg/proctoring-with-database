from sqlalchemy.orm import Session
from ..models.violation import Violation
from ..models.screen_capture import ScreenCapture
from ..models.behavioral_anomaly import BehavioralAnomaly
from ..schemas.violation import ViolationCreate
from ..schemas.screen_capture import ScreenCaptureCreate
from ..schemas.behavioral_anomaly import BehavioralAnomalyCreate
from datetime import datetime
import os
import base64
from pathlib import Path
import logging
from .file_service import FileService

# Get logger
logger = logging.getLogger(__name__)

class ProctoringService:
    @staticmethod
    def record_violation(db: Session, violation: ViolationCreate):
        if db is None:
            logger.error("Database session is None in record_violation")
            raise ValueError("Database session is not available")
            
        try:
            # First, check if the session exists in the database
            from ..models.test_session import TestSession
            session_exists = db.query(TestSession).filter(TestSession.id == violation.session_id).first()
            
            if not session_exists:
                logger.warning(f"Session {violation.session_id} not found. Violation will not be saved.")
                # Return a mock response instead of failing
                mock_violation = Violation(
                    id=0,
                    session_id=violation.session_id,
                    violation_type=violation.violation_type,
                    details=violation.details,
                    filepath=violation.filepath,
                    timestamp=datetime.utcnow()
                )
                return mock_violation
            
            db_violation = Violation(
                session_id=violation.session_id,
                violation_type=violation.violation_type,
                details=violation.details,
                filepath=violation.filepath,
                timestamp=violation.timestamp or datetime.utcnow()
            )
            db.add(db_violation)
            db.commit()
            db.refresh(db_violation)
            return db_violation
        except Exception as e:
            logger.error(f"Error in record_violation: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    async def save_screen_capture(db: Session, screen_capture: ScreenCaptureCreate, image_data=None):
        if db is None:
            logger.error("Database session is None in save_screen_capture")
            raise ValueError("Database session is not available")
            
        try:
            # First, check if the session exists in the database
            from ..models.test_session import TestSession
            session_exists = db.query(TestSession).filter(TestSession.id == screen_capture.session_id).first()
            
            if not session_exists:
                logger.warning(f"Session {screen_capture.session_id} not found. Screen capture will not be saved.")
                # Return a mock response instead of failing
                mock_capture = ScreenCapture(
                    id=0,
                    session_id=screen_capture.session_id,
                    image_path="",
                    timestamp=datetime.utcnow()
                )
                return mock_capture
            
            # If image data is provided, save it to a file
            if image_data:
                # Use FileService to save the image
                # Check if the image is base64 encoded
                if isinstance(image_data, str) and image_data.startswith('data:image'):
                    # Extract the actual base64 data
                    image_data = image_data.split(',')[1]
                    image_bytes = base64.b64decode(image_data)
                    success, filepath, url_path = await FileService.save_binary_data(
                        data=image_bytes,
                        file_type="screen_capture",
                        entity_id=str(screen_capture.session_id),
                        file_ext=".jpg"
                    )
                else:
                    # Assume it's already binary data
                    success, filepath, url_path = await FileService.save_binary_data(
                        data=image_data,
                        file_type="screen_capture",
                        entity_id=str(screen_capture.session_id),
                        file_ext=".jpg"
                    )
                
                if not success:
                    logger.error(f"Failed to save screen capture for session {screen_capture.session_id}")
                    raise Exception("Failed to save screen capture image")
                
                # Update the image path with the URL path instead of filesystem path
                screen_capture.image_path = url_path
            
            # Save to database
            db_screen_capture = ScreenCapture(
                session_id=screen_capture.session_id,
                image_path=screen_capture.image_path,
                timestamp=screen_capture.timestamp or datetime.utcnow()
            )
            db.add(db_screen_capture)
            db.commit()
            db.refresh(db_screen_capture)
            return db_screen_capture
        except Exception as e:
            logger.error(f"Error in save_screen_capture: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def record_behavioral_anomaly(db: Session, anomaly: BehavioralAnomalyCreate):
        if db is None:
            logger.error("Database session is None in record_behavioral_anomaly")
            raise ValueError("Database session is not available")
            
        try:
            # First, check if the session exists in the database
            from ..models.test_session import TestSession
            session_exists = db.query(TestSession).filter(TestSession.id == anomaly.session_id).first()
            
            if not session_exists:
                logger.warning(f"Session {anomaly.session_id} not found. Behavioral anomaly will not be saved.")
                # Return a mock response instead of failing
                mock_anomaly = BehavioralAnomaly(
                    id=0,
                    session_id=anomaly.session_id,
                    anomaly_type=anomaly.anomaly_type,
                    details=anomaly.details,
                    timestamp=datetime.utcnow()
                )
                return mock_anomaly
            
            db_anomaly = BehavioralAnomaly(
                session_id=anomaly.session_id,
                anomaly_type=anomaly.anomaly_type,
                details=anomaly.details,
                timestamp=anomaly.timestamp or datetime.utcnow()
            )
            db.add(db_anomaly)
            db.commit()
            db.refresh(db_anomaly)
            return db_anomaly
        except Exception as e:
            logger.error(f"Error in record_behavioral_anomaly: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def get_session_violations(db: Session, session_id: int):
        if db is None:
            logger.error("Database session is None in get_session_violations")
            raise ValueError("Database session is not available")
            
        try:
            # Add ORDER BY for SQL Server compatibility
            return db.query(Violation).filter(
                Violation.session_id == session_id
            ).order_by(Violation.timestamp).all()
        except Exception as e:
            logger.error(f"Error in get_session_violations: {str(e)}")
            raise
    
    @staticmethod
    def get_session_screen_captures(db: Session, session_id: int):
        if db is None:
            logger.error("Database session is None in get_session_screen_captures")
            raise ValueError("Database session is not available")
            
        try:
            # Add ORDER BY for SQL Server compatibility
            return db.query(ScreenCapture).filter(
                ScreenCapture.session_id == session_id
            ).order_by(ScreenCapture.timestamp).all()
        except Exception as e:
            logger.error(f"Error in get_session_screen_captures: {str(e)}")
            raise
    
    @staticmethod
    def get_session_behavioral_anomalies(db: Session, session_id: int):
        if db is None:
            logger.error("Database session is None in get_session_behavioral_anomalies")
            raise ValueError("Database session is not available")
            
        try:
            # Add ORDER BY for SQL Server compatibility
            return db.query(BehavioralAnomaly).filter(
                BehavioralAnomaly.session_id == session_id
            ).order_by(BehavioralAnomaly.timestamp).all()
        except Exception as e:
            logger.error(f"Error in get_session_behavioral_anomalies: {str(e)}")
            raise
    
    @staticmethod
    def get_all_proctoring_data(db: Session, session_id: int):
        if db is None:
            logger.error("Database session is None in get_all_proctoring_data")
            raise ValueError("Database session is not available")
            
        try:
            violations = ProctoringService.get_session_violations(db, session_id)
            screen_captures = ProctoringService.get_session_screen_captures(db, session_id)
            behavioral_anomalies = ProctoringService.get_session_behavioral_anomalies(db, session_id)
            
            return {
                "violations": violations,
                "screen_captures": screen_captures,
                "behavioral_anomalies": behavioral_anomalies
            }
        except Exception as e:
            logger.error(f"Error in get_all_proctoring_data: {str(e)}")
            raise 