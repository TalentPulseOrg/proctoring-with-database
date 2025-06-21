from fastapi import APIRouter, HTTPException, Path, Depends
from fastapi.responses import FileResponse
from typing import Optional
import os
import logging
from ..services.file_service import FileService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/media", tags=["Media"])

@router.get("/file/{file_path:path}")
async def get_media_file(file_path: str = Path(...)):
    """
    Get a media file by its path
    
    Args:
        file_path: The path of the file relative to the media directory
        
    Returns:
        The file as a response
    """
    try:
        # Construct full filesystem path from the URL path
        full_path = FileService.get_file_path(f"/media/{file_path}")
        
        # Check if file exists
        if not os.path.exists(full_path):
            logger.warning(f"Media file not found: {full_path}")
            raise HTTPException(status_code=404, detail="File not found")
            
        # Return the file
        return FileResponse(full_path)
    except Exception as e:
        logger.error(f"Error serving media file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/id-photo/{user_id}")
async def get_id_photo(user_id: int):
    """
    Get the ID photo for a user
    
    Args:
        user_id: The ID of the user
        
    Returns:
        The ID photo as a response
    """
    try:
        # Create path to the ID photo directory for the user
        id_photo_dir = os.path.join("media", "id_photos", str(user_id))
        
        # Check if directory exists
        if not os.path.exists(id_photo_dir):
            raise HTTPException(status_code=404, detail="No ID photo found for this user")
            
        # Get the first file in the directory (assuming there's only one)
        files = os.listdir(id_photo_dir)
        if not files:
            raise HTTPException(status_code=404, detail="No ID photo found for this user")
            
        # Return the file
        return FileResponse(os.path.join(id_photo_dir, files[0]))
    except Exception as e:
        logger.error(f"Error serving ID photo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/screen-capture/{session_id}/{filename}")
async def get_screen_capture(session_id: int, filename: str):
    """
    Get a screen capture for a test session
    
    Args:
        session_id: The ID of the test session
        filename: The filename of the screen capture
        
    Returns:
        The screen capture as a response
    """
    try:
        # Create path to the screen capture
        screen_capture_path = os.path.join("media", "screen_captures", str(session_id), filename)
        
        # Check if file exists
        if not os.path.exists(screen_capture_path):
            raise HTTPException(status_code=404, detail="Screen capture not found")
            
        # Return the file
        return FileResponse(screen_capture_path)
    except Exception as e:
        logger.error(f"Error serving screen capture: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 