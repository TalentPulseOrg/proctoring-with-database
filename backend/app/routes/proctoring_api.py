from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
from ..database import get_db
from ..services.proctoring_service import ProctoringService
from ..services.violation_service import ViolationService
from ..schemas.violation import ViolationCreate, ViolationResponse
from ..schemas.screen_capture import ScreenCaptureCreate, ScreenCaptureResponse
from ..schemas.behavioral_anomaly import BehavioralAnomalyCreate, BehavioralAnomalyResponse
from ..models.test_session import TestSession
from datetime import datetime
import json
from pydantic import BaseModel
from ..services.screenshot import screenshot_service
import os
import face_recognition
import cv2
import numpy as np

# Set up logging with reduced verbosity
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring", tags=["Proctoring"])

# Enhanced violation logging models
class CameraPermissionViolation(BaseModel):
    session_id: int
    error_message: Optional[str] = None

class MicrophonePermissionViolation(BaseModel):
    session_id: int
    error_message: Optional[str] = None

class BrowserCompatibilityViolation(BaseModel):
    session_id: int
    browser_name: Optional[str] = None
    browser_version: Optional[str] = None
    user_agent: Optional[str] = None

class TabSwitchViolation(BaseModel):
    session_id: int
    filepath: Optional[str] = None

class WindowBlurViolation(BaseModel):
    session_id: int
    filepath: Optional[str] = None

class FullscreenExitViolation(BaseModel):
    session_id: int
    filepath: Optional[str] = None

class KeyboardShortcutViolation(BaseModel):
    session_id: int
    key_combination: str
    filepath: Optional[str] = None

class LightingIssueViolation(BaseModel):
    session_id: int
    lighting_level: Optional[float] = None
    lighting_status: Optional[str] = None
    filepath: Optional[str] = None

class GazeAwayViolation(BaseModel):
    session_id: int
    gaze_direction: Optional[str] = None
    duration_seconds: Optional[float] = None
    filepath: Optional[str] = None

class MultipleFacesViolation(BaseModel):
    session_id: int
    face_count: int
    filepath: Optional[str] = None

class AudioSuspiciousViolation(BaseModel):
    session_id: int
    audio_type: Optional[str] = None
    confidence: Optional[float] = None
    volume_level: Optional[float] = None
    filepath: Optional[str] = None

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

# Enhanced Violation Logging Endpoints

@router.post("/violations/camera-permission")
async def log_camera_permission_violation(violation: CameraPermissionViolation, db: Session = Depends(get_db)):
    """Log camera permission denial violation"""
    try:
        details = {"error_message": violation.error_message} if violation.error_message else None
        result = ViolationService.log_camera_permission_violation(db, violation.session_id, details)
        if result:
            return {"success": True, "message": "Camera permission violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging camera permission violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/microphone-permission")
async def log_microphone_permission_violation(violation: MicrophonePermissionViolation, db: Session = Depends(get_db)):
    """Log microphone permission denial violation"""
    try:
        details = {"error_message": violation.error_message} if violation.error_message else None
        result = ViolationService.log_microphone_permission_violation(db, violation.session_id, details)
        if result:
            return {"success": True, "message": "Microphone permission violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging microphone permission violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/browser-compatibility")
async def log_browser_compatibility_violation(violation: BrowserCompatibilityViolation, db: Session = Depends(get_db)):
    """Log browser compatibility violation"""
    try:
        browser_info = {
            "browser_name": violation.browser_name,
            "browser_version": violation.browser_version,
            "user_agent": violation.user_agent
        }
        result = ViolationService.log_browser_compatibility_violation(db, violation.session_id, browser_info)
        if result:
            return {"success": True, "message": "Browser compatibility violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging browser compatibility violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/tab-switch")
async def log_tab_switch_violation(violation: TabSwitchViolation, db: Session = Depends(get_db)):
    """Log tab switch violation"""
    try:
        result = ViolationService.log_tab_switch_violation(db, violation.session_id, violation.filepath)
        if result:
            return {"success": True, "message": "Tab switch violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging tab switch violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/window-blur")
