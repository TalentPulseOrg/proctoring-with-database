from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile, Form
from pydantic import BaseModel
from typing import Optional, List, Dict
from ..services.monitoring_service import MonitoringService, monitoring_service
from ..services.screenshot import screenshot_service
from datetime import datetime
import os
import pyautogui
import logging
import asyncio
from fastapi.responses import FileResponse
import base64

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

# Configure logging
logger = logging.getLogger(__name__)

# Store active capture tasks
active_captures: Dict[str, asyncio.Task] = {}

class CaptureRequest(BaseModel):
    testId: str
    userId: str
    imageData: str
    timestamp: str

class MonitoringEvent(BaseModel):
    test_id: str
    event_type: str
    timestamp: str
    details: Optional[dict] = None

class ScreenCaptureRequest(BaseModel):
    test_id: str

@router.post("/capture")
async def capture_frame(request: CaptureRequest):
    try:
        # Create test-specific folder for snapshots with test_ prefix for consistency
        save_folder = os.path.join("snapshots", f"test_{request.testId}")
        os.makedirs(save_folder, exist_ok=True)
        
        # Generate filename with current timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"snapshot_{timestamp}.jpg"
        filepath = os.path.join(save_folder, filename)
        
        # Save the snapshot
        with open(filepath, "wb") as f:
            f.write(request.imageData.encode())
            
        result = monitoring_service.process_image(
            request.imageData,
            request.testId,
            request.userId
        )
        
        # Add file path to result
        result["saved_image_path"] = filepath
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suspicious")
async def get_suspicious_images(test_id: Optional[str] = None, user_id: Optional[str] = None):
    try:
        # Get suspicious images from test-specific folder
        suspicious_folder = os.path.join("suspicious_snapshots", test_id) if test_id else "suspicious_snapshots"
        images = []
        
        if os.path.exists(suspicious_folder):
            for filename in os.listdir(suspicious_folder):
                if filename.endswith(('.jpg', '.png')):
                    images.append({
                        "filename": filename,
                        "path": os.path.join(suspicious_folder, filename),
                        "timestamp": filename.split('_')[1].split('.')[0]  # Extract timestamp from filename
                    })
        
        return {"images": images}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log-event")
async def log_monitoring_event(event: MonitoringEvent):
    """
    Log a monitoring event (e.g., suspicious activity, poor lighting)
    """
    try:
        monitoring_service.log_event(
            event.test_id,
            event.event_type,
            event.details or {}
        )
        return {"message": "Event logged successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/{test_id}")
async def get_monitoring_logs(test_id: str):
    """
    Get all monitoring logs for a specific test
    """
    try:
        logs = monitoring_service.get_monitoring_logs(test_id)
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start-screen-capture")
async def start_screen_capture(request: ScreenCaptureRequest):
    try:
        if request.test_id in active_captures:
            return {"message": "Screen capture already running for this test"}
        
        # Create test-specific directory
        save_folder = os.path.join("screenshots", request.test_id)
        os.makedirs(save_folder, exist_ok=True)
        
        async def capture_screenshots():
            while True:
                try:
                    # Take screenshot
                    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                    filename = f"screenshot_{timestamp}.jpg"
                    filepath = os.path.join(save_folder, filename)
                    
                    # Take actual screenshot using pyautogui
                    screenshot = pyautogui.screenshot()
                    screenshot.save(filepath)
                    
                    # Log the capture
                    monitoring_service.log_event(
                        request.test_id,
                        "screenshot_captured",
                        {"filename": filename, "path": filepath}
                    )
                    
                    await asyncio.sleep(15)  # Capture every 15 seconds
                except Exception as e:
                    logger.error(f"Error capturing screenshot: {str(e)}")
                    await asyncio.sleep(15)  # Wait before retrying
        
        # Start the capture task
        task = asyncio.create_task(capture_screenshots())
        active_captures[request.test_id] = task
        
        return {"message": "Screen capture started successfully"}
    except Exception as e:
        logger.error(f"Error starting screen capture: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop-screen-capture")
async def stop_screen_capture(request: ScreenCaptureRequest):
    try:
        if request.test_id not in active_captures:
            return {"message": "No active screen capture for this test"}
        
        # Cancel the capture task
        task = active_captures[request.test_id]
        task.cancel()
        del active_captures[request.test_id]
        
        # Log the stop event
        monitoring_service.log_event(
            request.test_id,
            "screen_capture_stopped",
            {"timestamp": datetime.now().isoformat()}
        )
        
        return {"message": "Screen capture stopped successfully"}
    except Exception as e:
        logger.error(f"Error stopping screen capture: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-snapshot")
async def save_snapshot(
    image: UploadFile = File(...),
    test_id: str = Form(None),
    sessionId: str = Form(None),
    userId: str = Form(...)
):
    try:
        # Read the image data
        image_data = await image.read()        # Prefer sessionId for folder naming if present, else use test_id
        folder_id = sessionId if sessionId is not None else test_id
        if folder_id is None:
            raise HTTPException(status_code=422, detail="Missing sessionId or test_id")

        # Create folder for snapshots with test_ prefix for consistency
        save_folder = os.path.join("snapshots", f"test_{folder_id}")
        os.makedirs(save_folder, exist_ok=True)

        # Generate filename with current timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"snapshot_{timestamp}.jpg"
        filepath = os.path.join(save_folder, filename)

        # Save the snapshot
        with open(filepath, "wb") as f:
            f.write(image_data)

        # Process the image and check for suspicious activity
        result = monitoring_service.process_image(
            image_data,
            folder_id,
            userId
        )

        # Log the snapshot event
        monitoring_service.log_event(
            folder_id,
            "snapshot_captured",
            {
                "is_suspicious": result["is_suspicious"],
                "face_count": result["face_count"],
                "timestamp": result["timestamp"]
            }
        )

        # Add file path to result
        result["saved_image_path"] = filepath

        return result
    except Exception as e:
        logger.error(f"Error saving snapshot: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suspicious-images/{test_id}")
