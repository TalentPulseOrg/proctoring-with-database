#!/usr/bin/env python3
"""
Script to set up the webcam snapshot storage directories and permissions.
"""

import os
import sys
import logging
import shutil
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_directories():
    """Create and set up directories for webcam snapshots."""
    try:
        # Define base directories
        media_dir = Path("media")
        screenshots_dir = media_dir / "screenshots"
        
        # Create media directory if it doesn't exist
        if not media_dir.exists():
            logger.info(f"Creating media directory: {media_dir}")
            media_dir.mkdir(exist_ok=True)        # Create screenshots directory if it doesn't exist
        if not screenshots_dir.exists():
            logger.info(f"Creating screenshots directory: {screenshots_dir}")
            screenshots_dir.mkdir(exist_ok=True)
        
        # Create a placeholder in the screenshots directory to test write permissions
        placeholder_path = screenshots_dir / "placeholder.txt"
        with open(placeholder_path, "w") as f:
            f.write("This is a placeholder file to test write permissions. Test-specific folders will be created dynamically.")
        
        logger.info(f"Created placeholder file: {placeholder_path}")
        
        logger.info("Directories set up successfully!")
        
        # Print absolute paths for reference
        logger.info(f"Media directory: {media_dir.absolute()}")
        logger.info(f"Screenshots directory: {screenshots_dir.absolute()}")
        logger.info("Test-specific directories will be created dynamically based on session IDs")
        
        return True
    except Exception as e:
        logger.error(f"Error setting up directories: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Setting up webcam snapshot storage directories...")
    success = setup_directories()
    
    if success:
        logger.info("Setup completed successfully!")
    else:
        logger.error("Setup failed!")
        sys.exit(1) 