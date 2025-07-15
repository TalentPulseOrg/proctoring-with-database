"""
Face Detection Routes

This module contains the API routes for face detection monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import FaceDetectionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/face-detection", tags=["Face Detection"])

class FaceDetectionRequest(BaseModel):
    session_id: int
    image_data: str
    confidence_threshold: float = 0.5

@router.post("/detect")
async def detect_faces(
    request: FaceDetectionRequest,
    db: Session = Depends(get_db)
):
    """Detect faces in an image"""
    try:
        return FaceDetectionService.process_face_detection(
            db=db,
            session_id=request.session_id,
            image_data=request.image_data,
            confidence_threshold=request.confidence_threshold
        )
    except Exception as e:
        logger.error(f"Error detecting faces: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect-upload")
async def detect_faces_upload(
    session_id: int = Form(...),
    image_file: UploadFile = File(...),
    confidence_threshold: float = Form(0.5),
    db: Session = Depends(get_db)
):
    """Detect faces in an uploaded image"""
    try:
        # Read uploaded file
        image_data = await image_file.read()
        import base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        return FaceDetectionService.process_face_detection(
            db=db,
            session_id=session_id,
            image_data=image_base64,
            confidence_threshold=confidence_threshold
        )
    except Exception as e:
        logger.error(f"Error detecting faces from upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/multiple-faces-violations")
async def get_session_multiple_faces_violations(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all multiple faces violations for a session"""
    try:
        return FaceDetectionService.get_session_multiple_faces_violations(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session multiple faces violations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/summary")
async def get_face_detection_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a summary of face detection activity for a session"""
    try:
        violations = FaceDetectionService.get_session_multiple_faces_violations(db, session_id)
        
        total_violations = len(violations)
        
        # Calculate average face count from violations
        face_counts = [v.get('face_count', 0) for v in violations if v.get('face_count')]
        avg_face_count = sum(face_counts) / len(face_counts) if face_counts else 0
        
        return {
            "session_id": session_id,
            "total_violations": total_violations,
            "average_face_count": round(avg_face_count, 2),
            "violation_rate": 0  # Since we only track violations now
        }
    except Exception as e:
        logger.error(f"Error getting face detection summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 