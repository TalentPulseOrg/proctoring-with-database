import os
import logging
import uvicorn
from main import app
from app.database import recreate_all_tables, create_default_admin, migrate_to_test_id_primary_key

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Check for command line arguments
    import sys
    
    # Check if we need to recreate tables
    if len(sys.argv) > 1 and sys.argv[1] == "--recreate-tables":
        logger.warning("Recreating database tables...")
        recreate_all_tables()
        create_default_admin()
        logger.warning("Database setup completed")
    
    # Check if we need to migrate to the new schema
    if len(sys.argv) > 1 and sys.argv[1] == "--migrate-schema":
        logger.warning("Migrating database schema to use test_id as primary key...")
        migrate_to_test_id_primary_key()
        logger.warning("Database schema migration completed")
    
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 8000))
    
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    ) 