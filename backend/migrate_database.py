"""
Database Migration Script for Test Management System

This script migrates the database schema from using separate 'id' and 'test_id' fields
to using 'test_id' as the primary key across all related tables.

Usage:
    python migrate_database.py
"""

import logging
import sys
import time
from app.database import migrate_to_test_id_primary_key

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def main():
    logger.info("=== Database Schema Migration ===")
    logger.info("This script will migrate your database to use test_id as the primary key")
    logger.info("for tests table and update all foreign key relationships.")
    logger.info("")
    logger.info("IMPORTANT: Please backup your database before continuing!")
    logger.info("")
    
    # Ask for confirmation
    try:
        response = input("Have you backed up your database? Type 'yes' to continue: ")
        if response.lower() != 'yes':
            logger.warning("Migration aborted. Please backup your database first.")
            return
        
        logger.info("Starting migration in 5 seconds... Press Ctrl+C to cancel")
        time.sleep(5)
        
        # Run the migration
        logger.info("Beginning database schema migration")
        migrate_to_test_id_primary_key()
        
        logger.info("Migration completed successfully.")
        logger.info("You can now restart your application with the new schema.")
        
    except KeyboardInterrupt:
        logger.warning("Migration cancelled by user.")
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main()) 