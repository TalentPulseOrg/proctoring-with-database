from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
import logging
from ..database import get_db
from ..services.face_verification_service import FaceVerificationService
from ..schemas.face_verification import FaceVerificationResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Face Verification"])

@router.post("/upload-id-photo", status_code=status.HTTP_201_CREATED)
async def upload_id_photo(
    user_id: int = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload an ID photo for user verification"""
    try:
        # Read the photo data
        photo_data = await photo.read()
        
        if not photo_data:
            raise HTTPException(status_code=400, detail="Empty file")
            
        # Upload the ID photo - use await for async method
        result = await FaceVerificationService.upload_id_photo(db, user_id, photo_data)
        
        # If verification exists, properly format the response
        if result.get("verification"):
            verification = result["verification"]
            formatted_result = {
                "success": result.get("success", False),
                "message": result.get("message", ""),
                "verification": {
                    "id": verification.id,
                    "user_id": verification.user_id,
                    "id_photo_path": verification.id_photo_path,
                    "is_verified": verification.is_verified,
                    "verification_date": verification.verification_date,
                    "match_score": verification.match_score,
                    "liveness_score": verification.liveness_score
                }
            }
            return formatted_result
        
        return result
    except Exception as e:
        logger.error(f"Error uploading ID photo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-face")
async def verify_face(
    user_id: int = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Verify user's face against stored ID photo"""
    try:
        # Read the webcam photo data
        photo_data = await photo.read()
        
        if not photo_data:
            raise HTTPException(status_code=400, detail="Empty file")
            
        # Verify the face - check if this needs to be awaited
        result = await FaceVerificationService.verify_face(db, user_id, photo_data)
        
        # If verification exists, properly format the response
        if result.get("verification"):
            verification = result["verification"]
            formatted_result = {
                "success": result.get("success", False),
                "message": result.get("message", ""),
                "match_score": result.get("match_score"),
                "liveness_score": result.get("liveness_score"),
                "verification": {
                    "id": verification.id,
                    "user_id": verification.user_id,
                    "id_photo_path": verification.id_photo_path,
                    "is_verified": verification.is_verified,
                    "verification_date": verification.verification_date,
                    "match_score": verification.match_score,
                    "liveness_score": verification.liveness_score
                }
            }
            return formatted_result
        
        return result
    except Exception as e:
        logger.error(f"Error verifying face: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verification-status/{user_id}", response_model=dict)
async def get_verification_status(user_id: int, db: Session = Depends(get_db)):
    """Get the verification status for a user"""
    try:
        result = await FaceVerificationService.get_verification_status(db, user_id)
        
        # If verification exists, convert the model to a dict for proper serialization
        if result.get("verification"):
            # Create a response with properly serialized data
            verification = result["verification"]
            response = {
                "success": result.get("success", False),
                "message": result.get("message", ""),
                "is_verified": result.get("is_verified", False),
                "verification": {
                    "id": verification.id,
                    "user_id": verification.user_id,
                    "id_photo_path": verification.id_photo_path,
                    "is_verified": verification.is_verified,
                    "verification_date": verification.verification_date,
                    "match_score": verification.match_score,
                    "liveness_score": verification.liveness_score
                }
            }
            return response
        else:
            # No verification record exists
            return {
                "success": False,
                "message": "No verification record found for this user",
                "is_verified": False,
                "verification": None
            }
    except Exception as e:
        logger.error(f"Error getting verification status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 