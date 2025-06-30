#!/usr/bin/env python3
"""
Script to initialize database entries for existing media files.
This script scans the media directories and creates database entries for any files
that don't already have corresponding database records.
"""

import sys
import os
import logging
from pathlib import Path

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.media_database_service import media_db_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main function to initialize media database entries"""
    try:
        logger.info("Starting media database initialization...")
        
        # Scan existing files and create database entries
        stats = media_db_service.scan_existing_files()
        
        logger.info("Media database initialization completed!")
        logger.info(f"Results: {stats}")
        
        # Print summary
        print("\n" + "="*50)
        print("MEDIA DATABASE INITIALIZATION SUMMARY")
        print("="*50)
        print(f"Webcam snapshots processed: {stats['screenshots_processed']}")
        print(f"Screen captures processed: {stats['snapshots_processed']}")
        print(f"Errors encountered: {stats['errors']}")
        print("="*50)
        
        if stats['errors'] > 0:
            logger.warning(f"Some errors occurred during initialization. Check the logs for details.")
            return 1
        else:
            logger.info("All files processed successfully!")
            return 0
            
    except Exception as e:
        logger.error(f"Error during media database initialization: {str(e)}")
        print(f"\nERROR: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 