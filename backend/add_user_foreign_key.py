import logging
from app.database import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_foreign_key():
    try:
        # Read the SQL script
        with open('add_user_foreign_key.sql', 'r') as f:
            sql = f.read()
        
        # Execute the SQL
        with engine.connect() as conn:
            conn.execute(sql)
            conn.commit()
        
        logger.info("Successfully added foreign key constraint to test_sessions table")
    except Exception as e:
        logger.error(f"Error adding foreign key constraint: {str(e)}")
        raise

if __name__ == "__main__":
    add_foreign_key() 