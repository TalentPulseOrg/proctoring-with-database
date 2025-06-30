import os
import logging
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple
from fastapi import UploadFile
import shutil

# Set up logging
logger = logging.getLogger(__name__)

# Base directory for media storage
MEDIA_ROOT = Path("media")

class FileService:
    """Service for handling file uploads and retrievals"""
    
    @staticmethod
    def get_media_path(file_type: str) -> Path:
        """Get the appropriate directory path for a file type"""
        # Create mapping of file types to directories
        type_dirs = {
            "id_photo": MEDIA_ROOT / "id_photos",
            "webcam_photo": MEDIA_ROOT / "screenshots",  # Webcam snapshots go to screenshots folder
            "screen_capture": MEDIA_ROOT / "snapshots",  # Screen captures go to snapshots folder
            "test_document": MEDIA_ROOT / "test_documents",
            "suspicious": MEDIA_ROOT / "suspicious_snapshots",
        }
        
        # Get directory for the specified type, default to a general uploads directory
        media_dir = type_dirs.get(file_type, MEDIA_ROOT / "uploads")
        
        # Create directory if it doesn't exist
        media_dir.mkdir(parents=True, exist_ok=True)
        
        return media_dir
    
    @staticmethod
    async def save_uploaded_file(
        upload_file: UploadFile, 
        file_type: str, 
        entity_id: Optional[str] = None,
        custom_filename: Optional[str] = None
    ) -> Tuple[bool, str, str]:
        """
        Save an uploaded file to the appropriate directory
        
        Args:
            upload_file: The uploaded file
            file_type: Type of file (id_photo, webcam_photo, etc.)
            entity_id: ID of the entity this file belongs to (user_id, test_id, etc.)
            custom_filename: Optional custom filename, otherwise auto-generated
            
        Returns:
            Tuple of (success, filepath, url_path)
        """
        try:
            # Get the appropriate directory
            media_dir = FileService.get_media_path(file_type)
            
            # Create a subdirectory with the entity_id if provided
            if entity_id:
                media_dir = media_dir / str(entity_id)
                media_dir.mkdir(exist_ok=True)
            
            # Generate a unique filename if not provided
            if not custom_filename:
                # Get file extension from the original filename
                _, ext = os.path.splitext(upload_file.filename)
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                unique_id = str(uuid.uuid4())[:8]
                filename = f"{file_type}_{timestamp}_{unique_id}{ext}"
            else:
                filename = custom_filename
            
            # Full path where the file will be stored
            file_path = media_dir / filename
            
            # Read the file content
            content = await upload_file.read()
            
            # Write the content to the file
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Get the directory name from the media_dir path to ensure consistency
            dir_name = media_dir.relative_to(MEDIA_ROOT).parts[0]
            
            # Generate URL path using the actual directory name for consistency
            url_path = f"/media/{dir_name}/{entity_id}/{filename}" if entity_id else f"/media/{dir_name}/{filename}"
            
            logger.info(f"File saved to {file_path} with URL path {url_path}")
            return True, str(file_path), url_path
            
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            return False, "", ""
    
    @staticmethod
    async def save_binary_data(
        data: bytes,
        file_type: str,
        entity_id: Optional[str] = None,
        custom_filename: Optional[str] = None,
        file_ext: str = ".jpg"
    ) -> Tuple[bool, str, str]:
        """
        Save binary data directly to a file
        
        Args:
            data: Binary data to save
            file_type: Type of file (id_photo, webcam_photo, etc.)
            entity_id: ID of the entity this file belongs to (user_id, test_id, etc.)
            custom_filename: Optional custom filename, otherwise auto-generated
            file_ext: File extension to use if custom_filename not provided
            
        Returns:
            Tuple of (success, filepath, url_path)
        """
        try:
            # Get the appropriate directory
            media_dir = FileService.get_media_path(file_type)
            
            # Create a subdirectory with the entity_id if provided
            if entity_id:
                # For screen captures and webcam photos, use test_{entity_id} format
                if file_type in ["screen_capture", "webcam_photo"]:
                    media_dir = media_dir / f"test_{entity_id}"
                else:
                    media_dir = media_dir / str(entity_id)
                media_dir.mkdir(exist_ok=True)
            
            # Generate a unique filename if not provided
            if not custom_filename:
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                unique_id = str(uuid.uuid4())[:8]
                filename = f"{file_type}_{timestamp}_{unique_id}{file_ext}"
            else:
                filename = custom_filename
            
            # Full path where the file will be stored
            file_path = media_dir / filename
            
            # Write the content to the file
            with open(file_path, "wb") as f:
                f.write(data)
            
            # Get the directory name from the media_dir path to ensure consistency
            dir_name = media_dir.relative_to(MEDIA_ROOT).parts[0]
            
            # Generate URL path using the actual directory name for consistency
            if entity_id and file_type in ["screen_capture", "webcam_photo"]:
                url_path = f"/media/{dir_name}/test_{entity_id}/{filename}"
            elif entity_id:
                url_path = f"/media/{dir_name}/{entity_id}/{filename}"
            else:
                url_path = f"/media/{dir_name}/{filename}"
            
            logger.info(f"Binary data saved to {file_path} with URL path {url_path}")
            return True, str(file_path), url_path
            
        except Exception as e:
            logger.error(f"Error saving binary data: {str(e)}")
            return False, "", ""
    
    @staticmethod
    def get_file_path(url_path: str) -> str:
        """
        Convert a URL path to a file system path
        
        Args:
            url_path: The URL path to convert
            
        Returns:
            The absolute file system path
        """
        logger.debug(f"Converting URL path to file path: {url_path}")
        
        # Remove leading slash and 'media' prefix if present
        path_parts = url_path.lstrip('/').split('/')
        if path_parts[0] == 'media':
            path_parts = path_parts[1:]
        
        # Construct path relative to MEDIA_ROOT
        result_path = str(MEDIA_ROOT.joinpath(*path_parts))
        logger.debug(f"Converted URL path {url_path} to file path: {result_path}")
        
        # Check if the file exists and log a warning if it doesn't
        if not os.path.exists(result_path):
            logger.warning(f"Converted file path does not exist: {result_path}")
        
        return result_path
    
    @staticmethod
    def get_url_path(file_path: str) -> str:
        """
        Convert a file system path to a URL path
        
        Args:
            file_path: The file system path to convert
            
        Returns:
            The URL path
        """
        # Convert to Path object for easier manipulation
        path = Path(file_path)
        
        # Check if path is relative to MEDIA_ROOT
        try:
            relative_path = path.relative_to(MEDIA_ROOT)
            return f"/media/{relative_path}"
        except ValueError:
            # If not under MEDIA_ROOT, return the original path
            return file_path 