import cv2
import numpy as np
import os
from typing import Tuple, Dict
import logging
import random
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceAuthService:
    def __init__(self):
        # Create directory for storing ID photos if it doesn't exist
        self.id_photos_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "id_photos")
        try:
            os.makedirs(self.id_photos_dir, exist_ok=True)
            logger.info(f"ID photos directory created/verified at: {self.id_photos_dir}")
        except Exception as e:
            logger.error(f"Error creating ID photos directory: {e}")
            raise

    def save_id_photo(self, user_id: str, image_data: bytes) -> bool:
        """Save ID photo for a user"""
        try:
            file_path = os.path.join(self.id_photos_dir, f"{user_id}.jpg")
            with open(file_path, "wb") as f:
                f.write(image_data)
            logger.info(f"ID photo saved successfully for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving ID photo for user {user_id}: {e}")
            return False

    def get_id_photo(self, user_id: str) -> bytes:
        """Retrieve ID photo for a user"""
        try:
            file_path = os.path.join(self.id_photos_dir, f"{user_id}.jpg")
            with open(file_path, "rb") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error retrieving ID photo for user {user_id}: {e}")
            return None

    def compare_faces(self, id_photo: bytes, live_photo: bytes) -> Tuple[bool, float]:
        """
        Mock implementation of face comparison
        In a real implementation, this would use face recognition
        """
        try:
            # For demo purposes, always return successful match with high confidence
            match_score = random.uniform(0.85, 0.98)
            logger.info(f"Mock face comparison completed with score: {match_score}")
            return True, match_score
        except Exception as e:
            logger.error(f"Error in mock face comparison: {e}")
            return True, 0.95

    def detect_liveness(self, image_data: bytes) -> Dict[str, any]:
        """
        Mock implementation of liveness detection
        In a real implementation, this would use facial landmark analysis
        """
        try:
            # Try to decode the image to verify it's valid
            image = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
            if image is None:
                logger.warning("Invalid image data provided for liveness detection")
                return {
                    "is_live": False,
                    "confidence": 0.0,
                    "reason": "Invalid image data"
                }
            
            # For demo purposes, return positive liveness most of the time
            is_live = random.random() > 0.1  # 90% chance of being live
            confidence = random.uniform(0.7, 0.95) if is_live else random.uniform(0.3, 0.6)
            
            reason = "Demo liveness check: " + (
                "Face appears live" if is_live else 
                "Suspicious facial features"
            )
            
            logger.info(f"Mock liveness detection completed: {is_live}, confidence: {confidence}")
            return {
                "is_live": is_live,
                "confidence": confidence,
                "reason": reason
            }
        except Exception as e:
            logger.error(f"Error in mock liveness detection: {e}")
            return {
                "is_live": False,
                "confidence": 0.0,
                "reason": f"Error: {str(e)}"
            } 