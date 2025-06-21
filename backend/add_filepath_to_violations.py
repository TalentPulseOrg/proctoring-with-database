"""
Database Migration Script to Add Filepath Column to Violations Table

This script adds a new 'filepath' column to the violations table to store
the path to uploaded image files associated with violations.

Usage:
    python add_filepath_to_violations.py
"""

import logging
import sys
from app.database import engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def add_filepath_column():
    """
    Adds the filepath column to the violations table
    """
    if engine is None:
        logger.error("Cannot add column: No database engine available")
        return False
        
    try:
        logger.info("Adding filepath column to violations table...")
        
        # Create a connection and transaction
        conn = engine.connect()
        trans = conn.begin()
        
        try:
            # Check if the column already exists
            result = conn.execute("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'violations' 
                AND COLUMN_NAME = 'filepath'
            """)
            
            if result.fetchone():
                logger.info("Column 'filepath' already exists in violations table")
                trans.rollback()
                return True
            
            # Add the new column
            conn.execute("""
                ALTER TABLE violations 
                ADD filepath NVARCHAR(500) NULL
            """)
            
            # Commit the transaction
            trans.commit()
            logger.info("Successfully added filepath column to violations table")
            return True
            
        except Exception as e:
            # Roll back the transaction if any step fails
            trans.rollback()
            logger.error(f"Failed to add filepath column: {e}")
            return False
        finally:
            # Close the connection
            conn.close()
            
    except Exception as e:
        logger.error(f"Migration error: {e}")
        return False

def main():
    logger.info("=== Add Filepath Column to Violations Table ===")
    logger.info("This script will add a 'filepath' column to the violations table")
    logger.info("to store paths to uploaded image files associated with violations.")
    logger.info("")
    
    try:
        # Run the migration
        logger.info("Starting migration...")
        success = add_filepath_column()
        
        if success:
            logger.info("Migration completed successfully.")
            logger.info("The violations table now has a 'filepath' column.")
        else:
            logger.error("Migration failed.")
            return 1
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main())