async def get_suspicious_images(test_id: str):
    try:
        suspicious_folder = os.path.join("suspicious_snapshots", test_id)
        if not os.path.exists(suspicious_folder):
            return []
        
        images = []
        for filename in os.listdir(suspicious_folder):
            if filename.startswith("suspicious_") and filename.endswith(".jpg"):
                images.append({
                    "filename": filename,
                    "path": os.path.join(suspicious_folder, filename),
                    "timestamp": filename.replace("suspicious_", "").replace(".jpg", "")
                })
        
        return images
    except Exception as e:
        logger.error(f"Error getting suspicious images: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/monitoring-logs/{test_id}")
async def get_monitoring_logs(test_id: str):
    try:
        return monitoring_service.get_monitoring_logs(test_id)
    except Exception as e:
        logger.error(f"Error getting monitoring logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-data/{test_id}")
async def get_test_monitoring_data(test_id: str):
    """
    Get all monitoring data for a specific test including screenshots, snapshots, and suspicious images
    """
    try:
        # Get screenshots
        screenshots_dir = os.path.join("screenshots", test_id)
        screenshots = []
        if os.path.exists(screenshots_dir):
            for filename in os.listdir(screenshots_dir):
                if filename.endswith(('.jpg', '.png')):
                    file_path = os.path.join(screenshots_dir, filename)
                    screenshots.append({
                        "filename": filename,
                        "path": file_path,
                        "timestamp": filename.split('_')[1].split('.')[0],
                        "type": "screenshot"
                    })

        # Get regular snapshots
        snapshots_dir = os.path.join("snapshots", test_id)
        snapshots = []
        if os.path.exists(snapshots_dir):
            for filename in os.listdir(snapshots_dir):
                if filename.endswith(('.jpg', '.png')):
                    file_path = os.path.join(snapshots_dir, filename)
                    snapshots.append({
                        "filename": filename,
                        "path": file_path,
                        "timestamp": filename.split('_')[1].split('.')[0],
                        "type": "snapshot"
                    })

        # Get suspicious images
        suspicious_dir = os.path.join("suspicious_snapshots", test_id)
        suspicious_images = []
        if os.path.exists(suspicious_dir):
            for filename in os.listdir(suspicious_dir):
                if filename.endswith(('.jpg', '.png')):
                    file_path = os.path.join(suspicious_dir, filename)
                    suspicious_images.append({
                        "filename": filename,
                        "path": file_path,
                        "timestamp": filename.split('_')[1].split('.')[0],
                        "type": "suspicious"
                    })

        # Get monitoring logs
        logs = monitoring_service.get_monitoring_logs(test_id)

        return {
            "screenshots": screenshots,
            "snapshots": snapshots,
            "suspicious_images": suspicious_images,
            "logs": logs
        }
    except Exception as e:
        logger.error(f"Error getting test monitoring data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/image/{test_id}/{image_type}/{filename}")
async def get_test_image(test_id: str, image_type: str, filename: str):
    """
    Get a specific image from the test monitoring data
    """
    try:
        # Map image type to directory
        type_to_dir = {
            "screenshot": "screenshots",
            "snapshot": "snapshots",
            "suspicious": "suspicious_snapshots"
        }

        if image_type not in type_to_dir:
            raise HTTPException(status_code=400, detail="Invalid image type")

        # Construct file path
        file_path = os.path.join(type_to_dir[image_type], test_id, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Image not found")

        return FileResponse(file_path)
    except Exception as e:
        logger.error(f"Error getting test image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/proctoring/screenshots/start")
async def start_screenshot_service(request: ScreenCaptureRequest):
    """
    Start the Python screenshot service for a specific test
    """
    try:
        if screenshot_service.is_active():
            current_test = screenshot_service.get_current_test_id()
            if current_test == request.test_id:
                return {"message": f"Screenshot service already running for test {request.test_id}"}
            else:
                # Stop the current service and start a new one
                screenshot_service.stop_for_test()
                
        # Start the screenshot service
        success = screenshot_service.start_for_test(request.test_id)
        
        if success:
            return {"message": f"Screenshot service started for test {request.test_id}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to start screenshot service")
    except Exception as e:
        logger.error(f"Error starting screenshot service: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/proctoring/screenshots/stop")
async def stop_screenshot_service():
    """
    Stop the Python screenshot service
    """
    try:
        if not screenshot_service.is_active():
            return {"message": "Screenshot service is not running"}
            
        test_id = screenshot_service.get_current_test_id()
        success = screenshot_service.stop_for_test()
        
        if success:
            return {"message": f"Screenshot service stopped for test {test_id}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to stop screenshot service")
    except Exception as e:
        logger.error(f"Error stopping screenshot service: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 