async def log_window_blur_violation(violation: WindowBlurViolation, db: Session = Depends(get_db)):
    """Log window blur violation"""
    try:
        result = ViolationService.log_window_blur_violation(db, violation.session_id, violation.filepath)
        if result:
            return {"success": True, "message": "Window blur violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging window blur violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/fullscreen-exit")
async def log_fullscreen_exit_violation(violation: FullscreenExitViolation, db: Session = Depends(get_db)):
    """Log fullscreen exit violation"""
    try:
        result = ViolationService.log_fullscreen_exit_violation(db, violation.session_id, violation.filepath)
        if result:
            return {"success": True, "message": "Fullscreen exit violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging fullscreen exit violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/keyboard-shortcut")
async def log_keyboard_shortcut_violation(violation: KeyboardShortcutViolation, db: Session = Depends(get_db)):
    """Log keyboard shortcut violation"""
    try:
        result = ViolationService.log_keyboard_shortcut_violation(
            db, violation.session_id, violation.key_combination, violation.filepath
        )
        if result:
            return {"success": True, "message": "Keyboard shortcut violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging keyboard shortcut violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/lighting-issue")
async def log_lighting_issue_violation(violation: LightingIssueViolation, db: Session = Depends(get_db)):
    """Log lighting issue violation"""
    try:
        lighting_data = {
            "lighting_level": violation.lighting_level,
            "lighting_status": violation.lighting_status
        }
        result = ViolationService.log_lighting_violation(db, violation.session_id, lighting_data, violation.filepath)
        if result:
            return {"success": True, "message": "Lighting issue violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging lighting issue violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/gaze-away")
async def log_gaze_away_violation(violation: GazeAwayViolation, db: Session = Depends(get_db)):
    """Log gaze away violation"""
    try:
        gaze_data = {
            "gaze_direction": violation.gaze_direction,
            "duration_seconds": violation.duration_seconds
        }
        result = ViolationService.log_gaze_away_violation(db, violation.session_id, gaze_data, violation.filepath)
        if result:
            return {"success": True, "message": "Gaze away violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging gaze away violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/multiple-faces")
async def log_multiple_faces_violation(violation: MultipleFacesViolation, db: Session = Depends(get_db)):
    """Log multiple faces violation"""
    try:
        result = ViolationService.log_multiple_faces_violation(
            db, violation.session_id, violation.face_count, violation.filepath
        )
        if result:
            return {"success": True, "message": "Multiple faces violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging multiple faces violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/violations/audio-suspicious")
async def log_audio_suspicious_violation(violation: AudioSuspiciousViolation, db: Session = Depends(get_db)):
    """Log suspicious audio violation"""
    try:
        audio_data = {
            "audio_type": violation.audio_type,
            "confidence": violation.confidence,
            "volume_level": violation.volume_level
        }
        result = ViolationService.log_audio_suspicious_violation(db, violation.session_id, audio_data, violation.filepath)
        if result:
            return {"success": True, "message": "Suspicious audio violation logged", "violation_id": result.id}
        else:
            return {"success": False, "message": "Failed to log violation"}
    except Exception as e:
        logger.error(f"Error logging suspicious audio violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/violations/session/{session_id}/summary")
async def get_session_violations_summary(session_id: int, db: Session = Depends(get_db)):
    """Get violation summary for a session"""
    try:
        summary = ViolationService.get_session_violations_summary(db, session_id)
        return summary
    except Exception as e:
        logger.error(f"Error getting session violations summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Test endpoint for debugging violation logging
@router.post("/violations/test")
async def test_violation_logging(db: Session = Depends(get_db)):
    """Test endpoint to verify violation logging works"""
    try:
        # Get the first available test session for testing
        test_session = db.query(TestSession).first()
        if not test_session:
            return {"success": False, "message": "No test sessions found for testing"}
        
        # Log a test violation
        result = ViolationService.log_violation(
            db, 
            test_session.id, 
            'tab_switch', 
            {"test": True, "description": "Test violation from API endpoint"}
        )
        
        if result:
            return {
                "success": True, 
                "message": "Test violation logged successfully",
                "violation_id": result.id,
                "session_id": test_session.id
            }
        else:
            return {"success": False, "message": "Failed to log test violation"}
    except Exception as e:
        logger.error(f"Error in test violation logging: {str(e)}")
        return {"success": False, "message": f"Error: {str(e)}"}