import os
import logging
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

def cleanup_session_files(session_id: int) -> bool:
    """
    Clean up all media files associated with a test session
    
    Args:
        session_id: The ID of the session to clean up
        
    Returns:
        bool: True if cleanup was successful, False otherwise
    """
    try:
        media_dir = Path("media")
        if not media_dir.exists():
            logger.info(f"Media directory does not exist, nothing to clean up for session {session_id}")
            return True
        
        deleted_files = 0
        
        # Clean up screenshots
        screenshots_dir = media_dir / "screenshots" / f"test_{session_id}"
        if screenshots_dir.exists():
            for file in screenshots_dir.glob("*"):
                try:
                    file.unlink()
                    deleted_files += 1
                except Exception as e:
                    logger.warning(f"Failed to delete screenshot file {file}: {str(e)}")
            try:
                screenshots_dir.rmdir()
                logger.info(f"Deleted screenshots directory for session {session_id}")
            except Exception as e:
                logger.warning(f"Failed to delete screenshots directory {screenshots_dir}: {str(e)}")
        
        # Clean up webcam snapshots (they're in the same directory as screenshots)
        webcam_dir = media_dir / "screenshots" / f"test_{session_id}"
        if webcam_dir.exists():
            for file in webcam_dir.glob("*"):
                try:
                    file.unlink()
                    deleted_files += 1
                except Exception as e:
                    logger.warning(f"Failed to delete webcam file {file}: {str(e)}")
            try:
                webcam_dir.rmdir()
                logger.info(f"Deleted webcam directory for session {session_id}")
            except Exception as e:
                logger.warning(f"Failed to delete webcam directory {webcam_dir}: {str(e)}")
        
        # Clean up snapshots (if they exist in a separate directory)
        snapshots_dir = media_dir / "snapshots" / f"test_{session_id}"
        if snapshots_dir.exists():
            for file in snapshots_dir.glob("*"):
                try:
                    file.unlink()
                    deleted_files += 1
                except Exception as e:
                    logger.warning(f"Failed to delete snapshot file {file}: {str(e)}")
            try:
                snapshots_dir.rmdir()
                logger.info(f"Deleted snapshots directory for session {session_id}")
            except Exception as e:
                logger.warning(f"Failed to delete snapshots directory {snapshots_dir}: {str(e)}")
        
        logger.info(f"Cleaned up {deleted_files} files for session {session_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error cleaning up files for session {session_id}: {str(e)}")
        return False

def cleanup_all_session_files() -> int:
    """
    Clean up all media files for all sessions
    
    Returns:
        int: Number of files deleted
    """
    try:
        media_dir = Path("media")
        if not media_dir.exists():
            logger.info("Media directory does not exist, nothing to clean up")
            return 0
        
        total_deleted = 0
        
        # Clean up all test directories
        for test_dir in media_dir.glob("*/test_*"):
            if test_dir.is_dir():
                for file in test_dir.glob("*"):
                    try:
                        file.unlink()
                        total_deleted += 1
                    except Exception as e:
                        logger.warning(f"Failed to delete file {file}: {str(e)}")
                try:
                    test_dir.rmdir()
                except Exception as e:
                    logger.warning(f"Failed to delete directory {test_dir}: {str(e)}")
        
        logger.info(f"Cleaned up {total_deleted} files total")
        return total_deleted
        
    except Exception as e:
        logger.error(f"Error cleaning up all files: {str(e)}")
        return 0 