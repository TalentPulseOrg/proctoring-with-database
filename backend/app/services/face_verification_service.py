from sqlalchemy.orm import Session
from datetime import datetime
import os
import logging
import base64
from pathlib import Path
import cv2
import numpy as np
import face_recognition
from ..models.face_verification import FaceVerification
from ..models.user import User
from ..schemas.face_verification import FaceVerificationCreate, FaceVerificationUpdate
from .file_service import FileService

# Set up logging
logger = logging.getLogger(__name__)

class FaceVerificationService:
    @staticmethod
    async def upload_id_photo(db: Session, user_id: int, photo_data: bytes):
        """Upload a photo ID for a user"""
        try:
            # Save the photo using FileService
            success, filepath, url_path = await FileService.save_binary_data(
                data=photo_data,
                file_type="id_photo",
                entity_id=str(user_id),
                file_ext=".jpg"
            )
            
            if not success:
                logger.error(f"Failed to save ID photo for user {user_id}")
                return {
                    "success": False,
                    "message": "Failed to save the photo. Please try again."
                }
                
            # Check if user already has a face verification record
            db_verification = db.query(FaceVerification).filter(FaceVerification.user_id == user_id).first()
            
            # If record exists, update it
            if db_verification:
                db_verification.id_photo_path = url_path
                db_verification.is_verified = False  # Reset verification status
                db_verification.verification_date = datetime.utcnow()
            else:
                # Create new record
                verification = FaceVerificationCreate(
                    user_id=user_id,
                    id_photo_path=url_path,
                    is_verified=False
                )
                db_verification = FaceVerification(
                    user_id=verification.user_id,
                    id_photo_path=verification.id_photo_path,
                    is_verified=verification.is_verified,
                    verification_date=datetime.utcnow()
                )
                db.add(db_verification)
                
            db.commit()
            db.refresh(db_verification)
            
            # Check if the image contains a face
            # Convert url_path to actual file path
            file_path = FileService.get_file_path(url_path)
            
            # Debug log the file path
            logger.info(f"Attempting to read image from: {file_path}")
            
            # Check if file exists before reading
            if not os.path.exists(file_path):
                logger.error(f"Image file does not exist at path: {file_path}")
                return {
                    "success": False,
                    "message": f"Image file not found at {file_path}"
                }
                
            img = cv2.imread(file_path)
            
            # Check if image was loaded successfully
            if img is None:
                logger.error(f"Failed to load image with OpenCV from: {file_path}")
                return {
                    "success": False,
                    "message": "Failed to process the uploaded image. Please try again with a different image."
                }
                
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_img)
            
            # If no face is detected, return error
            if len(face_locations) == 0:
                logger.warning(f"No face detected in ID photo for user {user_id}")
                return {
                    "success": False,
                    "message": "No face detected in the image. Please upload a clear photo of your face.",
                    "verification": db_verification
                }
            
            return {
                "success": True,
                "message": "ID photo uploaded successfully",
                "verification": db_verification
            }
        
        except Exception as e:
            logger.error(f"Error in upload_id_photo: {str(e)}")
            return {
                "success": False,
                "message": f"An error occurred: {str(e)}"
            }
    
    @staticmethod
    async def verify_face(db: Session, user_id: int, webcam_photo_data: bytes):
        """Verify user's face against stored ID photo"""
        try:
            # Get user's face verification record
            db_verification = db.query(FaceVerification).filter(FaceVerification.user_id == user_id).first()
            
            # If no record exists, return error
            if not db_verification or not db_verification.id_photo_path:
                logger.warning(f"No ID photo found for user {user_id}")
                return {
                    "success": False,
                    "message": "No ID photo found. Please upload an ID photo first.",
                    "verification": None
                }
            
            # Save webcam photo using FileService
            success, filepath, url_path = await FileService.save_binary_data(
                data=webcam_photo_data,
                file_type="webcam_photo",
                entity_id=str(user_id),
                file_ext=".jpg"
            )
            
            if not success:
                logger.error(f"Failed to save webcam photo for user {user_id}")
                return {
                    "success": False,
                    "message": "Failed to save the webcam photo. Please try again."
                }
            
            # Get actual file paths
            webcam_filepath = FileService.get_file_path(url_path)
            id_photo_filepath = FileService.get_file_path(db_verification.id_photo_path)
            
            # Load ID photo and webcam photo
            id_img = face_recognition.load_image_file(id_photo_filepath)
            webcam_img = face_recognition.load_image_file(webcam_filepath)
            
            # Find face locations
            id_face_locations = face_recognition.face_locations(id_img)
            webcam_face_locations = face_recognition.face_locations(webcam_img)
            
            # If no face in ID photo, return error
            if len(id_face_locations) == 0:
                logger.warning(f"No face detected in stored ID photo for user {user_id}")
                return {
                    "success": False,
                    "message": "No face detected in your ID photo. Please upload a new ID photo.",
                    "verification": db_verification
                }
                
            # If no face in webcam photo, return error
            if len(webcam_face_locations) == 0:
                logger.warning(f"No face detected in webcam photo for user {user_id}")
                return {
                    "success": False,
                    "message": "No face detected in your webcam photo. Please try again with better lighting.",
                    "verification": db_verification
                }
                
            # If multiple faces in webcam photo, return error
            if len(webcam_face_locations) > 1:
                logger.warning(f"Multiple faces detected in webcam photo for user {user_id}")
                return {
                    "success": False,
                    "message": "Multiple faces detected. Please ensure only your face is visible.",
                    "verification": db_verification
                }
                
            # Get face encodings
            id_face_encoding = face_recognition.face_encodings(id_img, id_face_locations)[0]
            webcam_face_encoding = face_recognition.face_encodings(webcam_img, webcam_face_locations)[0]
            
            # Compare faces
            face_distance = face_recognition.face_distance([id_face_encoding], webcam_face_encoding)[0]
            match_score = 1.0 - face_distance
            
            # Determine if match is successful (threshold can be adjusted)
            is_match = match_score >= 0.6
            
            # Perform basic liveness detection (this is simplified)
            # A real implementation would use more sophisticated methods
            liveness_score = 0.8  # Placeholder value
            
            # Update verification record
            db_verification.is_verified = is_match
            db_verification.match_score = float(match_score)
            db_verification.liveness_score = liveness_score
            db_verification.verification_date = datetime.utcnow()
            
            db.commit()
            db.refresh(db_verification)
            
            # Clean up is not needed as we're storing files in the media directory now
            
            if is_match:
                return {
                    "success": True,
                    "message": "Face verification successful",
                    "verification": db_verification,
                    "match_score": match_score,
                    "liveness_score": liveness_score
                }
            else:
                return {
                    "success": False,
                    "message": "Face verification failed. The face does not match the ID photo.",
                    "verification": db_verification,
                    "match_score": match_score,
                    "liveness_score": liveness_score
                }
                
        except Exception as e:
            logger.error(f"Error verifying face: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    async def get_verification_status(db: Session, user_id: int):
        """Get the verification status for a user"""
        try:
            db_verification = db.query(FaceVerification).filter(FaceVerification.user_id == user_id).first()
            
            if not db_verification:
                return {
                    "success": False,
                    "message": "No verification record found for this user",
                    "verification": None,
                    "is_verified": False
                }
                
            return {
                "success": True,
                "message": "Verification status retrieved",
                "verification": db_verification,
                "is_verified": db_verification.is_verified
            }
            
        except Exception as e:
            logger.error(f"Error getting verification status: {str(e)}")
            raise 