"""
Face Detection Service

This module contains the business logic for face detection monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
import logging
import cv2
import numpy as np
import face_recognition
import base64
import os
from io import BytesIO

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class FaceDetectionService:
    """Service class for face detection operations"""
    
    @staticmethod
    def detect_faces_in_image(image_data: str, confidence_threshold: float = 0.5) -> Tuple[int, Optional[float]]:
        """Detect faces in a base64 encoded image"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                logger.error("Failed to decode image")
                return 0, None
            
            # Convert BGR to RGB for face_recognition
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Detect faces
            face_locations = face_recognition.face_locations(rgb_img)
            face_count = len(face_locations)
            
            # Calculate average confidence (simplified)
            confidence_score = min(1.0, face_count * 0.8) if face_count > 0 else 0.0
            
            logger.info(f"Detected {face_count} faces in image")
            return face_count, confidence_score
            
        except Exception as e:
            logger.error(f"Error detecting faces: {str(e)}")
            return 0, None
    
    @staticmethod
    def save_image_and_get_path(image_data: str, session_id: int) -> Optional[str]:
        """Save image to disk and return the path"""
        try:
            # Create directory if it doesn't exist
            image_dir = os.path.join("media", "face_detection", f"session_{session_id}")
            os.makedirs(image_dir, exist_ok=True)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"face_detection_{timestamp}.jpg"
            filepath = os.path.join(image_dir, filename)
            
            # Decode and save image
            image_bytes = base64.b64decode(image_data)
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
            
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving image: {str(e)}")
            return None
    
    @staticmethod
    def process_face_detection(
        db: Session, 
        session_id: int,
        image_data: str,
        confidence_threshold: float = 0.5
    ) -> Dict[str, Any]:
        """Process face detection request"""
        try:
            # Detect faces
            face_count, confidence_score = FaceDetectionService.detect_faces_in_image(
                image_data, 
                confidence_threshold
            )
            
            # Save image if faces detected
            image_path = None
            if face_count > 0:
                image_path = FaceDetectionService.save_image_and_get_path(
                    image_data, 
                    session_id
                )
            
            # Check for violation (multiple faces)
            is_violation = face_count > 1
            
            # Log violation if multiple faces detected
            if is_violation:
                FaceDetectionService.log_multiple_faces_violation(
                    db=db,
                    session_id=session_id,
                    face_count=face_count,
                    image_path=image_path
                )
            
            return {
                "session_id": session_id,
                "face_count": face_count,
                "confidence_score": confidence_score,
                "image_path": image_path,
                "timestamp": datetime.utcnow(),
                "is_violation": is_violation
            }
            
        except Exception as e:
            logger.error(f"Error processing face detection: {str(e)}")
            return {
                "session_id": session_id,
                "face_count": 0,
                "confidence_score": 0.0,
                "image_path": None,
                "timestamp": datetime.utcnow(),
                "is_violation": False,
                "error": str(e)
            }
    
    @staticmethod
    def log_multiple_faces_violation(
        db: Session, 
        session_id: int,
        face_count: int,
        image_path: Optional[str] = None
    ) -> bool:
        """Log a multiple faces violation"""
        try:
            violation = ViolationService.log_multiple_faces_violation(
                db=db,
                session_id=session_id,
                face_count=face_count,
                filepath=image_path
            )
            
            if violation:
                logger.warning(f"Multiple faces violation logged for session {session_id}: {face_count} faces")
                return True
            else:
                logger.error(f"Failed to log multiple faces violation for session {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging multiple faces violation: {str(e)}")
            return False
    
    @staticmethod
    def get_session_multiple_faces_violations(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """Get all multiple faces violations for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'multiple_faces'
                )
            ).order_by(Violation.timestamp.desc()).all()
            
            return [
                {
                    "id": violation.id,
                    "session_id": violation.session_id,
                    "face_count": violation.details.get('face_count') if violation.details else None,
                    "timestamp": violation.timestamp,
                    "details": violation.details,
                    "filepath": violation.filepath
                } for violation in violations
            ]
        except Exception as e:
            logger.error(f"Error getting session multiple faces violations: {str(e)}")
            return [] 