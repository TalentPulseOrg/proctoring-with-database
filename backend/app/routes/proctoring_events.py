from fastapi import APIRouter, HTTPException, Depends, Body, UploadFile, File, Form
from typing import List, Optional
from ..schemas.proctoring_event import ProctoringEvent, ProctoringEventDetails
from ..utils.event_logger import ProctoringEventLogger
from datetime import datetime
from ..utils.report_generator import generate_proctoring_report
import os
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import io

router = APIRouter()

# Create directory for screenshots
SCREENSHOTS_DIR = Path("screenshots")
SCREENSHOTS_DIR.mkdir(exist_ok=True)

@router.post("/capture-screen")
async def capture_screen(
    file: UploadFile = File(...),
    test_id: str = Form(...),
    candidate_id: str = Form(...),
    timestamp: str = Form(None)
):
    try:
        # Read the image file
        contents = await file.read()
        
        # Generate filename
        filename = f"screen_{test_id}_{candidate_id}_{timestamp or 'unknown'}.jpg"
        filepath = SCREENSHOTS_DIR / filename
        
        # Save the screenshot
        with open(filepath, "wb") as f:
            f.write(contents)
        
        return {
            "success": True,
            "message": "Screen capture saved",
            "image_path": str(filepath)
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }

router = APIRouter(prefix="/api/proctoring", tags=["proctoring"])

# In-memory storage of event loggers per session
session_loggers: dict[str, ProctoringEventLogger] = {}

def get_logger(session_id: str) -> ProctoringEventLogger:
    if session_id not in session_loggers:
        session_loggers[session_id] = ProctoringEventLogger(session_id)
    return session_loggers[session_id]

@router.post("/events/{session_id}")
async def log_event(
    session_id: str,
    event_type: str = Body(...),
    details: ProctoringEventDetails = Body(...)
) -> dict:
    """Log a new proctoring event."""
    try:
        logger = get_logger(session_id)
        logger.log_event(event_type, details.dict())
        return {"status": "success", "message": "Event logged successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{session_id}")
async def get_events(
    session_id: str,
    event_type: Optional[str] = None
) -> List[ProctoringEvent]:
    """Get all events for a session, optionally filtered by event type."""
    logger = get_logger(session_id)
    events = logger.get_events(event_type)
    return events

@router.get("/events/{session_id}/export/json")
async def export_json(session_id: str) -> dict:
    """Export events as JSON file."""
    logger = get_logger(session_id)
    filepath = logger.export_json()
    return {
        "status": "success",
        "message": "Events exported successfully",
        "filepath": filepath
    }

@router.get("/events/{session_id}/export/csv")
async def export_csv(session_id: str) -> dict:
    """Export events as CSV file."""
    logger = get_logger(session_id)
    filepath = logger.export_csv()
    return {
        "status": "success",
        "message": "Events exported successfully",
        "filepath": filepath
    }

@router.delete("/events/{session_id}")
async def clear_events(session_id: str) -> dict:
    """Clear all events for a session."""
    if session_id in session_loggers:
        session_loggers[session_id].clear_events()
    return {"status": "success", "message": "Events cleared successfully"}

@router.get("/events/{session_id}/report")
async def generate_report(session_id: str) -> dict:
    """Generate a comprehensive proctoring report for a session."""
    logger = get_logger(session_id)
    events = logger.get_events()
    
    # Generate report
    report_data = generate_proctoring_report(events)
    
    return {
        "status": "success",
        "message": "Report generated successfully",
        "report": report_data
    }

@router.post("/gaze/analyze")
async def analyze_gaze(image: UploadFile = File(...)):
    """
    Analyze gaze direction from an uploaded image.
    Returns the detected gaze direction (center, left, right, no_face).
    """
    try:
        # Create snapshots directory if it doesn't exist
        snapshots_dir = Path("snapshots")
        snapshots_dir.mkdir(exist_ok=True)
        
        # Save the uploaded image
        timestamp = datetime.now().timestamp()
        image_path = snapshots_dir / f"gaze_{timestamp}.jpg"
        
        # Read and save the image
        contents = await image.read()
        with open(image_path, "wb") as f:
            f.write(contents)
        
        # Analyze gaze
        result = gaze_tracker.analyze_gaze(str(image_path))
        
        # Log the event
        if "error" not in result:
            logger = get_logger("gaze_analysis")
            logger.log_event("gaze_analysis", result)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 