import pyodbc
from sqlalchemy import inspect
from app.database import engine
import logging
import os
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def grant_table_permissions():
    """
    Grants table-specific permissions to the 'preet' user after tables are created.
    """
    try:
        # Get the connection from SQLAlchemy engine
        connection = engine.raw_connection()
        cursor = connection.cursor()
        
        # Get all tables in the database
        inspector = inspect(engine)
        tables = inspector.get_table_names(schema='dbo')
        
        logger.info(f"Granting permissions for tables: {tables}")
        
        # Grant permissions for each table
        for table in tables:
            sql = f"GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.{table} TO {os.getenv("DB_USER")}"
            cursor.execute(sql)
            logger.info(f"Granted permissions on table: {table}")
            
        # Commit the changes
        connection.commit()
        logger.info("All permissions granted successfully!")
        
        # Close cursor and connection
        cursor.close()
        connection.close()
        
    except Exception as e:
        logger.error(f"Error granting permissions: {str(e)}")
        raise

# Function to check if tables exist
def check_table_permissions():
    """
    Checks if the 'preet' user has permissions on the tables.
    """
    try:
        # Get the connection from SQLAlchemy engine
        connection = engine.raw_connection()
        cursor = connection.cursor()
        
        # Get all tables in the database
        inspector = inspect(engine)
        tables = inspector.get_table_names(schema='dbo')
        
        logger.info(f"Checking permissions for tables: {tables}")
        
        # For each table, check permissions
        result = {}
        for table in tables:
            sql = f"""
            SELECT 
                HAS_PERMS_BY_NAME('dbo.{table}', 'OBJECT', 'SELECT') as has_select,
                HAS_PERMS_BY_NAME('dbo.{table}', 'OBJECT', 'INSERT') as has_insert,
                HAS_PERMS_BY_NAME('dbo.{table}', 'OBJECT', 'UPDATE') as has_update,
                HAS_PERMS_BY_NAME('dbo.{table}', 'OBJECT', 'DELETE') as has_delete
            """
            cursor.execute(sql)
            row = cursor.fetchone()
            result[table] = {
                'SELECT': bool(row[0]),
                'INSERT': bool(row[1]),
                'UPDATE': bool(row[2]),
                'DELETE': bool(row[3])
            }
            
        # Close cursor and connection
        cursor.close()
        connection.close()
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking permissions: {str(e)}")
        raise 