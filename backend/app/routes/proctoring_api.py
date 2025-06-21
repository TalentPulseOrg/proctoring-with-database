from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
from ..database import get_db
from ..services.proctoring_service import ProctoringService
from ..schemas.violation import ViolationCreate, ViolationResponse
from ..schemas.screen_capture import ScreenCaptureCreate, ScreenCaptureResponse
from ..schemas.behavioral_anomaly import BehavioralAnomalyCreate, BehavioralAnomalyResponse
from datetime import datetime
import json
from pydantic import BaseModel
from ..services.screenshot import screenshot_service
import os
import face_recognition
import cv2
import numpy as np
import os
import face_recognition
import cv2
import numpy as np

# Set up logging with reduced verbosity
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring", tags=["Proctoring"])

# Add model for screenshot service requests
class ScreenshotServiceRequest(BaseModel):
    test_id: str

class ScreenshotRequest(BaseModel):
    test_id: int
    session_id: int

@router.post("/violation", response_model=ViolationResponse)
async def record_violation(violation: ViolationCreate, db: Session = Depends(get_db)):
    """Record a violation during a test session"""
    try:
        return ProctoringService.record_violation(db, violation)
    except Exception as e:
        logger.error(f"Error recording violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/screen-capture", response_model=ScreenCaptureResponse)
async def save_screen_capture(
    session_id: int = Form(...),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Save a screen capture during a test session"""
    try:
        # Read the uploaded image
        image_data = await image_file.read()
        
        # Create screen capture object
        screen_capture = ScreenCaptureCreate(
            session_id=session_id,
            image_path="",  # Will be set by the service
            timestamp=datetime.utcnow()
        )
        
        # Save to database and file system - now using async method
        return await ProctoringService.save_screen_capture(db, screen_capture, image_data)
    except Exception as e:
        logger.error(f"Error saving screen capture: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webcam-snapshot")
async def save_webcam_snapshot(
    session_id: int = Form(...),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Save a webcam snapshot during a test session"""
    try:
        # Ensure the directory exists
        snapshot_dir = os.path.join("media", "screenshots")
        test_dir = os.path.join(snapshot_dir, f"test_{session_id}")
        
        if not os.path.exists(snapshot_dir):
            os.makedirs(snapshot_dir)
        if not os.path.exists(test_dir):
            os.makedirs(test_dir)
        
        # Read the uploaded image
        image_data = await image_file.read()
        
        # Convert to numpy array for face detection
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Generate a filename with timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"webcam_snapshot_{timestamp}.jpg"
        filepath = os.path.join(test_dir, filename)
        
        # Save the image
        cv2.imwrite(filepath, img)
        
        # Optional: Detect faces in the image
        face_count = 0
        try:
            # Convert BGR to RGB for face_recognition
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_img)
            face_count = len(face_locations)
            
            logger.info(f"Detected {face_count} faces in webcam snapshot for session {session_id}")
        except Exception as face_err:
            logger.error(f"Error detecting faces: {str(face_err)}")
        
        return {
            "success": True,
            "message": "Webcam snapshot saved successfully",
            "file_path": filepath,
            "face_count": face_count
        }
    except Exception as e:
        logger.error(f"Error saving webcam snapshot: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/behavioral-anomaly", response_model=BehavioralAnomalyResponse)
async def record_behavioral_anomaly(anomaly: BehavioralAnomalyCreate, db: Session = Depends(get_db)):
    """Record a behavioral anomaly during a test session"""
    try:
        return ProctoringService.record_behavioral_anomaly(db, anomaly)
    except Exception as e:
        logger.error(f"Error recording behavioral anomaly: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}")
async def get_proctoring_data(session_id: int, db: Session = Depends(get_db)):
    """Get all proctoring data for a session"""
    try:
        return ProctoringService.get_all_proctoring_data(db, session_id)
    except Exception as e:
        logger.error(f"Error getting proctoring data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/screenshots/start", status_code=status.HTTP_200_OK)
async def start_screenshot_service(request: ScreenshotRequest, db: Session = Depends(get_db)):
    """Start taking screenshots for a test session"""
    try:
        if not request.session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        
        # Start the screenshot service for this session
        success = screenshot_service.start_for_test(request.session_id)
        
        if success:
            logger.info(f"Started screenshot service for session ID: {request.session_id}")
            return {"status": "success", "message": f"Started screenshots for session ID: {request.session_id}"}
        else:
            logger.error(f"Failed to start screenshot service for session ID: {request.session_id}")
            return {"status": "error", "message": "Failed to start screenshot service"}
    except Exception as e:
        logger.error(f"Error starting screenshot service: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/screenshots/stop", status_code=status.HTTP_200_OK)
async def stop_screenshot_service(db: Session = Depends(get_db)):
    """Stop taking screenshots"""
    try:
        # Stop the currently running screenshot service
        success = screenshot_service.stop_for_test()
        
        if success:
            logger.info("Stopped screenshot service")
            return {"status": "success", "message": "Stopped screenshot service"}
        else:
            logger.error("Failed to stop screenshot service")
            return {"status": "error", "message": "Failed to stop screenshot service"}
    except Exception as e:
        logger.error(f"Error stopping screenshot service: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 