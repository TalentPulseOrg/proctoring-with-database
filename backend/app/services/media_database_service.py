import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.screen_capture import ScreenCapture
from app.models.snapshot_capture import SnapshotCapture

logger = logging.getLogger(__name__)

class MediaDatabaseService:
    """Service to automatically create database entries when media files are saved"""
    
    def __init__(self):
        self.media_root = Path("media")
        self.screenshots_dir = self.media_root / "screenshots"
        self.snapshots_dir = self.media_root / "snapshots"
    
    def extract_session_id_from_path(self, file_path: Path) -> Optional[int]:
        """
        Extract session ID from file path
        Expected format: media/screenshots/test_{session_id}/filename or media/snapshots/test_{session_id}/filename
        """
        try:
            # Split the path and look for test_{session_id} pattern
            path_parts = file_path.parts
            
            # Find the part that matches test_{session_id}
            for part in path_parts:
                if part.startswith("test_") and part != "test_":
                    session_id_str = part.replace("test_", "")
                    return int(session_id_str)
            
            return None
        except (ValueError, AttributeError) as e:
            logger.error(f"Error extracting session ID from path {file_path}: {str(e)}")
            return None
    
    def get_relative_path(self, file_path: Path) -> str:
        """
        Get relative path from media root for database storage
        Example: media/screenshots/test_1/screenshot_2024-01-01_12-00-00.png
        Returns: screenshots/test_1/screenshot_2024-01-01_12-00-00.png
        """
        try:
            # Get the relative path from media root
            relative_path = file_path.relative_to(self.media_root)
            return str(relative_path).replace("\\", "/")  # Ensure forward slashes
        except ValueError as e:
            logger.error(f"Error getting relative path for {file_path}: {str(e)}")
            return str(file_path)
    
    def create_screen_capture_entry(self, file_path: Path, session_id: int, db: Session) -> bool:
        """
        Create a database entry for a screen capture file
        """
        try:
            # Get relative path for database storage
            relative_path = self.get_relative_path(file_path)
            
            # Check if entry already exists
            existing_entry = db.query(ScreenCapture).filter(
                ScreenCapture.session_id == session_id,
                ScreenCapture.image_path == relative_path
            ).first()
            
            if existing_entry:
                logger.info(f"Screen capture entry already exists for {relative_path}")
                return True
            
            # Create database entry
            screen_capture = ScreenCapture(
                session_id=session_id,
                image_path=relative_path,
                timestamp=datetime.utcnow()
            )
            
            db.add(screen_capture)
            db.commit()
            db.refresh(screen_capture)
            
            logger.info(f"Created screen capture entry: ID={screen_capture.id}, Session={session_id}, Path={relative_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating screen capture entry for {file_path}: {str(e)}")
            db.rollback()
            return False
    
    def create_snapshot_capture_entry(self, file_path: Path, session_id: int, db: Session) -> bool:
        """
        Create a database entry for a snapshot capture file
        """
        try:
            # Get relative path for database storage
            relative_path = self.get_relative_path(file_path)
            
            # Check if entry already exists
            existing_entry = db.query(SnapshotCapture).filter(
                SnapshotCapture.session_id == session_id,
                SnapshotCapture.image_path == relative_path
            ).first()
            
            if existing_entry:
                logger.info(f"Snapshot capture entry already exists for {relative_path}")
                return True
            
            # Create database entry
            snapshot_capture = SnapshotCapture(
                session_id=session_id,
                image_path=relative_path,
                timestamp=datetime.utcnow()
            )
            
            db.add(snapshot_capture)
            db.commit()
            db.refresh(snapshot_capture)
            
            logger.info(f"Created snapshot capture entry: ID={snapshot_capture.id}, Session={session_id}, Path={relative_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating snapshot capture entry for {file_path}: {str(e)}")
            db.rollback()
            return False
    
    def process_file_creation(self, file_path: str) -> bool:
        """
        Process a newly created file and create appropriate database entry
        """
        try:
            file_path_obj = Path(file_path)
            
            # Check if file exists
            if not file_path_obj.exists():
                logger.warning(f"File does not exist: {file_path}")
                return False
            
            # Extract session ID
            session_id = self.extract_session_id_from_path(file_path_obj)
            if session_id is None:
                logger.warning(f"Could not extract session ID from path: {file_path}")
                return False
            
            # Determine file type based on directory
            if "screenshots" in file_path_obj.parts:
                # This is a webcam snapshot (stored in screenshots folder)
                db = next(get_db())
                try:
                    return self.create_snapshot_capture_entry(file_path_obj, session_id, db)
                finally:
                    db.close()
            elif "snapshots" in file_path_obj.parts:
                # This is a screen capture (stored in snapshots folder)
                db = next(get_db())
                try:
                    return self.create_screen_capture_entry(file_path_obj, session_id, db)
                finally:
                    db.close()
            else:
                logger.warning(f"File not in recognized media directory: {file_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error processing file creation for {file_path}: {str(e)}")
            return False
    
    def scan_existing_files(self) -> dict:
        """
        Scan existing files in media directories and create database entries for any missing ones
        Returns: Dictionary with counts of processed files
        """
        stats = {
            "screenshots_processed": 0,
            "snapshots_processed": 0,
            "errors": 0
        }
        
        try:
            # Process screenshots directory (webcam snapshots)
            if self.screenshots_dir.exists():
                for session_dir in self.screenshots_dir.iterdir():
                    if session_dir.is_dir() and session_dir.name.startswith("test_"):
                        session_id = self.extract_session_id_from_path(session_dir)
                        if session_id:
                            db = next(get_db())
                            try:
                                for file_path in session_dir.iterdir():
                                    if file_path.is_file() and file_path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                                        if self.create_snapshot_capture_entry(file_path, session_id, db):
                                            stats["screenshots_processed"] += 1
                                        else:
                                            stats["errors"] += 1
                            finally:
                                db.close()
            
            # Process snapshots directory (screen captures)
            if self.snapshots_dir.exists():
                for session_dir in self.snapshots_dir.iterdir():
                    if session_dir.is_dir() and session_dir.name.startswith("test_"):
                        session_id = self.extract_session_id_from_path(session_dir)
                        if session_id:
                            db = next(get_db())
                            try:
                                for file_path in session_dir.iterdir():
                                    if file_path.is_file() and file_path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                                        if self.create_screen_capture_entry(file_path, session_id, db):
                                            stats["snapshots_processed"] += 1
                                        else:
                                            stats["errors"] += 1
                            finally:
                                db.close()
            
            logger.info(f"Scan completed: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error scanning existing files: {str(e)}")
            stats["errors"] += 1
            return stats

# Create singleton instance
media_db_service = MediaDatabaseService() 